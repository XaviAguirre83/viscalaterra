// Model del joc Capital<>Comarca: relacionar cada comarca amb la seva capital,
// en un sentit o en l'altre. Sempre les 43 comarques, sense nivells (vegeu
// viscalaterra_plan.md § Capital<>Comarca).
//
// Els objectius són sempre codis de comarca, es pregunti la capital o la
// comarca: així les rondes, la pista i la puntuació són les comunes
// (data/partida.ts) i aquest mòdul només hi posa els noms. Mòdul pur (sense
// Vue), com data/geofreak.ts.

import { puntuacio, type Candidat, type DadesPuntuacio } from '@/data/partida'

// «Quina és la capital de...?»   → es mostra la comarca; s'escriu la capital.
// «De quina comarca és capital...?» → es mostra la capital; s'escriu la comarca.
export type ModalitatCapitals = 'quinaCapital' | 'quinaComarca'

export const MODALITATS_CAPITALS: ModalitatCapitals[] = ['quinaCapital', 'quinaComarca']

export interface ConfiguracioCapitals {
  // null = encara no triada (el wizard no deixa començar).
  modalitat: ModalitatCapitals | null
}

export function configuracioBuida(): ConfiguracioCapitals {
  return { modalitat: null }
}

export function configuracioCompleta(c: ConfiguracioCapitals): boolean {
  return c.modalitat !== null
}

// ── Capitals ───────────────────────────────────────────────────────────────

// Capitalitat compartida: el Vallès Occidental té dues capitals, Sabadell i
// Terrassa, però les dades de l'ICGC (comarques.cap) només en porten una.
// Totes dues són respostes bones.
export const COCAPITALS: Record<string, string[]> = {
  '40': ['Terrassa'],
}

// Codi de comarca → noms de les seves capitals (la de les dades primer). Les
// comarques transfrontereres surten repetides a l'arbre (una per província):
// compten una sola vegada.
export function capitalsPerComarca(
  comarques: { codi: string; cap: string }[]
): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const c of comarques) {
    if (m.has(c.codi) || !c.cap) continue
    const noms = [c.cap, ...(COCAPITALS[c.codi] ?? [])]
    m.set(c.codi, [...new Set(noms)])
  }
  return m
}

// Capital que es pregunta a «De quina comarca és capital...?»: amb dues
// capitals, una de les dues a l'atzar.
export function triaCapital(noms: string[], aleatori: () => number = Math.random): string {
  return noms[Math.floor(aleatori() * noms.length)] ?? ''
}

// Respostes possibles a «Quina és la capital de...?»: cada capital de les
// comarques donades (les dues del Vallès Occidental), per ordre alfabètic.
export function candidatsCapitals(capitals: Map<string, string[]>, codis: string[]): Candidat[] {
  return codis
    .flatMap((codi) => (capitals.get(codi) ?? []).map((nom) => ({ codi, nom })))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'ca'))
}

// ── Pista ──────────────────────────────────────────────────────────────────

// Grups de candidats per als distractors, del més proper al més llunyà: les
// comarques de les mateixes províncies que l'objectiu (una transfronterera en
// té dues) i després qualsevol. Així la pista mai regala la resposta posant-la
// entre tres de l'altra punta del país.
export function grupsDistractors(
  objectiu: string,
  vius: string[],
  provinciesDe: (codiComarca: string) => string[]
): string[][] {
  const provincies = new Set(provinciesDe(objectiu))
  const veines = vius.filter((c) => provinciesDe(c).some((p) => provincies.has(p)))
  return [veines, vius]
}

// ── Puntuació ──────────────────────────────────────────────────────────────

// La fórmula comuna sense multiplicador: no hi ha nivells (temps i ràtio
// d'encerts, amb l'encert amb pista a mig encert).
export function calculaPunts(dades: DadesPuntuacio): number {
  return puntuacio({ ...dades, multiplicador: 1 })
}
