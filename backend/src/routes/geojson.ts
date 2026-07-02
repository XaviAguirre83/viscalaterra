import { Router, Request, Response, NextFunction } from 'express'
import path from 'path'
import { readFile } from 'fs/promises'
import { gzip, gunzipSync } from 'zlib'
import { promisify } from 'util'
import { createHash } from 'crypto'

const gzipAsync = promisify(gzip)

const router = Router()

const GEOJSON_DIR = path.resolve(__dirname, '../../data/geojson')

// Resolucions GeoJSON disponibles (denominadors d'escala ICC):
// 5000 (màx detall) → 1000000 (mínim detall). Whitelist de seguretat:
// la resolució forma part del nom de fitxer, així evitem construir rutes arbitràries.
const RESOLUCIONS_VALIDES = new Set([5000, 100000, 250000, 500000, 1000000])

// Compatibilitat: si un client antic encara envia ?zoom=, en derivem la resolució.
const RESOLUCIO_PER_ZOOM: [number, number][] = [
  [15, 5000],
  [13, 100000],
  [11, 250000],
  [9, 500000],
  [0, 1000000],
]

const NIVELLS_VALIDS = new Set(['comunitat', 'provincies', 'comarques', 'vegueries', 'municipis'])

// Els fitxers de la comunitat estan anomenats "catalunya" als fitxers ICC,
// però conceptualment el nivell és "comunitat" (autonomia).
const NIVELL_A_NOMBRE_FITXER: Record<string, string> = {
  comunitat: 'catalunya',
}

function resolucioPerZoom(zoom: number): number {
  for (const [minZoom, resolucio] of RESOLUCIO_PER_ZOOM) {
    if (zoom >= minZoom) return resolucio
  }
  return 1000000
}

// Caché en memòria per fitxer: el contingut JA COMPRIMIT (gzip nivell 9) i el
// seu ETag. Es comprimeix UNA vegada en carregar — abans el middleware
// `compression` recomprimia a cada petició (~1 s de CPU per servir
// municipis-5000 encara que el fitxer fos a memòria) — i guardar només el
// comprimit divideix per ~4 la RAM del caché. Es cachea la PROMESA
// (single-flight): dues peticions concurrents del mateix fitxer comparteixen
// lectura i compressió.
interface EntradaCache {
  gzip: Buffer
  etag: string
}

const fileCache = new Map<string, Promise<EntradaCache>>()

function carregaFitxer(fitxerPath: string): Promise<EntradaCache> {
  let entrada = fileCache.get(fitxerPath)
  if (!entrada) {
    entrada = (async (): Promise<EntradaCache> => {
      const original = await readFile(fitxerPath)
      // Compressió asíncrona (threadpool de zlib): no bloqueja l'event loop
      // ni tan sols la primera vegada amb els 29 MB de municipis-5000.
      // Nivell 6 (default): el 9 només guanya ~2% de mida i triga 4× més
      // (mesurat: 9,7 s vs ~2,5 s en la primera càrrega del fitxer gran).
      const comprimit = await gzipAsync(original, { level: 6 })
      // ETag fort sobre el contingut original: només canvia si canvia el fitxer.
      const etag = `"${createHash('sha1').update(original).digest('hex')}"`
      return { gzip: comprimit, etag }
    })()
    // Si la càrrega falla (p. ex. ENOENT abans de col·locar les geodades),
    // s'allibera l'entrada perquè una petició posterior ho pugui reintentar.
    entrada.catch(() => fileCache.delete(fitxerPath))
    fileCache.set(fitxerPath, entrada)
  }
  return entrada
}

/**
 * GET /api/geojson/:nivell?resolucio=N   (preferent)
 * GET /api/geojson/:nivell?zoom=N         (compatibilitat)
 *
 * Serveix el GeoJSON d'un nivell territorial a la resolució demanada.
 * El client calcula la resolució òptima per capa i l'envia explícitament,
 * evitant el desajust on el servidor retornava fitxers molt més pesats del
 * necessari per a províncies i vegueries.
 *
 * Exemples:
 *   /api/geojson/comarques?resolucio=500000
 *   /api/geojson/municipis?resolucio=5000
 */
router.get('/:nivell', async (req: Request, res: Response, next: NextFunction) => {
  const nivell = String(req.params.nivell)

  if (!NIVELLS_VALIDS.has(nivell)) {
    res.status(400).json({ error: `Nivell no vàlid. Opcions: ${[...NIVELLS_VALIDS].join(', ')}` })
    return
  }

  // Resolució: preferim ?resolucio= explícit; si no, la derivem de ?zoom=.
  let resolucio: number
  const resolucioRaw = req.query.resolucio
  if (resolucioRaw !== undefined) {
    resolucio = parseInt(String(Array.isArray(resolucioRaw) ? resolucioRaw[0] : resolucioRaw))
  } else {
    const zoomRaw = req.query.zoom
    const zoom = parseInt(String(Array.isArray(zoomRaw) ? zoomRaw[0] : zoomRaw)) || 8
    resolucio = resolucioPerZoom(zoom)
  }

  if (!RESOLUCIONS_VALIDES.has(resolucio)) {
    res
      .status(400)
      .json({ error: `Resolució no vàlida. Opcions: ${[...RESOLUCIONS_VALIDES].join(', ')}` })
    return
  }

  const nomBase = NIVELL_A_NOMBRE_FITXER[nivell] ?? nivell
  const nomFitxer = `divisions-administratives-v2r1-${nomBase}-${resolucio}-20240118.json`
  const fitxerPath = path.join(GEOJSON_DIR, nivell, nomFitxer)

  try {
    const { gzip: cos, etag } = await carregaFitxer(fitxerPath)

    res.setHeader('Content-Type', 'application/geo+json')
    res.setHeader('Cache-Control', 'public, max-age=86400') // 24h — les geodades no canvien
    res.setHeader('ETag', etag)
    res.setHeader('Vary', 'Accept-Encoding')

    // Revalidació: passades les 24 h de max-age, el client pregunta amb
    // If-None-Match i, si té la versió vigent, rep un 304 buit en lloc de
    // tornar a descarregar ~1,6 MB de GeoJSON.
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end()
      return
    }

    if (req.acceptsEncodings('gzip')) {
      // Es serveix el buffer ja comprimit tal qual; `compression` (index.ts)
      // no toca respostes que ja porten Content-Encoding.
      res.setHeader('Content-Encoding', 'gzip')
      res.end(cos)
    } else {
      // Client sense suport gzip (raríssim): es descomprimeix sota demanda en
      // lloc de guardar també l'original (duplicaria la RAM del caché).
      res.end(gunzipSync(cos))
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(503).json({
        error: 'Geodades no disponibles. Executa npm run seed (vegeu backend/data/README.md)',
      })
      return
    }
    next(err)
  }
})

export default router
