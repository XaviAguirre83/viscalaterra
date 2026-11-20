// Textos legals (frontend/src/legal/, format al seu README): del Markdown reduït a
// blocs que el component TextLegal pinta sense v-html. Les dades del titular vénen
// del .env, no del text, i per això tampoc s'hi pot colar HTML. Un camp que no
// existeix o un enllaç no permès són errors del text: es llancen (i els tests els
// detecten) en lloc de pintar-se a mitges.

import { urlSegura } from './url'

export const TEXTOS_LEGALS = ['avis-legal', 'privacitat', 'cookies', 'condicions'] as const
export type NomTextLegal = (typeof TEXTOS_LEGALS)[number]

export const CAMPS_TITULAR = ['nom', 'email'] as const
export type CampTitular = (typeof CAMPS_TITULAR)[number]
export type DadesTitular = Record<CampTitular, string>

export type NodeInline =
  | { tipus: 'text'; text: string }
  | { tipus: 'codi'; text: string }
  | { tipus: 'negreta'; fills: NodeInline[] }
  | { tipus: 'enllac'; href: string; desti: 'intern' | 'web' | 'correu'; fills: NodeInline[] }
  | { tipus: 'pendent'; text: string }

export type BlocLegal =
  | { tipus: 'titol'; nivell: 1 | 2 | 3; contingut: NodeInline[] }
  | { tipus: 'paragraf'; contingut: NodeInline[] }
  | { tipus: 'llista'; elements: NodeInline[][] }

export interface TextLegal {
  blocs: BlocLegal[]
  /** Hi queda algun [[PENDENT: …]] (o falta un camp obligatori): no es pot publicar. */
  tePendents: boolean
}

const RE_CAMP = /\{\{titular\.(\w+)\}\}/g
const RE_INLINE = /\[\[PENDENT:\s*(.*?)\]\]|\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g

function campValid(nom: string): CampTitular {
  if (!(CAMPS_TITULAR as readonly string[]).includes(nom)) {
    throw new Error(`Camp desconegut als textos legals: {{titular.${nom}}}`)
  }
  return nom as CampTitular
}

function campsDe(font: string): CampTitular[] {
  return [...font.matchAll(RE_CAMP)].map(([, nom]) => campValid(nom!))
}

// Sense nom ni correu, els textos quedarien sense responsable ni contacte: no
// s'amaguen, es marquen com a pendents.
function pendentDeCamp(camp: CampTitular): NodeInline {
  return { tipus: 'pendent', text: `falta TITULAR_${camp.toUpperCase()} al .env` }
}

function textAmbCamps(text: string, dades: DadesTitular): NodeInline[] {
  // Amb el grup de captura, split alterna text (posicions parells) i noms de camp.
  return text
    .split(new RegExp(RE_CAMP.source))
    .map((tros, i): NodeInline | null => {
      if (i % 2 === 0) return tros ? { tipus: 'text', text: tros } : null
      const camp = campValid(tros)
      return dades[camp] ? { tipus: 'text', text: dades[camp] } : pendentDeCamp(camp)
    })
    .filter((n): n is NodeInline => n !== null)
}

function enllac(text: string, href: string, dades: DadesTitular): NodeInline {
  const buit = campsDe(href).find((c) => !dades[c])
  if (buit) return pendentDeCamp(buit)
  const adreca = href.replace(RE_CAMP, (_, camp: CampTitular) => dades[camp])
  const fills = analitzaInline(text, dades)
  if (/^\/(?!\/)/.test(adreca)) return { tipus: 'enllac', href: adreca, desti: 'intern', fills }
  if (adreca.startsWith('mailto:')) return { tipus: 'enllac', href: adreca, desti: 'correu', fills }
  const web = urlSegura(adreca)
  if (!web) throw new Error(`Enllaç no permès als textos legals: ${href}`)
  return { tipus: 'enllac', href: web, desti: 'web', fills }
}

function analitzaInline(font: string, dades: DadesTitular): NodeInline[] {
  const nodes: NodeInline[] = []
  let pos = 0
  for (const m of font.matchAll(RE_INLINE)) {
    nodes.push(...textAmbCamps(font.slice(pos, m.index), dades))
    const [, pendent, negreta, codi, text, href] = m
    if (pendent !== undefined) nodes.push({ tipus: 'pendent', text: pendent })
    else if (negreta !== undefined) {
      nodes.push({ tipus: 'negreta', fills: analitzaInline(negreta, dades) })
    } else if (codi !== undefined) nodes.push({ tipus: 'codi', text: codi })
    else nodes.push(enllac(text!, href!, dades))
    pos = m.index + m[0].length
  }
  nodes.push(...textAmbCamps(font.slice(pos), dades))
  return nodes
}

function tePendent(nodes: NodeInline[]): boolean {
  return nodes.some((n) => n.tipus === 'pendent' || ('fills' in n && tePendent(n.fills)))
}

export function analitzaTextLegal(font: string, dades: DadesTitular): TextLegal {
  const blocs: BlocLegal[] = []
  let paragraf: string[] = []
  let llista: string[] | null = null

  const tanca = () => {
    if (paragraf.length) {
      blocs.push({ tipus: 'paragraf', contingut: analitzaInline(paragraf.join(' '), dades) })
    }
    if (llista) {
      blocs.push({ tipus: 'llista', elements: llista.map((e) => analitzaInline(e, dades)) })
    }
    paragraf = []
    llista = null
  }

  for (const linia of font.split('\n').map((l) => l.trim())) {
    const titol = /^(#{1,3})\s+(.+)$/.exec(linia)
    const element = /^-\s+(.+)$/.exec(linia)
    if (!linia) tanca()
    else if (titol) {
      tanca()
      const nivell = titol[1]!.length as 1 | 2 | 3
      blocs.push({ tipus: 'titol', nivell, contingut: analitzaInline(titol[2]!, dades) })
    } else if (element) {
      if (paragraf.length) tanca()
      ;(llista ??= []).push(element[1]!)
    } else if (llista) llista[llista.length - 1] += ` ${linia}`
    else paragraf.push(linia)
  }
  tanca()

  return {
    blocs,
    tePendents: blocs.some((b) =>
      b.tipus === 'llista' ? b.elements.some(tePendent) : tePendent(b.contingut)
    ),
  }
}
