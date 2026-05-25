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
