// Model de configuració del joc GeoFreak (identificació territorial).
//
// El joc té dues modalitats (mútuament excloents) i 9 nivells de dificultat.
// Alguns nivells es juguen dins d'un territori contenidor que cal triar
// (p. ex. nivell 5 = municipis d'UNA comarca concreta).
//
// Tot el mòdul és pur (sense Vue ni estat): la lògica de validació és fàcilment
// testejable i el store (`stores/geofreak.ts`) només hi afegeix reactivitat.
// Mateix patró que `data/temporal.ts` ↔ `stores/filtres.ts`.

import type { NivellTerritorial } from '@/stores/mapa'

// «On és...?»     → es mostra el nom i el jugador clica el territori al mapa.
// «Com es diu...?» → s'il·lumina el territori i el jugador n'escriu el nom.
export type ModalitatJoc = 'onEs' | 'comEsDiu'

export const MODALITATS: ModalitatJoc[] = ['onEs', 'comEsDiu']

export type TipusDemarcacio = 'provincia' | 'vegueria' | 'comarca' | 'municipi'

// Capa del mapa Leaflet corresponent a cada tipus de demarcació.
// (Import només de tipus: el mòdul es manté pur en runtime.)
export const CAPA_PER_DEMARCACIO: Record<TipusDemarcacio, NivellTerritorial> = {
  provincia: 'provincies',
  vegueria: 'vegueries',
  comarca: 'comarques',
  municipi: 'municipis',
}

export interface NivellGeoFreak {
  id: number
  // Tipus de demarcació que s'endevina en aquest nivell.
  demarcacio: TipusDemarcacio
  // Territori dins del qual es juga. null = tota Catalunya (no cal triar res);
  // altrament el jugador ha de triar un contenidor concret abans de començar.
  contenidor: TipusDemarcacio | null
}

// Taula de nivells (vegeu viscalaterra_plan.md § GeoFreak). L'id és també
// el multiplicador de puntuació − 1 (nivell 0 → ×1 … nivell 8 → ×9).
export const NIVELLS: NivellGeoFreak[] = [
  { id: 0, demarcacio: 'provincia', contenidor: null },
  { id: 1, demarcacio: 'vegueria', contenidor: null },
  { id: 2, demarcacio: 'comarca', contenidor: 'vegueria' },
  { id: 3, demarcacio: 'comarca', contenidor: 'provincia' },
  { id: 4, demarcacio: 'comarca', contenidor: null },
  { id: 5, demarcacio: 'municipi', contenidor: 'comarca' },
  { id: 6, demarcacio: 'municipi', contenidor: 'vegueria' },
  { id: 7, demarcacio: 'municipi', contenidor: 'provincia' },
  { id: 8, demarcacio: 'municipi', contenidor: null },
]

export function nivellPerId(id: number): NivellGeoFreak | undefined {
  return NIVELLS.find((n) => n.id === id)
}

export function nivellNecessitaContenidor(id: number): boolean {
  return nivellPerId(id)?.contenidor != null
}

export interface ConfiguracioGeoFreak {
  // null = encara no triat (el modal de configuració no deixa començar).
  modalitat: ModalitatJoc | null
  nivell: number | null
  // Codi del territori contenidor (només als nivells que en demanen un).
  codiContenidor: string | null
}

export function configuracioBuida(): ConfiguracioGeoFreak {
  return { modalitat: null, nivell: null, codiContenidor: null }
}

// Una configuració és completa quan es pot començar la partida: modalitat i
// nivell triats, i contenidor triat si el nivell en demana un.
export function configuracioCompleta(c: ConfiguracioGeoFreak): boolean {
  if (c.modalitat === null || c.nivell === null) return false
  const nivell = nivellPerId(c.nivell)
  if (!nivell) return false
  return nivell.contenidor === null || c.codiContenidor !== null
}

// ── Partida: màquina d'estats de les rondes ────────────────────────────────
//
// Rondes fins que s'encerten totes les demarcacions: a cada ronda hi ha un
// objectiu triat a l'atzar entre les pendents. Un clic a l'objectiu és encert
// (la demarcació queda encertada i no torna a sortir); un clic a qualsevol
// altra demarcació jugable és error. Els errors mai acaben la partida (el
// ràtio ja penalitza a la puntuació), però al tercer error sobre el mateix
// objectiu la ronda SE SALTA: l'objectiu torna a la cua i sortirà més
// endavant — així una ronda encallada no degenera en clicar-ho tot. També es
// pot passar voluntàriament (passaRonda), sense penalització afegida.

export const MAX_INTENTS_RONDA = 3

export interface EstatPartida {
  // Codis pendents d'encertar. L'objectiu actual NO hi és inclòs.
  pendents: string[]
  // Codi de la demarcació que es pregunta ara (null = partida completada).
  objectiu: string | null
  // Codis encertats, en ordre d'encert.
  encertades: string[]
  errors: number
  // Errors comesos a la ronda actual (es reinicia a cada canvi d'objectiu).
  intentsRonda: number
}

// `aleatori` injectable per fer els tests deterministes (per defecte Math.random).
export function creaPartida(codis: string[], aleatori: () => number = Math.random): EstatPartida {
  const pendents = [...codis]
  const objectiu = treuAleatori(pendents, aleatori)
  return { pendents, objectiu, encertades: [], errors: 0, intentsRonda: 0 }
}

function treuAleatori(llista: string[], aleatori: () => number): string | null {
  if (llista.length === 0) return null
  const i = Math.floor(aleatori() * llista.length)
  return llista.splice(i, 1)[0] ?? null
}

// L'objectiu actual torna a la cua i en surt un altre (mai el mateix si hi
// ha alternativa). Reinicia el comptador d'intents de la ronda.
function saltaObjectiu(estat: EstatPartida, aleatori: () => number): EstatPartida {
  if (estat.objectiu === null) return estat
  const anterior = estat.objectiu
  const pendents = [...estat.pendents, anterior]
  const candidates = pendents.length > 1 ? pendents.filter((c) => c !== anterior) : pendents
  const seguent = candidates[Math.floor(aleatori() * candidates.length)] ?? null
  return {
    ...estat,
    pendents: pendents.filter((c) => c !== seguent),
    objectiu: seguent,
    intentsRonda: 0,
  }
}

// Passa la ronda voluntàriament: l'objectiu torna a la cua per a més endavant
// (p. ex. quan quedin menys candidates). No suma error — el cronòmetre que
// segueix corrent ja és el cost.
export function passaRonda(
  estat: EstatPartida,
  aleatori: () => number = Math.random
): EstatPartida {
  return saltaObjectiu(estat, aleatori)
}

// 'salt' = tercer error de la ronda: compta l'error I salta l'objectiu.
export type ResultatClic = 'encert' | 'error' | 'salt' | 'ignorat'

// Processa el clic sobre una demarcació jugable. Retorna un estat NOU (mai
// muta l'anterior — el store reassigna l'objecte sencer, com sempre).
export function responClic(
  estat: EstatPartida,
  codi: string,
  aleatori: () => number = Math.random
): { estat: EstatPartida; resultat: ResultatClic } {
  if (estat.objectiu === null) return { estat, resultat: 'ignorat' }
  // Re-clicar una demarcació ja encertada no compta (ni encert ni error).
  if (estat.encertades.includes(codi)) return { estat, resultat: 'ignorat' }

  if (codi !== estat.objectiu) {
    const ambError = { ...estat, errors: estat.errors + 1, intentsRonda: estat.intentsRonda + 1 }
    if (ambError.intentsRonda < MAX_INTENTS_RONDA) {
      return { estat: ambError, resultat: 'error' }
    }
    return { estat: saltaObjectiu(ambError, aleatori), resultat: 'salt' }
  }

  const pendents = [...estat.pendents]
  const seguent = treuAleatori(pendents, aleatori)
  return {
    estat: {
      pendents,
      objectiu: seguent,
      encertades: [...estat.encertades, codi],
      errors: estat.errors,
      intentsRonda: 0,
    },
    resultat: 'encert',
  }
}

export function partidaCompletada(estat: EstatPartida): boolean {
  return estat.objectiu === null && estat.pendents.length === 0
}

// ── Pista ──────────────────────────────────────────────────────────────────
//
// A cada ronda es pot demanar UNA pista: 4 opcions (l'objectiu + 3
// distractors). Els distractors es trien per proximitat (mateixa comarca →
// mateixa província → qualsevol jugable), mai de l'altra punta del país.
// L'encert aconseguit amb pista compta 0,5 al ràtio de puntuació.

// Barreja Fisher-Yates en còpia nova (RNG injectable per als tests).
export function barreja<T>(items: T[], aleatori: () => number = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(aleatori() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

// Tria fins a 3 distractors recorrent els grups en ordre de preferència
// (els més propers primer). Mai inclou l'objectiu ni repeteix codis; si un
// grup no arriba, es completa amb el següent.
export function triaDistractors(
  objectiu: string,
  grups: string[][],
  aleatori: () => number = Math.random
): string[] {
  const triats: string[] = []
  for (const grup of grups) {
    const restants = grup.filter((c) => c !== objectiu && !triats.includes(c))
    while (triats.length < 3 && restants.length > 0) {
      const i = Math.floor(aleatori() * restants.length)
      triats.push(restants.splice(i, 1)[0]!)
    }
    if (triats.length === 3) break
  }
  return triats
}

// ── Puntuació (v1, a afinar amb joc real) ──────────────────────────────────
//
//   punts = 1000 × multiplicador_nivell × ràtio × bonus_temps
//
//   multiplicador = nivell + 1 (×1 Províncies → ×9 tots els municipis)
//   ràtio   = (encerts − 0,5 × encerts_amb_pista) / (encerts + errors)
//             ← els errors penalitzen aquí; l'encert amb pista val mig encert
//   bonus   = T_REF / (T_REF + segons_per_demarcació), amb T_REF = 5 s:
//             respondre a l'instant → ~1; 5 s de mitjana → 0,5; 15 s → 0,25.

const SEGONS_REFERENCIA = 5

export function calculaPunts(args: {
  nivell: number
  encerts: number
  errors: number
  segons: number
  encertsAmbPista?: number
}): number {
  const { nivell, encerts, errors, segons, encertsAmbPista = 0 } = args
  if (encerts === 0) return 0
  const multiplicador = nivell + 1
  const ratio = (encerts - 0.5 * encertsAmbPista) / (encerts + errors)
  const segonsPerDemarcacio = segons / encerts
  const bonusTemps = SEGONS_REFERENCIA / (SEGONS_REFERENCIA + segonsPerDemarcacio)
  return Math.round(1000 * multiplicador * ratio * bonusTemps)
}
