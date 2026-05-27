/**
 * Paleta cromàtica per provincia de Catalunya.
 *
 * Cada provincia té un color primari relacionat amb un tret geogràfic:
 *  - Barcelona  (08) → roig: capitalitat, creu de Sant Jordi, teules de terracota
 *  - Girona     (17) → verd: provincia amb més massa forestal
 *  - Lleida     (25) → or:   provincia amb més hores de sol l'any
 *  - Tarragona  (43) → blau: provincia amb més línia de costa
 *
 * Per a Lleida usem un to or/mostassa en lloc de groc pur per garantir contrast
 * sobre fons blanc i llegibilitat amb text blanc al damunt.
 */

export interface TemaProvincia {
  base: string // estat "total" — fons sòlid
  parcial: string // estat "parcial" — fons suau
  hover: string // hover sense selecció
  contrast: string // text sobre el color base
  vora: string // color de la vora (més fosc que la base)
}

export const TEMA_PROVINCIA: Record<string, TemaProvincia> = {
  // Barcelona — roig
  '08': {
    base: '#c4382e',
    parcial: '#f0d4d2',
    hover: '#f7e8e6',
    contrast: '#ffffff',
    vora: '#8a2620',
  },
  // Girona — verd
  '17': {
    base: '#2d6a2d',
    parcial: '#dfe9d0',
    hover: '#f0f4f0',
    contrast: '#ffffff',
    vora: '#1a3a1a',
  },
  // Lleida — or
  '25': {
    base: '#b8860b',
    parcial: '#f0e3b8',
    hover: '#f7efd4',
    contrast: '#ffffff',
    vora: '#7d5d08',
  },
  // Tarragona — blau
  '43': {
    base: '#2b6cb0',
    parcial: '#d4e2f3',
    hover: '#e8effa',
    contrast: '#ffffff',
    vora: '#1a4880',
  },
}

// Tema neutre per quan no podem determinar la provincia (p. ex. comarques
// que s'estenen sobre dues provincies, vistes des del nivell comarcal del mapa).
export const TEMA_NEUTRE: TemaProvincia = {
  base: '#4a9e4a',
  parcial: '#88b85a',
  hover: '#f0f4f0',
  contrast: '#ffffff',
  vora: '#2d6a2d',
}

export function temaPerProvincia(codi: string | undefined): TemaProvincia {
  if (!codi) return TEMA_NEUTRE
  return TEMA_PROVINCIA[codi] ?? TEMA_NEUTRE
}

// ── Paleta cromàtica per vegueria ──────────────────────────────────────────
//
// Les vegueries no segueixen els límits provincials, per tant no poden
// heretar els colors provincials directament. En canvi, cada vegueria rep
// un color derivat del territori que representa:
//
//  - Les vegueries que coincideixen majorment amb una província (01 BCN,
//    02 GI, 03 L, 04 Tarragona) reutilitzen exactament la paleta provincial.
//  - Les vegueries transversals reben colors intermedis o evocadors:
//    05 Terres de l'Ebre → verd-blau (costa i delta)
//    06 Alt Pirineu i Aran → verd oliva (alta muntanya)
//    07 Catalunya Central → ambre/taronja (entre BCN i Lleida)
//    08 Penedès → vi/magenta (vinyes, entre BCN i Tarragona)
//    00 Val d'Aran → blau lacustre (entitat territorial singular)

export const TEMA_VEGUERIA: Record<string, TemaProvincia> = {
  // 00 Val d'Aran — blau lacustre pirinenc (entitat territorial singular)
  '00': {
    base: '#2d7a8a',
    parcial: '#c8e8ee',
    hover: '#e8f4f6',
    contrast: '#ffffff',
    vora: '#1a4d58',
  },
  // 01 Metropolitana de Barcelona — vermell (mateixa paleta que la província)
  '01': {
    base: '#c4382e',
    parcial: '#f0d4d2',
    hover: '#f7e8e6',
    contrast: '#ffffff',
    vora: '#8a2620',
  },
  // 02 Comarques de Girona — verd (mateixa paleta que la província)
  '02': {
    base: '#2d6a2d',
    parcial: '#dfe9d0',
    hover: '#f0f4f0',
    contrast: '#ffffff',
    vora: '#1a3a1a',
  },
  // 03 Comarques de Lleida — or (mateixa paleta que la província)
  '03': {
    base: '#b8860b',
    parcial: '#f0e3b8',
    hover: '#f7efd4',
    contrast: '#ffffff',
    vora: '#7d5d08',
  },
  // 04 Camp de Tarragona — blau (mateixa paleta que la província)
  '04': {
    base: '#2b6cb0',
    parcial: '#d4e2f3',
    hover: '#e8effa',
    contrast: '#ffffff',
    vora: '#1a4880',
  },
  // 05 Terres de l'Ebre — verd-blau (delta i costa sud)
  '05': {
    base: '#1a7a7a',
    parcial: '#c0e0e0',
    hover: '#e0f0f0',
    contrast: '#ffffff',
    vora: '#0d4d4d',
  },
  // 06 Alt Pirineu i Aran — verd oliva (alta muntanya pirinenca)
  '06': {
    base: '#6a7a2a',
    parcial: '#d8e0b0',
    hover: '#edf0d8',
    contrast: '#ffffff',
    vora: '#445018',
  },
  // 07 Catalunya Central — ambre/taronja (entre Barcelona i Lleida)
  '07': {
    base: '#c07020',
    parcial: '#f0ddc0',
    hover: '#f7eedd',
    contrast: '#ffffff',
    vora: '#7d4a14',
  },
  // 08 Penedès — vi/magenta (vinyes, entre Barcelona i Tarragona)
  '08': {
    base: '#8b3a6e',
    parcial: '#e8c8e0',
    hover: '#f2e0ec',
    contrast: '#ffffff',
    vora: '#5c2548',
  },
}

export function temaPerVegueria(codi: string | undefined): TemaProvincia {
  if (!codi) return TEMA_NEUTRE
  return TEMA_VEGUERIA[codi] ?? TEMA_NEUTRE
}
