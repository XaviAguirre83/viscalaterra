import { describe, it, expect } from 'vitest'
import { normalitza } from '../text'

describe('normalitza', () => {
  it('passa a minúscules i treu els accents', () => {
    expect(normalitza('Berguedà')).toBe('bergueda')
    expect(normalitza('Òdena')).toBe('odena')
    expect(normalitza('MÓRA D’EBRE')).toBe('mora d’ebre')
  })

  it('conserva apòstrofs, guions i punts volats', () => {
    expect(normalitza("l'Ametlla del Vallès")).toBe("l'ametlla del valles")
    expect(normalitza('Vilanova i la Geltrú')).toBe('vilanova i la geltru')
    expect(normalitza('Castell-Platja d’Aro')).toBe('castell-platja d’aro')
  })

  it('la dièresi i la ce trencada també es normalitzen', () => {
    expect(normalitza('Güell')).toBe('guell')
    expect(normalitza('Lluçanès')).toBe('llucanes')
  })
})
