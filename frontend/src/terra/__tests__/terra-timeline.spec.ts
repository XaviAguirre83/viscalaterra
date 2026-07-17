import { describe, expect, it } from 'vitest'
import {
  DURADA_TOTAL,
  FADE_IN,
  FADE_OUT_FINAL,
  FRASES,
  RETARD_SEGONA_LINIA,
} from '../terra-timeline'

// El guió s'edita a mà (temps i posicions): aquests tests vigilen que cap
// retoc trenqui les invariants de l'animació.
describe('terra-timeline', () => {
  it('té frases i acaba amb el clímax destacat', () => {
    expect(FRASES.length).toBeGreaterThan(0)
    const ultima = FRASES[FRASES.length - 1]
    expect(ultima?.destacat).toBe(true)
    expect(ultima?.linies).toEqual(['VISCA LA TERRA!'])
  })

  it('els temps d’entrada són estrictament creixents', () => {
    for (let i = 1; i < FRASES.length; i++) {
      expect(FRASES[i]!.tempsEntrada).toBeGreaterThan(FRASES[i - 1]!.tempsEntrada)
    }
  })

  it('tota entrada acaba dins la durada total', () => {
    for (const frase of FRASES) {
      const fiEntrada =
        frase.tempsEntrada + (frase.linies.length - 1) * RETARD_SEGONA_LINIA + FADE_IN
      expect(fiEntrada).toBeLessThanOrEqual(DURADA_TOTAL)
    }
  })

  it('el clímax entra sencer abans que comenci el seu fundido final', () => {
    const ultima = FRASES[FRASES.length - 1]!
    expect(ultima.tempsEntrada + FADE_IN).toBeLessThanOrEqual(DURADA_TOTAL - FADE_OUT_FINAL)
  })

  it('les àncores respecten la zona segura del 8%', () => {
    for (const frase of FRASES) {
      expect(frase.posX).toBeGreaterThanOrEqual(8)
      expect(frase.posX).toBeLessThanOrEqual(92)
      expect(frase.posY).toBeGreaterThanOrEqual(8)
      expect(frase.posY).toBeLessThanOrEqual(92)
    }
  })

  it('cap grup té més de dues línies i cap línia és buida', () => {
    for (const frase of FRASES) {
      expect(frase.linies.length).toBeGreaterThanOrEqual(1)
      expect(frase.linies.length).toBeLessThanOrEqual(2)
      for (const linia of frase.linies) expect(linia.trim().length).toBeGreaterThan(0)
    }
  })
})
