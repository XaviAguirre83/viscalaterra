import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMapaStore } from '../mapa'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('mapa — capes visibles (toggles de línies)', () => {
  it('arrenca amb només provincies visible', () => {
    const m = useMapaStore()
    expect([...m.capesVisibles]).toEqual(['provincies'])
  })

  it('alternaCapa activa i desactiva lliurement qualsevol combinació', () => {
    const m = useMapaStore()
    m.alternaCapa('comarques')
    m.alternaCapa('municipis')
    expect(m.esVisible('provincies')).toBe(true)
    expect(m.esVisible('comarques')).toBe(true)
    expect(m.esVisible('municipis')).toBe(true)
    m.alternaCapa('provincies')
    expect(m.esVisible('provincies')).toBe(false)
  })

  it('alternaCapa reassigna el Set (nova identitat, per als watchers)', () => {
    const m = useMapaStore()
    const abans = m.capesVisibles
    m.alternaCapa('vegueries')
    expect(m.capesVisibles).not.toBe(abans)
  })
})

describe('mapa — nivell de selecció (radio dels quadres de valors)', () => {
  it('arrenca seleccionant per provincies', () => {
    const m = useMapaStore()
    expect(m.nivellSeleccio).toBe('provincies')
  })

  it('defineixNivellSeleccio canvia el nivell (sempre exactament un)', () => {
    const m = useMapaStore()
    m.defineixNivellSeleccio('comarques')
    expect(m.nivellSeleccio).toBe('comarques')
    m.defineixNivellSeleccio('municipis')
    expect(m.nivellSeleccio).toBe('municipis')
  })

  it('és independent de la visibilitat de les capes', () => {
    const m = useMapaStore()
    m.defineixNivellSeleccio('municipis')
    m.alternaCapa('provincies') // amaga l'única capa visible
    expect(m.capesVisibles.size).toBe(0)
    expect(m.nivellSeleccio).toBe('municipis')
  })
})
