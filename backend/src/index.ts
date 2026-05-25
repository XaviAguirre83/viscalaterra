import express from 'express'
import cors from 'cors'
import territorisRouter from './routes/territoris'
import geojsonRouter from './routes/geojson'

const app = express()
const port = process.env.PORT ?? 3000

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', project: 'viscalaterra' })
})

app.use('/api/territoris', territorisRouter)
app.use('/api/geojson', geojsonRouter)

app.listen(port, () => {
  console.log(`Backend escoltant al port ${port}`)
})
