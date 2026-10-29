import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import territorisRouter from './routes/territoris'
import geojsonRouter from './routes/geojson'
import llocsRouter from './routes/llocs'
import authRouter from './routes/auth'
import { pool } from './db'

const app = express()
const port = process.env.PORT ?? 3000

// No revelar la tecnologia del servidor (fingerprinting).
app.disable('x-powered-by')

// Un salt de proxy davant (Caddy a producció, proxy de Vite en dev): sense
// això req.ip és la IP del contenidor del proxy — idèntica per a tothom — i
// el rate limiting es converteix en un únic cub compartit per tots els usuaris
// (express-rate-limit v8 ho detecta i llança ERR_ERL_UNEXPECTED_X_FORWARDED_FOR).
app.set('trust proxy', 1)

// Cabeceres de seguretat (clickjacking, MIME-sniffing, etc.).
app.use(helmet())

// Compressió gzip/br: els GeoJSON són text molt repetitiu i comprimeixen ~75%.
app.use(compression())

// CORS restringit per llista blanca (configurable via CORS_ORIGINS).
const ORIGENS = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
app.use(cors({ origin: ORIGENS, credentials: true }))

// Anti-CSRF (defensa en profunditat: la cookie de sessió SameSite=Strict ja és
// la primera barrera). Una petició que canvia coses (POST/PUT/PATCH/DELETE)
// només s'accepta si ve de la pròpia web:
//   - navegadors moderns en HTTPS o localhost: ho diu Sec-Fetch-Site;
//   - si no l'envien (HTTP no segur, p. ex. dev des del mòbil per la LAN, o
//     navegadors antics), l'Origin ha de ser a CORS_ORIGINS o ser el mateix host
//     al qual es parla (Caddy i el proxy de Vite conserven el Host);
//   - sense cap de les dues capçaleres no és un navegador (curl, scripts) i no
//     hi ha cap cookie de víctima en joc.
// Staging i producció són el mateix "site" (viscalaterra.cat): per això
// s'exigeix same-origin, no same-site.
const METODES_SEGURS = new Set(['GET', 'HEAD', 'OPTIONS'])

function venDeLaPropiaWeb(req: Request): boolean {
  const lloc = req.headers['sec-fetch-site']
  if (lloc === 'same-origin' || lloc === 'none') return true
  const origen = req.headers.origin
  if (!origen) return lloc === undefined
  if (ORIGENS.includes(origen)) return true
  if (lloc !== undefined) return false
  try {
    return new URL(origen).host === req.headers.host
  } catch {
    return false // Origin mal format, p. ex. "null"
  }
}

app.use((req, res, next) => {
  if (METODES_SEGURS.has(req.method) || venDeLaPropiaWeb(req)) return next()
  res.status(403).json({ codi: 'origen_no_permes' })
})

// Límit explícit de payload (cap endpoint actual consumeix body gran).
// inflate: false → rebutja (415) els cossos comprimits (gzip/deflate/br): el
// frontend mai n'envia, i així cap client extern no posa a treballar els
// descompressors de Node amb dades seves (p. ex. CVE-2026-111497, Brotli).
app.use(express.json({ limit: '100kb', inflate: false }))

// Rate limiting: protegeix el pool de Postgres i el stream de GeoJSON d'un DoS trivial.
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 120),
    standardHeaders: true,
    legacyHeaders: false,
  })
)

// Salut: 200 només si el procés respon I la BD també (SELECT 1); si no, 503. El
// fa servir el healthcheck dels compose (el servidor web no arrenca fins que el
// backend està sa). No és públic: Caddy només passa /api/* al backend.
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', project: 'viscalaterra' })
  } catch {
    res.status(503).json({ status: 'bd_no_disponible' })
  }
})

app.use('/api/auth', authRouter)
app.use('/api/territoris', territorisRouter)
app.use('/api/geojson', geojsonRouter)
app.use('/api/llocs', llocsRouter)

// Gestor d'errors centralitzat: registra internament i mai filtra detalls al client.
// Els errors del client que llança express.json (JSON mal format → 400, cos massa
// gran → 413, cos comprimit → 415) porten un `status` 4xx: es respon amb aquest
// codi i un missatge genèric, no com un 500 (no és una fallada del servidor).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: unknown } | null)?.status
  if (typeof status === 'number' && status >= 400 && status < 500) {
    if (!res.headersSent) res.status(status).json({ error: 'Petició no vàlida' })
    return
  }
  console.error(err)
  if (res.headersSent) return
  res.status(500).json({ error: 'Error intern' })
})

const server = app.listen(port, () => {
  console.log(`Backend escoltant al port ${port}`)
})

// Aturada neta: com a PID 1 dins Docker, Node ignora SIGTERM per defecte i
// cada redeploy esperava els 10 s de gràcia i tallava respostes en vol.
process.on('SIGTERM', () => {
  server.close(() => process.exit(0))
})
