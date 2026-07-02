import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import territorisRouter from './routes/territoris'
import geojsonRouter from './routes/geojson'
import authRouter from './routes/auth'

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

// Límit explícit de payload (cap endpoint actual consumeix body gran).
app.use(express.json({ limit: '100kb' }))

// Rate limiting: protegeix el pool de Postgres i el stream de GeoJSON d'un DoS trivial.
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 120),
    standardHeaders: true,
    legacyHeaders: false,
  })
)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', project: 'viscalaterra' })
})

app.use('/api/auth', authRouter)
app.use('/api/territoris', territorisRouter)
app.use('/api/geojson', geojsonRouter)

// Gestor d'errors centralitzat: registra internament i mai filtra detalls al client.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
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
