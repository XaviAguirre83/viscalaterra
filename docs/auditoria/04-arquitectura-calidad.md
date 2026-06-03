# Auditoría 04 — Arquitectura y calidad de código

**Proyecto:** viscalaterra.cat
**Alcance:** monorepo npm workspaces (frontend Vue 3 + Vite + TS, backend Express + TS, PostGIS), configuración, tests y CI.
**Fecha:** 2026-06-03
**Método:** lectura del código fuente real, solo lectura. Cada hallazgo cita `archivo:línea`.

---

## 1. Resumen ejecutivo

El proyecto está **notablemente bien estructurado para su madurez**. La separación monorepo es limpia, el tipado TypeScript es disciplinado (cero `any`, cero `@ts-ignore`, cero `TODO/FIXME` en `src`), el modelo de datos territorial (comarcas y veguerías transfronterizas) está resuelto con corrección tanto en BD como en stores, y el código está densamente comentado con el _porqué_ de las decisiones no obvias (panes de Leaflet, Set no reactivo para selección bulk, mezcla RGB de colores). Es un código que un programador con perfil embedded ha escrito con cuidado.

La deuda principal **no está en el código que existe, sino en lo que falta de andamiaje de calidad**: prácticamente no hay tests (el único test que hay, además, fallaría), el CI no protege nada real del frontend en tiempo de ejecución, hay tipos duplicados entre frontend y backend que deberían compartirse, el backend carece de capa de servicios y manejo de errores centralizado, y `MapaLeaflet.vue` (851 líneas) concentra demasiada lógica de negocio que pertenecería a composables.

| Área                       | Estado       | Impacto principal                                            |
| -------------------------- | ------------ | ------------------------------------------------------------ |
| Tipado TypeScript          | 🟢 Muy bueno | Tipos duplicados FE/BE sin compartir (MEDIO)                 |
| Stores Pinia               | 🟢 Bueno     | `filtres` desincronizado con CLAUDE.md (BAJO)                |
| Componentes                | 🟡 Mejorable | `MapaLeaflet.vue` 851L sin composables (ALTO)                |
| Backend                    | 🟡 Mejorable | Sin capa servicios, sin error handler, sin validación (ALTO) |
| Manejo de errores          | 🟡 Mejorable | `fetch` sin `catch` en mapa, promesas sin `await` (MEDIO)    |
| Tests                      | 🔴 Crítico   | ~0 cobertura; el único test fallaría (ALTO)                  |
| CI/CD                      | 🟡 Mejorable | No corre BD ni E2E; no protege runtime (MEDIO)               |
| Config                     | 🟡 Mejorable | `.oxlintrc.json` ausente y referenciado; título HTML (MEDIO) |
| Consistencia con CLAUDE.md | 🟡 Mejorable | Varias funciones documentadas no existen (BAJO)              |

---

## 2. Lo que ya está bien hecho

- **Disciplina de tipado.** Cero `any`, cero `as any`, cero `@ts-ignore`/`@ts-expect-error` en todo `frontend/src` y `backend/src`. El único cast amplio (`as L.GeoJSONOptions` en `MapaLeaflet.vue:474`) está justificado con comentario por una carencia de `@types/leaflet`. `tsconfig` con `strict: true` en ambos lados.
- **Modelo de datos transfronterizo correcto de punta a punta.** El esquema SQL (`infra/db/init/02-territorial-schema.sql`) documenta y aplica que provincia/veguería se definen _solo_ a nivel de municipio; la query del backend agrupa por `(provincia, comarca)` (`routes/territoris.ts:42-52`); el store reconstruye `tallsComarcaPerCodi` (`stores/territoris.ts:33-43`) y ofrece métodos duales (`estatSeleccioComarca` global vs `...EnProvincia` por columna). Es la parte más difícil del dominio y está bien resuelta.
- **Optimización de reactividad consciente.** `stores/territoris.ts:91-128`: las operaciones bulk construyen un `Set` plano y lo asignan una sola vez al `ref`, evitando N disparos del sistema reactivo. Comentado con el motivo y el coste medido.
- **Estado derivado vs almacenado bien separado** en los stores: `municipiPerCodi`, `tallsComarcaPerCodi`, `municipisPerVegueria`, `teFiltresActius` son `computed`; solo se almacena lo mínimo (`Set` de seleccionados).
- **Backend: query única y eficiente.** `/territoris/arbre` carga todo el árbol con 4 queries en `Promise.all` y arma la jerarquía en memoria (`routes/territoris.ts:18-34`), con `client.release()` en `finally`. El endpoint de geojson hace _streaming_ del fichero con `Cache-Control` de 24h (`routes/geojson.ts:66-68`).
- **Validación de entrada en geojson:** `NIVELLS_VALIDS` (allow-list) evita path traversal en `:nivell` (`routes/geojson.ts:19,49`), y el `zoom` se castea con fallback.
- **Configuración sin secretos hardcodeados:** `db.ts` y `docker-compose.yml` toman todo de variables de entorno; sin contraseñas en el repo.
- **Documentación interna excelente:** la `theme/provincies.ts` explica el criterio de cada color y el cálculo de mezcla; los comentarios de panes/CSS en `MapaLeaflet.vue` son didácticos.

---

## 3. Hallazgos por área

### 3.1 Tipado TypeScript

**[MEDIO] Tipos del dominio duplicados entre frontend y backend, sin paquete compartido.**
`frontend/src/types/territori.ts` define `Municipi/Comarca/Provincia/Vegueria/ArbreTerritorial`. El backend redefine _la misma forma_ inline como genéricos de query en `routes/territoris.ts:19-34` y como `GeoJSONFeature/FeatureCollection` en `scripts/seed-geodata.ts:34-43`. No hay una única fuente de verdad para el contrato de la API.
_Por qué importa:_ si se añade un campo al municipio (p. ej. `area_m2`, que ya existe en BD pero no se expone), hay que tocar dos sitios sin que el compilador lo enlace; las divergencias se detectan en runtime, no en build.
_Refactor:_ crear un workspace `packages/shared` (o `frontend/src/types` re-exportado) con las interfaces del dominio y los tipos de respuesta de la API (`ArbreTerritorialResponse`), e importarlo desde ambos lados. El backend tiparía `res.json()` contra ese tipo.

**[MEDIO] Las respuestas de `fetch` se castean sin validar (type-safety en la frontera).**
`stores/territoris.ts:19` (`as ArbreTerritorial`), `MapaLeaflet.vue:404` (`as GeoJSON.FeatureCollection`), `:470` (`await res.json()` sin tipo). Un cast `as` no verifica nada en runtime; si el backend cambia la forma, el frontend explota en un punto lejano.
_Por qué importa:_ es el límite exacto donde TypeScript pierde garantías. Con datos de un ICC externo, es donde más conviene validar.
_Refactor:_ introducir validación ligera (zod o un type-guard manual) en `carregaArbre` y en `codiDeFeature`/máscara. Mínimo: validar que `data.provincies` es array antes de asignar.

**[BAJO] `props.CODIMUNI` etc. son `any` implícito vía `Record`-like.**
En `MapaLeaflet.vue:119-157` y `seed-geodata.ts` (`p.CODIMUNI`), `properties` es `GeoJSON.GeoJsonProperties` (≈ `{ [k]: any } | null`), por lo que cada `props.X` es `any`. Está mitigado con `String(...)` defensivo, pero no hay tipo para las propiedades del ICC.
_Refactor:_ declarar `interface PropietatsICC { CODIMUNI: string; NOMMUNI: string; ... }` y castear `feature.properties as PropietatsICC` una vez.

---

### 3.2 Stores Pinia

**[BAJO] `stores/filtres.ts` no coincide con lo que documenta CLAUDE.md.**
CLAUDE.md dice que el store `filtres` guarda _"la pestaña activa del panel On?/Què?/Quan?"_. En realidad `filtres.ts` guarda `categoriesActives` y `temporalitat` (estado de Què?/Quan?), y la pestaña activa vive como `ref` local en `PanellFiltres.vue:14`. La documentación quedó desfasada.
_Por qué importa:_ induce a error a quien lea la doc; además, si en el futuro otra vista necesita saber la pestaña activa, hoy no puede.
_Refactor:_ actualizar CLAUDE.md, o (mejor) mover `tabActiva` al store si se prevé compartirla.

**[BAJO] `defineStore` con setup-store devuelve refs sin marcar `readonly`.**
Todos los stores exponen `ref` mutables directamente (p. ej. `municipisSeleccionats`, `zoom`). Cualquier componente podría mutar `territoris.municipisSeleccionats` saltándose los métodos. `MapaLeaflet.vue` ya lo lee directamente (`:175`, `:357`), lo cual está bien, pero nada impide una mutación externa.
_Refactor:_ opcional; exponer `readonly(...)` para el estado que solo debe cambiarse vía acciones, o documentar la convención.

**Nota positiva:** `mapa.ts` define `volaA()` (`:23`) que **no se usa en ningún sitio** — código muerto menor. Es candidato a eliminar o a cablear al `CercaRapida` para hacer _fly-to_ al seleccionar.

---

### 3.3 Componentes

**[ALTO] `MapaLeaflet.vue` (851 líneas) mezcla 5 responsabilidades y debería trocearse en composables.**
El componente contiene, todo en su `<script setup>`: (1) sistema de panes/z-index/renderers Canvas, (2) cálculo de estilos por feature y hover, (3) resolución de tema cromático, (4) lógica de selección al hacer clic delegando al store, (5) navegación adaptativa del mapa (maxBounds, dragging, re-centrado), (6) la máscara de Catalunya, (7) el panel de info y su `computed filesHover`.
_Por qué importa:_ es el archivo con más lógica de negocio del proyecto y el más difícil de testear (hoy, imposible de testear unitariamente porque todo está acoplado al ciclo de vida del componente y a Leaflet). Cualquier cambio en colores o niveles obliga a navegar 851 líneas.
_Refactor propuesto (composables):_

- `useMapaTerritoris(mapa)` → carga de capas, caché, panes, interactividad (`carregaCapa`, `carregaTotesCapes`, `actualitzaInteractivitatPanes`, `cacheLayers`).
- `useEstilTerritori()` → `estilPerFeature`, `estilHoverPerFeature`, `temaDeInfo`, `codiDeFeature` (funciones puras → **testeables sin DOM**).
- `useNavegacioMapa(mapa)` → `actualitzaMaxBounds`, `actualitzaDragging`, re-centrado, `LIMITS_CATALUNYA`.
- `useMascaraCatalunya(mapa)` → la máscara.
- El `.vue` quedaría como orquestador (~150L) + el panel `info-territori`.

**[MEDIO] Lógica de negocio (qué es "cap de comarca") embebida en el seed con heurística frágil.**
`seed-geodata.ts:109`: `esCapComarca = nomMuni === capComar || nomMuni.startsWith(capComar + ' ')`. Es una heurística de strings para un dato que el ICC seguramente provee de forma estructurada. Un municipio cuyo nombre empiece igual que el cap daría falso positivo.
_Refactor:_ derivarlo del campo ICC correspondiente, o validarlo contra `comarques.cap`.

**[BAJO] `TabOn.vue`: comptadores recalculados en cada render sin memoizar.**
`comptadorProvincia`/`comptadorComarca` (`TabOn.vue:72-86`) hacen `reduce`+`filter` sobre todos los municipios en cada repintado, y se invocan varias veces por fila en el template (`:118-121` llama 3 veces a `comptadorProvincia`). Con ~947 municipios es trabajo repetido.
_Refactor:_ exponer un `computed` de comptadores en el store o memoizar por `municipisSeleccionats`.

**[BAJO] Props/emits tipados: no aplica (componentes sin props), pero falta tipado de eventos personalizados.** No hay `defineProps`/`defineEmits` en ningún componente; toda la comunicación va por stores. Es una decisión válida y consistente, pero acopla todo a Pinia. Aceptable a esta escala.

**Nota positiva:** los componentes de UI (`CabeceraApp`, `PanellFiltres`, `CercaRapida`, `TabQue`, `TabQuan`) tienen tamaño razonable y responsabilidad única.

---

### 3.4 Backend

**[ALTO] No hay capa de servicios ni manejo de errores centralizado.**
La lógica de armado del árbol vive dentro del handler de la ruta (`routes/territoris.ts:15-78`). No hay middleware de errores Express: si una query falla, el `try/finally` libera el cliente pero **no captura el error** → la promesa rechaza y Express 5 la propaga, pero sin formato JSON consistente ni logging. `index.ts` no registra ningún `app.use((err, req, res, next) => ...)`.
_Por qué importa:_ a medida que crezcan las rutas (agenda, jocs, auth), repetir try/catch ad-hoc lleva a respuestas de error inconsistentes y fugas de detalles.
_Refactor:_ (1) extraer `services/territoris.ts` con `obtenArbre(): Promise<ArbreTerritorial>`; (2) handlers finos que llaman al servicio; (3) `errorHandler` central que mapea a `{ error }` con status y hace `console.error`; (4) envolver handlers async para reenviar rechazos al handler.

**[MEDIO] Riesgo de fallo en el seed por desajuste de geometría POLYGON vs MULTIPOLYGON.**
El esquema declara `GEOMETRY(MULTIPOLYGON, 4326)` (`02-territorial-schema.sql:9,20,32,44`) pero el seed inserta `ST_GeomFromGeoJSON(...)` sin envolver en `ST_Multi(...)` (`seed-geodata.ts:55,73,91,112`). Si alguna feature del ICC es un `Polygon` simple (no `MultiPolygon`), PostGIS rechaza el INSERT por tipo incompatible y, al estar todo en una transacción, **aborta todo el seed**.
_Refactor:_ `ST_Multi(ST_GeomFromGeoJSON($n))` en las cuatro inserciones. Barato y robusto.

**[MEDIO] Errores de fichero del seed no usan transacción consistente entre tablas.**
El seed inserta secuencialmente con `ON CONFLICT DO NOTHING` dentro de una transacción global (`seed-geodata.ts:133-138`), lo cual está bien, pero inserta municipio a municipio (~947 round-trips). Funciona, pero es lento.
_Refactor (opcional):_ `pg-copy-streams` o INSERT multi-fila. No urgente.

**[BAJO] Config de puerto/BD duplicada.**
`db.ts:3-9` y `seed-geodata.ts:16-22` repiten el mismo objeto `Pool`. El seed crea su propio pool en lugar de importar `pool` de `db.ts`.
_Refactor:_ importar `pool` desde `db.ts` (o un `config.ts` único). Cuidado con cerrar el pool solo en el script.

**[BAJO] `process.env.PORT ?? 3000` sin `Number()`** en `index.ts:7` — Express lo tolera como string, pero es inconsistente con `db.ts:5` que sí castea. Nitpick.

---

### 3.5 Manejo de errores y casos límite

**[MEDIO] `fetch` sin `catch` en el mapa.**
`MapaLeaflet.vue:401` (`carregaMascaraCatalunya`) y `:468` (`carregaCapa`) comprueban `res.ok` y hacen `return` silencioso si falla, pero **no envuelven en try/catch**: un error de red (no un 4xx/5xx) lanza una promesa rechazada no manejada. Además `carregaTotesCapes` se invoca sin `await` ni `.catch` desde `onMounted` (`:620`) y desde el handler `zoomend` (`:599`).
_Por qué importa:_ en una red móvil intermitente (caso de uso explícito del proyecto), un fetch que falla deja el mapa a medias sin feedback y con un _unhandled rejection_ en consola.
_Refactor:_ try/catch en ambas funciones + estado de error visible; o reusar el patrón `carregant/error` que ya existe en el store de territoris.

**[BAJO] `carregaArbre` captura el error pero ninguna vista reintenta.**
El store guarda `error` (`territoris.ts:23`) y `TabOn.vue:92` lo muestra, pero no hay botón de reintento ni se cubre el caso en el mapa (que también depende del árbol indirectamente).

**Nota positiva:** el manejo de `null`/`undefined` es cuidadoso en general: `?.`, `?? []`, comprobaciones `if (!info) return`, `aLatLng` con `pos[1]!` donde el dato está garantizado.

---

### 3.6 Duplicación, magic numbers y constantes dispersas

**[MEDIO] La tabla resolución-por-zoom existe DOS veces, desincronizable.**
Frontend `MapaLeaflet.vue:439-456` (`resolucioPerCapa`, con rangos por nivel) y backend `routes/geojson.ts:11-32` (`RESOLUCIO_PER_ZOOM`). Son lógicas relacionadas pero **distintas**: el front pide `?zoom=N` y el back vuelve a derivar la resolución de ese zoom, de modo que la `clau` de caché del front (`${nivell}-${resolucio}`, `:464`) usa una resolución que **no es necesariamente la que sirve el backend**. P. ej., a zoom 12 el front cachea municipios como `250000` y el back también sirve `250000`, pero a zoom 9 el front calcula `500000` para municipios y el back igual — coincide por ahora, pero son dos fuentes que pueden divergir.
_Refactor:_ mover la decisión de resolución a un único lado. Lo más limpio: el frontend manda `?resolucio=` explícito (calculado por su propia tabla) y el backend solo valida que el fichero existe; así la caché y el fichero servido son siempre coherentes.

**[BAJO] El color verde `#2d6a2d`/`#2d6a2d` aparece hardcodeado en CSS de varios componentes** (`CercaRapida.vue:207,217`, `PanellFiltres.vue:249,298`, `TabQue.vue`, `TabQuan.vue`) en lugar de una variable CSS global. El tema vive en `theme/provincies.ts` pero el "verde de marca" de la UI no.
_Refactor:_ definir `--color-marca: #2d6a2d` en `assets/base.css` y usarlo.

**[BAJO] `ESTIL_NIVELL` (MapaLeaflet:43-48) no coincide con CLAUDE.md.** La doc dice opacidades `100%→75%→50%→25%`; el código usa `1.0 / 0.6 / 0.4 / 0.4` (nivel 4 = 0.4, no 0.25; nivel 2 = 0.6, no 0.75). Documentación desfasada o valor sin querer.

---

### 3.7 Cobertura de tests

**[ALTO] No existe ningún test unitario. El único test E2E que hay fallaría.**

- `frontend/src/components/__tests__/` está **vacío** (carpeta sin ficheros), pese a que `eslint.config.ts:31` y `vitest.config.ts` están preparados para tests. El CI ejecuta `npm run test:unit -- --run` (`ci.yml:40`), que con cero ficheros pasa trivialmente sin verificar nada.
- El único test, `e2e/vue.spec.ts:5`, hace `expect(page).toHaveTitle(/viscalaterra/i)`, pero `frontend/index.html:7` tiene `<title>Vite App</title>`. **El test fallaría** si se ejecutara — pero el CI **no corre Playwright**, así que nadie lo detecta.

_Qué falta cubrir (prioridad):_

1. **Lógica pura del store** (`estatPerMunicipis`, selección bulk de comarca/provincia/veguería, agrupación transfronteriza) — son funciones deterministas, fáciles de testear, y son el corazón del dominio.
2. **`theme/provincies.ts`** (`temaPerComarca` con transfronterizas, `nomProvinciesPerComarca`) — tablas estáticas, ideales para snapshot/aserción.
3. **Funciones puras de `MapaLeaflet`** una vez extraídas a composables (`codiDeFeature`, `estilPerFeature`).
4. **Backend:** `routes/territoris` armado del árbol (con BD de test o mock de `pool`), `geojson` validación de nivel inválido (400) y fichero ausente (503).
5. **E2E real:** carga del árbol, selección en mapa ↔ panel On?, cercador.

_Refactor inmediato y barato:_ corregir el título del HTML y añadir 1 archivo de tests por store. Eso ya da valor real al `test:unit` del CI.

---

### 3.8 CI/CD

**[MEDIO] El pipeline no protege el comportamiento en runtime.**
`ci.yml` corre: `format:check`, `type-check`, `lint`, `test:unit` (vacío) y `build` del backend. **No** levanta PostGIS, **no** ejecuta Playwright, **no** hace build del frontend en un job separado verificable (el `build` del front incluye type-check pero no se invoca como job propio). Resultado: un PR puede pasar todo el CI con la app rota en runtime.
_Refactor:_ (1) job de E2E con `services: postgres` (imagen postgis) + seed + Playwright; (2) añadir `npm run build` del frontend como gate; (3) cuando haya tests unitarios reales, exigir cobertura mínima.

**[MEDIO] `.oxlintrc.json` referenciado pero ausente — el lint puede romperse o ser no-determinista.**
`eslint.config.ts:34` llama `pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json')` y `package.json` tiene `lint:oxlint: "oxlint ."`, pero **el fichero `.oxlintrc.json` no existe en el repo**. Según versión, `buildFromOxlintConfigFile` con fichero ausente puede lanzar o devolver config vacía, y `oxlint .` corre con defaults. El CI ejecuta `npm run lint` (`ci.yml:38`) con `--fix`, que en CI además es peligroso (modifica ficheros que no se commitean y enmascara errores).
_Refactor:_ crear `.oxlintrc.json` explícito, y en CI usar lint **sin `--fix`** (modo verificación), dejando `--fix` solo para el script local/pre-commit.

**[BAJO] `lint` con `--fix` en CI.** Tanto `lint:oxlint` como `lint:eslint` (`frontend/package.json:15-16`) llevan `--fix`. En CI un linter debe _verificar_, no _arreglar_; con `--fix` un error auto-corregible pasa el job pero el fix se pierde.

---

### 3.9 Consistencia con CLAUDE.md

CLAUDE.md describe bastante código **que aún no existe**, lo que confunde sobre el estado real:

- **`stores/geomaster.ts`, `views/GeoMasterView.vue`, `views/JocsView.vue` (con tarjetas), `MerchandisingView`, `SobreView`** — documentados extensamente; en el repo `JocsView.vue` es `<div>Jocs — pròximament</div>` y no existen rutas `/jocs/geomaster`, `/merchandising`, `/sobre` (el router solo tiene `/cerca`, `/agenda`, `/jocs`). El menú de `PanellFiltres.vue:17-23` enlaza a `/merchandising` y `/sobre` que **no están en el router** → clic = ruta no resuelta.
- **`HomeView.vue`** existe (`<p>viscalaterra.cat</p>`) pero **no está referenciada en el router** → código muerto.
- **`mapa.ts:volaA`** documentado/implementado pero sin uso.
- **`ESTIL_NIVELL`** y descripción del store `filtres` desfasados (ver 3.2 y 3.6).

_Por qué importa (BAJO-MEDIO):_ CLAUDE.md es la fuente de verdad para el propio asistente y para nuevos colaboradores; describir features inexistentes como reales degrada su utilidad. Conviene marcar claramente lo "planificado" vs lo "implementado".

---

## 4. Top 6 refactors recomendados (priorizados)

| #     | Refactor                                                                                                                                                                       | Impacto | Esfuerzo | Por qué primero                                                                                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1** | **Arreglar la base de calidad: `.oxlintrc.json`, título HTML, lint sin `--fix` en CI, y 2-3 ficheros de tests unitarios de stores/theme.**                                     | ALTO    | Bajo     | Hoy el CI da una falsa sensación de seguridad (test vacío, lint que se auto-arregla, único test que fallaría). Es lo más barato con más retorno. |
| **2** | **Trocear `MapaLeaflet.vue` (851L) en composables** (`useMapaTerritoris`, `useEstilTerritori`, `useNavegacioMapa`, `useMascaraCatalunya`).                                     | ALTO    | Medio    | Desbloquea la testabilidad de la lógica más crítica y reduce el archivo más difícil del repo. Las funciones puras extraídas se testean sin DOM.  |
| **3** | **Backend: capa de servicios + `errorHandler` central + envoltura async de handlers.**                                                                                         | ALTO    | Medio    | Necesario antes de añadir agenda/jocs/auth. Respuestas de error consistentes y sin fugas.                                                        |
| **4** | **Paquete de tipos compartido FE/BE** (dominio + tipos de respuesta de API) y **validar las respuestas `fetch`** en la frontera.                                               | MEDIO   | Medio    | Elimina la duplicación de contratos y convierte errores de integración de runtime en errores de compilación.                                     |
| **5** | **Unificar la resolución-por-zoom en una sola fuente** (front manda `?resolucio=`, back solo valida/sirve) y arreglar el desajuste POLYGON→MULTIPOLYGON del seed (`ST_Multi`). | MEDIO   | Bajo     | Quita una duplicación sutil que puede divergir y un bug latente que puede abortar todo el seed.                                                  |
| **6** | **Robustecer errores de red en el mapa** (try/catch en `carregaCapa`/`carregaMascaraCatalunya`, `await`+`.catch` en las llamadas de `onMounted`/`zoomend`, feedback visible).  | MEDIO   | Bajo     | El proyecto apunta explícitamente a uso móvil con red intermitente; hoy un fetch fallido deja el mapa roto sin aviso.                            |

---

## 5. Nitpicks de estilo (no estructurales)

- `index.ts:7` `PORT` sin `Number()` (inconsistente con `db.ts`).
- Color de marca `#2d6a2d` repetido en CSS de 4+ componentes → variable CSS.
- `mapa.ts:volaA` y `views/HomeView.vue` son código muerto.
- `ESTIL_NIVELL` y la doc del store `filtres` en CLAUDE.md están desfasados respecto al código.
- Operador ternario usado por efecto secundario (sin asignar) en `territoris.ts:88`, `filtres.ts:14-17` — funciona, pero un `if/else` es más legible y algunos linters lo marcan.

---

_Fin del informe._
