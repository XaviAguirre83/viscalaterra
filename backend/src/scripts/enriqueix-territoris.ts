// Genera l'enriquiment de territoris a partir de Wikidata: per cada municipi,
// comarca i província, la seva web oficial, l'article de Viquipèdia (ca), i les
// imatges d'escut i bandera (URL de Wikimedia Commons).
//
// Sortida: frontend/public/data/territoris-enriquiment.json (estàtic, no toca
// la BD ni afegeix dependència en runtime). Es regenera quan es vulgui:
//   npm --prefix backend run enriqueix
//
// Join: els municipis es creuen pel codi INE (P772 a Wikidata = CODIMUNI a
// l'ICC). Comarques i províncies, pel nom normalitzat (sense article).

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const SPARQL = 'https://query.wikidata.org/sparql'
const SORTIDA = resolve(__dirname, '../../../frontend/public/data/territoris-enriquiment.json')

// Normalització idèntica a la del frontend (data/text.ts) + treure article
// inicial, perquè "el Maresme" i "Maresme" col·lideixin en la mateixa clau.
function clauNom(s: string): string {
  const n = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  return n.replace(/^(l'|d'|el |la |els |les |de |s')/, '').trim()
}

interface Enriquiment {
  web?: string
  wiki?: string
  escut?: string
  bandera?: string
}

async function consulta(query: string): Promise<Record<string, string>[]> {
  const url = `${SPARQL}?format=json&query=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': 'viscalaterra-dev/1.0 (enriquiment de territoris)',
    },
  })
  if (!res.ok) throw new Error(`Wikidata ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as {
    results: { bindings: Record<string, { value: string }>[] }
  }
  return json.results.bindings.map((b) =>
    Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value]))
  )
}

// Acumula files (Wikidata pot retornar-ne diverses per entitat si un camp té
// múltiples valors): primer valor que arriba per camp, per clau.
function acumula(
  files: Record<string, string>[],
  clau: (f: Record<string, string>) => string | undefined
): Record<string, Enriquiment> {
  const out: Record<string, Enriquiment> = {}
  for (const f of files) {
    const k = clau(f)
    if (!k) continue
    const e = (out[k] ??= {})
    if (f.web && !e.web) e.web = f.web
    if (f.article && !e.wiki) e.wiki = f.article
    if (f.escut && !e.escut) e.escut = f.escut
    if (f.bandera && !e.bandera) e.bandera = f.bandera
  }
  return out
}

const CAMPS_OPCIONALS = `
  OPTIONAL { ?x wdt:P856 ?web }
  OPTIONAL { ?article schema:about ?x ; schema:isPartOf <https://ca.wikipedia.org/> }
  OPTIONAL { ?x wdt:P94 ?escut }
  OPTIONAL { ?x wdt:P41 ?bandera }`

async function main() {
  console.log('Consultant Wikidata…')

  const municipis = acumula(
    await consulta(
      `SELECT ?ine ?web ?article ?escut ?bandera WHERE {
        ?x wdt:P31 wd:Q33146843 ; wdt:P772 ?ine .
        ${CAMPS_OPCIONALS}
      }`
    ),
    (f) => f.ine
  )

  const comarques = acumula(
    await consulta(
      `SELECT ?nom ?web ?article ?escut ?bandera WHERE {
        ?x wdt:P31 wd:Q937876 ; rdfs:label ?nom . FILTER(LANG(?nom) = "ca")
        ${CAMPS_OPCIONALS}
      }`
    ),
    (f) => (f.nom ? clauNom(f.nom) : undefined)
  )

  // Províncies: per codi ISO 3166-2 (P300), que les identifica sense
  // ambigüitat. Es claven al nostre CODIPROV.
  const ISO_A_CODIPROV: Record<string, string> = {
    'ES-B': '08',
    'ES-GI': '17',
    'ES-L': '25',
    'ES-T': '43',
  }
  const provincies = acumula(
    await consulta(
      `SELECT ?iso ?web ?article ?escut ?bandera WHERE {
        VALUES ?iso { "ES-B" "ES-GI" "ES-L" "ES-T" }
        ?x wdt:P300 ?iso .
        ${CAMPS_OPCIONALS}
      }`
    ),
    (f) => (f.iso ? ISO_A_CODIPROV[f.iso] : undefined)
  )

  // Aliasos de noms que Wikidata escriu diferent del nostre NOMCOMAR:
  // - "Baixa Cerdanya" (part espanyola) → la nostra "Cerdanya" transfronterera.
  if (comarques['baixa cerdanya'] && !comarques['cerdanya']) {
    comarques['cerdanya'] = comarques['baixa cerdanya']
  }
  // Pendent (curació manual): la Val d'Aran no és instància de comarca a
  // Wikidata (entitat territorial singular), així que no s'enriqueix aquí.

  const dades = { municipis, comarques, provincies }

  await mkdir(dirname(SORTIDA), { recursive: true })
  await writeFile(SORTIDA, JSON.stringify(dades, null, 0) + '\n', 'utf8')

  const compta = (o: Record<string, Enriquiment>, camp: keyof Enriquiment) =>
    Object.values(o).filter((e) => e[camp]).length
  for (const [nivell, o] of Object.entries(dades)) {
    const n = Object.keys(o).length
    console.log(
      `${nivell}: ${n} entrades — web ${compta(o, 'web')}, wiki ${compta(o, 'wiki')}, ` +
        `escut ${compta(o, 'escut')}, bandera ${compta(o, 'bandera')}`
    )
  }
  console.log(`Escrit a ${SORTIDA}`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
