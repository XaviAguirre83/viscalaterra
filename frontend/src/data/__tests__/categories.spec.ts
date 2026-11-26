import { describe, it, expect } from 'vitest'
import ca from '@/i18n/locales/ca.json'
import es from '@/i18n/locales/es.json'
import en from '@/i18n/locales/en.json'
import { TEMES_AGENDA, TEMES_LLOCS, TEMES_PER_SECCIO, type Tema } from '../categories'

const DICCIONARIS: Record<string, unknown> = { ca, es, en }
const CATALEGS = [TEMES_LLOCS, TEMES_AGENDA]

// Resol una clau amb punts ('que.esports.titol') dins d'un diccionari.
function textDe(diccionari: unknown, clau: string): unknown {
  return clau
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node !== null && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      diccionari
    )
}

function codisSubtemes(temes: Tema[]): string[] {
  return temes.flatMap((t) => t.subtemes.map((s) => s.codi))
}

describe('categories — catàlegs del Què?', () => {
  it('Llocs i Agenda tenen cadascuna el seu catàleg', () => {
    expect(TEMES_PER_SECCIO.llocs).toBe(TEMES_LLOCS)
    expect(TEMES_PER_SECCIO.agenda).toBe(TEMES_AGENDA)
  })

  it('els codis de subtema són únics entre tots dos catàlegs', () => {
    const codis = CATALEGS.flatMap(codisSubtemes)
    expect(new Set(codis).size).toBe(codis.length)
  })

  it('dins de cada catàleg, els temes tenen codi únic i algun subtema', () => {
    for (const temes of CATALEGS) {
      const codis = temes.map((t) => t.codi)
      expect(new Set(codis).size).toBe(codis.length)
      expect(temes.filter((t) => t.subtemes.length === 0).map((t) => t.codi)).toEqual([])
    }
  })

  it('totes les claus tenen text en català, castellà i anglès', () => {
    const claus = CATALEGS.flat().flatMap((t) => [t.clau, ...t.subtemes.map((s) => s.clau)])
    // «idioma: clau» de cada text que falta, perquè l'error digui quin és.
    const senseText = Object.entries(DICCIONARIS).flatMap(([idioma, diccionari]) =>
      claus
        .filter((c) => {
          const text = textDe(diccionari, c)
          return typeof text !== 'string' || text.trim() === ''
        })
        .map((c) => `${idioma}: ${c}`)
    )
    expect(senseText).toEqual([])
  })

  it('les fires i els mercats són esdeveniments (Agenda), no llocs', () => {
    const llocs = codisSubtemes(TEMES_LLOCS)
    const agenda = codisSubtemes(TEMES_AGENDA)
    for (const codi of ['fira-gastronomica', 'mercat-setmanal']) {
      expect(llocs).not.toContain(codi)
      expect(agenda).toContain(codi)
    }
    // Els food trucks són negocis privats: no surten enlloc.
    expect([...llocs, ...agenda]).not.toContain('food-trucks')
  })
})
