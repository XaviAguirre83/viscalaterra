import { Router } from 'express'
import { pool } from '../db'

const router = Router()

/**
 * GET /api/territoris/arbre
 *
 * Retorna la jerarquia territorial completa en una sola petició:
 * provincies → comarques → municipis
 *
 * El frontend el carrega una vegada a l'inici i navega localment.
 * ~1000 registres de text = payload lleuger (~150KB).
 */
router.get('/arbre', async (_req, res) => {
  const client = await pool.connect()
  try {
    const [provResult, vegResult, comResult, munResult] = await Promise.all([
      client.query<{ codi: string; nom: string }>('SELECT codi, nom FROM provincies ORDER BY nom'),
      client.query<{ codi: string; nom: string }>('SELECT codi, nom FROM vegueries ORDER BY nom'),
      client.query<{ codi: string; nom: string; cap: string }>(
        'SELECT codi, nom, cap FROM comarques ORDER BY nom'
      ),
      client.query<{
        codi: string
        nom: string
        es_cap_comarca: boolean
        comarca_codi: string
        vegueria_codi: string
        provincia_codi: string
      }>(
        'SELECT codi, nom, es_cap_comarca, comarca_codi, vegueria_codi, provincia_codi FROM municipis ORDER BY nom'
      ),
    ])

    // Index ràpid de comarques pel codi
    const comarcaPerCodi = new Map<string, { codi: string; nom: string; cap: string }>()
    for (const c of comResult.rows) comarcaPerCodi.set(c.codi, c)

    // Agrupem municipis per (provincia, comarca) — així una comarca transfronterera
    // (Cerdanya, Berguedà, Osona, Selva) apareix sota cada provincia que conté municipis seus.
    const municipisPerProvinciaIComarca = new Map<string, Map<string, typeof munResult.rows>>()
    for (const m of munResult.rows) {
      let comarques = municipisPerProvinciaIComarca.get(m.provincia_codi)
      if (!comarques) {
        comarques = new Map()
        municipisPerProvinciaIComarca.set(m.provincia_codi, comarques)
      }
      const llista = comarques.get(m.comarca_codi) ?? []
      llista.push(m)
      comarques.set(m.comarca_codi, llista)
    }

    const arbre = provResult.rows.map((p) => {
      const comarquesDeLaProv = municipisPerProvinciaIComarca.get(p.codi)
      const comarques = comarquesDeLaProv
        ? [...comarquesDeLaProv.entries()]
            .map(([comarcaCodi, municipis]) => {
              const c = comarcaPerCodi.get(comarcaCodi)
              return {
                codi: c?.codi ?? comarcaCodi,
                nom: c?.nom ?? '',
                cap: c?.cap ?? '',
                municipis,
              }
            })
            .sort((a, b) => a.nom.localeCompare(b.nom, 'ca'))
        : []
      return { codi: p.codi, nom: p.nom, comarques }
    })

    const vegueries = vegResult.rows.map((v) => ({ codi: v.codi, nom: v.nom }))

    res.json({ provincies: arbre, vegueries })
  } finally {
    client.release()
  }
})

export default router
