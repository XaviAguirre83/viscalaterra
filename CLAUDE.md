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
- **Temàtica de colors**: `frontend/src/theme/provincies.ts` — paleta central por provincia (Barcelona=rojo, Girona=verde, Lleida=oro, Tarragona=azul). Usada tanto por Leaflet (L.PathOptions) como por el panel On? (CSS custom properties `--prov-base`, `--prov-parcial`, etc.).
- **Routing**: Vue Router con `createWebHistory`. Las rutas se definen en `frontend/src/router/index.ts`.
- **Componentes**: `frontend/src/components/` para reutilizables, `frontend/src/views/` para páginas completas (una por ruta).

### Navegació del mapa (restriccions i límits)

`MapaLeaflet.vue` implementa una lògica de navegació adaptativa:

- **`minZoom`**: igual al zoom inicial (8). No es pot fer zoom out més enllà de la vista inicial de Catalunya.
- **Re-centrat**: en tornar al zoom mínim (`zoomend` amb `zoom <= zoomInicial`), el mapa fa `setView` al `centreInicial` (capturat una sola vegada a `onMounted`, no el del store que s'actualitza en moure's).
- **`maxBounds` dinàmics** (`actualitzaMaxBounds`): en lloc d'uns bounds estàtics, es calculen com `LIMITS_CATALUNYA` (bbox real) + mig viewport en graus. Això garanteix que el centre del mapa sempre pugui arribar a qualsevol cantonada del territori independentment de la mida de la finestra o el zoom. Es recalcula a `zoomend` i `resize`.
- **Dragging adaptatiu** (`actualitzaDragging`): al zoom mínim, comprova si el viewport cobreix tot `LIMITS_CATALUNYA`. Si sí → `dragging.disable()` (immòbil, tot és visible). Si no → `dragging.enable()` (finestra petita, cal poder desplaçar-se). Als zooms superiors, sempre habilitat.

### Comarques transfrontereres

Berguedà, Cerdanya, Osona i Selva tenen municipis a dues províncies. El model les gestiona correctament: la BD no guarda `provincia_codi` a la taula `comarques` — cada municipi porta la seva pròpia província. L'API agrupa per `(provincia_codi, comarca_codi)`, de manera que la mateixa comarca apareix a dues columnes del panell On?, cadascuna amb els seus municipis. El store té mètodes duals: `estatSeleccioComarca` (global, per al mapa) i `estatSeleccioComarcaEnProvincia` (per columna, per al panell).

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

## Decisiones de producto tomadas

- La unidad mínima de selección es siempre el **municipi**
- Los niveles superiores (Comarca, Vegueria, Província) son atajos para seleccionar conjuntos de municipis
- Las Veguerías NO aparecen en el desplegable On? pero sí en el mapa
- Sincronización bidireccional: mapa ↔ desplegable On?
- Cuatro niveles de líneas delimitantes según opacidad/grosor (ver `viscalaterra_plan.md`)
- Inspiración visual: meteo.cat (Catalunya destacada, resto de España en tenue)
- Idioma principal de la interfaz: català

## Pendiente de decidir

- Público objetivo
- Interfaz del Quan? (calendario, selector de días, rango de fechas…)
- Criterio de ordenación cuando una división pertenece a múltiples unidades superiores
