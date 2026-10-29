// Importa les comissaries de la Guàrdia Urbana (policia local) de Barcelona des
// d'Open Data de l'Ajuntament de Barcelona (dataset «comissaries-policia»), que
// les té per districte — cosa que el dataset de la Generalitat no fa (només hi ha
// una seu per municipi). Van al subtema 'policia-local' amb font pròpia.
//
// El dataset municipal cobreix TOT Barcelona, per això a importa-equipaments
// excloem Barcelona de la policia local (excloreMunicipis) i la posem aquí.
//
// Coordenades: vénen en UTM ETRS89 31N (EPSG:25831); les passem a WGS84 amb PostGIS.
// Font: https://opendata-ajuntament.barcelona.cat/data/ca/dataset/comissaries-policia
// Idempotent: esborra els registres d'aquesta font i torna a inserir.
//
// Ús: npm run importa-policia-bcn  (dins backend/ o via docker exec al contenidor)

import { pool } from '../db'
import { fetchAmbReintents } from './xarxa'

const URL_DADES =
  'https://opendata-ajuntament.barcelona.cat/data/dataset/04649b6a-f620-4046-879e-5b458eb090cd/resource/9148c81a-4eb2-45f8-9d2a-c771de456e83/download'
const FONT = 'policia-bcn'
const FONT_NOM = 'Comissaries de Barcelona (Open Data Ajuntament de Barcelona)'
const FONT_URL = 'https://opendata-ajuntament.barcelona.cat/data/ca/dataset/comissaries-policia'

// Classifica cada comissaria del dataset pel subtema del Què?. Deixem fora els
// Mossos d'Esquadra (ja tenen font pròpia); agafem la Guàrdia Urbana (policia
// local) i les oficines de tramitació del DNI/passaport (que gestiona la Policia
// Nacional).
function subtemaPer(nom: string): string | null {
  const n = nom.toLowerCase()
  if (n.includes('urbana')) return 'policia-local'
  if (n.includes('dni') || n.includes('passaport')) return 'policia-nacional'
  return null
}

interface Adreca {
  address_name?: string
  street_number_1?: string
  start_street_number?: number
  zip_code?: string
  location?: { geometries?: { coordinates?: number[] }[] }
}
interface Equip {
  register_id?: number | string
  name?: string
  addresses?: Adreca[]
}

function netejaNom(nom?: string): string {
  return (nom ?? '').replace(/\*/g, ' ').replace(/\s+/g, ' ').trim()
}

function construeixAdreca(addr?: Adreca): string | null {
  const via = (addr?.address_name ?? '').trim()
  if (!via) return null
  const num = (addr?.street_number_1 ?? addr?.start_street_number?.toString() ?? '')
    .replace(/\*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return num ? `${via}, ${num}` : via
}

async function main() {
  console.log('Baixant el dataset de comissaries de Barcelona…')
  const res = await fetchAmbReintents(URL_DADES)
  if (!res.ok) throw new Error(`Error ${res.status} baixant el dataset`)
  const tots = (await res.json()) as Equip[]

  // Guàrdia Urbana (policia local) + oficines de DNI/passaport (Policia Nacional).
  // Els Mossos d'Esquadra queden fora: ja tenen font pròpia.
  const comissaries = tots.filter((e) => subtemaPer(e.name ?? '') !== null)
  console.log(
    `${tots.length} comissaries al dataset; ${comissaries.length} de Guàrdia Urbana + oficines DNI.`
  )

  let inserits = 0
  let saltats = 0

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM llocs WHERE font = $1', [FONT])

    for (const e of comissaries) {
      const nom = netejaNom(e.name)
      const subtema = subtemaPer(nom)
      const addr = e.addresses?.[0]
      const coords = addr?.location?.geometries?.[0]?.coordinates
      const id = e.register_id != null ? String(e.register_id) : ''
      if (!nom || !subtema || !id || !coords || coords.length < 2) {
        saltats++
        continue
      }

      // UTM 25831 → WGS84 i municipi contenidor, tot amb PostGIS.
      const { rows } = await client.query<{ lat: number; lng: number; municipi: string | null }>(
        `SELECT ST_Y(p) AS lat, ST_X(p) AS lng,
                (SELECT codi FROM municipis WHERE ST_Contains(geom, p) LIMIT 1) AS municipi
         FROM (SELECT ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 25831), 4326) AS p) t`,
        [coords[0], coords[1]]
      )
      const r = rows[0]
      if (!r?.municipi) {
        console.warn('  · municipi no resolt —', nom)
        saltats++
        continue
      }

      await client.query(
        `INSERT INTO llocs
           (nom, subtema_codi, municipi_codi, geom, adreca, cp, font, font_id, font_nom, font_url, font_tipus)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $7, $8, $9, $10, $11, 'oficial')
         ON CONFLICT (font, font_id) DO UPDATE SET
           nom = EXCLUDED.nom, municipi_codi = EXCLUDED.municipi_codi, geom = EXCLUDED.geom,
           adreca = EXCLUDED.adreca, cp = EXCLUDED.cp, font_nom = EXCLUDED.font_nom,
           font_url = EXCLUDED.font_url, actualitzat_at = now()`,
        [
          nom,
          subtema,
          r.municipi,
          r.lng,
          r.lat,
          construeixAdreca(addr),
          addr?.zip_code ?? null,
          FONT,
          id,
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

  console.log(`Fet: ${inserits} comissaries de Barcelona inserides, ${saltats} saltades.`)
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    void pool.end().finally(() => process.exit(1))
  })
