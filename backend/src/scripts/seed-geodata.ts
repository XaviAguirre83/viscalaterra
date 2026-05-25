/**
 * Importa les divisions administratives de Catalunya a PostGIS.
 * Font: ICGC divisions-administratives-v2r1 (2024-01-18)
 *
 * Ús: npm run seed (des de backend/)
 * Requereix: backend/data/geojson/ amb els fitxers del ICC
 * Ordre d'inserció: provincies → vegueries → comarques → municipis (per les FK)
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

async function seedProvincies(client: PoolClient) {
  console.log('  → Inserint províncies...')
  const { features } = readGeoJSON(
    'provincies/divisions-administratives-v2r1-provincies-5000-20240118.json'
  )

  for (const f of features) {
    const p = f.properties
    await client.query(
      `INSERT INTO provincies (codi, nom, geom)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))
       ON CONFLICT (codi) DO NOTHING`,
      [p.CODIPROV, p.NOMPROV, JSON.stringify(f.geometry)]
    )
  }
  console.log(`     ${features.length} províncies inserides`)
}

async function seedVegueries(client: PoolClient) {
  console.log('  → Inserint vegueries...')
  const { features } = readGeoJSON(
    'vegueries/divisions-administratives-v2r1-vegueries-5000-20240118.json'
  )

  for (const f of features) {
    const p = f.properties
    await client.query(
      `INSERT INTO vegueries (codi, nom, geom)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))
       ON CONFLICT (codi) DO NOTHING`,
      [p.CODIVEGUE, p.NOMVEGUE, JSON.stringify(f.geometry)]
    )
  }
  console.log(`     ${features.length} vegueries inserides`)
}

async function seedComarques(client: PoolClient) {
  console.log('  → Inserint comarques...')
  const { features } = readGeoJSON(
    'comarques/divisions-administratives-v2r1-comarques-5000-20240118.json'
  )

  for (const f of features) {
    const p = f.properties
    await client.query(
      `INSERT INTO comarques (codi, nom, cap, geom)
       VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326))
       ON CONFLICT (codi) DO NOTHING`,
      [p.CODICOMAR, p.NOMCOMAR, p.CAPCOMAR, JSON.stringify(f.geometry)]
    )
  }
  console.log(`     ${features.length} comarques inserides`)
}

async function seedMunicipis(client: PoolClient) {
  console.log('  → Inserint municipis (pot trigar uns segons)...')
  const { features } = readGeoJSON(
    'municipis/divisions-administratives-v2r1-municipis-5000-20240118.json'
  )

  for (const f of features) {
    const p = f.properties
    const esCapComarca = (p.NOMMUNI as string) === (p.CAPCOMAR as string)
    await client.query(
      `INSERT INTO municipis (codi, nom, es_cap_comarca, area_m2, comarca_codi, veguerla_codi, provincia_codi, geom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_GeomFromGeoJSON($8), 4326))
       ON CONFLICT (codi) DO NOTHING`,
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
  }
  console.log(`     ${features.length} municipis inserits`)
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
    await client.query('COMMIT')
    console.log('✓ Seed completat correctament')
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
