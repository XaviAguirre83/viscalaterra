// Rondes d'una partida dels jocs (GeoFreak, Capital<>Comarca…): quin objectiu
// toca, què passa amb cada resposta, la pista i la puntuació.
//
// Tot el mòdul és pur (sense Vue ni estat), com `data/temporal.ts`: la lògica
// és fàcilment testejable i el motor de partida (`composables/useMotorJoc.ts`)
// només hi afegeix reactivitat, torns i rellotges. Cada joc hi posa el
// significat dels codis: a GeoFreak són demarcacions del mapa; a
// Capital<>Comarca, comarques (es pregunti la capital o la comarca).

// ── Rondes ─────────────────────────────────────────────────────────────────
//
// Rondes fins que s'encerten tots els objectius: a cada ronda hi ha un
// objectiu triat a l'atzar entre els pendents. Respondre l'objectiu és encert
// (queda encertat i no torna a sortir); respondre qualsevol altre codi jugable
// és error. Els errors mai acaben la partida (el ràtio ja penalitza a la
// puntuació), però al tercer error sobre el mateix objectiu la ronda SE SALTA:
// l'objectiu torna a la cua i sortirà més endavant — així una ronda encallada
// no degenera en provar-ho tot. També es pot passar voluntàriament
// (passaRonda), sense penalització afegida.

export const MAX_INTENTS_RONDA = 3

export interface EstatPartida {
  // Codis pendents d'encertar. L'objectiu actual NO hi és inclòs.
  pendents: string[]
  // Codi que es pregunta ara (null = partida completada).
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
// (p. ex. quan quedin menys candidats). No suma error — el cronòmetre que
// segueix corrent ja és el cost.
export function passaRonda(
  estat: EstatPartida,
  aleatori: () => number = Math.random
): EstatPartida {
  return saltaObjectiu(estat, aleatori)
}

// Resposta possible d'una ronda tal com es mostra al jugador (autocomplete i
// opcions de la pista). Un codi pot tenir més d'un nom (p. ex. les dues
// capitals del Vallès Occidental).
export interface Candidat {
  codi: string
  nom: string
}

// 'salt' = tercer error de la ronda: compta l'error I salta l'objectiu.
export type ResultatRonda = 'encert' | 'error' | 'salt' | 'ignorat'

// Processa una resposta (un clic al mapa o un nom escrit). Retorna un estat
// NOU (mai muta l'anterior — el store reassigna l'objecte sencer, com sempre).
export function responRonda(
  estat: EstatPartida,
  codi: string,
  aleatori: () => number = Math.random
): { estat: EstatPartida; resultat: ResultatRonda } {
  if (estat.objectiu === null) return { estat, resultat: 'ignorat' }
  // Tornar a respondre un objectiu ja encertat no compta (ni encert ni error).
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
// distractors). Cada joc agrupa els candidats per proximitat (p. ex. mateixa
// comarca → mateixa província → qualsevol): els distractors mai són de l'altra
// punta del país si n'hi ha de propers, perquè la pista no regali la resposta.
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
//   punts = 1000 × multiplicador × ràtio × bonus_temps
//
//   multiplicador = el que fixi cada joc (GeoFreak: nivell + 1; sense
//                   nivells, 1)
//   ràtio   = (encerts − 0,5 × encerts_amb_pista) / (encerts + errors)
//             ← els errors penalitzen aquí; l'encert amb pista val mig encert
//   bonus   = T_REF / (T_REF + segons_per_encert), amb T_REF = 5 s:
//             respondre a l'instant → ~1; 5 s de mitjana → 0,5; 15 s → 0,25.

const SEGONS_REFERENCIA = 5

export interface DadesPuntuacio {
  encerts: number
  errors: number
  segons: number
  encertsAmbPista?: number
}

export function puntuacio(args: DadesPuntuacio & { multiplicador?: number }): number {
  const { multiplicador = 1, encerts, errors, segons, encertsAmbPista = 0 } = args
  if (encerts === 0) return 0
  const ratio = (encerts - 0.5 * encertsAmbPista) / (encerts + errors)
  const segonsPerEncert = segons / encerts
  const bonusTemps = SEGONS_REFERENCIA / (SEGONS_REFERENCIA + segonsPerEncert)
  return Math.round(1000 * multiplicador * ratio * bonusTemps)
}

// Format del cronòmetre: "m:ss" (els minuts no es limiten a 59).
export function formataTemps(segons: number): string {
  return `${Math.floor(segons / 60)}:${String(segons % 60).padStart(2, '0')}`
}
