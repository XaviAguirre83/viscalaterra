# Auditoría de seguridad — viscalaterra.cat

- **Fecha:** 2026-06-03
- **Alcance:** backend (Express + pg), base de datos (PostgreSQL/PostGIS), infraestructura Docker, frontend (Vue 3 + Vite), dependencias.
- **Commit auditado:** rama `main` (HEAD `0d844f0`).
- **Estado del proyecto:** prototipo en desarrollo. Aún no hay autenticación, ni endpoints de escritura expuestos, ni despliegue en producción. Esto modula la severidad de varios hallazgos: muchos son **aceptables en desarrollo local pero bloqueantes antes de producción**.

---

## Resumen ejecutivo

| Severidad | Conteo | Hallazgos                                                                                                                                                                                                                         |
| --------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRÍTICA   | 0      | —                                                                                                                                                                                                                                 |
| ALTA      | 3      | H-01 (sin Helmet/headers), H-02 (CORS abierto), H-03 (sin rate limiting / sin timeouts ni límites de payload)                                                                                                                     |
| MEDIA     | 4      | M-01 (fuga de stack traces / sin error handler), M-02 (Postgres y backend con puertos publicados al host), M-03 (contenedores como root + bind-mount del código), M-04 (`fs.existsSync` + stream sin manejo de errores de stream) |
| BAJA      | 3      | B-01 (sin validación estricta de `zoom`), B-02 (`.env.example` con `VITE_API_URL` y patrón de despliegue), B-03 (sin `.dockerignore`, build copia `node_modules`/secretos potenciales)                                            |
| INFO      | 4      | I-01 (sin SQL injection: queries parametrizadas), I-02 (sin XSS en frontend), I-03 (dependencias sin CVEs: `npm audit` = 0), I-04 (no hay auth todavía — esperado, pero planificada)                                              |

**Veredicto global:** la base es **sólida y limpia** para un prototipo. No se ha encontrado inyección SQL, ni XSS, ni secretos hardcodeados en el repositorio, ni dependencias vulnerables. Los hallazgos ALTA/MEDIA son carencias de _hardening_ (cabeceras, CORS, límites, aislamiento de contenedores, manejo de errores) que deben resolverse **antes de exponer el backend a una red no confiable o a producción**, pero no representan una explotación activa en el entorno local actual.

---

## Detalle de hallazgos

### I-01 (INFO) — No hay inyección SQL. Queries correctamente parametrizadas

**Ubicación:** `backend/src/routes/territoris.ts:19-33`, `backend/src/scripts/seed-geodata.ts:53-124`.

Todas las consultas SQL son **estáticas** (sin interpolación de input) o usan **placeholders parametrizados** de `pg` (`$1..$8`). Ejemplos:

- `territoris.ts:32` — `SELECT ... FROM municipis ORDER BY nom` es una cadena constante, sin variables.
- `seed-geodata.ts:53-58` — `INSERT INTO provincies ... VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))` con array de valores `[p.CODIPROV, p.NOMPROV, JSON.stringify(f.geometry)]`.

El driver `pg` envía los valores fuera del texto SQL, por lo que no hay vector de inyección aunque los datos GeoJSON del ICC contuvieran caracteres especiales. **No se requiere acción.** Mantener este patrón (nunca construir SQL por concatenación) en futuros endpoints.

---

### I-02 (INFO) — No hay XSS en el frontend

**Ubicación:** búsqueda en `frontend/src/**`.

- `grep` de `v-html`, `innerHTML`, `outerHTML`, `eval(`, `new Function`, `document.write`, `insertAdjacentHTML`: **0 coincidencias**.
- Los datos del backend se renderizan exclusivamente con **interpolación de plantilla Vue** (`{{ ... }}`), que escapa HTML automáticamente. Ej.: `frontend/src/components/mapa/MapaLeaflet.vue:701,714` (`{{ filesHover?.comarca }}`, `{{ filesHover?.municipi }}`).
- **No hay popups ni tooltips de Leaflet** con `bindPopup`/`setContent` (que serían un vector clásico de XSS al inyectar HTML crudo). 0 coincidencias.
- **No se manejan tokens/secretos en cliente**: 0 usos de `localStorage`, `sessionStorage`, `jwt`, `token`, `password`, `secret`, `apiKey`.

**No se requiere acción.** Recomendación preventiva: si en el futuro se usan popups de Leaflet, no construir su HTML concatenando nombres de municipios u otro texto de origen externo sin escaparlo.

---

### I-03 (INFO) — Dependencias sin vulnerabilidades conocidas

**Resultado de `npm audit`:**

- `backend`: `{ critical: 0, high: 0, moderate: 0, low: 0 }` — **0 vulnerabilidades**.
- `frontend`: **0 vulnerabilities found**.

Versiones resueltas relevantes: `express@5.2.1` (rama 5.x, actual), `pg@8.21.0`, `cors@2.8.6`, `vite@8`, `vue@3.5.x`, `leaflet@1.9.4`. Todas recientes.

**Acción:** integrar `npm audit` (o Dependabot) en el CI de `.github/workflows/ci.yml` para detección continua; hoy el CI no ejecuta auditoría de dependencias.

---

### I-04 (INFO) — Ausencia de autenticación (esperado en esta fase)

El stack documenta JWT + bcrypt (`CLAUDE.md`) y `.env.example` reserva `JWT_SECRET`/`JWT_EXPIRES_IN`, pero **aún no hay código de auth ni endpoints que la requieran**. Los dos endpoints actuales (`/api/territoris/arbre`, `/api/geojson/:nivell`) son de **solo lectura de datos públicos** (divisiones administrativas del ICC), por lo que la falta de auth es correcta hoy.

**Acción futura:** cuando se introduzcan endpoints de escritura (usuarios, agenda, trivial multijugador), exigir auth y autorización por endpoint desde el primer commit. Generar `JWT_SECRET` con alta entropía (≥256 bits) y nunca con valor por defecto.

---

### H-01 (ALTA) — Backend sin cabeceras de seguridad (Helmet ausente)

**Ubicación:** `backend/src/index.ts:6-17`.

La app Express no aplica ninguna cabecera de seguridad. No están presentes `helmet`, ni `X-Content-Type-Options`, `X-Frame-Options`/CSP (clickjacking), `Referrer-Policy`, ni desactivación de `X-Powered-By` (Express revela `X-Powered-By: Express` por defecto, facilitando _fingerprinting_).

**Impacto:** en producción, las respuestas (incluido el JSON de la API y, si se sirviera HTML, el frontend) quedan sin protección frente a _sniffing_ de MIME, _framing_ y _fingerprinting_. Severidad ALTA condicionada a exposición pública; baja en localhost.

**Corrección:**

```ts
// backend/src/index.ts
import helmet from 'helmet' // npm i helmet
app.disable('x-powered-by')
app.use(helmet())
```

---

### H-02 (ALTA) — CORS abierto a cualquier origen

**Ubicación:** `backend/src/index.ts:9` → `app.use(cors())`.

`cors()` sin opciones responde `Access-Control-Allow-Origin: *`, permitiendo que **cualquier sitio web** invoque la API desde el navegador de un usuario.

**Impacto:** hoy el riesgo es bajo (datos públicos de solo lectura, sin cookies de sesión). Pero en cuanto se añada autenticación basada en cookies o se sirvan datos no públicos, un CORS comodín permite peticiones cross-site no deseadas. Debe restringirse **antes** de introducir auth.

**Corrección:** lista blanca por entorno.

```ts
const ORIGENS = (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',')
app.use(cors({ origin: ORIGENS, credentials: true }))
```

---

### H-03 (ALTA) — Sin rate limiting, sin límite de payload explícito ni timeouts

**Ubicación:** `backend/src/index.ts:10` (`express.json()` sin opciones), ausencia de middleware de límite de peticiones; `backend/src/routes/geojson.ts:68` (stream de ficheros grandes).

- **Sin rate limiting:** cualquier cliente puede inundar `/api/territoris/arbre` (que abre conexión al pool y ejecuta 4 queries) o `/api/geojson/:nivell` (que hace stream de ficheros GeoJSON de hasta varios MB). Vector trivial de DoS / agotamiento del pool de conexiones.
- **`express.json()` sin `limit`:** por defecto acepta cuerpos de hasta ~100 kB; aceptable, pero conviene fijarlo explícitamente. Hoy ningún endpoint consume body, así que el riesgo es menor, pero el middleware está activo globalmente.

**Impacto:** denegación de servicio y consumo de ancho de banda/CPU. ALTA de cara a exposición pública.

**Corrección:**

```ts
import rateLimit from 'express-rate-limit' // npm i express-rate-limit
app.use(express.json({ limit: '100kb' }))
app.use(rateLimit({ windowMs: 60_000, max: 120 }))
```

Además, considerar `Cache-Control` (ya presente en geojson) y servir los GeoJSON estáticos vía CDN/Nginx en producción en lugar de Node.

---

### M-01 (MEDIA) — Posible fuga de stack traces y sin error handler centralizado

**Ubicación:** `backend/src/index.ts` (no hay middleware de error), `backend/src/routes/territoris.ts:15-78` (handler `async` con `try/finally` pero **sin `catch`**).

El handler de `/arbre` usa `try { ... } finally { client.release() }` sin `catch`. Si una query falla, la promesa se rechaza y, en Express 5, el error se propaga al **manejador de errores por defecto**, que en `NODE_ENV` distinto de `production` responde con el **stack trace completo** en el cuerpo HTTP. No hay un error handler propio que normalice respuestas ni oculte detalles.

**Impacto:** exposición de rutas de ficheros internas, versiones, y estructura del código ante errores. MEDIA.

**Corrección:** añadir un error handler final que no filtre detalles y registre internamente.

```ts
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Error intern' })
})
```

Y asegurar `NODE_ENV=production` en despliegue (hoy `.env.example` fija `NODE_ENV=development`).

---

### M-02 (MEDIA) — PostgreSQL y backend con puertos publicados al host

**Ubicación:** `docker-compose.yml:10-11` (`${DB_PORT:-5432}:5432`), `docker-compose.yml:29-30` (`${PORT:-3000}:3000`).

El contenedor de Postgres publica el puerto 5432 en el host, y el backend el 3000. En una máquina de desarrollo es cómodo, pero si este compose se reutilizara en un servidor (o el host tiene el firewall abierto en LAN), **la base de datos queda accesible directamente** desde la red.

**Impacto:** superficie de ataque sobre Postgres (depende de la fortaleza de `DB_PASSWORD`). MEDIA en desarrollo; ALTA si se reusa en servidor.

**Corrección:** para producción, **no publicar** el puerto de la DB (el backend la alcanza por la red interna de Docker). Si se necesita acceso local, enlazar solo a loopback:

```yaml
ports:
  - '127.0.0.1:5432:5432' # solo accesible desde el propio host
```

Y un compose de producción separado que omita por completo el `ports` de `db`.

---

### M-03 (MEDIA) — Contenedores corriendo como root y bind-mount del código + `npm install` en arranque

**Ubicación:** `backend/Dockerfile.dev:1-14`, `frontend/Dockerfile.dev:1-12`, `docker-compose.yml:28,31-32,45,48-49`.

- Ninguna imagen define `USER`; ambos contenedores corren como **root**.
- El compose monta el código del host como volumen (`./backend:/app`, `./frontend:/app`) y ejecuta `npm install && npm run dev` en el `command`. Esto significa que **cualquier paquete instalado en tiempo de arranque corre como root** y puede escribir en el árbol de código del host vía el bind-mount.

**Impacto:** una dependencia maliciosa (o un _postinstall_ comprometido) tendría privilegios de root dentro del contenedor y acceso de escritura al repo. Son `Dockerfile.dev` (desarrollo), por lo que el riesgo es contextual, pero conviene mitigar.

**Corrección:** añadir usuario no-root en los Dockerfiles de producción y evitar `npm install` en el `command` (usar la instalación de la imagen):

```dockerfile
RUN addgroup -S app && adduser -S app -G app
USER app
```

Para producción, construir imágenes inmutables (sin bind-mount del código ni `npm install` en runtime).

---

### M-04 (MEDIA) — `fs.existsSync` + `createReadStream` sin manejo de error de stream

**Ubicación:** `backend/src/routes/geojson.ts:59-68`.

El handler comprueba `fs.existsSync(fitxerPath)` y luego hace `fs.createReadStream(fitxerPath).pipe(res)`. Hay una **condición de carrera** (TOCTOU) entre la comprobación y la lectura, y **no se gestiona el evento `error`** del stream. Si el fichero desaparece, hay un fallo de E/S, o el cliente corta la conexión, el stream emite `error` sin listener → **excepción no capturada** que puede tumbar el proceso Node.

**Impacto:** crash del backend por E/S no manejada; DoS. MEDIA.

**Nota positiva:** **no hay path traversal**. `nivell` se valida contra `NIVELLS_VALIDS` (whitelist, `geojson.ts:49`) y `nomFitxer` se construye con una plantilla fija a partir de `resolucio`, que proviene de una tabla interna (`resolucioPerZoom`), no del input del usuario. El `zoom` se parsea con `parseInt` y solo selecciona entre valores predefinidos. Correcto.

**Corrección:** eliminar `existsSync`, abrir el stream y manejar errores:

```ts
const stream = fs.createReadStream(fitxerPath)
stream.on('error', () => {
  if (!res.headersSent) res.status(503).json({ error: 'Geodades no disponibles' })
  else res.destroy()
})
stream.pipe(res)
```

---

### B-01 (BAJA) — Validación laxa del parámetro `zoom`

**Ubicación:** `backend/src/routes/geojson.ts:46-47`.

`const zoom = parseInt(String(...)) || 8`. Acepta cualquier cosa y cae a 8 si no es numérico; valores negativos o enormes se aceptan pero solo influyen en una tabla de búsqueda acotada (`resolucioPerZoom`). No es explotable (no llega a SQL ni a path), pero conviene validar rango por higiene.

**Corrección:** acotar `zoom` a `[0, 20]` y rechazar fuera de rango con 400, o `clamp`.

---

### B-02 (BAJA) — `.env.example` correcto, sin secretos reales; `.env` real no está en git

**Ubicación:** `.env.example`, `.gitignore`, comprobación de `git ls-files`.

- `.env.example` (`.env.example:11-19`) tiene `DB_USER=`, `DB_PASSWORD=`, `JWT_SECRET=` **vacíos** — correcto, no hay credenciales reales comprometidas en el repo.
- Existe un `.env` real en el disco (`/home/xavi/Developer/VLT/.env`) con `DB_USER`, `DB_PASSWORD` y `JWT_SECRET` rellenados, pero **está en `.gitignore` y NO está trackeado** (`git ls-files` solo devuelve `.env.example`). Correcto.

**Observación (BAJA):** `.env.example:23` fija `VITE_API_URL=http://localhost:3000`, pero el frontend ya usa rutas relativas + proxy de Vite (`vite.config.ts:18-19`), por lo que esa variable parece obsoleta y podría inducir a confusión/configuración insegura en despliegue. Revisar si `VITE_API_URL` sigue siendo necesaria. **Recordatorio:** cualquier variable `VITE_*` se incrusta en el bundle del cliente y es pública — nunca poner secretos ahí.

---

### B-03 (BAJA) — Sin `.dockerignore`: el build copia `node_modules`, `.env`, etc.

**Ubicación:** `backend/Dockerfile.dev:10` (`COPY . .`), `frontend/Dockerfile.dev:8` (`COPY . .`); no existe `.dockerignore` en `backend/` ni `frontend/`.

`COPY . .` sin `.dockerignore` arrastra al contexto/imagen todo el directorio: `node_modules` del host (puede romper la build por binarios incompatibles), ficheros de test, y **un eventual `.env`** si se colocara dentro de `backend/`/`frontend/`. En desarrollo el bind-mount lo enmascara, pero para imágenes de producción es un riesgo de inclusión de secretos.

**Corrección:** crear `.dockerignore` en cada paquete:

```
node_modules
dist
.env
.env.*
*.log
coverage
```

---

## Top 5 acciones prioritarias

1. **Añadir Helmet + cerrar CORS + desactivar `x-powered-by`** (H-01, H-02). Tres líneas en `backend/src/index.ts`; eliminan clickjacking, MIME-sniffing, fingerprinting y el CORS comodín que será peligroso en cuanto haya auth.
2. **Rate limiting y límites de payload** (H-03): `express-rate-limit` + `express.json({ limit })`. Protege el pool de Postgres y el stream de GeoJSON frente a DoS trivial.
3. **Error handler centralizado + `NODE_ENV=production` en despliegue + `catch` en `/arbre`** (M-01): evita fuga de stack traces y respuestas internas; normaliza errores a `{ error: 'Error intern' }`.
4. **Hardening de la infraestructura Docker para producción** (M-02, M-03): no publicar el puerto de Postgres (o ligarlo a `127.0.0.1`), añadir `USER` no-root, imágenes de producción inmutables sin `npm install` en runtime ni bind-mounts.
5. **Robustecer el stream de GeoJSON** (M-04): sustituir `existsSync` por apertura directa con listener `error` en el stream, para que un fallo de E/S o un cliente que corta no derribe el proceso.

**Bonus (continuo):** integrar `npm audit` en el CI (I-03) y, antes de implementar auth (I-04), generar `JWT_SECRET` de alta entropía, exigir autorización por endpoint y restringir CORS con `credentials`.
