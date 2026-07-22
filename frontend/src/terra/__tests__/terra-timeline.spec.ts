import { describe, expect, it } from 'vitest'
import {
  DURADA_TOTAL,
  FADE_IN,
  FADE_OUT_FINAL,
  FRASES,
  resolFrases,
  type FraseResolta,
} from '../terra-timeline'

/** Offset de l'última paraula del grup (el moment en què acaba d'escriure's). */
function darrerOffset(resolta: FraseResolta): number {
  return Math.max(0, ...resolta.linies.flat().map((p) => p.offset))
}

// El guió s'edita a mà (temps i posicions): aquests tests vigilen que cap
// retoc trenqui les invariants de l'animació. Els temps es validen sobre el
// guió RESOLT (resolFrases), perquè les frases poden entrar amb àncora
// absoluta (tempsEntrada) o encadenades (despres).
describe('terra-timeline', () => {
  const resoltes = resolFrases()

  it('té frases i acaba amb el clímax destacat', () => {
    expect(FRASES.length).toBeGreaterThan(0)
    const ultima = FRASES[FRASES.length - 1]
    expect(ultima?.destacat).toBe(true)
    expect(ultima?.linies).toEqual(['VISCA LA TERRA!'])
  })

  it('els temps d’entrada resolts són estrictament creixents', () => {
    for (let i = 1; i < resoltes.length; i++) {
      expect(resoltes[i]!.t).toBeGreaterThan(resoltes[i - 1]!.t)
    }
  })

  it('tota entrada (fins a l’última paraula) acaba dins la durada total', () => {
    for (const resolta of resoltes) {
      expect(resolta.t + darrerOffset(resolta) + FADE_IN).toBeLessThanOrEqual(DURADA_TOTAL)
    }
  })

  it('el clímax entra sencer abans que comenci el seu fundido final', () => {
    const ultima = resoltes[resoltes.length - 1]!
    expect(ultima.t + darrerOffset(ultima) + FADE_IN).toBeLessThanOrEqual(
      DURADA_TOTAL - FADE_OUT_FINAL
    )
  })

  it('les àncores respecten la zona segura del 8%', () => {
    for (const frase of FRASES) {
      expect(frase.posX).toBeGreaterThanOrEqual(8)
      expect(frase.posX).toBeLessThanOrEqual(92)
      expect(frase.posY).toBeGreaterThanOrEqual(8)
      expect(frase.posY).toBeLessThanOrEqual(92)
    }
  })

  it('cap grup té més de tres línies i cap línia és buida', () => {
    for (const frase of FRASES) {
      expect(frase.linies.length).toBeGreaterThanOrEqual(1)
      expect(frase.linies.length).toBeLessThanOrEqual(3)
      for (const linia of frase.linies) expect(linia.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('resolFrases', () => {
  it('encadena `despres` a partir de l’última paraula de la frase anterior', () => {
    const resoltes = resolFrases([
      { linies: ['un dos'], tempsEntrada: 1, tempsParaules: [[0, 0.5]], posX: 50, posY: 50 },
      { linies: ['tres'], despres: 1, posX: 50, posY: 50 },
      { linies: ['quatre'], tempsEntrada: 9, posX: 50, posY: 50 },
      { linies: ['cinc'], despres: 0.5, posX: 50, posY: 50 },
    ])
    expect(resoltes[0]!.t).toBe(1)
    // 1 (entrada) + 0.5 (última paraula) + 1 (despres)
    expect(resoltes[1]!.t).toBe(2.5)
    // L'àncora absoluta mana i re-sincronitza el cursor…
    expect(resoltes[2]!.t).toBe(9)
    // …i la cadena continua des d'ella.
    expect(resoltes[3]!.t).toBe(9.5)
  })

  it('sense tempsEntrada ni despres, encadena immediatament (despres = 0)', () => {
    const resoltes = resolFrases([
      { linies: ['un'], tempsEntrada: 2, posX: 50, posY: 50 },
      { linies: ['dos'], posX: 50, posY: 50 },
    ])
    expect(resoltes[1]!.t).toBe(2)
  })
})
