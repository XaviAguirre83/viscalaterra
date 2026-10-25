/**
 * Carrega les geometries de les divisions administratives de Catalunya a PostGIS.
 * Font: ICGC divisions-administratives-v2r1 (2024-01-18)
 *
 * Ús: npm run seed (des de backend/)
 * Requereix: backend/data/geojson/ amb els fitxers del ICC
 * Ordre: provincies → vegueries → comarques → municipis (per les FK)
 *
 * En una BD nova, infra/db/init/03-territorial-data.sql ja hi ha posat totes les
 * files (codi, nom, jerarquia) SENSE geometria: aquest script n'hi afegeix la geom
 * (ON CONFLICT … DO UPDATE). Els atributs del 03 manen; un codi que no hi sigui
 * s'insereix sencer. És idempotent: es pot tornar a executar.
 * Els importadors de llocs (importa-*.ts) necessiten aquestes geometries.
 */

import path from 'path'
import fs from 'fs'
import { Pool, PoolClient } from 'pg'

const GEOJSON_DIR = path.resolve(__dirname, '../../data/geojson')

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'viscalaterra',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

function readGeoJSON(relPath: string): GeoJSONFeatureCollection {
  const fullPath = path.join(GEOJSON_DIR, relPath)
  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `Fitxer no trobat: ${fullPath}\nExecuta el seed després de baixar les geodades (vegeu backend/data/README.md)`
    )
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
}

interface GeoJSONFeature {
  type: string
  properties: Record<string, unknown>
  geometry: object | null
}

interface GeoJSONFeatureCollection {
  type: string
  features: GeoJSONFeature[]
}

// Cada seed* retorna les files afectades (inserides o amb la geometria posada):
// el recompte és el de la BD, no el de features del fitxer.

async function seedProvincies(client: PoolClient): Promise<number> {
  console.log('  → Províncies...')
  const { features } = readGeoJSON(
    'provincies/divisions-administratives-v2r1-provincies-5000-20240118.json'
  )

  let n = 0
  for (const f of features) {
    const p = f.properties
    const r = await client.query(
      `INSERT INTO provincies (codi, nom, geom)
       VALUES ($1, $2, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)))
       ON CONFLICT (codi) DO UPDATE SET geom = EXCLUDED.geom`,
      [p.CODIPROV, p.NOMPROV, JSON.stringify(f.geometry)]
    )
    n += r.rowCount ?? 0
  }
  console.log(`     ${n} províncies amb geometria`)
  return n
}

async function seedVegueries(client: PoolClient): Promise<number> {
  console.log('  → Vegueries...')
  const { features } = readGeoJSON(
    'vegueries/divisions-administratives-v2r1-vegueries-5000-20240118.json'
  )

  let n = 0
  for (const f of features) {
    const p = f.properties
    const r = await client.query(
      `INSERT INTO vegueries (codi, nom, geom)
       VALUES ($1, $2, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)))
       ON CONFLICT (codi) DO UPDATE SET geom = EXCLUDED.geom`,
      [p.CODIVEGUE, p.NOMVEGUE, JSON.stringify(f.geometry)]
    )
    n += r.rowCount ?? 0
  }
  console.log(`     ${n} vegueries amb geometria`)
  return n
}

async function seedComarques(client: PoolClient): Promise<number> {
  console.log('  → Comarques...')
  const { features } = readGeoJSON(
    'comarques/divisions-administratives-v2r1-comarques-5000-20240118.json'
  )

  let n = 0
  for (const f of features) {
    const p = f.properties
    const r = await client.query(
      `INSERT INTO comarques (codi, nom, cap, geom)
       VALUES ($1, $2, $3, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)))
       ON CONFLICT (codi) DO UPDATE SET geom = EXCLUDED.geom`,
      [p.CODICOMAR, p.NOMCOMAR, p.CAPCOMAR, JSON.stringify(f.geometry)]
    )
    n += r.rowCount ?? 0
  }
  console.log(`     ${n} comarques amb geometria`)
  return n
}

async function seedMunicipis(client: PoolClient): Promise<number> {
  console.log('  → Municipis (pot trigar uns segons)...')
  const { features } = readGeoJSON(
    'municipis/divisions-administratives-v2r1-municipis-5000-20240118.json'
  )

  let n = 0
  for (const f of features) {
    const p = f.properties
    const nomMuni = p.NOMMUNI as string
    const capComar = p.CAPCOMAR as string
    const esCapComarca = nomMuni === capComar || nomMuni.startsWith(capComar + ' ')
    const r = await client.query(
      `INSERT INTO municipis (codi, nom, es_cap_comarca, area_m2, comarca_codi, vegueria_codi, provincia_codi, geom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($8), 4326)))
       ON CONFLICT (codi) DO UPDATE SET geom = EXCLUDED.geom`,
      [
        p.CODIMUNI,
        p.NOMMUNI,
        esCapComarca,
        p.AREAM5000,
        p.CODICOMAR,
        p.CODIVEGUE,
        p.CODIPROV,
        JSON.stringify(f.geometry),
      ]
    )
    n += r.rowCount ?? 0
  }
  console.log(`     ${n} municipis amb geometria`)
  return n
}

// Cap fila no pot quedar sense geometria. Abans, amb ON CONFLICT DO NOTHING, en
// una BD nova el seed no en carregava cap i deia igualment "947 municipis
// inserits": la fallada només es veia quan els importadors no trobaven el
// municipi dels llocs. Ara, si en falta alguna, error i ROLLBACK.
async function verificaGeometries(client: PoolClient): Promise<void> {
  const { rows } = await client.query<{ taula: string; sense: string }>(
    `SELECT 'provincies' AS taula, count(*) AS sense FROM provincies WHERE geom IS NULL
     UNION ALL SELECT 'vegueries', count(*) FROM vegueries WHERE geom IS NULL
     UNION ALL SELECT 'comarques', count(*) FROM comarques WHERE geom IS NULL
     UNION ALL SELECT 'municipis', count(*) FROM municipis WHERE geom IS NULL`
  )
  const buides = rows.filter((r) => Number(r.sense) > 0)
  if (buides.length > 0) {
    throw new Error(
      `Files sense geometria: ${buides.map((r) => `${r.taula} ${r.sense}`).join(', ')}`
    )
  }
}

async function main() {
  const client = await pool.connect()
  try {
    console.log('Iniciant seed de geodades...')
    await client.query('BEGIN')
    await seedProvincies(client)
    await seedVegueries(client)
    await seedComarques(client)
    await seedMunicipis(client)
    await verificaGeometries(client)
    await client.query('COMMIT')
    console.log('✓ Seed completat: totes les files tenen geometria')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('✗ Error durant el seed:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
