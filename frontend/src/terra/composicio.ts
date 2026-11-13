/**
 * Composició de la capçalera segons la seva amplada: on cau el centre de
 * l'escena, quant s'encongeix i quant s'acosta tot al centre. La comparteixen
 * les escenes il·lustrades i el text del poema, perquè tots dos es col·loquin
 * amb el mateix regle. Mòdul pur.
 */

/** Amplada a partir de la qual l'escena es veu a mida real; per sota, s'encongeix. */
export const AMPLADA_PLENA = 900
export const ESCALA_MINIMA = 0.6

/** Amplada a partir de la qual cada cosa és al seu lloc; per sota, tot s'acosta al centre. */
export const AMPLADA_COMPOSICIO = 1000
export const COMPRESSIO_MINIMA = 0.45

/** En pantalles estretes el logo tapa mitja capçalera: l'escena es corre cap a la dreta. */
export const AMPLADA_ESTRETA = 700
export const DESPLACAMENT_ESTRET = 60

const limita = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))

/**
 * Compressió horitzontal de la composició per a una amplada de capçalera, en
 * passos de 0,05 (perquè no canviï a cada píxel mentre s'estira la finestra).
 */
export function compressio(ampla: number): number {
  return Math.round(limita(ampla / AMPLADA_COMPOSICIO, COMPRESSIO_MINIMA, 1) * 20) / 20
}

/** Escala de l'escena (ancorada a baix) per a una amplada de capçalera. */
export function escalaEscena(ampla: number): number {
  return limita(ampla / AMPLADA_PLENA, ESCALA_MINIMA, 1)
}

/** x de pantalla on cau el centre de l'escena (la x = 0 de les il·lustracions). */
export function centreEscena(ampla: number): number {
  return (
    ampla / 2 + DESPLACAMENT_ESTRET * limita((AMPLADA_ESTRETA - ampla) / (AMPLADA_ESTRETA - 400))
  )
}
