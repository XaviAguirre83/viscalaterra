// Importa les comissaries dels Mossos d'Esquadra des de Dades Obertes de la
// Generalitat (dataset "Dependències de la Policia de la Generalitat – Mossos
// d'Esquadra", 8jxf-yu8c) cap a la taula `llocs` amb subtema 'mossos'.
//
// Font oficial: https://analisi.transparenciacatalunya.cat/d/8jxf-yu8c
// Idempotent: esborra els Mossos previs d'aquesta font i torna a inserir.
//
// Ús: npm run importa-mossos  (dins backend/, o via docker exec al contenidor)

import { pool } from '../db'
import { fetchAmbReintents } from './xarxa'

const DATASET = '8jxf-yu8c'
const URL_DADES = `https://analisi.transparenciacatalunya.cat/resource/${DATASET}.json?$limit=1000`
const FONT = 'mossos-gencat'
const FONT_NOM = "Comissaries dels Mossos d'Esquadra (Dades Obertes de la Generalitat)"
const FONT_URL = `https://analisi.transparenciacatalunya.cat/d/${DATASET}`
// Web oficial dels Mossos (el dataset no en té una per comissaria).
const WEB = 'https://mossos.gencat.cat'

// El dataset és una foto per any; agafem el darrer disponible.
const ANY = '2021'

// Tipus de dependència que són comissaries d'atenció al públic (excloem trànsit,
// dependències administratives, etc.).
const TIPUS_COMISSARIA = new Set([
  'Àrea Bàsica Policial',
  'Comissaria de Districte',
  'Oficina Policial',
])

interface RegistreMossos {
  any?: string
  nom?: string
  adre_a?: string
  municipi?: string
  cp?: string
  latitud?: string
  longitud?: string
  tipus?: string
  codi_ine?: string
}

// A la font, alguna coordenada ve sense punt decimal (p. ex. 41409356 →
// 41.409356). Corregeix aquest patró i valida que caigui dins de Catalunya.
function netejaCoord(latStr?: string, lngStr?: string): { lat: number; lng: number } | null {
  if (!latStr || !lngStr) return null
  let lat = Number(latStr)
  let lng = Number(lngStr)
  if (Math.abs(lat) > 90) {
    const s = latStr.replace('.', '')
    lat = Number(`${s.slice(0, 2)}.${s.slice(2)}`)
  }
  if (Math.abs(lng) > 180) {
    const s = lngStr.replace('.', '')
    lng = Number(`${s.slice(0, 1)}.${s.slice(1)}`)
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  // Bbox generós de Catalunya.
  if (lat < 40 || lat > 43 || lng < 0 || lng > 3.5) return null
  return { lat, lng }
}

async function centreMunicipi(codi: string): Promise<{ lat: number; lng: number } | null> {
  const { rows } = await pool.query<{ lat: number; lng: number }>(
    'SELECT ST_Y(ST_PointOnSurface(geom)) AS lat, ST_X(ST_PointOnSurface(geom)) AS lng FROM municipis WHERE codi = $1',
    [codi]
  )
  return rows[0] ?? null
}

async function main() {
  console.log('Baixant el dataset dels Mossos…', URL_DADES)
  const res = await fetchAmbReintents(URL_DADES)
  if (!res.ok) throw new Error(`Error ${res.status} baixant el dataset`)
  const tots = (await res.json()) as RegistreMossos[]

  const comissaries = tots.filter(
    (r) => r.any === ANY && !!r.tipus && TIPUS_COMISSARIA.has(r.tipus)
  )
  console.log(`${tots.length} registres totals; ${comissaries.length} comissaries (any ${ANY}).`)

  let inserits = 0
  let ambCentre = 0
  let saltats = 0

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM llocs WHERE font = $1', [FONT])

    for (const r of comissaries) {
      const codi = (r.codi_ine ?? '').trim()
      const nom = (r.nom ?? '').trim()
      if (codi.length !== 6 || !nom) {
        saltats++
        continue
      }
      const muni = await client.query('SELECT 1 FROM municipis WHERE codi = $1', [codi])
      if (muni.rowCount === 0) {
        console.warn('  · municipi desconegut', codi, '—', nom)
        saltats++
        continue
      }

      let coord = netejaCoord(r.latitud, r.longitud)
      if (!coord) {
        coord = await centreMunicipi(codi)
        if (coord) ambCentre++
      }
      if (!coord) {
        saltats++
        continue
      }

      await client.query(
        `INSERT INTO llocs
           (nom, subtema_codi, municipi_codi, geom, adreca, cp, web, font, font_id, font_nom, font_url, font_tipus)
         VALUES ($1, 'mossos', $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8, $9, $10, $11, 'oficial')
         ON CONFLICT (font, font_id) DO UPDATE SET
           nom = EXCLUDED.nom, municipi_codi = EXCLUDED.municipi_codi, geom = EXCLUDED.geom,
           adreca = EXCLUDED.adreca, cp = EXCLUDED.cp, web = EXCLUDED.web,
           font_nom = EXCLUDED.font_nom, font_url = EXCLUDED.font_url, actualitzat_at = now()`,
        [
          nom,
          codi,
          coord.lng,
          coord.lat,
          r.adre_a ?? null,
          r.cp ?? null,
          WEB,
          FONT,
          `${codi}|${nom}`,
          FONT_NOM,
          FONT_URL,
        ]
      )
      inserits++
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  console.log(
    `Fet: ${inserits} comissaries inserides (${ambCentre} amb centre de municipi per coordenada dolenta), ${saltats} saltades.`
  )
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    void pool.end().finally(() => process.exit(1))
  })
