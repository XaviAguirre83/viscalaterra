import { describe, expect, it } from 'vitest'
import { emplaca, type Caixa } from '../emplacament'

// Zones reservades reals de la capçalera (logo, nom i controls) a cada amplada.
const reserves = (ampla: number): Caixa[] =>
  ampla < 700
    ? [
        { x: 12, y: 21, w: 69, h: 68 },
        { x: 34, y: 74, w: 140, h: 19 },
        { x: ampla - 64, y: 9, w: 64, h: 93 },
      ]
    : [
        { x: 20, y: 17, w: 77, h: 76 },
        { x: 48, y: 73, w: 170, h: 24 },
        { x: ampla - 169, y: 20, w: 169, h: 70 },
      ]

const DUES_LINIES = { w: 220, h: 56 }

describe('emplaca · pantalles amples', () => {
  it('ancora la frase a l’escena: la x es compta des del centre de la capçalera', () => {
    expect(emplaca({ x: 40, y: 6 }, DUES_LINIES, 1600, 110, reserves(1600))).toEqual({
      left: 840,
      top: 6,
    })
    expect(emplaca({ x: 40, y: 6 }, DUES_LINIES, 1280, 110, reserves(1280))).toEqual({
      left: 680,
      top: 6,
    })
  })

  it('un bloc centrat s’ancora pel seu centre', () => {
    expect(emplaca({ x: 0, y: 6, centrat: true }, DUES_LINIES, 1600, 110).left).toBe(690)
  })

  it('no entra al logo: per damunt del nom pot arribar fins al costat del dibuix', () => {
    const { left } = emplaca({ x: -900, y: 6 }, DUES_LINIES, 1280, 110, reserves(1280))
    expect(left).toBe(97 + 14)
  })

  it('si el bloc baixa fins al nom, s’ha d’apartar també del nom', () => {
    const { left } = emplaca({ x: -900, y: 40 }, DUES_LINIES, 1280, 110, reserves(1280))
    expect(left).toBe(218 + 14)
  })

  it('no entra als controls de la dreta', () => {
    const { left } = emplaca({ x: 900, y: 6 }, DUES_LINIES, 1280, 110, reserves(1280))
    expect(left + DUES_LINIES.w).toBe(1280 - 169 - 14)
  })

  it('no surt per dalt ni trepitja la franja de baix', () => {
    expect(emplaca({ x: 0, y: -20 }, DUES_LINIES, 1600, 110).top).toBeGreaterThanOrEqual(6)
    const { top } = emplaca({ x: 0, y: 90 }, DUES_LINIES, 1600, 110)
    expect(top + DUES_LINIES.h).toBeLessThanOrEqual(110 - 7)
  })

  it('en una capçalera mitjana la composició es comprimeix cap al centre', () => {
    // A 800 px la compressió és 0,8: una x de 200 cau a 160 px del centre.
    expect(emplaca({ x: 200, y: 6 }, { w: 100, h: 28 }, 800, 110).left).toBe(400 + 160)
  })
})

describe('emplaca · pantalles estretes', () => {
  const ampla = 390

  it('totes les frases van a la franja de dalt, entre el logo i els controls', () => {
    for (const x of [-500, 0, 400]) {
      const { left, top } = emplaca({ x, y: 40 }, { w: 200, h: 43 }, ampla, 110, reserves(ampla))
      expect(top).toBe(5)
      expect(left).toBe(81 + 14)
      expect(left + 200).toBeLessThanOrEqual(ampla - 64 - 14)
    }
  })

  it('un bloc centrat se centra dins del tram lliure', () => {
    const { left } = emplaca(
      { x: 0, y: 40, centrat: true },
      { w: 100, h: 22 },
      ampla,
      110,
      reserves(ampla)
    )
    expect(Math.abs(left + 50 - (81 + 14 + ampla - 64 - 14) / 2)).toBeLessThanOrEqual(1)
  })

  it('si un bloc no hi cap, mana la vora dels controls (el logo queda per sobre del text)', () => {
    const { left } = emplaca({ x: 0, y: 40 }, { w: 260, h: 43 }, ampla, 110, reserves(ampla))
    expect(left + 260).toBe(ampla - 64 - 14)
  })
})
