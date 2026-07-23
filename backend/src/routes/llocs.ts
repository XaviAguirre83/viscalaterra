import { Router } from 'express'
import { pool } from '../db'

const router = Router()

// Límits defensius sobre la mida del cos (tota Catalunya són 947 municipis).
const MAX_SUBTEMES = 60
const MAX_MUNICIPIS = 1000

// Valida i normalitza una llista de codis (strings curts). Retorna null si no és vàlida.
function arrayDeCodis(valor: unknown, max: number): string[] | null {
  if (!Array.isArray(valor) || valor.length > max) return null
  const codis: string[] = []
  for (const v of valor) {
    if (typeof v !== 'string') return null
    const net = v.trim()
    if (!net || net.length > 64) return null
    codis.push(net)
  }
  return codis
}

/**
 * POST /api/llocs/cerca
 *
 * Cos: { subtemes: string[], municipis?: string[] }
 *   - subtemes: codis del catàleg Què? (p. ex. 'policia-nacional', 'cap'). Obligatori, ≥1.
 *   - municipis: codis de municipi que delimiten el On?. Omès o buit ⇒ tota Catalunya.
 *
 * El On? sempre es resol a un conjunt de municipis (la unitat mínima), així que el
 * filtre territorial és un simple `municipi_codi = ANY(...)`. Retorna els llocs que
 * casen, ORDENATS per municipi i després per nom. Un sol payload alimenta les tres
 * vistes del frontend (municipis pintats, pins i llista).
 */
router.post('/cerca', async (req, res, next) => {
  const body = (req.body ?? {}) as Record<string, unknown>

  const subtemes = arrayDeCodis(body.subtemes, MAX_SUBTEMES)
  if (!subtemes || subtemes.length === 0) {
    res.status(400).json({ error: 'Cal indicar almenys un subtema.' })
    return
  }

  // municipis és opcional: absent o buit ⇒ sense filtre territorial (tota Catalunya).
  let municipis: string[] | null = null
  if (body.municipis !== undefined && body.municipis !== null) {
    municipis = arrayDeCodis(body.municipis, MAX_MUNICIPIS)
    if (!municipis) {
      res.status(400).json({ error: 'La llista de municipis no és vàlida.' })
      return
    }
    if (municipis.length === 0) municipis = null
  }

  try {
    const { rows } = await pool.query(
      `SELECT l.id, l.nom, l.subtema_codi,
              l.municipi_codi, m.nom AS municipi_nom, m.comarca_codi,
              ST_Y(l.geom) AS lat, ST_X(l.geom) AS lng,
              l.adreca, l.telefon, l.web
       FROM llocs l
       JOIN municipis m ON m.codi = l.municipi_codi
       WHERE l.subtema_codi = ANY($1::text[])
         AND ($2::char(6)[] IS NULL OR l.municipi_codi = ANY($2::char(6)[]))
       ORDER BY m.nom, l.nom`,
      [subtemes, municipis]
    )

    const llocs = rows.map((r) => ({
      id: r.id as number,
      nom: r.nom as string,
      subtema: r.subtema_codi as string,
      municipiCodi: (r.municipi_codi as string).trim(),
      municipiNom: r.municipi_nom as string,
      comarcaCodi: (r.comarca_codi as string | null)?.trim() ?? null,
      lat: r.lat as number,
      lng: r.lng as number,
      adreca: r.adreca as string | null,
      telefon: r.telefon as string | null,
      web: r.web as string | null,
    }))

    res.json({ total: llocs.length, llocs })
  } catch (err) {
    next(err)
  }
})

export default router
