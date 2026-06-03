import { Router, Request, Response, NextFunction } from 'express'
import path from 'path'
import { readFile } from 'fs/promises'

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

// Caché en memòria dels fitxers ja llegits: evita el I/O de disc en peticions
// repetides. Els fitxers més sol·licitats (~6 MB en total) hi caben de sobres.
const fileCache = new Map<string, Buffer>()

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

  const cached = fileCache.get(fitxerPath)
  if (cached) {
    res.setHeader('Content-Type', 'application/geo+json')
    res.setHeader('Cache-Control', 'public, max-age=86400') // 24h — les geodades no canvien
    res.end(cached)
    return
  }

  try {
    const buffer = await readFile(fitxerPath)
    fileCache.set(fitxerPath, buffer)
    res.setHeader('Content-Type', 'application/geo+json')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.end(buffer)
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
