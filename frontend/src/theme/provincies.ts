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

// ── Paleta cromàtica per comarca ───────────────────────────────────────────
//
// Estratègia: cada comarca mostra el color de la seva província.
// Les 4 comarques transfrontereres reben un color calculat com a mescla
// ponderada dels colors de les seves dues províncies, proporcional al
// percentatge de municipis que aporten cadascuna (font: ICC, dades 2024).
//
// Transfrontereres:
//   14 Berguedà  → 96.8% Barcelona + 3.2% Lleida
//   15 Cerdanya  → 64.7% Girona    + 35.3% Lleida  ← mescla visible
//   24 Osona     → 92.9% Barcelona + 7.1% Girona
//   34 Selva     → 96.2% Girona    + 3.8% Barcelona

// Mapa comarca → codi de província (per a les 39 comarques d'una sola província)
const COMARCA_PROVINCIA: Record<string, string> = {
  '01': '43', // Alt Camp           → Tarragona
  '02': '17', // Alt Empordà        → Girona
  '03': '08', // Alt Penedès        → Barcelona
  '04': '25', // Alt Urgell         → Lleida
  '05': '25', // Alta Ribagorça     → Lleida
  '06': '08', // Anoia              → Barcelona
  '07': '08', // Bages              → Barcelona
  '08': '43', // Baix Camp          → Tarragona
  '09': '43', // Baix Ebre          → Tarragona
  '10': '17', // Baix Empordà       → Girona
  '11': '08', // Baix Llobregat     → Barcelona
  '12': '43', // Baix Penedès       → Tarragona
  '13': '08', // Barcelonès         → Barcelona
  // 14 Berguedà  → TEMA_COMARCA_CUSTOM
  // 15 Cerdanya  → TEMA_COMARCA_CUSTOM
  '16': '43', // Conca de Barberà   → Tarragona
  '17': '08', // Garraf             → Barcelona
  '18': '25', // Garrigues          → Lleida
  '19': '17', // Garrotxa           → Girona
  '20': '17', // Gironès            → Girona
  '21': '08', // Maresme            → Barcelona
  '22': '43', // Montsià            → Tarragona
  '23': '25', // Noguera            → Lleida
  // 24 Osona     → TEMA_COMARCA_CUSTOM
  '25': '25', // Pallars Jussà      → Lleida
  '26': '25', // Pallars Sobirà     → Lleida
  '27': '25', // Pla d'Urgell       → Lleida
  '28': '17', // Pla de l'Estany    → Girona
  '29': '43', // Priorat            → Tarragona
  '30': '43', // Ribera d'Ebre      → Tarragona
  '31': '17', // Ripollès           → Girona
  '32': '25', // Segarra            → Lleida
  '33': '25', // Segrià             → Lleida
  // 34 Selva     → TEMA_COMARCA_CUSTOM
  '35': '25', // Solsonès           → Lleida
  '36': '43', // Tarragonès         → Tarragona
  '37': '43', // Terra Alta         → Tarragona
  '38': '25', // Urgell             → Lleida
  '39': '25', // Val d'Aran         → Lleida
  '40': '08', // Vallès Occidental  → Barcelona
  '41': '08', // Vallès Oriental    → Barcelona
  '42': '08', // Moianès            → Barcelona
  '43': '08', // Lluçanès           → Barcelona
}

// Temes personalitzats per a les 4 comarques transfrontereres.
// Colors calculats com a mescla RGB ponderada pels % de municipis per província.
const TEMA_COMARCA_CUSTOM: Record<string, TemaProvincia> = {
  // 14 Berguedà — 96.8% Barcelona (#c4382e) + 3.2% Lleida (#b8860b)
  '14': {
    base: '#c43a2d',
    parcial: '#f0d4d1',
    hover: '#f7e8e5',
    contrast: '#ffffff',
    vora: '#8a281f',
  },
  // 15 Cerdanya — 64.7% Girona (#2d6a2d) + 35.3% Lleida (#b8860b)
  // Resultat: verd oliva — clarament distint de les dues províncies
  '15': {
    base: '#5e7421',
    parcial: '#e5e7c8',
    hover: '#f2f2e6',
    contrast: '#ffffff',
    vora: '#3d4614',
  },
  // 24 Osona — 92.9% Barcelona (#c4382e) + 7.1% Girona (#2d6a2d)
  '24': {
    base: '#b93c2e',
    parcial: '#efd5d2',
    hover: '#f7e9e7',
    contrast: '#ffffff',
    vora: '#822720',
  },
  // 34 Selva — 96.2% Girona (#2d6a2d) + 3.8% Barcelona (#c4382e)
  '34': {
    base: '#33682d',
    parcial: '#e0e8d0',
    hover: '#f0f4f0',
    contrast: '#ffffff',
    vora: '#1e391a',
  },
}

export function temaPerComarca(codi: string | undefined): TemaProvincia {
  if (!codi) return TEMA_NEUTRE
  if (TEMA_COMARCA_CUSTOM[codi]) return TEMA_COMARCA_CUSTOM[codi]
  const prov = COMARCA_PROVINCIA[codi]
  if (prov) return temaPerProvincia(prov)
  return TEMA_NEUTRE
}

// ── Noms per comarca ───────────────────────────────────────────────────────
//
// Cada comarca → array de noms de província/vegueria ordenats per dominància
// (majoria de municipis primer). Font: ICC divisions-administratives-v2r1 2024.
// Casos multi:
//   Províncies: 14 Berguedà, 15 Cerdanya, 24 Osona, 34 Selva
//   Vegueries:  06 Anoia

const COMARCA_NOMPROVINCIES: Record<string, string[]> = {
  '01': ['Tarragona'], // Alt Camp
  '02': ['Girona'], // Alt Empordà
  '03': ['Barcelona'], // Alt Penedès
  '04': ['Lleida'], // Alt Urgell
  '05': ['Lleida'], // Alta Ribagorça
  '06': ['Barcelona'], // Anoia
  '07': ['Barcelona'], // Bages
  '08': ['Tarragona'], // Baix Camp
  '09': ['Tarragona'], // Baix Ebre
  '10': ['Girona'], // Baix Empordà
  '11': ['Barcelona'], // Baix Llobregat
  '12': ['Tarragona'], // Baix Penedès
  '13': ['Barcelona'], // Barcelonès
  '14': ['Barcelona', 'Lleida'], // Berguedà — transfronterera
  '15': ['Girona', 'Lleida'], // Cerdanya — transfronterera
  '16': ['Tarragona'], // Conca de Barberà
  '17': ['Barcelona'], // Garraf
  '18': ['Lleida'], // Garrigues
  '19': ['Girona'], // Garrotxa
  '20': ['Girona'], // Gironès
  '21': ['Barcelona'], // Maresme
  '22': ['Tarragona'], // Montsià
  '23': ['Lleida'], // Noguera
  '24': ['Barcelona', 'Girona'], // Osona — transfronterera
  '25': ['Lleida'], // Pallars Jussà
  '26': ['Lleida'], // Pallars Sobirà
  '27': ['Lleida'], // Pla d'Urgell
  '28': ['Girona'], // Pla de l'Estany
  '29': ['Tarragona'], // Priorat
  '30': ['Tarragona'], // Ribera d'Ebre
  '31': ['Girona'], // Ripollès
  '32': ['Lleida'], // Segarra
  '33': ['Lleida'], // Segrià
  '34': ['Girona', 'Barcelona'], // Selva — transfronterera
  '35': ['Lleida'], // Solsonès
  '36': ['Tarragona'], // Tarragonès
  '37': ['Tarragona'], // Terra Alta
  '38': ['Lleida'], // Urgell
  '39': ['Lleida'], // Val d'Aran
  '40': ['Barcelona'], // Vallès Occidental
  '41': ['Barcelona'], // Vallès Oriental
  '42': ['Barcelona'], // Moianès
  '43': ['Barcelona'], // Lluçanès
}

const COMARCA_NOMVEGUERIES: Record<string, string[]> = {
  '01': ['Camp de Tarragona'],
  '02': ['Girona'],
  '03': ['Penedès'],
  '04': ['Alt Pirineu'],
  '05': ['Alt Pirineu'],
  '06': ['Penedès', 'Catalunya Central'], // Anoia — transfronterera
  '07': ['Catalunya Central'],
  '08': ['Camp de Tarragona'],
  '09': ["Terres de l'Ebre"],
  '10': ['Girona'],
  '11': ['Barcelona'],
  '12': ['Penedès'],
  '13': ['Barcelona'],
  '14': ['Catalunya Central'],
  '15': ['Alt Pirineu'],
  '16': ['Camp de Tarragona'],
  '17': ['Penedès'],
  '18': ['Lleida'],
  '19': ['Girona'],
  '20': ['Girona'],
  '21': ['Barcelona'],
  '22': ["Terres de l'Ebre"],
  '23': ['Lleida'],
  '24': ['Catalunya Central'],
  '25': ['Alt Pirineu'],
  '26': ['Alt Pirineu'],
  '27': ['Lleida'],
  '28': ['Girona'],
  '29': ['Camp de Tarragona'],
  '30': ["Terres de l'Ebre"],
  '31': ['Girona'],
  '32': ['Lleida'],
  '33': ['Lleida'],
  '34': ['Girona'],
  '35': ['Catalunya Central'],
  '36': ['Camp de Tarragona'],
  '37': ["Terres de l'Ebre"],
  '38': ['Lleida'],
  '39': ["Val d'Aran (entitat territorial singular)"],
  '40': ['Barcelona'],
  '41': ['Barcelona'],
  '42': ['Catalunya Central'],
  '43': ['Catalunya Central'],
}

export function nomProvinciesPerComarca(codi: string): string[] {
  return COMARCA_NOMPROVINCIES[codi] ?? []
}

export function nomVeguiesPerComarca(codi: string): string[] {
  return COMARCA_NOMVEGUERIES[codi] ?? []
}
