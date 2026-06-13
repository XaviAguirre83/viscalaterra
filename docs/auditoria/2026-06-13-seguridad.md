---
titulo: Auditoría de seguridad — viscalaterra.cat
fecha: 2026-06-13
auditoria_previa: docs/auditoria/01-seguridad.md (2026-06-03)
rama: feature/auditoria-bloque-1-2
alcance: backend (Express + pg), frontend (Vue 3 + Vite), infraestructura Docker/Caddy, gestión de secretos, dependencias
---

# Auditoría de seguridad — viscalaterra.cat

- **Fecha:** 2026-06-13
- **Auditoría previa:** `docs/auditoria/01-seguridad.md` (2026-06-03).
- **Estado del proyecto:** prototipo en desarrollo. Sin autenticación implementada (JWT+bcrypt previstos pero no escritos). Solo endpoints de lectura de datos públicos del ICGC. Esto modula la severidad: varios hallazgos son aceptables en desarrollo local pero bloqueantes antes de producción.

---

## Resumen ejecutivo

Desde la auditoría del 2026-06-03 se ha aplicado **prácticamente todo el hardening recomendado**: Helmet, CORS por lista blanca, `x-powered-by` desactivado, rate limiting, límite de payload, error handler centralizado, eliminación del TOCTOU del stream de GeoJSON (ahora `readFile` con manejo de `ENOENT`), puertos de DB/backend ligados a `127.0.0.1`, `docker-compose.prod.yml` con imágenes multi-stage, usuario no-root (`USER node`) y `.dockerignore` en ambos paquetes. La base sigue siendo **sólida y limpia**: sin inyección SQL, sin XSS, sin secretos reales en el repositorio.

Los hallazgos nuevos se concentran en: una vulnerabilidad de dependencia (dev-only) reportada por `npm audit`, la **ausencia de cabeceras de seguridad en Caddy** (Helmet protege la API JSON pero NO el HTML de la SPA, que lo sirve Caddy), y detalles de hardening de cara a cuando se conecte la auth real.

| Severidad      | Conteo | Hallazgos                                                                                                                                                                           |
| -------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 Crítico     | 0      | —                                                                                                                                                                                   |
| 🟠 Alto        | 1      | A-01 (Caddy sin cabeceras de seguridad para la SPA)                                                                                                                                 |
| 🟡 Medio       | 3      | M-01 (`npm audit`: shell-quote 1.8.3), M-02 (auth mock → riesgos al conectar), M-03 (CI sin `npm audit`)                                                                            |
| 🔵 Bajo        | 4      | B-01 (`.env` con secretos placeholder débiles), B-02 (CSP de Helmet por defecto laxa para la API), B-03 (validación `resolucio`/`zoom`), B-04 (sin límite de tamaño de `fileCache`) |
| ℹ️ Informativo | 5      | I-01 (SQL parametrizado OK), I-02 (sin XSS), I-03 (frontend sin tokens/localStorage sensible), I-04 (secretos no en git), I-05 (preparación de auth)                                |

**Veredicto:** listo para seguir desarrollando con tranquilidad. Antes de exponer a producción, cerrar A-01 (cabeceras en Caddy) y M-03 (audit en CI), y al implementar la auth atender M-02 y B-01.

---

## Estado de las recomendaciones previas (2026-06-03)

| Prev. | Descripción                                  | Estado 2026-06-13                                                                    |
| ----- | -------------------------------------------- | ------------------------------------------------------------------------------------ |
| H-01  | Helmet / cabeceras / `x-powered-by`          | ✅ Resuelto (`index.ts:13,16`)                                                       |
| H-02  | CORS abierto                                 | ✅ Resuelto: lista blanca por `CORS_ORIGINS` (`index.ts:22-26`)                      |
| H-03  | Rate limiting + límite de payload            | ✅ Resuelto (`index.ts:29,32-39`)                                                    |
| M-01  | Stack traces / error handler                 | ✅ Resuelto: handler centralizado (`index.ts:50-54`), `catch`/`next` en routes       |
| M-02  | Puertos de Postgres/backend publicados       | ✅ Resuelto: ligados a `127.0.0.1` (dev) / sin `ports` (prod)                        |
| M-03  | Contenedores root + bind-mount + npm install | ✅ Parcial: prod usa `USER node` e imágenes inmutables; dev sigue root (aceptable)   |
| M-04  | TOCTOU del stream de GeoJSON                 | ✅ Resuelto: `readFile` + manejo de `ENOENT`, sin `existsSync` (`geojson.ts:93-107`) |
| B-01  | Validación de `zoom`                         | ⚠️ Parcial: hay whitelist de resolución, pero `parseInt` sigue laxo → ver B-03       |
| B-02  | `.env.example` / `VITE_API_URL` obsoleta     | ✅ Documentado claramente en `.env.example`                                          |
| B-03  | Sin `.dockerignore`                          | ✅ Resuelto: `backend/.dockerignore`, `frontend/.dockerignore`                       |
| I-03  | `npm audit` limpio                           | ⚠️ Cambió: ahora 1 vuln crítica dev-only (ver M-01)                                  |

---

## Detalle de hallazgos nuevos / vigentes

### 🟠 A-01 (ALTO) — Caddy sirve la SPA sin cabeceras de seguridad

**Ubicación:** `frontend/Caddyfile:6-23`.

En producción, **Caddy** (no Express) sirve el HTML/JS/CSS de la SPA y hace de reverse proxy a `/api/*`. Helmet (`backend/src/index.ts:16`) solo añade cabeceras a las **respuestas JSON de la API**; el documento HTML que carga el navegador y ejecuta todo el JavaScript del cliente sale de Caddy **sin ninguna cabecera de seguridad**: no hay `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security` ni `Permissions-Policy`.

**Riesgo:** la página principal queda expuesta a clickjacking (framing), a MIME-sniffing y, lo más relevante, sin **CSP** que limite el daño de un futuro XSS o de scripts de terceros. HSTS ausente permite downgrade a HTTP en el primer acceso. Severidad ALTA condicionada a exposición pública (hoy en local no aplica).

**Recomendación:** añadir un bloque `header` en el `Caddyfile`. Ejemplo de partida:

```caddy
{$SITE_ADDRESS} {
	encode gzip zstd

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		Permissions-Policy "geolocation=(), camera=(), microphone=()"
		Content-Security-Policy "default-src 'self'; img-src 'self' data: https://*.tile.openstreetmap.org; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'"
		-Server
	}

	handle /api/* { reverse_proxy backend:3000 }
	handle { root * /srv; try_files {path} /index.html; file_server }
}
```

Ajustar la CSP a los orígenes reales (tiles del mapa Leaflet, fuentes de vídeo de la cabecera, etc.) y probarla en modo `Content-Security-Policy-Report-Only` antes de aplicarla en bloqueo.

---

### 🟡 M-01 (MEDIO) — `npm audit`: vulnerabilidad crítica en `shell-quote@1.8.3` (dev-only)

**Ubicación:** `package-lock.json` → `node_modules/shell-quote` (1.8.3); cadena `frontend → npm-run-all2@8.0.4 → shell-quote`.

`npm audit` (raíz y workspace frontend) reporta **1 vulnerabilidad crítica**: GHSA-w7jw-789q-3m8p (`shell-quote.quote()` no escapa saltos de línea en `.op`). Matices que **reducen el riesgo real**:

- Es una dependencia **transitiva de desarrollo** (`npm-run-all2`, herramienta de build/scripts). **No forma parte del bundle del cliente ni del runtime del backend** — no llega a producción.
- La función vulnerable es `quote()`, que `npm-run-all2` no usa con entrada controlada por un atacante.
- El árbol instalado contiene además un `1.8.4` (ya parcheado) deduplicado; el problema es que el **lockfile** fija `1.8.3`.

Aun así, una vuln "crítica" en el lockfile ensucia cualquier gate de CI y conviene cerrarla.

**Recomendación:** `npm audit fix` (no instalar nada ahora; el usuario pidió no instalar). Esto debería elevar `shell-quote` a ≥1.8.4 en el lockfile. Verificar luego con `npm audit` que queda en 0.

---

### 🟡 M-02 (MEDIO) — El store `auth.ts` es un mock; riesgos a vigilar al conectar la auth real

**Ubicación:** `frontend/src/stores/auth.ts`.

El store actual es un mock en memoria correcto y honesto (`entra(nom)` no valida ni persiste, comentario `⚠️ MOCK temporal`). No es un bug hoy. Pero conviene dejar registradas las decisiones de seguridad para cuando se conecte al backend JWT, porque son fáciles de equivocar:

- **No guardar el JWT en `localStorage`/`sessionStorage`** (accesible desde JS → robable por XSS). Preferir **cookie `HttpOnly` + `Secure` + `SameSite=Strict/Lax`** emitida por el backend. Hoy `index.ts:26` ya usa `cors({ credentials: true })`, coherente con cookies.
- Si se usan cookies de sesión, será **obligatorio CSRF protection** (token o `SameSite` estricto) y CORS con lista blanca real (no comodín) — ya preparado.
- El estado `autenticat` del cliente **nunca** debe ser la fuente de verdad de autorización: cada endpoint protegido debe validar el token en el servidor.

**Recomendación:** documentar estas decisiones en el plan y aplicarlas en el primer commit de auth. No hay acción de código inmediata.

---

### 🟡 M-03 (MEDIO) — El CI no ejecuta `npm audit`

**Ubicación:** `.github/workflows/*.yml` (solo `npm ci`, sin paso de auditoría).

Como demuestra M-01, una dependencia vulnerable puede colarse entre commits sin que nadie lo note. El CI instala (`npm ci`) pero no audita.

**Recomendación:** añadir un paso `npm audit --audit-level=high` (o `--omit=dev` si se prefiere ignorar las dev) al workflow, o activar Dependabot. Decidir si las vulns dev-only deben romper el build (recomiendo `--audit-level=high` sobre prod deps + alerta no bloqueante sobre dev).

---

### 🔵 B-01 (BAJO) — `.env` local con secretos placeholder débiles

**Ubicación:** `/home/xavi/Developer/VLT/.env` (no trackeado).

El `.env` real contiene `DB_PASSWORD=viscalaterra_dev` y `JWT_SECRET=canvia_aquest_secret_en_produccio`. **Correcto en desarrollo local** y **no está en git** (`.gitignore:4` cubre `.env`, confirmado). El riesgo es de proceso: estos valores son tentadores de reusar tal cual en el VPS.

**Recomendación:** al desplegar, generar `JWT_SECRET` de alta entropía (`openssl rand -base64 48`) y `DB_PASSWORD` fuerte y único. El `.env.example` ya lo recuerda (`:54-55`). Considerar un `.env.prod` separado o secrets del gestor del VPS.

---

### 🔵 B-02 (BAJO) — CSP por defecto de Helmet sobre la API (poco impacto)

**Ubicación:** `backend/src/index.ts:16` (`helmet()` sin opciones).

Helmet por defecto añade una CSP `default-src 'self'`, pensada para servir HTML. Como Express solo devuelve JSON (la SPA la sirve Caddy, ver A-01), esta CSP no protege nada útil pero tampoco molesta. Es informativo más que un riesgo. Si en algún caso el backend respondiera HTML (páginas de error, futuras vistas SSR), revisar que la CSP sea adecuada.

**Recomendación:** ninguna acción urgente. La protección real de la SPA debe ir en Caddy (A-01).

---

### 🔵 B-03 (BAJO) — Validación laxa de `resolucio`/`zoom` (no explotable)

**Ubicación:** `backend/src/routes/geojson.ts:64-72`.

`parseInt(String(...))` sobre `resolucio`/`zoom` acepta entrada arbitraria, pero el resultado se valida después contra `RESOLUCIONS_VALIDES` (whitelist, `geojson.ts:74`) y `nivell` contra `NIVELLS_VALIDS` (`:58`). El nombre de fichero se compone con plantilla fija (`:82`) a partir de valores ya validados. **No hay path traversal** y no es explotable. Solo es higiene de entrada.

**Recomendación:** opcional — rechazar con 400 si `parseInt` da `NaN` para `resolucio` explícita (hoy cae al chequeo de whitelist y también responde 400, así que el comportamiento ya es seguro). Sin cambio obligatorio.

---

### 🔵 B-04 (BAJO) — `fileCache` en memoria sin límite de tamaño

**Ubicación:** `backend/src/routes/geojson.ts:40,85-98`.

`fileCache` es un `Map` que crece sin cota. El conjunto de ficheros servibles está acotado por la whitelist (`nivells × resolucions` ≈ 25 ficheros, ~varios MB), así que en la práctica el crecimiento es limitado y no es un DoS. Solo se anota por completitud: si en el futuro la matriz de ficheros crece mucho, convendría un LRU o un límite.

**Recomendación:** ninguna acción ahora. Tenerlo presente si se amplían los datasets servidos por este endpoint.

---

## Hallazgos informativos (sin acción)

### ℹ️ I-01 — SQL correctamente parametrizado, sin inyección

`backend/src/routes/territoris.ts:28-42` usa consultas estáticas; `backend/src/scripts/seed-geodata.ts:53-124` usa placeholders `$1..$8` del driver `pg`. El GeoJSON entra como valor parametrizado, nunca concatenado. Mantener este patrón en futuros endpoints (especialmente cuando lleguen filtros dinámicos de Què?/Quan?).

### ℹ️ I-02 — Sin XSS en el frontend

`grep` de `v-html`, `innerHTML`, `outerHTML`, `eval(`, `new Function`, `document.write`, `insertAdjacentHTML`, `bindPopup`, `bindTooltip`, `setContent`: **0 coincidencias**. Todo se renderiza con interpolación Vue (escapada). Sin popups de Leaflet con HTML crudo.

### ℹ️ I-03 — El frontend no maneja tokens ni datos sensibles en cliente

`localStorage` solo se usa para la preferencia de idioma (`frontend/src/i18n/index.ts:43,64`). Las llamadas `fetch` usan **URLs relativas** (`/api/...`) — sin secretos ni hosts hardcodeados (`stores/territoris.ts:17`, `components/mapa/MapaLeaflet.vue:786,856`).

### ℹ️ I-04 — Secretos no presentes en el repositorio

`.env.example` tiene `DB_USER`/`DB_PASSWORD`/`JWT_SECRET` vacíos. El `.env` real está cubierto por `.gitignore` y no trackeado. `.dockerignore` de ambos paquetes excluye `.env`. No hay secretos hardcodeados en código ni en los compose (todo vía `${VAR}`).

### ℹ️ I-05 — Preparación de auth adecuada

`.env.example` reserva `JWT_SECRET`/`JWT_EXPIRES_IN`; CORS ya admite `credentials: true`. La base está lista para una auth basada en cookie `HttpOnly` (ver M-02). La ausencia de auth hoy es correcta: los dos endpoints son de lectura de datos públicos del ICGC.

---

## Acciones prioritarias

1. **A-01** — Añadir bloque `header` con CSP/HSTS/X-Frame-Options en `frontend/Caddyfile` antes de exponer la SPA a internet.
2. **M-01** — `npm audit fix` para sacar `shell-quote` del lockfile en versión vulnerable.
3. **M-03** — Añadir `npm audit` (o Dependabot) al CI para no reincidir.
4. **M-02 / B-01** — Al conectar la auth real: JWT en cookie `HttpOnly`+`Secure`+`SameSite`, CSRF, y `JWT_SECRET`/`DB_PASSWORD` fuertes en el VPS (no los placeholders del `.env` local).
