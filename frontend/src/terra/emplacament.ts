/**
 * Emplaçament del text del poema dins la capçalera: on va cada frase segons
 * l'amplada, perquè no trepitgi ni les il·lustracions ni el logo, el nom i els
 * controls. Mòdul pur.
 *
 * En pantalles amples, cada frase s'ancora a l'escena (igual que les
 * il·lustracions: píxels respecte del seu centre), al forat que el guió li ha
 * triat, i només es corre si topa amb una zona reservada. En pantalles estretes
 * no hi ha forats: l'escena s'encongeix cap a baix i el text ocupa sempre la
 * franja de dalt, entre el logo i els controls.
 */
import { AMPLADA_ESTRETA, centreEscena, compressio } from './composicio'

/** Rectangle en píxels de la capçalera. */
export interface Caixa {
  x: number
  y: number
  w: number
  h: number
}

/** El que cal saber d'una frase per col·locar-la. */
export interface Ancora {
  /** Píxels respecte del centre de l'escena: vora esquerra del bloc (o el seu centre, si és centrat). */
  x: number
  /** Píxels des de dalt de la capçalera: vora superior del bloc. */
  y: number
  centrat?: boolean
}

/** Aire entre el text i una zona reservada, en horitzontal i en vertical. */
const AIRE_X = 14
const AIRE_Y = 6
/** Marge amb les vores de la capçalera (a baix hi ha la franja de colors). */
const VORA = 6
const VORA_BAIX = 7
/** Pantalles estretes: y de la franja de dalt on va sempre el text. */
const Y_FRANJA = 5

/**
 * Tram horitzontal lliure a l'alçada d'un bloc: de les zones reservades que
 * coincideixen en vertical amb ell, les de l'esquerra el limiten per un costat
 * i les de la dreta, per l'altre.
 */
function tramLliure(
  top: number,
  alt: number,
  ampla: number,
  reserves: Caixa[]
): [min: number, max: number] {
  let min = VORA
  let max = ampla - VORA
  for (const r of reserves) {
    if (top >= r.y + r.h + AIRE_Y || top + alt <= r.y - AIRE_Y) continue
    if (r.x + r.w / 2 < ampla / 2) min = Math.max(min, r.x + r.w + AIRE_X)
    else max = Math.min(max, r.x - AIRE_X)
  }
  return [min, max]
}

/**
 * Cantonada superior esquerra (en píxels de la capçalera) d'una frase de mida
 * `mida`, en una capçalera de `ampla` × `alcada` amb les zones `reserves`
 * ocupades (logo, nom, controls).
 */
export function emplaca(
  ancora: Ancora,
  mida: { w: number; h: number },
  ampla: number,
  alcada: number,
  reserves: Caixa[] = []
): { left: number; top: number } {
  const estret = ampla < AMPLADA_ESTRETA
  const top = estret
    ? Y_FRANJA
    : Math.min(Math.max(ancora.y, VORA), Math.max(VORA, alcada - VORA_BAIX - mida.h))
  const [min, max] = tramLliure(top, mida.h, ampla, reserves)
  let left: number
  if (estret) {
    // Franja de dalt: alineat a l'esquerra del tram lliure (o centrat-hi).
    left = ancora.centrat ? (min + max - mida.w) / 2 : min
  } else {
    const x = centreEscena(ampla) + ancora.x * compressio(ampla)
    left = ancora.centrat ? x - mida.w / 2 : x
  }
  // Dins del tram lliure; si no hi cap, mana la vora dreta (els controls són
  // interactius; el logo, si de cas, queda per sobre del text).
  left = Math.min(Math.max(left, min), Math.max(VORA, max - mida.w))
  return { left: Math.round(left), top: Math.round(top) }
}
