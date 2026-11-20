// Capa de correccions dels emblemes (escuts i banderes).
//
// `enriqueix` regenera el JSON sencer des de Wikidata i `baixa-emblemes` el
// reescriu amb les còpies locals: sense aquesta capa, qualsevol arreglament fet
// a mà es perdria a la regeneració següent. Les nostres excepcions viuen a
// backend/correccions/emblemes.json (a git) i tots dos scripts les apliquen al
// damunt del que ve de Wikidata, cada vegada. Format i exemples al README de
// la carpeta.
//
// Tres menes de correcció, per territori i camp (escut/bandera):
//   · commons: fes servir aquest fitxer de Commons (es baixa i s'acredita com
//     qualsevol altre).
//   · amaga:   no en mostris cap, encara que Wikidata en doni un.
//   · propi:   fes servir una imatge nostra (frontend/public/emblemes-propis/,
//     a git), amb el crèdit que indiquem.

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const FITXER = resolve(__dirname, '../../correccions/emblemes.json')
const ARREL_PUBLIC = resolve(__dirname, '../../../frontend/public')
const PREFIX_PROPI = '/emblemes-propis/'

const NIVELLS = ['municipis', 'comarques', 'provincies'] as const
const CAMPS = ['escut', 'bandera'] as const
type Nivell = (typeof NIVELLS)[number]
type Camp = (typeof CAMPS)[number]

export interface Credit {
  autor?: string
  llicencia?: string
  pagina?: string
  // Imatge derivada d'una altra (la llicència demana dir-ho).
  modificat?: boolean
}

export interface Correccio {
  // Per què ens apartem de Wikidata: obligatori, és la memòria de la decisió.
  motiu: string
  commons?: string // "File:Nom del fitxer.svg"
  amaga?: true
  propi?: string // "/emblemes-propis/nom.svg"
  credit?: Credit // només amb `propi`
}

export type Correccions = Partial<Record<Nivell, Record<string, Partial<Record<Camp, Correccio>>>>>

// El mínim que la capa necessita d'una entrada del JSON d'enriquiment.
interface Entrada {
  escut?: string
  bandera?: string
  escutCredit?: Credit
  banderaCredit?: Credit
}
type Dades = Record<Nivell, Record<string, Entrada>>

// "File:Escut_de_X.svg" i "File:Escut de X.svg" són el mateix fitxer.
const canon = (titol: string) => titol.replace(/_/g, ' ').trim()

function titolDePagina(url: string | undefined): string | null {
  const m = url?.match(/\/wiki\/(File:.+)$/)
  return m ? canon(decodeURIComponent(m[1])) : null
}

// Mateixa forma d'URL que retorna Wikidata (la que baixa-emblemes sap llegir).
const urlCommons = (titol: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(canon(titol).replace(/^File:/, ''))}`

// Comprova el fitxer sencer abans d'aplicar res: un error de picatge ha de
// parar l'script, no deixar una correcció sense efecte en silenci.
export function validaCorreccions(c: Correccions): void {
  const errors: string[] = []
  for (const [nivell, territoris] of Object.entries(c)) {
    if (nivell.startsWith('_')) continue // comentaris
    if (!(NIVELLS as readonly string[]).includes(nivell)) {
      errors.push(`nivell desconegut: «${nivell}»`)
      continue
    }
    for (const [clau, camps] of Object.entries(territoris ?? {})) {
      for (const [camp, cor] of Object.entries(camps ?? {})) {
        const on = `${nivell} › ${clau} › ${camp}`
        if (!(CAMPS as readonly string[]).includes(camp)) {
          errors.push(`${on}: el camp ha de ser «escut» o «bandera»`)
          continue
        }
        if (!cor?.motiu?.trim()) errors.push(`${on}: falta el motiu`)
        const menes = [cor?.commons, cor?.amaga, cor?.propi].filter((v) => v !== undefined)
        if (menes.length !== 1) {
          errors.push(`${on}: cal exactament un de «commons», «amaga» o «propi»`)
          continue
        }
        if (cor?.commons !== undefined && !cor.commons.startsWith('File:')) {
          errors.push(`${on}: «commons» ha de començar per «File:»`)
        }
        if (cor?.amaga !== undefined && cor.amaga !== true) {
          errors.push(`${on}: «amaga» només pot ser true`)
        }
        if (cor?.propi !== undefined) {
          if (!cor.propi.startsWith(PREFIX_PROPI)) {
            errors.push(`${on}: «propi» ha de començar per «${PREFIX_PROPI}»`)
          } else if (!existsSync(resolve(ARREL_PUBLIC, cor.propi.replace(/^\//, '')))) {
            errors.push(`${on}: no existeix frontend/public${cor.propi}`)
          }
          if (!cor.credit?.llicencia)
            errors.push(`${on}: una imatge pròpia demana «credit.llicencia»`)
        }
        if (cor?.credit !== undefined && cor.propi === undefined) {
          errors.push(`${on}: «credit» només té sentit amb «propi»`)
        }
      }
    }
  }
  if (errors.length) {
    throw new Error(`Correccions d'emblemes no vàlides:\n  ${errors.join('\n  ')}`)
  }
}

export async function llegeixCorreccions(): Promise<Correccions> {
  if (!existsSync(FITXER)) return {}
  const c = JSON.parse(await readFile(FITXER, 'utf8')) as Correccions
  validaCorreccions(c)
  return c
}

// Aplica les correccions sobre les dades (les modifica) i retorna què ha
// canviat, per al registre de l'script. Idempotent: aplicar-les dues vegades
// dona el mateix que una, i una correcció ja satisfeta no toca res (si no, cada
// execució de baixa-emblemes tornaria a baixar les mateixes imatges).
export function aplicaCorreccions(dades: Dades, correccions: Correccions): string[] {
  const canvis: string[] = []
  for (const nivell of NIVELLS) {
    for (const [clau, camps] of Object.entries(correccions[nivell] ?? {})) {
      for (const camp of CAMPS) {
        const cor = camps?.[camp]
        if (!cor) continue
        const on = `${nivell} › ${clau} › ${camp}`
        const campCredit = `${camp}Credit` as const
        // Un territori que Wikidata no dona (p. ex. la Val d'Aran, que allà no
        // és una comarca) neix amb la primera correcció que no sigui amagar.
        const e = dades[nivell][clau] ?? (cor.amaga ? undefined : (dades[nivell][clau] = {}))
        if (!e) continue

        if (cor.amaga) {
          if (e[camp] === undefined) continue
          delete e[camp]
          delete e[campCredit]
          canvis.push(`${on}: amagat`)
        } else if (cor.propi) {
          const credit = cor.credit ?? {}
          if (e[camp] === cor.propi && JSON.stringify(e[campCredit]) === JSON.stringify(credit)) {
            continue
          }
          e[camp] = cor.propi
          e[campCredit] = credit
          canvis.push(`${on}: imatge pròpia ${cor.propi}`)
        } else if (cor.commons) {
          const url = urlCommons(cor.commons)
          // Ja és aquest fitxer: o bé encara en forma d'URL (acabat de
          // regenerar), o bé ja baixat (ho diu la pàgina del seu crèdit).
          const jaBaixat =
            e[camp]?.startsWith('/emblemes/') &&
            titolDePagina(e[campCredit]?.pagina) === canon(cor.commons)
          if (e[camp] === url || jaBaixat) continue
          e[camp] = url
          delete e[campCredit]
          canvis.push(`${on}: ${cor.commons}`)
        }
      }
    }
  }
  return canvis
}
