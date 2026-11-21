import { describe, it, expect } from 'vitest'
import {
  MODALITATS_CAPITALS,
  calculaPunts,
  candidatsCapitals,
  capitalsPerComarca,
  configuracioBuida,
  configuracioCompleta,
  grupsDistractors,
  triaCapital,
} from '../capitalComarca'
import { puntuacio } from '../partida'

describe('capitalComarca — configuració', () => {
  it('té les dues modalitats', () => {
    expect(MODALITATS_CAPITALS).toEqual(['quinaCapital', 'quinaComarca'])
  })

  it('només cal triar la modalitat (no hi ha nivells)', () => {
    expect(configuracioCompleta(configuracioBuida())).toBe(false)
    expect(configuracioCompleta({ modalitat: 'quinaComarca' })).toBe(true)
  })
})

describe('capitalComarca — capitals', () => {
  // Talls de l'arbre: Osona surt sota dues províncies (transfronterera).
  const COMARQUES = [
    { codi: '21', cap: 'Mataró' },
    { codi: '24', cap: 'Vic' },
    { codi: '24', cap: 'Vic' },
    { codi: '40', cap: 'Sabadell' },
    { codi: '99', cap: '' },
  ]

  it('una entrada per comarca, sense repetir les transfrontereres', () => {
    const capitals = capitalsPerComarca(COMARQUES)
    expect([...capitals.keys()]).toEqual(['21', '24', '40'])
    expect(capitals.get('24')).toEqual(['Vic'])
  })

  it('el Vallès Occidental té dues capitals: Sabadell i Terrassa', () => {
    expect(capitalsPerComarca(COMARQUES).get('40')).toEqual(['Sabadell', 'Terrassa'])
  })

  it('una comarca sense capital a les dades no entra en joc', () => {
    expect(capitalsPerComarca(COMARQUES).has('99')).toBe(false)
  })

  it('triaCapital tria una de les capitals', () => {
    expect(triaCapital(['Sabadell', 'Terrassa'], () => 0)).toBe('Sabadell')
    expect(triaCapital(['Sabadell', 'Terrassa'], () => 0.99)).toBe('Terrassa')
    expect(triaCapital(['Vic'], () => 0.99)).toBe('Vic')
    expect(triaCapital([], () => 0)).toBe('')
  })

  it('candidatsCapitals: totes les capitals de les comarques donades, per ordre alfabètic', () => {
    const capitals = capitalsPerComarca(COMARQUES)
    expect(candidatsCapitals(capitals, ['40', '21'])).toEqual([
      { codi: '21', nom: 'Mataró' },
      { codi: '40', nom: 'Sabadell' },
      { codi: '40', nom: 'Terrassa' },
    ])
  })
})

describe('capitalComarca — distractors de la pista', () => {
  // Osona (24) és a Barcelona i Girona; la Selva (34), a Girona.
  const PROVINCIES: Record<string, string[]> = {
    '21': ['08'],
    '24': ['08', '17'],
    '34': ['17'],
    '33': ['25'],
  }
  const provinciesDe = (c: string) => PROVINCIES[c] ?? []

  it('primer les comarques de la mateixa província, després qualsevol', () => {
    const vius = ['21', '24', '34', '33']
    expect(grupsDistractors('21', vius, provinciesDe)).toEqual([['21', '24'], vius])
  })

  it('una transfronterera té veïnes a les dues províncies', () => {
    const vius = ['21', '24', '34', '33']
    expect(grupsDistractors('24', vius, provinciesDe)[0]).toEqual(['21', '24', '34'])
  })
})

describe('capitalComarca — puntuació', () => {
  it('la fórmula comuna sense multiplicador de nivell', () => {
    const dades = { encerts: 43, errors: 4, segons: 300, encertsAmbPista: 3 }
    expect(calculaPunts(dades)).toBe(puntuacio(dades))
    expect(calculaPunts({ encerts: 43, errors: 0, segons: 215 })).toBe(500)
  })
})
