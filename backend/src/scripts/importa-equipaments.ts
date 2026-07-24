// Importa equipaments públics des del dataset mestre "Equipaments de Catalunya"
// de Dades Obertes de la Generalitat (8gmd-gz7i) cap a la taula `llocs`.
//
// Un sol dataset (26.585 equipaments, actualitzat mensualment) cobreix molts
// subtemes del Què?: parcs de bombers, hospitals, ajuntaments, jutjats de pau…
// El mapa MAPA relaciona la taxonomia `categoria` del dataset amb el subtema_codi
// del catàleg (frontend/src/data/categories.ts).
//
// Font oficial: https://analisi.transparenciacatalunya.cat/d/8gmd-gz7i
// Idempotent: per cada subtema processat esborra els seus llocs d'aquesta font i
// torna a inserir (així carregar només 'bombers' no toca la resta de subtemes).
//
// Ús:  npm run importa-equipaments            → tots els subtemes del MAPA
//      npm run importa-equipaments -- bombers → només aquests subtemes
//      (dins backend/, o via docker exec al contenidor)

import { pool } from '../db'

const DATASET = '8gmd-gz7i'
const FONT = 'equipaments-gencat'
const FONT_NOM = 'Equipaments de Catalunya (Dades Obertes de la Generalitat)'
const FONT_URL = `https://analisi.transparenciacatalunya.cat/d/${DATASET}`

// Relació categoria del dataset → subtema del catàleg Què?. El valor de `categoria`
// és el text exacte de la taxonomia (separada per «|»); cap dels que mapegem porta
// cometa simple, així que és segur dins un $where SoQL. `web` és una adreça
// institucional per defecte (el dataset no en porta una per equipament).
interface MapaSubtema {
  categoria: string
  subtema: string
  web?: string
  // Filtre opcional pel nom: quan la categoria del dataset barreja coses (p. ex.
  // «Jutjats i tribunals» inclou deganats, serveis processals, arxius…), només
  // importem els registres el nom dels quals compleix aquest predicat.
  filtreNom?: (nom: string) => boolean
  // Deriva el subtema del nom del registre (p. ex. classificar «Jutjats i
  // tribunals» per tipus de jutjat). Si no hi és, s'usa `subtema`.
  subtemaPerNom?: (nom: string) => string
  // Tots els subtemes que subtemaPerNom pot generar, per esborrar-los abans de
  // reinserir (idempotència). Si no hi és, s'esborra només `subtema`.
  subtemesGenerats?: string[]
  // Municipis a excloure perquè els cobreix una font municipal pròpia més completa
  // (p. ex. la policia local de Barcelona ve d'Open Data BCN, per districtes).
  excloreMunicipis?: string[]
}

// Treu accents i passa a minúscules (per classificar pel nom sense tocar articles).
function sensAccents(s: string): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Subtemes que pot generar la classificació de «Jutjats i tribunals» (l'últim és
// el calaix de reserva). Serveix per esborrar-los tots en reimportar.
const SUBTEMES_JUTJATS = [
  'jutjat-1a-instancia-instruccio',
  'jutjat-1a-instancia',
  'jutjat-instruccio',
  'jutjat-penal',
  'jutjat-social',
  'jutjat-guardia',
  'jutjat-contencios',
  'jutjat-violencia-dona',
  'jutjat-mercantil',
  'jutjat-menors',
  'jutjat-vigilancia-penitenciaria',
  'jutjats-tribunals',
]

// Classifica un jutjat pel seu tipus a partir del nom. L'ordre importa: els
// patrons més específics (mixt, violència, vigilància) es comproven abans que els
// que en són subcadena («primera instancia i instruccio» conté «instruccio»).
function tipusJutjat(nom: string): string {
  const n = sensAccents(nom)
  if (n.includes('primera instancia i instruccio')) return 'jutjat-1a-instancia-instruccio'
  if (n.includes('violencia sobre la dona')) return 'jutjat-violencia-dona'
  if (n.includes('vigilancia penitenciaria')) return 'jutjat-vigilancia-penitenciaria'
  if (n.includes('contencios administratiu')) return 'jutjat-contencios'
  if (n.includes('primera instancia')) return 'jutjat-1a-instancia'
  if (n.includes('instruccio')) return 'jutjat-instruccio'
  if (n.includes('mercantil')) return 'jutjat-mercantil'
  if (n.includes('menors')) return 'jutjat-menors'
  if (n.includes('penal')) return 'jutjat-penal'
  if (n.includes('social')) return 'jutjat-social'
  if (n.includes('guardia')) return 'jutjat-guardia'
  return 'jutjats-tribunals'
}

const MAPA: MapaSubtema[] = [
  {
    categoria: 'Emergències. Seguretat|Parcs de Bombers||',
    subtema: 'bombers',
    web: 'https://interior.gencat.cat/ca/arees_dactuacio/bombers',
  },
  {
    categoria: 'Emergències. Seguretat|Policies Locals||',
    subtema: 'policia-local',
    excloreMunicipis: ['080193'], // Barcelona: coberta per Open Data BCN (per districtes)
  },
  {
    categoria: 'Salut|Centres sanitaris|3. Hospitals|',
    subtema: 'hospital',
  },
  {
    categoria: 'Administració pública|Ens locals|Ajuntaments|',
    subtema: 'ajuntament',
  },
  {
    categoria: 'Justícia|Jutjats de pau||',
    subtema: 'jutjat-pau',
  },
  {
    // El calaix «Jutjats i tribunals» barreja jutjats reals amb deganats, serveis
    // comuns processals, unitats, oficines d'atenció, arxius, medicina legal…
    // Ens quedem només amb els que són pròpiament un «Jutjat …» i els classifiquem
    // per tipus (primera instància, penal, social, mercantil, menors…).
    categoria: 'Justícia|Jutjats i tribunals||',
    subtema: 'jutjats-tribunals',
    filtreNom: (nom) => /^jutjat/i.test(nom),
    subtemaPerNom: tipusJutjat,
    subtemesGenerats: SUBTEMES_JUTJATS,
  },
  {
    categoria: 'Justícia|Fiscalies||',
    subtema: 'fiscalia',
  },
  {
    categoria: 'Justícia|Centres penitenciaris||',
    subtema: 'centre-penitenciari',
  },
]

interface RegistreEquip {
  idequipament?: string
  nom?: string
  alies?: string
  via?: string
  sufix_via?: string
  num?: string
  cpostal?: string
  codi_municipi?: string
  poblacio?: string
  telefon1?: string
  longitud?: string
  latitud?: string
}

// Normalitza un nom de municipi per comparar-lo: minúscules, sense accents i
// sense article, tant si va davant («el/la/els/les/l'Hospitalet») com darrere
// («Lloar, el» — forma en què el dataset desa `poblacio`).
function normalitzaNom(nom: string): string {
  let n = sensAccents(nom).trim()
  n = n.replace(/,\s*(els|les|el|la|l')\s*$/, '') // article pospuesto
  n = n.replace(/^(els|les|el|la)\s+/, '').replace(/^l'\s*/, '') // article antepuesto
  return n.replace(/\s+/g, ' ').trim()
}

// Índex nom-normalitzat → codi de municipi. Els noms ambigus (dos municipis que
// normalitzen igual) es descarten per no assignar-los malament.
async function indexMunicipisPerNom(client: import('pg').PoolClient): Promise<Map<string, string>> {
  const { rows } = await client.query<{ codi: string; nom: string }>(
    'SELECT codi, nom FROM municipis'
  )
  const idx = new Map<string, string>()
  const ambigus = new Set<string>()
  for (const r of rows) {
    const k = normalitzaNom(r.nom)
    if (idx.has(k)) ambigus.add(k)
    else idx.set(k, r.codi)
  }
  for (const k of ambigus) idx.delete(k)
  return idx
}

// Parseja i valida les coordenades. La majoria venen en decimal net, però algunes
// arriben sense punt decimal (p. ex. 41759749 → 41.759749, com al C.P. Lledoners):
// el reinserim (a Catalunya la latitud té 2 dígits enters i la longitud 1) i
// validem amb el bbox de Catalunya per descartar registres realment dolents.
function parseCoord(latStr?: string, lngStr?: string): { lat: number; lng: number } | null {
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
  if (lat < 40 || lat > 43 || lng < 0 || lng > 3.5) return null
  return { lat, lng }
}

// Normalitza el codi postal. Com amb codi_municipi, el dataset el desa com a
// número i els CP de Barcelona (08xxx) perden el zero inicial → el recuperem.
function normalitzaCp(cp?: string): string | null {
  const c = (cp ?? '').trim()
  if (!c) return null
  return c.padStart(5, '0')
}

// Alguns registres del dataset són entrades fantasma amb el nom substituït per un
// codi administratiu intern (p. ex. 'A0011992  A' o 'A 0582006 A' als jutjats de
// pau) i dupliquen l'equipament real, que ja ve en un altre registre amb nom
// llegible. Els descartem: cap equipament públic real es diu així.
function nomEsCodi(nom: string): boolean {
  return /^[A-Z]\s?\d{3}/.test(nom)
}

// Construeix l'adreça. Els camps del dataset són heterogenis segons el tipus:
// als bombers `via` ja porta el número i `num`/`sufix_via` el dupliquen o són
// soroll truncat («Km», «baixos», «(Pol. ind…»); als ajuntaments `via` no porta
// número i `num` sí. Estratègia: partim de `via`, ignorem `sufix_via` (sempre
// soroll) i només afegim `num` si aporta un número que `via` encara no conté.
function construeixAdreca(r: RegistreEquip): string | null {
  const via = (r.via ?? '').replace(/\s+/g, ' ').trim()
  if (!via) return null
  const num = (r.num ?? '').trim()
  if (/\d/.test(num) && !via.includes(num)) return `${via}, ${num}`
  return via
}

// Resol el codi de municipi contenidor a partir d'un punt (fallback quan el
// dataset no porta codi_municipi vàlid). Un equipament sempre cau dins el seu
// municipi, així que ST_Contains és fiable.
async function municipiPerPunt(
  client: import('pg').PoolClient,
  lng: number,
  lat: number
): Promise<string | null> {
  const { rows } = await client.query<{ codi: string }>(
    'SELECT codi FROM municipis WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) LIMIT 1',
    [lng, lat]
  )
  return rows[0]?.codi ?? null
}

// Centroide interior del municipi (punt garantit dins el polígon), per quan les
// coordenades del dataset són errònies.
async function centreMunicipi(
  client: import('pg').PoolClient,
  codi: string
): Promise<{ lat: number; lng: number } | null> {
  const { rows } = await client.query<{ lat: number; lng: number }>(
    'SELECT ST_Y(ST_PointOnSurface(geom)) AS lat, ST_X(ST_PointOnSurface(geom)) AS lng FROM municipis WHERE codi = $1',
    [codi]
  )
  return rows[0] ?? null
}

async function baixaCategoria(categoria: string): Promise<RegistreEquip[]> {
  const where = encodeURIComponent(`categoria='${categoria}'`)
  const url = `https://analisi.transparenciacatalunya.cat/resource/${DATASET}.json?$where=${where}&$limit=5000`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Error ${res.status} baixant la categoria «${categoria}»`)
  return (await res.json()) as RegistreEquip[]
}

async function processaSubtema(
  m: MapaSubtema,
  client: import('pg').PoolClient,
  idxNom: Map<string, string>
) {
  const registres = await baixaCategoria(m.categoria)
  console.log(`\n[${m.subtema}] ${registres.length} equipaments a «${m.categoria}»`)

  // Idempotent: buida tots els subtemes que genera aquesta entrada abans de reinserir.
  const subtemesEsborrar = m.subtemesGenerats ?? [m.subtema]
  await client.query('DELETE FROM llocs WHERE font = $1 AND subtema_codi = ANY($2)', [
    FONT,
    subtemesEsborrar,
  ])

  let inserits = 0
  let saltats = 0

  for (const r of registres) {
    const idEquip = (r.idequipament ?? '').trim()
    const nom = (r.nom ?? r.alies ?? '').replace(/\s+/g, ' ').trim()
    if (!idEquip || !nom || nomEsCodi(nom)) {
      saltats++
      continue
    }
    if (m.filtreNom && !m.filtreNom(nom)) {
      saltats++
      continue
    }

    const coord = parseCoord(r.latitud, r.longitud)
    if (!coord) {
      console.warn('  · coordenada dolenta —', nom)
      saltats++
      continue
    }

    // Resol el municipi en tres passos, del més fiable al menys:
    //  1) codi_municipi del dataset (recuperant el zero inicial dels municipis de
    //     Barcelona, 08xxxx, que el desa com a número i el perd);
    //  2) pel nom (`poblacio`) — imprescindible per als municipis amb article, que
    //     porten codi_municipi '000000' i sovint coordenades dins el poble veí;
    //  3) ST_Contains amb les coordenades, com a últim recurs.
    let codi = (r.codi_municipi ?? '').trim().padStart(6, '0')
    let muniOk = false
    if (codi.length === 6 && codi !== '000000') {
      const muni = await client.query('SELECT 1 FROM municipis WHERE codi = $1', [codi])
      muniOk = (muni.rowCount ?? 0) > 0
    }
    if (!muniOk) {
      const perNom = idxNom.get(normalitzaNom(r.poblacio ?? ''))
      if (perNom) {
        codi = perNom
        muniOk = true
      }
    }
    if (!muniOk) {
      const perPunt = await municipiPerPunt(client, coord.lng, coord.lat)
      if (perPunt) {
        codi = perPunt
        muniOk = true
      }
    }
    if (!muniOk) {
      console.warn('  · municipi no resolt —', nom)
      saltats++
      continue
    }

    // Municipis coberts per una font municipal pròpia (més completa): els saltem.
    if (m.excloreMunicipis?.includes(codi)) {
      saltats++
      continue
    }

    // Coherència geomètrica: si les coordenades no cauen dins el municipi assignat,
    // són errònies (al dataset n'hi ha unes quantes que apunten a Barcelona ciutat,
    // p.ex. Rajadell, Campins o Orpí) → fem servir el centroide del municipi perquè
    // el pin caigui on toca.
    let punt = coord
    const dins = await client.query<{ ok: boolean }>(
      'SELECT ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) AS ok FROM municipis WHERE codi = $3',
      [coord.lng, coord.lat, codi]
    )
    if (!dins.rows[0]?.ok) {
      const centre = await centreMunicipi(client, codi)
      if (centre) punt = centre
    }

    // El subtema pot derivar del nom (classificació dels jutjats per tipus).
    const subtema = m.subtemaPerNom ? m.subtemaPerNom(nom) : m.subtema

    await client.query(
      `INSERT INTO llocs
         (nom, subtema_codi, municipi_codi, geom, adreca, cp, telefon, web, font, font_id, font_nom, font_url, font_tipus)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $7, $8, $9, $10, $11, $12, $13, 'oficial')
       ON CONFLICT (font, font_id) DO UPDATE SET
         nom = EXCLUDED.nom, subtema_codi = EXCLUDED.subtema_codi, municipi_codi = EXCLUDED.municipi_codi,
         geom = EXCLUDED.geom, adreca = EXCLUDED.adreca, cp = EXCLUDED.cp, telefon = EXCLUDED.telefon,
         web = EXCLUDED.web, font_nom = EXCLUDED.font_nom, font_url = EXCLUDED.font_url, actualitzat_at = now()`,
      [
        nom,
        subtema,
        codi,
        punt.lng,
        punt.lat,
        construeixAdreca(r),
        normalitzaCp(r.cpostal),
        r.telefon1 ?? null,
        m.web ?? null,
        FONT,
        idEquip,
        FONT_NOM,
        FONT_URL,
      ]
    )
    inserits++
  }

  console.log(`[${m.subtema}] fet: ${inserits} inserits, ${saltats} saltats.`)
  return { inserits, saltats }
}

async function main() {
  const filtres = process.argv.slice(2).map((s) => s.trim().toLowerCase())
  const subtemes = filtres.length ? MAPA.filter((m) => filtres.includes(m.subtema)) : MAPA

  if (subtemes.length === 0) {
    console.error(
      `Cap subtema conegut a [${filtres.join(', ')}]. Disponibles: ${MAPA.map((m) => m.subtema).join(', ')}`
    )
    return
  }
  console.log(`Importarà: ${subtemes.map((m) => m.subtema).join(', ')}`)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const idxNom = await indexMunicipisPerNom(client)
    let totalInserits = 0
    for (const m of subtemes) {
      const { inserits } = await processaSubtema(m, client, idxNom)
      totalInserits += inserits
    }
    await client.query('COMMIT')
    console.log(`\nTotal inserits: ${totalInserits}`)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    void pool.end().finally(() => process.exit(1))
  })
