---
títol: Auditoria d'arquitectura i escalabilitat
data: 2026-07-02
mètode: lectura de codi + mesures reals (build de producció, peticions HTTP al stack dev i al de prod amb Caddy)
objectiu de capacitat: VPS Hetzner CX22 (2 vCPU · 4 GB RAM) amb ~100 usuaris concurrents
---

# Auditoria d'arquitectura — 2026-07-02

## Seguiment del 2026-06-03

Els 4 ALTS de rendiment **aplicats i funcionant** (mesurat: municipis-1000000 passa
de 3,09 MB a 808 KB per gzip): compressió, resolució explícita, caché en memòria de
GeoJSON i de l'arbre. També: debounce de CercaRapida, error handler, ST_Multi al
seed, tests reals (10+ fitxers). Pendents menors: comptadors de TabOn (H7), índexs
btree (H9) i trocejar MapaLeaflet.vue (ara ~2000 línies) — cap dels tres urgeix.

## Bloc A — "Molt clar, aplicar ja" — ✅ TOTS APLICATS (2026-07-02)

| #   | Hallazgo (mesurat)                                                                                                                                             | Fix aplicat                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| A1  | Rate limit = un únic cub per a tothom darrere de Caddy (logs de prod amb ERR_ERL_UNEXPECTED_X_FORWARDED_FOR; ~17 visitants/min haurien tombat el lloc amb 429) | `app.set('trust proxy', 1)`                         |
| A2  | Sense `pool.on('error')`: un reinici de la BD matava el procés                                                                                                 | listener afegit a db.ts                             |
| A3  | Node PID 1 ignora SIGTERM: cada deploy esperava 10 s i tallava respostes                                                                                       | `server.close()` amb SIGTERM                        |
| A4  | Caddy sense Cache-Control: assets hasheados revalidats a cada visita i index.html amb caché heurística (pantalla trencada ~3 dies després d'un deploy)         | no-cache per defecte + immutable a /assets/\*       |
| A5  | logo.png 767 KB (944×1005) mostrat a 94 px — el ~28% del payload no-GeoJSON                                                                                    | 178×190, 27 KB                                      |
| A6  | flag-icons inlinava 400 banderes al CSS crític: 431 KB / 88 KB gz per usar-ne 3                                                                                | 3 SVGs propis; CSS 431→11 KB; dependència eliminada |
| B5  | Dockerfiles amb npm install (no reproduïble)                                                                                                                   | npm ci                                              |
| —   | CI sense audit de dependències                                                                                                                                 | npm audit --audit-level=high al CI                  |

## Bloc B — considerar més endavant (per ordre de retorn)

1. ~~**Cachear el GeoJSON ja comprimit**~~ — ✅ **APLICAT 2026-07-03**: caché del
   buffer gzip (nivell 6, async, single-flight); mesurat 1 s → 6,8 ms per petició
   en calent.
2. **Reconsiderar la resolució 5000 dels municipis** (`resolucioPerCapa`):
   7,2 MB gz per usuari a zoom ≥15, probablement indistingible de 100000.
   _Decisió visual de l'usuari pendent (comparació A/B en pantalla)._
3. ~~**ETag a /api/geojson**~~ — ✅ **APLICAT 2026-07-03**: ETag fort + 304 a
   If-None-Match (mesurat: 0 bytes, 2,6 ms).
4. **Healthcheck real**: /health amb `SELECT 1` + healthcheck al compose de prod
   (el depends_on actual no detecta un backend zombie).
5. **Pool de pg amb max/connectionTimeoutMillis explícits** — quan hi hagi més
   endpoints amb BD.
6. **CI**: lint/tests del backend (quan n'hi hagi) i Playwright.
7. **H7/H9 del 2026-06-03** (comptadors TabOn; índexs btree) — micro.
8. **Trocejar MapaLeaflet.vue** (~2000 línies) en composables — el refactor amb
   més retorn a llarg termini, però no urgent: fer-ho quan comenci a fer mal.

## Estimació de capacitat (CX22)

- Primera visita ≈ **2,0 MB** transferits després dels retalls (245 KB JS/CSS gz +
  27 KB logo + 1,63 MB GeoJSON gz + 13 KB arbre gz).
- CPU backend ≈ 150–200 ms de compressió per visitant nou (threadpool, no bloqueja
  l'event loop). I/O de disc ≈ 0 en calent (caché en memòria verificada).
- RAM del stack < 1 GB (caché GeoJSON ≤ ~100 MB al pitjor cas).
- **Conclusió: 100 usuaris concurrents amb molta folgança.** El coll d'ampolla que
  ho hauria impedit (A1, rate limit compartit) està corregit.

## Verificat i està bé

- GeoJSON: gzip actiu (−74%), whitelists client i servidor coherents, caché en
  memòria, Cache-Control 24h; arbre amb caché + ETag (13 KB gz).
- Backend: Express 5 amb error handler central; helmet/CORS/límits; auth sòlida.
- Frontend: totes les rutes lazy; code-splitting real (Leaflet en chunk propi de
  171 KB / 50 KB gz); cap dependència pesada injustificada (l'única anomalia era
  flag-icons, corregida).
- CI amb caché npm; format+type-check+lint+tests+build.
- Docker: multi-stage, no-root, .dockerignore exclou els 115 MB de dades, BD i
  backend sense ports exposats a prod, paritat dev/prod real.
