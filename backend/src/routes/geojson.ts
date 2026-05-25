import { Router, Request, Response } from 'express'
import path from 'path'
import fs from 'fs'

const router = Router()

const GEOJSON_DIR = path.resolve(__dirname, '../../data/geojson')

// Resolució GeoJSON adequada per a cada nivell de zoom de Leaflet
// Denominadors d'escala ICC: 5000 (màx detall) → 1000000 (mínim detall)
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

/**
 * GET /api/geojson/:nivell?zoom=N
 *
 * Serveix el GeoJSON d'un nivell territorial a la resolució adequada per al zoom.
 * El frontend envia el zoom actual de Leaflet; el backend tria el fitxer òptim.
 *
 * Exemples:
 *   /api/geojson/comarques?zoom=9  → resolució 500000
 *   /api/geojson/municipis?zoom=13 → resolució 100000
 */
router.get('/:nivell', (req: Request, res: Response) => {
  const nivell = String(req.params.nivell)
  const zoomRaw = req.query.zoom
  const zoom = parseInt(String(Array.isArray(zoomRaw) ? zoomRaw[0] : zoomRaw)) || 8

  if (!NIVELLS_VALIDS.has(nivell)) {
    res.status(400).json({ error: `Nivell no vàlid. Opcions: ${[...NIVELLS_VALIDS].join(', ')}` })
    return
  }

  const resolucio = resolucioPerZoom(zoom)
  const nomBase = NIVELL_A_NOMBRE_FITXER[nivell] ?? nivell
  const nomFitxer = `divisions-administratives-v2r1-${nomBase}-${resolucio}-20240118.json`
  const fitxerPath = path.join(GEOJSON_DIR, nivell, nomFitxer)

  if (!fs.existsSync(fitxerPath)) {
    res.status(503).json({
      error: 'Geodades no disponibles. Executa npm run seed (vegeu backend/data/README.md)',
    })
    return
  }

  res.setHeader('Content-Type', 'application/geo+json')
  res.setHeader('Cache-Control', 'public, max-age=86400') // 24h — les geodades no canvien
  fs.createReadStream(fitxerPath).pipe(res)
})

export default router
