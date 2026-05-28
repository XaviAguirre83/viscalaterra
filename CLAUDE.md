# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Plataforma de descubrimiento de Catalunya. El mapa es el filtro principal: el usuario selecciona territorio y luego busca contenido dentro de esa selección geográfica.

Spec de producto detallada: `viscalaterra_plan.md`

### Concepto de las tres pestañas

- **On?** — selector geográfico (Província → Comarca → Municipi)
- **Què?** — categorías de espacio público y equipamientos colectivos (datos abiertos)
- **Quan?** — temporalidad: Permanent / Recurrent / Puntual

## Stack técnico

| Capa          | Tecnología                                     |
| ------------- | ---------------------------------------------- |
| Frontend      | Vue 3 + Vite + TypeScript                      |
| Backend       | Node.js + Express + TypeScript                 |
| Base de datos | PostgreSQL + PostGIS                           |
| Mapa          | Leaflet.js                                     |
| Tiempo real   | Socket.io (Trivial multijugador)               |
| Auth          | JWT + bcrypt                                   |
| i18n          | i18next                                        |
| Contenedores  | Docker + Docker Compose                        |
| Testing       | Vitest (unit) + Playwright (E2E)               |
| Linting       | ESLint (oxlint + eslint-plugin-vue) + Prettier |
| Pre-commit    | Husky + lint-staged                            |
| CI/CD         | GitHub Actions                                 |

## Comandos de desarrollo

### Entorno completo (recomendado)

```bash
docker compose up          # arranca DB (PostGIS), backend y frontend
docker compose down        # para los contenedores
```

Requiere `.env` en la raíz (copiar desde `.env.example` y rellenar).

### Frontend (puerto 5173)

```bash
cd frontend
npm run dev                # servidor de desarrollo Vite
npm run build              # compilación de producción
npm run type-check         # verificación de tipos TypeScript
npm run lint               # oxlint + eslint con autofix
npm run test:unit          # Vitest (tests unitarios)
npm run test:unit -- --reporter=verbose   # un solo fichero: vitest run src/foo.spec.ts
npm run test:e2e           # Playwright
```

### Backend (puerto 3000)

```bash
cd backend
npm run dev                # ts-node-dev con hot-reload
npm run build              # compilación a dist/
npm start                  # ejecuta dist/index.js
```

### Raíz del monorepo

```bash
npm run format             # Prettier sobre todo el repo
npm run format:check       # verifica formato sin modificar
```

### Base de datos

La instancia PostGIS corre en Docker (`viscalaterra_db`, puerto 5432). El script `infra/db/init/01-extensions.sql` activa PostGIS y postgis_topology automáticamente al crear el contenedor.

### Datos geográficos

`backend/data/geojson/` contiene los GeoJSON del ICC (Institut Cartogràfic de Catalunya), organizados por nivel territorial y en 6 resoluciones (5000 → 1000000). **Esta carpeta no está en git** — hay que obtenerla por separado. Los datos son la versión `divisions-administratives-v2r1` (2024-01-18) e incluyen: comunitat, provincies, comarques, vegueries, municipis y una carpeta `data/` con propiedades de cada municipi (CODIMUNI, NOMMUNI, CODICOMAR, NOMCOMAR, CODIVEGUE, CODIPROV, AREAM5000, etc.).

## Arquitectura

### Estructura del monorepo

```
/
├── frontend/          # Vue 3 SPA
├── backend/           # Express REST API
├── infra/db/init/     # SQL que corre al inicializar el contenedor
├── backend/data/      # datos GeoJSON (no en git)
└── docker-compose.yml
```

npm workspaces: `frontend` y `backend` son paquetes independientes. Las dependencias compartidas de desarrollo (Prettier, Husky, commitlint) están en el `package.json` raíz.

### Frontend

- **Entrada**: `frontend/src/main.ts` monta la app Vue, registra Pinia y Vue Router.
- **Estado global**: Pinia (`frontend/src/stores/`). Stores activos:
  - `territoris` — árbol provincial completo (província → comarca → municipi), municipis seleccionats, helpers de selección global y per-provincia (distinción necesaria por las comarques transfrontereres)
  - `mapa` — zoom y centro del mapa Leaflet
  - `filtres` — pestaña activa del panel On?/Què?/Quan?
- **Temàtica de colors**: `frontend/src/theme/provincies.ts` — paleta central per província i per vegueria, usada tant per Leaflet (`L.PathOptions`) com pel panell On? (CSS custom properties `--prov-base`, `--prov-parcial`, etc.). Vegeu la secció "Temàtica de colors" més avall.
- **Routing**: Vue Router con `createWebHistory`. Las rutas se definen en `frontend/src/router/index.ts`.
- **Componentes**: `frontend/src/components/` para reutilizables, `frontend/src/views/` para páginas completas (una por ruta).

### Sistema de 4 nivells territorials al mapa

`MapaLeaflet.vue` carrega **simultàniament** les 4 capes territorials (provincies, vegueries, comarques, municipis). El `mapaStore.nivellActiu` determina quina és la "Nivell 1" (la més prominent i l'única interactiva).

- **Matriu de prioritat** (`NIVELLS_ORDRE`): segons el nivell actiu, la resta de capes ocupen els nivells 2-4 amb gruix i opacitat de bordes decreixents (`ESTIL_NIVELL`): 2px/100% → 1.5px/75% → 1px/50% → 0.5px/25%.
- **Resolució per capa** (`resolucioPerCapa`): provincies/vegueries mai van més enllà de 250000; comarques fins a 100000; municipis fins a 5000.
- **Caché**: capes carregades reutilitzades en canviar de zoom (key `${nivell}-${resolucio}`).
- **Selector**: integrat al panell `info-territori` (vegeu secció següent); ja no és un control Leaflet independent.

#### Sistema de panes i interactivitat

Cada capa territorial viu en el seu propi **pane Leaflet** (`PANE_NOMS`), amb z-index fix (`PANE_Z_INDEX`: 410 provincies → 440 municipis). Els panes garanteixen el z-order sense `bringToFront/Back`.

La interactivitat es gestiona exclusivament via CSS, **no** via l'opció `interactive` de Leaflet (que en la v1.9.4 no es pot canviar amb `setStyle` un cop creat el layer):

- El pane actiu rep la classe CSS `.territori-actiu`.
- CSS: `.leaflet-pane[class*='leaflet-territori-'] path.leaflet-interactive { pointer-events: none }` — tots els paths inactius ignoren events.
- CSS: `.territori-actiu path.leaflet-interactive { pointer-events: fill }` — el pane actiu respon a tota l'àrea interior del polígon, fins i tot amb `fillOpacity: 0` (amb `visiblePainted` l'interior no respondria).
- L'especificitat de les regles és (0,3,1) i (0,4,1), superiors a la regla de Leaflet `.leaflet-pane > svg path.leaflet-interactive` (0,2,2) que posa `pointer-events: auto`.
- Els handlers `mouseover/mouseout/click` comproven igualment `if (nivell !== mapaStore.nivellActiu) return` com a seguretat addicional.

#### Panell d'informació i selector de nivell (`info-territori`)

Panell Vue posicionat `absolute` a la part superior centrada del mapa (`top: 10px; left: 50%; transform: translateX(-50%)`). Té dues files:

- **Fila de capçaleres** — 4 botons (`<button>`) amb `pointer-events: auto`: Província · Vegueria · Comarca · Municipi. El nivell actiu es marca amb subratllat i text fosc; la resta en gris. Clic → `mapaStore.defineixNivellActiu(nivell)`.
- **Fila de valors** — `pointer-events: none`, s'omple en `mouseover` sobre el territori actiu. Les cel·les de Província i Vegueria suporten múltiples línies (valor dominant + secundari en gris més clar) per a les comarques transfrontereres.

Comportament per nivell actiu:

| Selector   | Província                               | Vegueria                     | Comarca     | Municipi     |
| ---------- | --------------------------------------- | ---------------------------- | ----------- | ------------ |
| Provincies | nom de la província                     | —                            | —           | —            |
| Vegueries  | —                                       | nom de la vegueria           | —           | —            |
| Comarques  | prov. dominant (+2a si transfronterera) | veg. dominant (+2a si Anoia) | nom comarca | —            |
| Municipis  | nom província                           | nom vegueria                 | nom comarca | nom municipi |

La lògica de resolució viu a `filesHover` (computed reactiu sobre `hoverInfo` ref).

#### Selecció visual al mapa

**Únicament la capa de municipis mostra farcit de color.** Les capes superiors (comarca, vegueria, província) mantenen sempre `fillOpacity: 0` — les seves línies delimitadores es veuen, però l'àrea interior mai es pinta. La selecció es visualitza exclusivament als municipis individuals que formen part del territori seleccionat, independentment del nivell selector actiu. Així, fent zoom out des d'una selecció de 3 municipis del Maresme, es veuen exactament aquells 3 municipis pintats.

Opacitats:

| Estat                                   | `fillOpacity`                              |
| --------------------------------------- | ------------------------------------------ |
| Municipi seleccionat                    | 0.70                                       |
| Municipi en hover                       | 0.55 (no seleccionat) / 0.85 (seleccionat) |
| Comarca/Vegueria/Província en hover     | 0.55 (feedback visual, no persisteix)      |
| Qualsevol capa no seleccionada en repòs | 0                                          |

### Navegació del mapa (restriccions i límits)

`MapaLeaflet.vue` implementa una lògica de navegació adaptativa:

- **`minZoom`**: igual al zoom inicial (8). No es pot fer zoom out més enllà de la vista inicial de Catalunya.
- **Re-centrat**: en tornar al zoom mínim (`zoomend` amb `zoom <= zoomInicial`), el mapa fa `setView` al `centreInicial` (capturat una sola vegada a `onMounted`, no el del store que s'actualitza en moure's).
- **`maxBounds` dinàmics** (`actualitzaMaxBounds`): en lloc d'uns bounds estàtics, es calculen com `LIMITS_CATALUNYA` (bbox real) + mig viewport en graus. Això garanteix que el centre del mapa sempre pugui arribar a qualsevol cantonada del territori independentment de la mida de la finestra o el zoom. Es recalcula a `zoomend` i `resize`.
- **Dragging adaptatiu** (`actualitzaDragging`): al zoom mínim, comprova si el viewport cobreix tot `LIMITS_CATALUNYA`. Si sí → `dragging.disable()` (immòbil, tot és visible). Si no → `dragging.enable()` (finestra petita, cal poder desplaçar-se). Als zooms superiors, sempre habilitat.

### Comarques transfrontereres

Berguedà, Cerdanya, Osona i Selva tenen municipis a dues províncies. A més, l'**Anoia** té municipis a dues vegueries (Penedès i Catalunya Central). El model les gestiona correctament: la BD no guarda `provincia_codi` a la taula `comarques` — cada municipi porta la seva pròpia província. L'API agrupa per `(provincia_codi, comarca_codi)`, de manera que la mateixa comarca apareix a dues columnes del panell On?, cadascuna amb els seus municipis. El store té mètodes duals: `estatSeleccioComarca` (global, per al mapa) i `estatSeleccioComarcaEnProvincia` (per columna, per al panell).

Les taules `COMARCA_NOMPROVINCIES` i `COMARCA_NOMVEGUERIES` a `provincies.ts` mapegen els 43 codis de comarca als seus noms de província/vegueria en ordre de dominància; les comarques transfrontereres porten dos elements a l'array.

### Backend

- **Entrada**: `backend/src/index.ts`. Express con `express.json()`. Endpoint de salud en `GET /health`.
- **Conexión a BD**: vía variables de entorno `DB_*` del `.env`.

### Convenciones de commits

Conventional Commits obligatorio (commitlint). Prefijos habituales: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`.

### Estrategia de ramas

```
main          ← siempre estable, desplegable
develop       ← integración; aquí se fusionan las features
feature/*     ← una rama por funcionalidad (sale de develop)
fix/*         ← correcciones de bugs (sale de develop o main)
```

El CI corre en push a `main` y `develop`, y en PRs hacia ambas. Para contribuir: rama desde `develop` → PR hacia `develop` → merge cuando CI pase.

### Temàtica de colors

`frontend/src/theme/provincies.ts` exporta tres elements principals:

**`TEMA_PROVINCIA`** — paleta per província (usada per municipis i per la capa de provincies):

| Província | Codi | Color             |
| --------- | ---- | ----------------- |
| Barcelona | `08` | Vermell `#c4382e` |
| Girona    | `17` | Verd `#2d6a2d`    |
| Lleida    | `25` | Or `#b8860b`      |
| Tarragona | `43` | Blau `#2b6cb0`    |

**`TEMA_VEGUERIA`** — paleta pròpia per a cada vegueria. Les vegueries no segueixen els límits provincials, per tant cada una té un color derivat del seu territori:

| Codi | Vegueria                   | Color                   | Criteri                                |
| ---- | -------------------------- | ----------------------- | -------------------------------------- |
| `01` | Metropolitana de Barcelona | Vermell                 | = província Barcelona                  |
| `02` | Comarques de Girona        | Verd                    | = província Girona                     |
| `03` | Comarques de Lleida        | Or                      | = província Lleida                     |
| `04` | Camp de Tarragona          | Blau                    | = província Tarragona                  |
| `05` | Terres de l'Ebre           | Verd-blau `#1a7a7a`     | delta i costa sud                      |
| `06` | Alt Pirineu i Aran         | Verd oliva `#6a7a2a`    | alta muntanya pirinenca                |
| `07` | Catalunya Central          | Ambre `#c07020`         | entre Barcelona i Lleida               |
| `08` | Penedès                    | Vi/magenta `#8b3a6e`    | vinyes, entre Barcelona i Tarragona    |
| `00` | Val d'Aran                 | Blau lacustre `#2d7a8a` | entitat territorial singular pirinenca |

**`temaPerComarca(codi)`** — color per comarca, resolt en dos passos:

1. **39 comarques d'una sola província** (`COMARCA_PROVINCIA`): taula estàtica `CODICOMAR → CODIPROV`, hereta directament la paleta provincial.
2. **4 comarques transfrontereres** (`TEMA_COMARCA_CUSTOM`): color calculat com a mescla RGB ponderada pel percentatge de municipis de cada província (dades ICC 2024):

| Codi | Comarca  | Mescla                        | Color resultant             |
| ---- | -------- | ----------------------------- | --------------------------- |
| `14` | Berguedà | 96.8% Barcelona + 3.2% Lleida | Vermell quasi pur           |
| `15` | Cerdanya | 64.7% Girona + 35.3% Lleida   | Verd oliva `#5e7421`        |
| `24` | Osona    | 92.9% Barcelona + 7.1% Girona | Vermell lleugerament apagat |
| `34` | Selva    | 96.2% Girona + 3.8% Barcelona | Verd quasi pur              |

**`TEMA_NEUTRE`** — color verd neutre de fallback. S'aplica quan no hi ha cap codi de província, vegueria ni comarca reconegut.

Cada tema té els camps: `base` (selecció total), `parcial` (selecció parcial), `hover`, `contrast` (text sobre base) i `vora` (línia de delimitació).

La funció `temaDeInfo(info)` a `MapaLeaflet.vue` centralitza la resolució del tema per jerarquia: `codiProvincia` → `temaPerProvincia`, `codiVegueria` → `temaPerVegueria`, `codiComarca` → `temaPerComarca`, cap → `TEMA_NEUTRE`.

## Decisiones de producto tomadas

- La unidad mínima de selección es siempre el **municipi**
- Los niveles superiores (Comarca, Vegueria, Província) son atajos para seleccionar conjuntos de municipis
- Las Veguerías NO aparecen en el desplegable On? pero sí en el mapa
- Sincronización bidireccional: mapa ↔ desplegable On?
- Cuatro niveles de líneas delimitantes según opacidad/grosor (ver `viscalaterra_plan.md`)
- Inspiración visual: meteo.cat (Catalunya destacada, resto de España en tenue)
- Idioma principal de la interfaz: català
- **Selecció visual al mapa**: únicament la capa de municipis mostra farcit de color; comarques, vegueries i províncies mantenen àrea transparent (sols es pinten les línies delimitadores)
- **Colors de hover de comarques**: hereta el color de la seva província; les 4 transfrontereres (Berguedà, Cerdanya, Osona, Selva) usen una mescla RGB ponderada pel % de municipis per província

## Pendiente de decidir

- Público objetivo
- Interfaz del Quan? (calendario, selector de días, rango de fechas…)
- Criterio de ordenación cuando una división pertenece a múltiples unidades superiores
