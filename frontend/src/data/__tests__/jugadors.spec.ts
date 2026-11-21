import { describe, it, expect } from 'vitest'
import {
  COLORS_JUGADOR,
  MAX_JUGADORS,
  colorsInicials,
  jugadorsDelWizard,
  triaColor,
} from '../jugadors'

const [blau, vermell, verd, lila] = COLORS_JUGADOR as [string, string, string, string]

describe('jugadors — colors de conquesta', () => {
  it('cada jugador possible arrenca amb un color diferent', () => {
    const colors = colorsInicials()
    expect(colors).toHaveLength(MAX_JUGADORS)
    expect(new Set(colors).size).toBe(MAX_JUGADORS)
  })

  it('triar un color lliure només canvia el del jugador', () => {
    const colors = [blau, vermell]
    expect(triaColor(colors, 0, verd)).toEqual([verd, vermell])
    expect(colors).toEqual([blau, vermell]) // còpia nova
  })

  it('triar el color d’un altre jugador els intercanvia', () => {
    expect(triaColor([blau, vermell, verd, lila], 0, verd)).toEqual([verd, vermell, blau, lila])
  })
})

describe('jugadors — jugadorsDelWizard', () => {
  const perDefecte = (n: number) => `Jugador ${n}`

  it('amb un sol jugador, sense nom ni color', () => {
    expect(jugadorsDelWizard(1, ['Anna'], [blau], perDefecte)).toEqual([{ nom: '', color: '' }])
  })

  it('amb més d’un, el nom escrit (sense espais) o «Jugador N» si és buit', () => {
    const jugadors = jugadorsDelWizard(
      3,
      ['  Anna ', '', 'Biel'],
      [blau, vermell, verd],
      perDefecte
    )
    expect(jugadors).toEqual([
      { nom: 'Anna', color: blau },
      { nom: 'Jugador 2', color: vermell },
      { nom: 'Biel', color: verd },
    ])
  })

  it('sense color triat, el de la paleta per ordre', () => {
    expect(jugadorsDelWizard(2, [], [], perDefecte).map((j) => j.color)).toEqual([blau, vermell])
  })
})
