// Model de selecció temporal del panell Quan?
//
// L'usuari tria QUAN està disponible un contingut (Què?) dins el territori (On?).
// La unitat mínima és el DIA: no es fa mai selecció d'hores.
//
// Hi ha quatre modalitats mútuament excloents (`ModeTemporal`):
//
//   permanent  → sempre disponible, sense data de fi.
//   dates      → una data concreta o un interval [inici, fi] (dos calendaris).
//   setmanal   → es repeteix cada setmana en uns dies concrets (dilluns, dijous…).
//   mensual    → es repeteix cada mes en una posició ordinal d'un dia de la
//                setmana (p. ex. "primer i últim dilluns de mes").
//
// Tot el mòdul és pur (sense Vue ni estat): la lògica de validació és fàcilment
// testejable i el store (`stores/filtres.ts`) només hi afegeix reactivitat.

export type ModeTemporal = 'permanent' | 'dates' | 'setmanal' | 'mensual'

export const MODES_TEMPORALS: ModeTemporal[] = ['permanent', 'dates', 'setmanal', 'mensual']

// Posicions ordinals d'un dia dins el mes. 'ultim' cobreix l'últim dia de la
// setmana del mes (p. ex. l'últim divendres), independentment de quants n'hi hagi.
export const ORDINALS = ['primer', 'segon', 'tercer', 'quart', 'ultim'] as const
export type Ordinal = (typeof ORDINALS)[number]

// Dies de la setmana en codi ISO-8601: 1 = dilluns … 7 = diumenge.
export const DIES_SETMANA = [1, 2, 3, 4, 5, 6, 7] as const
export type DiaSetmana = (typeof DIES_SETMANA)[number]

export interface SeleccioTemporal {
  // null = "qualsevol moment" (sense filtre temporal actiu).
  mode: ModeTemporal | null
  // mode 'dates' — dates en format ISO 'YYYY-MM-DD' (el que retorna <input type="date">).
  dataInici: string | null
  dataFi: string | null
  // mode 'setmanal' i 'mensual' — dies de la setmana triats, en ordre ascendent.
  diesSetmana: DiaSetmana[]
  // mode 'mensual' — posicions ordinals triades, en l'ordre canònic d'ORDINALS.
  ordinals: Ordinal[]
}

export function seleccioTemporalBuida(): SeleccioTemporal {
  return { mode: null, dataInici: null, dataFi: null, diesSetmana: [], ordinals: [] }
}

// Un interval és vàlid si, quan els dos extrems hi són, el final no precedeix
// l'inici. Les dates ISO 'YYYY-MM-DD' es comparen correctament de forma
// lexicogràfica. Un sol extrem (o cap) també es considera vàlid.
export function rangDatesValid(inici: string | null, fi: string | null): boolean {
  if (!inici || !fi) return true
  return fi >= inici
}

// Una selecció és "completa" quan conté prou informació per filtrar de debò.
// teFiltresActius (al store) la utilitza per saber si el Quan? aplica un filtre.
export function seleccioTemporalCompleta(s: SeleccioTemporal): boolean {
  switch (s.mode) {
    case 'permanent':
      return true
    case 'dates':
      return s.dataInici !== null && rangDatesValid(s.dataInici, s.dataFi)
    case 'setmanal':
      return s.diesSetmana.length > 0
    case 'mensual':
      return s.ordinals.length > 0 && s.diesSetmana.length > 0
    case null:
      return false
  }
}
