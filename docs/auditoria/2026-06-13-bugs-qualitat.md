---
fecha: 2026-06-13
autor: revisión de código (auditoría de bugs y robustez)
ámbito: frontend Vue 3 (GeoFreak + stores/data de soporte + MapaLeaflet)
rama: feature/auditoria-bloque-1-2
---

# Auditoría de bugs y calidad — GeoFreak y soporte

## Resumen ejecutivo

Estado de las herramientas (ejecutadas, sin modificar nada):

- `type-check` (vue-tsc): **OK**, sin errores.
- `test:unit` (Vitest): **98/98 tests pasan**, 9 ficheros.
- `lint` (oxlint + eslint): **0 warnings, 0 errores**.

El código está limpio en cuanto a tipos, estilo y tests existentes. Los problemas
encontrados son lógicos / de casos límite y de robustez, no de compilación.

Conteo por severidad:

| Severidad             | Cantidad |
| --------------------- | -------- |
| 🔴 Bug que rompe      | 1        |
| 🟠 Bug en caso límite | 6        |
| 🟡 Fragilidad         | 7        |
| 🔵 Mejora menor       | 5        |

Los hallazgos más graves (todos accionables):

1. 🔴 **Fuga de capas Leaflet entre montajes** por caché y renderers a nivel de
   módulo en `MapaLeaflet.vue` (mapa zombie tras HMR / re-montaje).
2. 🟠 **Recuento de puntos del ganador con `tempsMs` sin cerrar el último turno**
   en multijugador (el reloj del jugador que da el clic final no se computa bien
   para el cálculo de puntos en algunos caminos).
3. 🟠 `tornaAJugar` deja un estado incoherente (salta `preparacio`, no reinicia el
   reloj multijugador correctamente) — mitigado solo porque la vista no lo usa.

---

## 🔴 Bugs que rompen

### 🔴-1 · Caché de capas y renderers Leaflet a nivel de módulo → fuga entre montajes / mapa zombie

**Ubicación:** `frontend/src/components/mapa/MapaLeaflet.vue:78-86, 282-287`

```ts
const capesActives: Record<NivellTerritorial, L.GeoJSON | null> = { ... }   // módulo
const cacheLayers: Record<string, L.GeoJSON> = {}                            // módulo
const canvasRenderers: Record<NivellTerritorial, L.Canvas> = { ... }         // módulo
```

`cacheLayers`, `capesActives` y `canvasRenderers` están declarados **a nivel de
módulo**, no dentro de `setup()`. Esto significa que se **comparten entre todas las
instancias del componente** y **sobreviven al desmontaje**.

**Por qué es un bug real:**

- En `onUnmounted` se hace `mapa.remove()` pero **nunca se limpia `cacheLayers` ni
  `capesActives`**. Las `L.GeoJSON` cacheadas siguen referenciando el mapa
  destruido y sus capas Leaflet internas.
- Al re-montar el componente (navegar fuera de `/jocs` y volver, o cualquier HMR
  en desarrollo), `carregaCapa` encuentra `cacheLayers[clau]` ya poblado y
  **reutiliza una `L.GeoJSON` que fue creada con el `pane`/`canvas` de un mapa
  anterior ya destruido**. Sus features llaman a `setStyle` sobre un renderer
  Canvas que apuntaba a un pane que ya no existe → estilos que no se aplican,
  paths "fantasma", o el clásico "mapa zombie" que la propia CLAUDE.md menciona
  como problema conocido tras HMR.
- `canvasRenderers` se instancia **una sola vez al evaluar el módulo**, con
  `{ pane: PANE_NOMS.x }`. Tras el primer desmontaje, esos renderers quedan
  asociados a panes muertos; el segundo mapa crea panes nuevos con el mismo nombre
  pero los renderers del módulo siguen siendo los viejos.

**Reproducción:** navegar a `/jocs/geofreak`, volver a `/cerca` y entrar de nuevo
en el juego; o simplemente guardar el fichero en dev (HMR). Las capas no se
repintan / el hit-testing falla.

**Arreglo propuesto:** mover `capesActives`, `cacheLayers` y `canvasRenderers`
dentro de `setup()` (o crearlos en `onMounted` y vaciarlos en `onUnmounted`).
`canvasRenderers` debe recrearse por instancia porque depende de los panes de ese
mapa concreto. En `onUnmounted` añadir:

```ts
Object.keys(cacheLayers).forEach((k) => delete cacheLayers[k])
;(Object.keys(capesActives) as NivellTerritorial[]).forEach((n) => (capesActives[n] = null))
```

(o, mejor, que sean locales de la instancia y se recolecten solos).

---

## 🟠 Bugs en caso límite

### 🟠-1 · Multijugador: el último clic ganador computa el reloj, pero la puntuación usa `tempsMs` que puede no incluir el segmento si el flujo cambia

**Ubicación:** `frontend/src/stores/geofreak.ts:225-238, 128-149`

`tancaTorn()` suma `ara - marcaTornMs` a `tempsMs` **antes** de comprobar
`partidaCompletada`, así que el último encierto sí entra en `tempsMs`. Esto está
**bien para el camino encert**. El riesgo está en `resultats` (líneas 128-149):
usa `j.tempsMs / 1000` directamente. Como `resultats` solo se evalúa en
`fase==='resultats'` y `tancaTorn` ya cerró el segmento, el cómputo es correcto en
el camino normal. **Pero** si una partida multijugador acaba por `passaRonda` o
`salt` del último objetivo, el flujo también pasa por `tancaTorn` y funciona; el
caso problemático es teórico (si se añadiera un final que no pase por `tancaTorn`).
Severidad rebajada a fragilidad latente: **documentar la invariante "toda
transición a `resultats` pasa por `tancaTorn`"** o calcular el segmento en curso en
`resultats` igual que hace `tempsJugadorMs`.

### 🟠-2 · `tornaAJugar` produce un estado incoherente (salta `preparacio` y no resetea reloj multijugador)

**Ubicación:** `frontend/src/stores/geofreak.ts:296-300`

```ts
function tornaAJugar(codis: string[]) {
  fase.value = 'configuracio'
  comencaPartida(codis.length > 0 ? codis : codisPartida)
}
```

`comencaPartida` → `preparaPartida` + `arrencaPartida`: arranca **sin** cuenta
atrás (la vista nunca enseña `preparacio`) y pone `fase` a `'partida'`
inmediatamente. La línea `fase.value = 'configuracio'` es un flicker inútil (se
sobrescribe en el mismo tick). En multijugador `preparaPartida` sí reinicia
`estatJugadors`, así que el reloj se resetea; pero el método **no pasa por el watch
de `preparacio`** de la vista, de modo que no hay cuenta atrás ni anuncio "Torn
de…". **Es un bug latente**: solo no se manifiesta porque la vista usa `rejuga()`
(`preparaPartida`) en lugar de `tornaAJugar`. El método del store queda como trampa
para el próximo que lo llame. **Arreglo:** alinear `tornaAJugar` con `rejuga`
(llamar a `preparaPartida`, no a `comencaPartida`) o eliminarlo si solo lo usan los
tests.

### 🟠-3 · `flaixJoc` puede dibujar el halo sobre un mapa que se está desmontando

**Ubicación:** `frontend/src/components/mapa/MapaLeaflet.vue:558-619`

Si `flaixJoc('encert')` está a mitad de animación cuando el componente se desmonta,
`onUnmounted` cancela los rAF de `animacionsFlaix` (línea 1040) **pero el `halo`
(`L.GeoJSON`) creado en la línea 560 solo se elimina dentro del `pas` final**
(líneas 612-615). Si el rAF se cancela antes de llegar a `t>=1`, el halo nunca se
hace `removeLayer`. Como `mapa.remove()` se llama justo después, el halo se va con
el mapa, así que no hay fuga real de DOM **pero sí queda la referencia `halo` viva
en el closure cancelado**. Bajo impacto; conviene un cleanup explícito de halos
pendientes en `onUnmounted`.

### 🟠-4 · `colorsConquestes` mapea por código, pero un código encertado por dos jugadores (imposible hoy) lo pintaría con el último

**Ubicación:** `frontend/src/stores/geofreak.ts:94-103`

No es alcanzable con la lógica actual (una demarcación encertada sale del juego),
pero el `forEach` anidado asigna `m[codi] = j.color` sin comprobar colisión. Es
seguro hoy; queda anotado como invariante a respetar.

### 🟠-5 · `quantitatNivell`/`opcionsContenidor` devuelven 0/[] silenciosamente si el árbol aún no cargó

**Ubicación:** `frontend/src/views/GeoFreakView.vue:91-104, 73-86`

Si `territoris.carregaArbre()` falla (API caída) o aún no terminó, el wizard se
muestra con contadores vacíos y `opcionsContenidor` vacío. El botón 🎲
(`triaContenidorAleatori`, línea 156-160) hace `Math.floor(Math.random()*0)` = 0 e
indexa `opcions[0]` → `undefined`, y el `if (tria)` lo protege (no rompe), pero
**no hay feedback de error**: el usuario ve un wizard funcional que no puede
completar un nivel "a triar". No existe estado de error/carga del árbol en la vista
del juego (sí lo hay en el store: `territoris.error`). **Arreglo:** mostrar
spinner/retry mientras `territoris.carregant`/`error`.

### 🟠-6 · `confirmaISomhi` puede preparar la partida con `codisJoc` vacío si el árbol no cargó

**Ubicación:** `frontend/src/views/GeoFreakView.vue:504-514` + `stores/geofreak.ts:179`

`preparaPartida` ya protege (`if (...||codis.length===0) return`), así que no
rompe, pero el botón "Som-hi" puede estar habilitado (`configCompleta` no depende
del árbol cargado para nivel 0/contenidor ya elegido) y al pulsarlo **no pasa
nada** silenciosamente. Conviene deshabilitar "Som-hi" mientras `codisJoc` esté
vacío o el árbol no haya cargado.

---

## 🟡 Fragilidades

### 🟡-1 · `localStorage` del idioma sin try/catch (modo privado / cuota llena)

**Ubicación:** fuera del scope estricto pero relevante (i18n). El enunciado pide
revisar `localStorage` lleno/bloqueado. En el ámbito GeoFreak **no se usa
localStorage** (el juego no persiste), lo cual es correcto. Pero conviene verificar
que el acceso a `localStorage` del idioma (`viscalaterra-idioma`, en `i18n/`) está
envuelto en try/catch; en Safari modo privado un `setItem` lanza `QuotaExceededError`.
(No verificado aquí por estar fuera de los ficheros leídos; recomendado revisar.)

### 🟡-2 · `hexARgb` asume hex de 6 dígitos con `#`; entrada inesperada da NaN

**Ubicación:** `frontend/src/components/mapa/MapaLeaflet.vue:495-498`

`parseInt(hex.slice(1),16)` con un color de 3 dígitos (`#abc`) o sin `#` produce un
valor erróneo y `lerpColor` genera `rgb(NaN, NaN, NaN)`. Los colores de jugador
(`COLORS_JUGADOR`) y de tema son todos de 6 dígitos, así que hoy es seguro, pero es
frágil ante cualquier color nuevo en formato corto. **Arreglo:** normalizar o
validar el formato.

### 🟡-3 · Regex de `normalitza` con bytes de marcas combinantes literales

**Ubicación:** `frontend/src/data/text.ts:5`

```ts
.replace(/[<combinantes U+0300-U+036F literales>]/g, '')
```

El rango es correcto en runtime, pero está escrito con **caracteres combinantes
literales** en lugar de `/[̀-ͯ]/`. Cualquier editor/format que toque el
fichero puede corromper esos bytes silenciosamente (y romper la normalización de
acentos en buscador y en GeoFreak «Com es diu...?»). **Arreglo:** usar la forma con
escapes Unicode `̀-ͯ`.

### 🟡-4 · El ticker del cronómetro (500 ms) sigue corriendo en fases sin partida

**Ubicación:** `frontend/src/views/GeoFreakView.vue:39-44`

`setInterval` de 500 ms se crea en `onMounted` y solo se limpia en `onUnmounted`.
Corre también en `configuracio` y `resultats`, donde `araMs` no se usa para nada
útil (en `resultats` `cronoText` usa `tempsFiMs`). Coste despreciable, pero es
trabajo reactivo continuo innecesario. Opcional: pausar fuera de `partida`.

### 🟡-5 · `entraModeJoc` calcula `boundsContenidor` desde capas que pueden no estar cargadas todavía

**Ubicación:** `frontend/src/components/mapa/MapaLeaflet.vue:713-763, 1036`

`boundsContenidor` recorre `capesActives[contenidor.nivell]`. En `onMounted`,
`entraModeJoc(props.modeJoc)` (línea 1036) se llama **inmediatamente después** de
`carregaTotesCapes(...)` que es `async` y no se espera (no hay `await`). Si las
capas aún no han llegado, `boundsContenidor` devuelve `null` y se cae al fallback
de Catalunya entera → el encuadre inicial al contenedor (p. ej. comarca) **falla en
el primer render** y solo se corrige si hay un `resize` o un cambio de `modeJoc`. En
la práctica el juego siempre nace en `configuracio` con contenedor null, así que el
primer encuadre real ocurre vía watch tras elegir contenedor (cuando las capas ya
están), mitigándolo. Conviene re-enquadrar cuando termine `carregaTotesCapes` si
hay `boundsJoc` pendiente.

### 🟡-6 · `tempsJugadorMs` y `cronoText` dependen de `araMs` (tick 500 ms): el reloj salta de medio en medio segundo

**Ubicación:** `frontend/src/views/GeoFreakView.vue:316-325`

No es bug; el reloj puede mostrar el mismo segundo 0–500 ms o saltar irregular si
el tick y el segundo real desfasan. Cosmético.

### 🟡-7 · `creaPartida` con lista vacía deja `objectiu=null` → `partidaCompletada` true al instante

**Ubicación:** `frontend/src/data/geofreak.ts:108-118, 182-184`

`creaPartida([])` produce `{pendents:[], objectiu:null}` y `partidaCompletada`
sería true. El store lo evita (`preparaPartida` rechaza `codis.length===0`), pero la
función pura no se autoprotege. Dado que es lógica pura testeada, es aceptable;
anotado como invariante del llamante.

---

## 🔵 Mejoras menores

### 🔵-1 · `ESTIL_NIVELL[3]` y `[4]` tienen la misma `opacity` (0.4)

`frontend/src/components/mapa/MapaLeaflet.vue:98-103`. La CLAUDE.md describe
opacidades decrecientes 100/75/50/25 %; el código usa 1.0/0.6/0.4/0.4. Los niveles
3 y 4 son indistinguibles en opacidad (solo difieren en weight). Discrepancia menor
entre doc y código.

### 🔵-2 · `barreja` y `triaDistractors` usan el mismo `Math.random` por defecto: bien para tests, pero el RNG no es inyectable desde la vista

`GeoFreakView.vue:470` llama `barreja([...])` sin RNG; correcto. Sin acción.

### 🔵-3 · `colorsJugadors` se inicializa con `COLORS_JUGADOR.slice(0,4)` pero hay 6 colores en la paleta

`GeoFreakView.vue:135-136`. Con 4 jugadores máx está bien; los 2 colores extra solo
sirven como opciones de la paleta. Sin impacto.

### 🔵-4 · `formataTemps` no contempla horas (>59:59)

`GeoFreakView.vue:437-439`. Una partida de >1 h mostraría "75:30". Irrelevante en
la práctica (partidas cortas).

### 🔵-5 · Mensajes de error de red solo a `console.error`

`MapaLeaflet.vue:817, 944` y `territoris.ts:22-24`. El mapa sí tiene UI de error +
retry; la máscara de Catalunya falla en silencio (solo console). Aceptable (la
máscara es decorativa).

---

## Cobertura de tests — evaluación

**Bien cubierto:**

- `data/geofreak.ts`: excelente. Cubre encert/error/salt, re-clic ignorado,
  inmutabilidad, tercer error, passaRonda, distractors, barreja, calculaPunts
  (errores, tiempo, multiplicador, pista). RNG inyectable y determinista.
- `stores/geofreak.ts`: cubre configuración, rondas, racha, pista, multijugador
  (turnos, colores, clasificación), passa multijugador, tornaAConfiguracio/reinicia.
- `data/temporal.ts`, `data/articles.ts`, `data/text.ts`, `stores/filtres.ts`,
  `stores/territoris.ts`: con tests.

**Lógica crítica SIN test (recomendado añadir):**

1. **`MapaLeaflet.vue` no tiene tests** (es el componente más complejo y donde está
   el 🔴-1). Difícil por Leaflet/canvas, pero al menos `resolucioPerCapa`,
   `nivellNumero`, `hexARgb`/`lerpColor` y `filesHover` son funciones puras
   extraíbles y testeables. Recomendado extraer y testear `lerpColor`/`hexARgb`
   (riesgo de NaN, 🟡-2) y la matriz `NIVELLS_ORDRE`/`nivellNumero`.
2. **`tempsJugadorMs` y el cálculo de reloj multijugador** (store): no hay test que
   verifique que el tiempo acumulado por turnos es correcto (con mock de
   `Date.now`). El 🟠-1 quedaría blindado con un test así.
3. **`tornaAJugar`** sí tiene un test (línea 179), pero el test **valida el
   comportamiento incoherente** (espera `fase==='partida'` sin cuenta atrás). El
   test pasa pero el método no coincide con el flujo real de la vista (`rejuga`). El
   test enmascara el 🟠-2.
4. **Caso "árbol no cargado / API caída"** en la vista del juego (🟠-5, 🟠-6): sin
   test ni manejo de UI.
5. **`creaPartida([])`** (🟡-7): sin test del caso vacío.

---

## Conclusión

El núcleo lógico (módulos puros `data/`) y los stores están sólidos y bien
testeados; type-check, lint y tests pasan limpios. El riesgo real concentrado está
en **`MapaLeaflet.vue`**: el caché y los renderers a nivel de módulo (🔴-1) son una
fuga/zombie entre montajes que conviene arreglar antes de producción, y varias
asincronías de carga de capas (🟠-3, 🟡-5) son frágiles. En el store, `tornaAJugar`
(🟠-2) es una trampa latente que el test actual enmascara. Las mejoras de manejo de
error de red en la vista del juego (🟠-5/🟠-6) mejorarían la robustez en móvil.
</content>
</invoke>
