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

app.listen(port, () => {
  console.log(`Backend escoltant al port ${port}`)
})
