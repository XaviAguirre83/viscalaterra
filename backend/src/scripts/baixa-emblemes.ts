// Descarrega en local els escuts i banderes (avui carregats per URL remota des de
// Wikimedia Commons, amb un redirect no cachejat que els fa lents) i guarda
// l'atribució (autor + llicència + pàgina del fitxer) per a cada imatge.
//
// Llegeix i REESCRIU frontend/public/data/territoris-enriquiment.json: els camps
// `escut`/`bandera` passen de ser URL de Commons a una ruta local
// (/emblemes/...), i s'hi afegeixen `escutCredit`/`banderaCredit`.
// Les imatges es desen a frontend/public/emblemes/.
//
//   npm --prefix backend run baixa-emblemes
//
// Idempotent: les entrades que ja apunten a /emblemes/ es salten. Cal executar-lo
// DESPRÉS de `enriqueix` (que regenera el JSON amb URLs de Commons).
// Variable opcional EMBLEMES_LIMIT=N per limitar (proves).

import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const ARREL = resolve(__dirname, '../../../frontend/public')
const JSON_PATH = resolve(ARREL, 'data/territoris-enriquiment.json')
const DIR_EMBLEMES = resolve(ARREL, 'emblemes')
const API = 'https://commons.wikimedia.org/w/api.php'
const UA = "viscalaterra-dev/1.0 (descàrrega d'emblemes; x.tecnic@gmail.com)"
const LIMIT = Number(process.env.EMBLEMES_LIMIT ?? 0)

interface Credit {
  autor?: string
  llicencia?: string
  pagina?: string
}
interface Enriquiment {
  web?: string
  wiki?: string
  escut?: string
  bandera?: string
  escutCredit?: Credit
  banderaCredit?: Credit
}
type Dades = Record<'municipis' | 'comarques' | 'provincies', Record<string, Enriquiment>>

const PREFIX: Record<string, string> = { municipis: 'mun', comarques: 'com', provincies: 'prov' }

interface Entrada {
  nivell: string
  clau: string
  camp: 'escut' | 'bandera'
  titol: string // "File:..."
}

function titolDeUrl(url: string): string | null {
  const i = url.indexOf('Special:FilePath/')
  if (i < 0) return null
  return 'File:' + decodeURIComponent(url.slice(i + 'Special:FilePath/'.length))
}

function canon(titol: string): string {
  return titol.replace(/_/g, ' ').trim()
}

function netejaHtml(s: string | undefined): string | undefined {
  if (!s) return undefined
  const t = s
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return t || undefined
}

function sanititza(clau: string): string {
  return clau
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface Meta {
  urlDescarrega: string
  ext: string
  autor?: string
  llicencia?: string
  pagina?: string
}

async function consultaCommons(titols: string[]): Promise<Map<string, Meta>> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'url|mime|extmetadata',
    // Els SVG es baixen vectorials (ii.url); aquest ample només s'aplica als
    // pocs emblemes raster (PNG/JPG), per tenir-ne una còpia local raonable.
    iiurlwidth: '256',
    titles: titols.join('|'),
  })
  const res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`Commons API ${res.status}`)
  const json = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          title: string
          imageinfo?: {
            url: string
            thumburl?: string
            mime?: string
            descriptionurl?: string
            extmetadata?: Record<string, { value?: string }>
          }[]
        }
      >
    }
  }
  const out = new Map<string, Meta>()
  for (const p of Object.values(json.query?.pages ?? {})) {
    const ii = p.imageinfo?.[0]
    if (!ii) continue
    const esSvg = (ii.mime ?? '').includes('svg')
    const urlDescarrega = esSvg ? ii.url : (ii.thumburl ?? ii.url)
    const ext = (urlDescarrega.split('.').pop() ?? 'img').toLowerCase().split('?')[0]
    out.set(canon(p.title), {
      urlDescarrega,
      ext: esSvg ? 'svg' : ext,
      autor: netejaHtml(ii.extmetadata?.Artist?.value),
      llicencia: netejaHtml(ii.extmetadata?.LicenseShortName?.value),
      pagina: ii.descriptionurl,
    })
  }
  return out
}

const dorm = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function baixa(url: string, desti: string): Promise<void> {
  // upload.wikimedia.org limita peticions ràpides: reintent amb espera creixent
  // davant un 429 (Too Many Requests).
  for (let intent = 0; intent < 7; intent++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.ok) {
      await writeFile(desti, Buffer.from(await res.arrayBuffer()))
      return
    }
    if (res.status === 429 && intent < 6) {
      await dorm(Math.min(2000 * 2 ** intent, 30000)) // 2s,4s,8s,16s,30s,30s
      continue
    }
    throw new Error(`${res.status} a ${url}`)
  }
}

async function ambConcurrencia<T>(
  items: T[],
  n: number,
  fn: (t: T) => Promise<void>
): Promise<void> {
  let i = 0
  const worker = async () => {
    while (i < items.length) {
      const idx = i++
      await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker))
}

async function main() {
  const dades = JSON.parse(await readFile(JSON_PATH, 'utf8')) as Dades
  await mkdir(DIR_EMBLEMES, { recursive: true })

  // 1) Recull entrades pendents (URL de Commons, no encara local).
  let entrades: Entrada[] = []
  for (const nivell of Object.keys(dades) as (keyof Dades)[]) {
    for (const [clau, e] of Object.entries(dades[nivell])) {
      for (const camp of ['escut', 'bandera'] as const) {
        const v = e[camp]
        if (!v || v.startsWith('/emblemes/')) continue
        const titol = titolDeUrl(v)
        if (titol) entrades.push({ nivell, clau, camp, titol })
      }
    }
  }
  if (LIMIT > 0) entrades = entrades.slice(0, LIMIT)
  console.log(`Entrades a processar: ${entrades.length}`)

  // 2) Metadades de Commons (lots de 50).
  const meta = new Map<string, Meta>()
  for (let i = 0; i < entrades.length; i += 50) {
    const lot = entrades.slice(i, i + 50)
    const m = await consultaCommons([...new Set(lot.map((e) => e.titol))])
    m.forEach((v, k) => meta.set(k, v))
    process.stdout.write(`\rMetadades: ${Math.min(i + 50, entrades.length)}/${entrades.length}`)
    await new Promise((r) => setTimeout(r, 250))
  }
  console.log()

  // 3) Descàrrega (amb concurrència limitada) + actualització del JSON.
  let ok = 0
  let fallits = 0
  let fets = 0
  // Serial + pausa generosa per no disparar el rate limit de Wikimedia.
  await ambConcurrencia(entrades, 1, async (en) => {
    const m = meta.get(canon(en.titol))
    const e = dades[en.nivell as keyof Dades][en.clau]
    if (!m) {
      fallits++
      return
    }
    const nom = `${PREFIX[en.nivell]}-${sanititza(en.clau)}-${en.camp}.${m.ext}`
    try {
      await baixa(m.urlDescarrega, resolve(DIR_EMBLEMES, nom))
      e[en.camp] = `/emblemes/${nom}`
      e[`${en.camp}Credit`] = {
        ...(m.autor ? { autor: m.autor } : {}),
        ...(m.llicencia ? { llicencia: m.llicencia } : {}),
        ...(m.pagina ? { pagina: m.pagina } : {}),
      }
      ok++
    } catch (err) {
      fallits++
      console.error(`\nFalla ${en.titol}:`, (err as Error).message)
    }
    if (++fets % 50 === 0) process.stdout.write(`\rDescàrrega: ${fets}/${entrades.length}`)
    await dorm(400)
  })
  console.log()

  await mkdir(dirname(JSON_PATH), { recursive: true })
  await writeFile(JSON_PATH, JSON.stringify(dades, null, 0) + '\n', 'utf8')
  console.log(`Descarregats: ${ok} · fallits: ${fallits}`)
  console.log(`Emblemes a ${DIR_EMBLEMES}`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
