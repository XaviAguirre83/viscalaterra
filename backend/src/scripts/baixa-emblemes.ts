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
//   npm --prefix backend run baixa-emblemes -- --credits
//
// Idempotent: les entrades que ja apunten a /emblemes/ es salten. Cal executar-lo
// DESPRÉS de `enriqueix` (que regenera el JSON amb URLs de Commons).
// Amb --credits no baixa res: només torna a demanar l'atribució de les imatges
// que ja són locals (a la pàgina de Commons desada al seu crèdit). Si a Commons
// hi ha una versió més nova que la còpia local, aquell crèdit no es toca.
// Variable opcional EMBLEMES_LIMIT=N per limitar (proves).
//
// Abans de baixar res aplica les nostres correccions (backend/correccions/
// emblemes.json; vegeu correccions-emblemes.ts): n'hi ha prou amb executar-lo
// per fer efectiu un canvi d'aquell fitxer. Amb --credits no s'apliquen.

import { createHash } from 'node:crypto'
import { writeFile, mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { aplicaCorreccions, llegeixCorreccions } from './correccions-emblemes'

const ARREL = resolve(__dirname, '../../../frontend/public')
const JSON_PATH = resolve(ARREL, 'data/territoris-enriquiment.json')
const DIR_EMBLEMES = resolve(ARREL, 'emblemes')
const API = 'https://commons.wikimedia.org/w/api.php'
const UA = "viscalaterra-dev/1.0 (descàrrega d'emblemes; xavi.aguirre@proton.me)"
const LIMIT = Number(process.env.EMBLEMES_LIMIT ?? 0)
const NOMES_CREDITS = process.argv.includes('--credits')

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

// "https://commons.wikimedia.org/wiki/File:Escut_de_X.svg" → "File:Escut_de_X.svg"
function titolDePagina(url: string | undefined): string | null {
  const m = url?.match(/\/wiki\/(File:.+)$/)
  return m ? decodeURIComponent(m[1]) : null
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

// Camp d'autor de la plantilla d'informació del fitxer ({{Information|author=}} o
// {{COAInformation|artist=}}, la dels escuts) passat a text pla. Si hi queda
// marcatge que no sabem llegir, millor sense autor que amb brossa.
function autorDeWikitext(wikitext: string | undefined): string | undefined {
  for (const [, valor] of (wikitext ?? '').matchAll(/^\s*\|\s*(?:author|artist)\s*=(.*)$/gim)) {
    const t = valor
      .replace(/^\s*[*#]+/, '') // vinyeta de llista
      .replace(/<!--.*?-->/g, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\{\{\s*(?:u|uw|ut|user)\s*\|\s*([^|{}]+)[^{}]*\}\}/gi, '$1') // {{U|nom}}
      .replace(/\{\{\s*(?:attrib\w*|thv)\b[^{}]*\}\}/gi, '') // notes al costat del nom
      .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1') // [[User:nom|text]]
      .replace(/\[\[(?:[^\]:]*:)*([^\]]*)\]\]/g, '$1') // [[User:nom]]
      .replace(/\[(?:https?:)?\/\/\S+\s+([^\]]*)\]/g, '$1') // [https://… text]
      .replace(/'{2,}/g, '')
      .replace(/\}\}\s*$/, '') // tancament de la plantilla a la mateixa línia
      .replace(/\s+/g, ' ')
      .trim()
    if (t && !/[{}[\]|<>=]/.test(t)) return t
  }
  return undefined
}

// L'autor no sempre és a `Artist`: els escuts amb {{COAInformation}} no l'hi
// exposen, i llavors surt a l'atribució que demana la llicència
// ({{self|author=…}}) o només al wikitext.
function autorDe(
  meta: Record<string, { value?: string }> | undefined,
  wikitext: string | undefined
): string | undefined {
  return (
    netejaHtml(meta?.Artist?.value) ??
    netejaHtml(meta?.Attribution?.value) ??
    autorDeWikitext(wikitext)
  )
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
  sha1?: string
  pujada?: string // data de la versió actual del fitxer
}

async function consultaCommons(titols: string[]): Promise<Map<string, Meta>> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo|revisions',
    iiprop: 'url|mime|extmetadata|sha1|timestamp',
    // Els SVG es baixen vectorials (ii.url); aquest ample només s'aplica als
    // pocs emblemes raster (PNG/JPG), per tenir-ne una còpia local raonable.
    iiurlwidth: '256',
    // Wikitext de la pàgina, per si l'autor no surt a extmetadata (autorDe).
    rvprop: 'content',
    rvslots: 'main',
    titles: titols.join('|'),
  })
  // Amb el wikitext les respostes pesen més i l'API pot demanar calma (429).
  let res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } })
  for (let intent = 0; res.status === 429 && intent < 5; intent++) {
    await dorm(Number(res.headers.get('retry-after')) * 1000 || 5000 * 2 ** intent)
    res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } })
  }
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
            sha1?: string
            timestamp?: string
          }[]
          revisions?: { slots?: { main?: { '*'?: string } } }[]
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
      autor: autorDe(ii.extmetadata, p.revisions?.[0]?.slots?.main?.['*']),
      llicencia: netejaHtml(ii.extmetadata?.LicenseShortName?.value),
      pagina: ii.descriptionurl,
      sha1: ii.sha1,
      pujada: ii.timestamp,
    })
  }
  return out
}

function creditDe(m: Meta): Credit {
  return {
    ...(m.autor ? { autor: m.autor } : {}),
    ...(m.llicencia ? { llicencia: m.llicencia } : {}),
    ...(m.pagina ? { pagina: m.pagina } : {}),
  }
}

// La còpia local és la versió actual del fitxer a Commons? Els SVG es comparen
// per SHA-1; dels raster se'n va baixar una miniatura, així que es mira la data.
async function esVersioActual(ruta: string, m: Meta): Promise<boolean> {
  const fitxer = resolve(ARREL, ruta.replace(/^\//, ''))
  if (m.ext !== 'svg') {
    return m.pujada !== undefined && new Date(m.pujada) <= (await stat(fitxer)).mtime
  }
  const sha1 = createHash('sha1')
    .update(await readFile(fitxer))
    .digest('hex')
  return sha1 === m.sha1
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

  if (!NOMES_CREDITS) {
    const canvis = aplicaCorreccions(dades, await llegeixCorreccions())
    console.log(`Correccions aplicades: ${canvis.length}`)
    canvis.forEach((c) => console.log(`  ${c}`))
  }

  // 1) Recull entrades pendents (URL de Commons, no encara local) o, amb
  //    --credits, les ja locals (pel títol de la pàgina desada al crèdit).
  let entrades: Entrada[] = []
  for (const nivell of Object.keys(dades) as (keyof Dades)[]) {
    for (const [clau, e] of Object.entries(dades[nivell])) {
      for (const camp of ['escut', 'bandera'] as const) {
        const v = e[camp]
        if (!v) continue
        const local = v.startsWith('/emblemes/')
        const titol = NOMES_CREDITS
          ? local && titolDePagina(e[`${camp}Credit`]?.pagina)
          : !local && titolDeUrl(v)
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
    await new Promise((r) => setTimeout(r, 1000))
  }
  console.log()

  // 3) Amb --credits només es reescriu l'atribució; les imatges no es toquen.
  if (NOMES_CREDITS) {
    let canviats = 0
    let senseResposta = 0
    const desfasats: string[] = []
    for (const en of entrades) {
      const m = meta.get(canon(en.titol))
      const e = dades[en.nivell as keyof Dades][en.clau]
      const ruta = e[en.camp]
      if (!m || !ruta) {
        senseResposta++ // el crèdit es queda com estava
        continue
      }
      // Si el fitxer ha canviat a Commons, el seu crèdit d'avui potser no és el
      // de la nostra còpia: es deixa com estava.
      if (!(await esVersioActual(ruta, m))) {
        desfasats.push(`${en.titol} (${ruta})`)
        continue
      }
      const credit = creditDe(m)
      if (JSON.stringify(credit) !== JSON.stringify(e[`${en.camp}Credit`])) canviats++
      e[`${en.camp}Credit`] = credit
    }
    await writeFile(JSON_PATH, JSON.stringify(dades, null, 0) + '\n', 'utf8')
    console.log(`Crèdits canviats: ${canviats} · sense resposta de Commons: ${senseResposta}`)
    if (desfasats.length) {
      console.log(`Còpia local més antiga que Commons (crèdit intacte): ${desfasats.length}`)
      desfasats.forEach((d) => console.log(`  ${d}`))
    }
    process.exit(0)
  }

  // 4) Descàrrega (amb concurrència limitada) + actualització del JSON.
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
      e[`${en.camp}Credit`] = creditDe(m)
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
