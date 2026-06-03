# Auditoría de Rendimiento — viscalaterra.cat

**Fecha:** 2026-06-03  
**Scope:** Frontend (Vue 3/Vite/Leaflet) + Backend (Express/PostGIS) + Infra (DB schema)  
**Modelo:** Claude Sonnet 4.6

---

## Resumen ejecutivo

| #   | Hallazgo                                                                                  | Impacto   | Esfuerzo de fix |
| --- | ----------------------------------------------------------------------------------------- | --------- | --------------- |
| 1   | Sin compresión gzip en Express — payloads x4 más grandes                                  | **ALTO**  | Bajo            |
| 2   | Desajuste de resolución servidor/cliente — hasta +16 MB extra al hacer zoom máximo        | **ALTO**  | Bajo            |
| 3   | Sin caché en memoria para ficheros GeoJSON — lectura de disco en cada petición            | **ALTO**  | Bajo            |
| 4   | Sin `Cache-Control` en `/api/territoris/arbre` — BD consultada en cada recarga            | **MEDIO** | Bajo            |
| 5   | `actualitzaEstilsTotes()` recorre los 1003 features completos en cada cambio de selección | **MEDIO** | Medio           |
| 6   | `CercaRapida`: sin debounce + `normalitza(q)` llamada 1003 veces por keystroke            | **MEDIO** | Bajo            |
| 7   | `TabOn`: `comptadorProvincia()` invocada 3 veces por render, sin memoización              | **MEDIO** | Bajo            |
| 8   | Vite: sin `manualChunks`, sin sección `build`, `vueDevTools` sin guard de entorno         | **BAJO**  | Bajo            |
| 9   | BD: índices btree ausentes en FKs de `municipis`                                          | **BAJO**  | Bajo            |
| 10  | `CercaRapida`: búsqueda de comarca por municipio en bucle anidado O(n×m)                  | **BAJO**  | Bajo            |

---

## Hallazgos detallados

---

### H1 — Sin compresión gzip en Express `backend/src/index.ts:1-21` · ALTO

**Qué pasa:** El backend no incluye el middleware `compression`. Todos los GeoJSON se sirven sin comprimir.

**Por qué cuesta:** Los archivos GeoJSON son texto altamente repetitivo (coordenadas numéricas, nombres de campos). Gzip los comprime al 24-27%. La carga inicial invoca 5 peticiones de GeoJSON (4 capas + máscara) que suman **~6,2 MB** sin comprimir. Con gzip bajarían a **~1,5 MB** (reducción de ~76%).

```
municipis-1000000:  3,0 MB → 841 KB (27%)
comarques-1000000:  1,1 MB → 308 KB (27%)
vegueries-1000000:  799 KB → 203 KB (25%)
provincies-1000000: 738 KB → 190 KB (25%)
catalunya-1000000:  617 KB → 148 KB (24%)
Total: 6,2 MB → ~1,5 MB
```

**Dónde:** `backend/src/index.ts` — no hay ninguna llamada a `app.use(compression())`.

**Fix:**

```bash
cd backend && npm install compression @types/compression
```

```typescript
// backend/src/index.ts
import compression from 'compression'
// ...
app.use(compression()) // añadir antes de las rutas
```

Express + `compression` detecta automáticamente si el cliente acepta gzip/br y comprime la respuesta. El `createReadStream().pipe(res)` del geojson también se comprimirá porque el middleware intercepta el stream de salida.

**Impacto estimado:** −4,7 MB en la carga inicial. En conexión móvil 4G (~10 Mbps), la diferencia es 5 seg → 1,2 seg solo en descarga de GeoJSON.

---

### H2 — Desajuste de resolución cliente/servidor `backend/src/routes/geojson.ts:11-17` vs `MapaLeaflet.vue:439-456` · ALTO

**Qué pasa:** El frontend calcula `resolucioPerCapa(nivell, zoom)` con una lógica que **limita** la resolución de `provincies` y `vegueries` a un máximo de 250 000 (nunca necesitan detalle de 5 000). Pero el backend usa `resolucioPerZoom(zoom)` que aplica la misma tabla para todos los niveles sin ese límite. El frontend envía el `zoom` crudo (`/api/geojson/provincies?zoom=15`) y el servidor devuelve el fichero de resolución 5 000 aunque el cliente esperaba 250 000.

**Por qué cuesta:** A `zoom >= 15`:

| Capa       | Resolución esperada por el cliente | Resolución devuelta por el servidor | Tamaño real vs esperado |
| ---------- | ---------------------------------- | ----------------------------------- | ----------------------- |
| provincies | 250 000 → 1,1 MB                   | 5 000 → **7,9 MB**                  | +6,8 MB                 |
| vegueries  | 250 000 → 1,2 MB                   | 5 000 → **8,6 MB**                  | +7,4 MB                 |

Transferencia extra acumulada al llegar al zoom máximo: **+14,2 MB** innecesarios. Además, la clave de caché del frontend es `provincies-250000` — correcto — pero el contenido almacenado es el fichero de resolución 5 000, lo que supone que el cliente trabaja con geometrías mucho más complejas de lo necesario para esas capas.

El mismo desajuste se da a `zoom >= 13`: el servidor devuelve resolución 100 000 para `provincies` (1,5 MB) cuando el cliente esperaba 250 000 (1,1 MB).

**Dónde:** `backend/src/routes/geojson.ts:11-17` y `frontend/src/components/mapa/MapaLeaflet.vue:439-456`.

**Fix:** La solución más robusta es que el cliente envíe la resolución explícita en la URL en lugar del zoom, eliminando la doble lógica:

```typescript
// MapaLeaflet.vue — carregaCapa()
const resolucio = resolucioPerCapa(nivell, zoom)
const res = await fetch(`/api/geojson/${nivell}?resolucio=${resolucio}`)
// La clau de caché ya usa resolucio, sin cambios.
```

```typescript
// geojson.ts — cambiar el parámetro leído
const resolucioRaw = req.query.resolucio
const resolucio = parseInt(String(resolucioRaw)) || 1000000
// Ya no se necesita resolucioPerZoom()
```

---

### H3 — Sin caché en memoria para GeoJSON en el backend `backend/src/routes/geojson.ts:59-68` · ALTO

**Qué pasa:** Cada petición a `/api/geojson/:nivell` abre y lee el fichero completo desde disco (`fs.createReadStream().pipe(res)`), sin ningún almacenamiento en memoria entre peticiones.

**Por qué cuesta:** Los ficheros GeoJSON más usados (los de resolución 1 000 000, cargados en cada visita) son ficheros de 0,7–3 MB. Node.js tiene que llamar a `open()` + `read()` en cada petición, lo que añade latencia innecesaria. En producción con múltiples usuarios esto escala mal. El header `Cache-Control: public, max-age=86400` ayuda al cliente (y a un proxy intermedio), pero no evita el I/O en el servidor.

**Dónde:** `backend/src/routes/geojson.ts:59-68`.

**Fix — caché en memoria con Map:**

```typescript
// geojson.ts
const fileCache = new Map<string, Buffer>()

// En el handler, antes de createReadStream:
const cached = fileCache.get(fitxerPath)
if (cached) {
  res.setHeader('Content-Type', 'application/geo+json')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.end(cached)
  return
}

// Si no está en caché, leer y guardar:
const buffer = fs.readFileSync(fitxerPath)
fileCache.set(fitxerPath, buffer)
res.setHeader('Content-Type', 'application/geo+json')
res.setHeader('Cache-Control', 'public, max-age=86400')
res.end(buffer)
```

Los 6 ficheros de resolución 1 000 000 ocupan en total ~6 MB en memoria — despreciable. Con el fix H1 (compression), el middleware comprimirá el buffer antes de enviarlo.

Alternativa más simple: cachear solo el buffer gzip en memoria y servirlo con `Content-Encoding: gzip` manualmente, combinando H1 y H3.

---

### H4 — Sin `Cache-Control` en `/api/territoris/arbre` `backend/src/routes/territoris.ts:15-78` · MEDIO

**Qué pasa:** El endpoint `/arbre` ejecuta 4 queries a PostgreSQL y construye el árbol jerárquico completo en cada petición. La respuesta (JSON con 4 provincias, 43 comarcas, 9 veguerías, 947 municipios) pesa aproximadamente **150–180 KB** sin comprimir. No se incluye ningún header `Cache-Control` en la respuesta.

**Por qué cuesta:** Los datos territoriales son completamente estáticos (no cambian entre visitas). Sin caché, cada recarga de página, cada `carregaArbre()` (llamada en `CercaView.vue:8`) lanza las 4 queries a la BD. Express con `res.json()` añade ETag automáticamente, lo que permite al cliente evitar re-descargar el cuerpo en recargas posteriores, pero el servidor siempre ejecuta la query.

**Dónde:** `backend/src/routes/territoris.ts:74` — `res.json(...)` sin `Cache-Control`.

**Fix:**

```typescript
// territoris.ts — antes de res.json()
res.setHeader('Cache-Control', 'public, max-age=3600') // 1h
res.json({ provincies: arbre, vegueries })
```

Para evitar las queries a BD, complementar con caché en memoria del resultado:

```typescript
let arbreCache: object | null = null

router.get('/arbre', async (_req, res) => {
  if (arbreCache) {
    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.json(arbreCache)
  }
  // ... queries ...
  arbreCache = { provincies: arbre, vegueries }
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.json(arbreCache)
})
```

---

### H5 — `actualitzaEstilsTotes()` recorre todos los features en cada cambio de selección `MapaLeaflet.vue:537-546` · MEDIO

**Qué pasa:** Cada vez que `municipisSeleccionats.size` cambia (watch en línea 631) o cambia `nivellActiu` (watch en línea 637), se llama `actualitzaEstilsTotes()`, que itera sobre las 4 capas activas y llama `setStyle(estilPerFeature(...))` en cada uno de los ~1003 features (947 municipios + 43 comarcas + 9 veguerías + 4 provincias).

**Por qué cuesta:** En las operaciones bulk (seleccionar una provincia entera — 300+ municipios — desde el mapa), el watch se dispara exactamente una vez porque `seleccionaProvincia()` asigna un nuevo Set en una sola operación (`territoris.ts:114-120`). Eso está bien. Pero `actualitzaEstilsTotes()` siempre evalúa los 1003 features independientemente de cuántos hayan cambiado. A zoom=8 con Canvas renderer el impacto es tolerable (Canvas coalesca las llamadas a `setStyle` en un `requestAnimationFrame`), pero cada `estilPerFeature()` invoca `temaDeInfo()`, `estatSeleccioFeature()` y `nivellNumero()` — tres lookups que suman algo de CPU sincrónico.

**Dónde:** `MapaLeaflet.vue:537-546` (`actualitzaEstilsTotes`) y los dos watchers en líneas 631 y 637.

**Fix — optimización granular:** Solo redibujar los municipios que han cambiado. Hacer que el watch reciba el valor anterior y nuevo del Set, calcular el diff, y llamar `setStyle` solo en las features afectadas:

```typescript
// Guardar referencia al GeoJSON layer de municipis indexado por codi
const municipisIndex = new Map<string, L.Path & { feature?: GeoJSON.Feature }>()

// Al crear la capa de municipis, en onEachFeature:
const info = codiDeFeature(feature, 'municipis')
if (info) municipisIndex.set(info.codi, layer as L.Path & { feature?: GeoJSON.Feature })

// Watch con diff:
watch(
  () => territoris.municipisSeleccionats,
  (now, before) => {
    const changed = new Set([...now, ...before].filter((c) => now.has(c) !== before.has(c)))
    changed.forEach((codi) => {
      const layer = municipisIndex.get(codi)
      if (layer?.feature) layer.setStyle(estilPerFeature(layer.feature, 'municipis'))
    })
    // Solo las capas superiores si el nivel activo no es municipis
    if (mapaStore.nivellActiu !== 'municipis') {
      capesActives[mapaStore.nivellActiu]?.eachLayer((l) => {
        const gl = l as L.Path & { feature?: GeoJSON.Feature }
        if (gl.feature) gl.setStyle(estilPerFeature(gl.feature, mapaStore.nivellActiu))
      })
    }
  },
  { deep: false }
)
```

Para el cambio de `nivellActiu`, el recorrido completo es correcto (hay que redibujar todas las capas al cambiar el modo visual activo).

---

### H6 — `CercaRapida`: sin debounce + `normalitza(q)` redundante `CercaRapida.vue:12-77` · MEDIO

**Qué pasa:**

1. **Sin debounce:** El computed `resultats` se recalcula en cada keystroke (el `v-model` actualiza `query.value` de forma síncrona). Cada tecla desencadena el recorrido completo del árbol (~1003 items).

2. **`normalitza(q)` recalculada por item:** La función `coincideix(nom, q)` llama `normalitza(q)` en cada invocación (`CercaRapida.vue:17`). Para una búsqueda de "maresm" con 1003 items, `normalitza(q)` se invoca 1003 veces, aunque el resultado es siempre "maresm" — la misma cadena calculada 1003 veces.

3. **Búsqueda de comarca en O(n×m):** Para cada municipio que coincide, se busca el nombre de su comarca con un bucle anidado `for prov of arbre` + `.find()` (`CercaRapida.vue:65-70`), siendo M = número de comarcas por provincia. Esto es redundante porque el store ya expone `municipiPerCodi` (con `comarca_codi`), pero falta un mapa `codiComarca → nomComarca`.

**Dónde:** `CercaRapida.vue:12-77`.

**Fix:**

```typescript
// CercaRapida.vue <script setup>
import { ref, computed, watchEffect } from 'vue'

// Debounce del query
const queryBruta = ref('')
const query = ref('')
let debounceTimer: ReturnType<typeof setTimeout>
watchEffect(() => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    query.value = queryBruta.value
  }, 150)
})

// Mapa comarca codi → nom (calculat una sola vez)
const nomComarcaPerCodi = computed<Map<string, string>>(() => {
  const m = new Map<string, string>()
  territoris.arbre?.forEach((p) => p.comarques.forEach((c) => m.set(c.codi, c.nom)))
  return m
})

// En resultats, calcular normalitza(q) una sola vez:
const resultats = computed<Resultat[]>(() => {
  const q = query.value.trim()
  if (q.length < 2 || !territoris.arbre) return []
  const qN = normalitza(q) // ← una sola vez
  const res: Resultat[] = []
  // ...
  // En cada coincideix(): return normalitza(nom).includes(qN)  (sin llamar normalitza(q))
  // Para municipis: nomComarca = nomComarcaPerCodi.value.get(mu.comarca_codi) ?? ''
})
```

Con estos cambios, el trabajo por keystroke pasa de O(1003×k) a O(1003) solo después de 150ms de inactividad.

---

### H7 — `TabOn`: `comptadorProvincia()` invocada 3 veces por render `TabOn.vue:78-86, 118-120` · MEDIO

**Qué pasa:** En el template, para cada provincia, `comptadorProvincia(provincia)` se llama 3 veces en el mismo render:

- Línea 118: `v-if="comptadorProvincia(provincia).sel > 0"`
- Línea 119: `{{ comptadorProvincia(provincia).sel }}`
- Línea 120: `{{ comptadorProvincia(provincia).total }}`

Cada llamada recorre `.reduce()` sobre todas las comarcas y sus municipios para contar seleccionados. Lo mismo ocurre con `comptadorComarca(comarca)` en líneas 151-152. Además, estas funciones no están memoizadas — se recomputan en cada re-render del componente, que ocurre cada vez que `municipisSeleccionats` cambia.

**Dónde:** `TabOn.vue:72-86`, template líneas 118-120, 151-152.

**Fix — guardar en variable de template con `v-memo` o desestructurar antes:**

```html
<!-- TabOn.vue template — para provincia -->
<template v-for="provincia in provinciesOrdenades" :key="provincia.codi">
  <div
    v-bind="{ ...(()=> { const c = comptadorProvincia(provincia); return {
    'data-sel': c.sel, 'data-total': c.total } })() }"
  ></div>
</template>
```

Mejor solución: convertir `comptadorProvincia` y `comptadorComarca` en computeds derivados de una estructura pre-indexada:

```typescript
// En <script setup>
const comptadorsProvincies = computed(() => {
  const m = new Map<string, { sel: number; total: number }>()
  for (const p of territoris.arbre ?? []) {
    let sel = 0,
      total = 0
    for (const c of p.comarques) {
      for (const mu of c.municipis) {
        total++
        if (territoris.municipisSeleccionats.has(mu.codi)) sel++
      }
    }
    m.set(p.codi, { sel, total })
  }
  return m
})
```

Esto centraliza el recorrido, se recalcula una sola vez cuando cambia `municipisSeleccionats`, y el template accede en O(1) con `.get(provincia.codi)`.

---

### H8 — Vite: sin `build` config, sin `manualChunks`, `vueDevTools` sin guard `vite.config.ts:1-22` · BAJO

**Qué pasa:**

1. **`vueDevTools` cargado incondicionalmente:** `vite.config.ts:9` incluye `vueDevTools()` sin comprobar `process.env.NODE_ENV !== 'production'`. El plugin se documenta como no-op en producción internamente, pero añade código al bundle y procesamiento en el build.

2. **Sin `manualChunks`:** Vite por defecto agrupa todo lo que no sea un entry point. Leaflet (~145 KB minificado) y Vue/Router/Pinia (~80 KB) acaban en el mismo chunk o en chunks automáticos que no optimizan la carga inicial. Sin configuración explícita no hay garantía de que Leaflet quede en un chunk separado que pueda precargarse o cachearse independientemente.

3. **Sin sección `build`:** No hay configuración de `target`, `sourcemap`, ni `chunkSizeWarningLimit`, lo que puede llevar a chunks de aviso en CI.

**Dónde:** `frontend/vite.config.ts:9`.

**Fix:**

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    mode !== 'production' && vueDevTools(), // solo en dev
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ['leaflet'],
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
  // ...server config igual
}))
```

---

### H9 — BD: índices btree ausentes en FKs de `municipis` `infra/db/init/02-territorial-schema.sql:35-50` · BAJO

**Qué pasa:** El schema define 4 índices GIST sobre geometrías (líneas 47-50), pero no hay índices btree en las columnas de FK: `municipis.comarca_codi`, `municipis.vegueria_codi`, `municipis.provincia_codi`.

**Por qué cuesta:** La query de `/arbre` hace `SELECT ... FROM municipis ORDER BY nom` (full scan — aceptable para 947 filas). Pero si en el futuro se añaden queries filtradas como `WHERE provincia_codi = $1` o `JOIN` con las tablas de comarques/vegueries, la ausencia de índices btree forzará seq scans. Con 947 municipios el impacto es bajo hoy, pero si se añaden tablas de eventos/lugares con FK a municipis, los joins se degradarán.

**Dónde:** `infra/db/init/02-territorial-schema.sql:35-50`.

**Fix:**

```sql
CREATE INDEX IF NOT EXISTS municipis_comarca_codi_idx  ON municipis (comarca_codi);
CREATE INDEX IF NOT EXISTS municipis_vegueria_codi_idx ON municipis (vegueria_codi);
CREATE INDEX IF NOT EXISTS municipis_provincia_codi_idx ON municipis (provincia_codi);
```

---

### H10 — `CercaRapida`: búsqueda de comarca en O(n×m) `CercaRapida.vue:65-70` · BAJO

**Qué pasa:** Para cada municipio que coincide en la búsqueda, se busca el nombre de su comarca con un bucle anidado: `for (const prov of territoris.arbre!)` + `.find(c => c.codi === mu.comarca_codi)`. Esto es O(P × C/P) ≈ O(C) = O(43) por municipio encontrado.

**Por qué cuesta:** Con el límite de 8 municipios mostrados y solo 43 comarcas, el coste absoluto es trivial (≤344 comparaciones). Sin embargo, el patrón es incorrecto conceptualmente: el store ya expone `municipiPerCodi` que contiene `comarca_codi`, y bastaría con un mapa auxiliar `comarca_codi → nom` (ver fix en H6) para resolver en O(1).

**Dónde:** `CercaRapida.vue:65-70`.

**Fix:** Ver H6 — el computed `nomComarcaPerCodi` resuelve ambos problemas.

---

## Top 5 Quick Wins

Ordenados por relación impacto/esfuerzo. Los tres primeros se pueden implementar en menos de 30 minutos y juntos reducen la carga inicial un ~80%.

### QW1 — Añadir compresión gzip al backend (15 min)

```bash
cd backend && npm install compression @types/compression
```

```typescript
// backend/src/index.ts — línea 9
import compression from 'compression'
app.use(compression())
```

**Resultado:** Carga inicial de GeoJSON: 6,2 MB → ~1,5 MB. El fix más impactante del proyecto.

---

### QW2 — Pasar resolución explícita en URL del GeoJSON (20 min)

Cambiar el frontend para enviar `?resolucio=250000` en lugar de `?zoom=15`, y el backend para leer ese parámetro directamente. Elimina la doble lógica de cálculo de resolución y el bug que enviaba ficheros 7× más grandes de lo necesario a zoom máximo.

---

### QW3 — Caché en memoria de ficheros GeoJSON (20 min)

```typescript
// backend/src/routes/geojson.ts
const fileCache = new Map<string, Buffer>()
// Leer con fs.readFileSync(), guardar en fileCache, servir desde fileCache
```

Elimina el I/O de disco en todas las peticiones repetidas. Los 6 ficheros de 1 000 000 de resolución (los más solicitados) pesan ~6 MB en total en RAM.

---

### QW4 — Cache-Control en `/arbre` + caché en memoria (15 min)

```typescript
// territoris.ts — añadir variable de módulo
let arbreCache: object | null = null
// En el handler, retornar arbreCache si está populado
res.setHeader('Cache-Control', 'public, max-age=3600')
```

Evita 4 queries a PostgreSQL en cada carga de página. Los datos no cambian nunca en desarrollo.

---

### QW5 — Debounce + `normalitza(q)` precompilada en CercaRapida (20 min)

```typescript
// Añadir debounce de 150ms sobre query
// Calcular qN = normalitza(q) una sola vez fuera del bucle
// Usar nomComarcaPerCodi Map en lugar del bucle anidado
```

Elimina la evaluación de 1003 funciones de normalización en cada keystroke. La búsqueda pasa a ser perceptiblemente más fluida en dispositivos lentos.

---

## Análisis adicional — lo que ya está bien

Para completar el cuadro, estos aspectos del proyecto tienen un diseño de rendimiento correcto:

- **Canvas renderer por nivel (`MapaLeaflet.vue:222-227`):** Decisión excelente. Un `<canvas>` por pane en lugar de ~1003 elementos `<path>` SVG. Las llamadas a `setStyle()` se coalescen en un único `requestAnimationFrame`. Esto es lo que hace viable seleccionar provincias enteras sin jank visible.

- **Operaciones bulk sobre Set plano (`territoris.ts:96-128`):** `seleccionaProvincia/Comarca/Vegueria` crean un nuevo Set, lo modifican, y lo asignan en una sola operación. Vue reactivo dispara exactamente 1 update en lugar de N updates por municipio. Correcto.

- **Caché de capes Leaflet (`MapaLeaflet.vue:30-31, 66-68`):** `cacheLayers` evita re-fetching al cambiar de zoom cuando la resolución ya estaba cargada. Solo hay un bug (H2) en la clave vs. el contenido real.

- **4 queries en paralelo con `Promise.all` (`territoris.ts:18-34`):** Las 4 tablas se consultan simultáneamente. Correcto.

- **`resolucioPerCapa` con tope para provincies/vegueries (`MapaLeaflet.vue:440-441`):** La intención es correcta. El problema está en que el servidor no respeta ese tope (H2).

- **Lazy-loading de rutas (`router/index.ts`):** Todas las vistas usan `() => import(...)`. La ruta `/jocs` (GeoMaster, no implementado aún) no añade peso a la carga inicial.

- **Índices GIST en geometrías (`02-territorial-schema.sql:47-50`):** Presentes en todas las tablas con geometría. Imprescindibles para consultas espaciales futuras (`ST_Intersects`, `ST_Within`).
