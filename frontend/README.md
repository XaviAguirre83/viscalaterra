# frontend — viscalaterra.cat

SPA en **Vue 3 + Vite + TypeScript** (Pinia, Vue Router, Vue I18n, Leaflet).

La documentació de referència del projecte (arquitectura, convencions, comandos)
és a [`../CLAUDE.md`](../CLAUDE.md) i la spec de producte a
[`../viscalaterra_plan.md`](../viscalaterra_plan.md).

## Desenvolupament

L'entorn recomanat és Docker des de l'arrel del repo (`docker compose up`, vegeu
el [README principal](../README.md)). El frontend queda servit a
`http://localhost:5173` amb hot-reload; les crides `/api/*` es redirigeixen al
backend via proxy de Vite (`vite.config.ts`).

Les dependències s'instal·len **dins del contenidor** (el `node_modules` està
bind-muntat): `docker compose exec frontend npm install <paquet>`.

## Comandos

```sh
npm run dev          # servidor de desenvolupament Vite
npm run build        # compilació de producció (vue-tsc + vite build)
npm run type-check   # verificació de tipus
npm run lint         # oxlint + eslint (no modifica; el que corre al CI)
npm run lint:fix     # amb autofix
npm run test:unit    # Vitest
npm run test:e2e     # Playwright (cal `npx playwright install` el primer cop)
```

Amb Docker, prefixa'ls amb `docker compose exec frontend …`.

## Estructura de `src/`

| Carpeta        | Contingut                                                       |
| -------------- | --------------------------------------------------------------- |
| `views/`       | una vista per ruta (Explorador = Llocs/Agenda, Jocs, GeoFreak…) |
| `components/`  | components reutilitzables (mapa, filtres, capçalera, modals…)   |
| `stores/`      | Pinia (territoris, mapa, filtres, auth, geofreak…)              |
| `data/`        | mòduls purs sense Vue, testejables (temporal, geofreak, text…)  |
| `composables/` | composables Vue (p. ex. `useFocusTrap`)                         |
| `theme/`       | paleta de colors per província/vegueria/comarca                 |
| `i18n/`        | Vue I18n amb diccionaris `ca` / `es` / `en` a `locales/`        |
