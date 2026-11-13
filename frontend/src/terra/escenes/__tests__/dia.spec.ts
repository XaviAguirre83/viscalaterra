import { describe, expect, it } from 'vitest'
import { clausLluna, clausSol, creaDia, trajectoria, type ClauAstre } from '../dia'
import { creaGuio } from '../guio'
import { TERRA_Y } from '../nucli'

describe('trajectoria', () => {
  const claus: ClauAstre[] = [
    [0, 0, 80, 0],
    [2, 10, 20, 1],
    [6, 30, 20, 1],
    [8, 40, 80, 0],
  ]
  const astre = trajectoria(claus)

  it('passa per totes les claus', () => {
    for (const [t, x, y, opacitat] of claus) {
      expect(astre(t).x).toBeCloseTo(x, 6)
      expect(astre(t).y).toBeCloseTo(y, 6)
      expect(astre(t).opacitat).toBeCloseTo(opacitat, 6)
    }
  })

  it('abans de la primera clau i després de l’última, s’hi queda', () => {
    expect(astre(-5)).toEqual({ x: 0, y: 80, opacitat: 0 })
    expect(astre(50)).toEqual({ x: 40, y: 80, opacitat: 0 })
  })

  it('no fa panxes: entre dues claus no surt mai dels seus valors', () => {
    for (let t = 0; t <= 8; t += 0.05) {
      const { x, y } = astre(t)
      expect(y).toBeGreaterThanOrEqual(20 - 1e-9)
      expect(y).toBeLessThanOrEqual(80 + 1e-9)
      expect(x).toBeGreaterThanOrEqual(-1e-9)
      expect(x).toBeLessThanOrEqual(40 + 1e-9)
    }
  })

  it('no s’atura a cada clau: hi passa en moviment', () => {
    const v = (t: number) => (astre(t + 0.01).x - astre(t - 0.01).x) / 0.02
    expect(v(2)).toBeGreaterThan(2)
    expect(v(6)).toBeGreaterThan(2)
  })
})

describe('el dia del poema real', () => {
  const guio = creaGuio()
  const dia = creaDia(guio)

  it('les claus del sol i de la lluna van en ordre de temps', () => {
    for (const claus of [clausSol(guio), clausLluna(guio)]) {
      for (let i = 1; i < claus.length; i++) expect(claus[i]![0]).toBeGreaterThan(claus[i - 1]![0])
    }
  })

  it('comença i acaba de nit, amb la lluna al mateix lloc: el bucle empalma net', () => {
    expect(dia.llum(0)).toBe(0)
    expect(dia.llum(guio.durada)).toBe(0)
    expect(dia.sol(0).opacitat).toBe(0)
    expect(dia.sol(guio.durada).opacitat).toBe(0)
    expect(dia.lluna(0)).toEqual(dia.lluna(guio.durada))
    expect(dia.lluna(0).opacitat).toBe(1)
  })

  it('al mig del poema és ple dia, amb el sol dalt de tot i sense lluna', () => {
    for (const t of [guio.durada * 0.4, guio.durada / 2, guio.durada * 0.6]) {
      expect(dia.llum(t)).toBe(1)
      expect(dia.sol(t).y).toBeLessThan(12)
      expect(dia.lluna(t).opacitat).toBe(0)
    }
  })

  it('la claror puja amb el sol i baixa amb ell, sense salts', () => {
    const migdia = guio.durada / 2
    const mostres: number[] = []
    for (let t = 0; t <= guio.durada; t += 0.1) mostres.push(dia.llum(t))
    const canvis = mostres.slice(1).map((llum, i) => llum - mostres[i]!)
    const mati = canvis.filter((_, i) => (i + 1) * 0.1 <= migdia)
    const tarda = canvis.filter((_, i) => (i + 1) * 0.1 > migdia)
    expect(Math.max(...canvis.map(Math.abs))).toBeLessThan(0.06)
    expect(Math.min(...mati)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...tarda)).toBeLessThanOrEqual(0)
  })

  it('el sol surt i es pon per sota de la línia de terra, cadascun per una banda', () => {
    expect(dia.sol(dia.alba).y).toBeGreaterThan(TERRA_Y)
    expect(dia.sol(dia.posta).y).toBeGreaterThan(TERRA_Y)
    expect(dia.sol(dia.alba).x).toBeGreaterThan(0)
    expect(dia.sol(dia.posta).x).toBeLessThan(0)
  })

  it('sol i lluna no es veuen mai alhora a ple', () => {
    for (let t = 0; t <= guio.durada; t += 0.5) {
      expect(Math.min(dia.sol(t).opacitat, dia.lluna(t).opacitat)).toBeLessThan(1)
    }
  })
})
