import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGeofreakStore } from '../geofreak'

beforeEach(() => {
  setActivePinia(createPinia())
})

// Prepara una configuració completa de nivell 0 (sense contenidor).
function configuraNivell0() {
  const g = useGeofreakStore()
  g.defineixModalitat('onEs')
  g.defineixNivell(0)
  return g
}

describe('geofreak — configuració de la partida', () => {
  it('arrenca en fase de configuració, buida i incompleta', () => {
    const g = useGeofreakStore()
    expect(g.fase).toBe('configuracio')
    expect(g.configuracio.modalitat).toBeNull()
    expect(g.configuracio.nivell).toBeNull()
    expect(g.configCompleta).toBe(false)
    expect(g.nivellActual).toBeNull()
    expect(g.partida).toBeNull()
  })

  it('modalitat + nivell sense contenidor completen la configuració', () => {
    const g = useGeofreakStore()
    g.defineixModalitat('onEs')
    expect(g.configCompleta).toBe(false)
    g.defineixNivell(0)
    expect(g.configCompleta).toBe(true)
    expect(g.nivellActual?.demarcacio).toBe('provincia')
  })

  it('un nivell "a triar" demana contenidor abans de ser complet', () => {
    const g = useGeofreakStore()
    g.defineixModalitat('comEsDiu')
    g.defineixNivell(5)
    expect(g.configCompleta).toBe(false)
    g.defineixContenidor('21')
    expect(g.configCompleta).toBe(true)
  })

  it('canviar de nivell invalida el contenidor triat', () => {
    const g = useGeofreakStore()
    g.defineixModalitat('onEs')
    g.defineixNivell(5)
    g.defineixContenidor('21')
    g.defineixNivell(6)
    expect(g.configuracio.codiContenidor).toBeNull()
    expect(g.configCompleta).toBe(false)
  })
})

describe('geofreak — rondes de partida', () => {
  it('comencaPartida només arrenca amb configuració completa i codis', () => {
    const g = useGeofreakStore()
    g.comencaPartida(['a', 'b'])
    expect(g.fase).toBe('configuracio')

    g.defineixModalitat('onEs')
    g.defineixNivell(0)
    g.comencaPartida([])
    expect(g.fase).toBe('configuracio')

    g.comencaPartida(['a', 'b'])
    expect(g.fase).toBe('partida')
    expect(g.totalDemarcacions).toBe(2)
    expect(g.partida?.objectiu).not.toBeNull()
  })

  it('flux complet: errors, encerts i pas a resultats amb punts', () => {
    const g = configuraNivell0()
    const codis = ['a', 'b', 'c']
    g.comencaPartida(codis)

    // Un error: clic a una demarcació que no és l'objectiu.
    const objectiu = g.partida!.objectiu!
    const altra = codis.find((c) => c !== objectiu)!
    expect(g.clicDemarcacio(altra)).toBe('error')
    expect(g.partida!.errors).toBe(1)
    expect(g.fase).toBe('partida')

    // Encertar-les totes acaba la partida.
    while (g.fase === 'partida') {
      expect(g.clicDemarcacio(g.partida!.objectiu!)).toBe('encert')
    }
    expect(g.fase).toBe('resultats')
    expect(g.partida!.encertades).toHaveLength(3)
    expect(g.partida!.errors).toBe(1)
    expect(g.tempsFiMs).toBeGreaterThanOrEqual(g.tempsIniciMs)
    expect(g.punts).toBeGreaterThan(0)
  })

  it('fora de la fase de partida els clics s’ignoren', () => {
    const g = configuraNivell0()
    expect(g.clicDemarcacio('a')).toBe('ignorat')
  })

  it('pista: una per ronda, l’encert la consumeix i compta 0,5', () => {
    const g = configuraNivell0()
    g.comencaPartida(['a', 'b', 'c'])

    g.activaPista(['a', 'b', 'c'])
    expect(g.pista).toEqual(['a', 'b', 'c'])
    // No es pot demanar una segona pista a la mateixa ronda.
    g.activaPista(['x'])
    expect(g.pista).toEqual(['a', 'b', 'c'])

    // L'error no consumeix la pista.
    const objectiu = g.partida!.objectiu!
    const altra = ['a', 'b', 'c'].find((c) => c !== objectiu)!
    g.clicDemarcacio(altra)
    expect(g.pista).not.toBeNull()

    // L'encert sí, i suma al comptador d'encerts amb pista.
    g.clicDemarcacio(objectiu)
    expect(g.pista).toBeNull()
    expect(g.encertsAmbPista).toBe(1)
  })

  it('tornaAJugar rellança una partida nova amb la mateixa configuració', () => {
    const g = configuraNivell0()
    g.comencaPartida(['a', 'b'])
    while (g.fase === 'partida') g.clicDemarcacio(g.partida!.objectiu!)
    expect(g.fase).toBe('resultats')

    g.tornaAJugar(['a', 'b'])
    expect(g.fase).toBe('partida')
    expect(g.partida!.encertades).toEqual([])
    expect(g.partida!.errors).toBe(0)
  })

  it('tornaAConfiguracio conserva la configuració; reinicia la buida', () => {
    const g = configuraNivell0()
    g.comencaPartida(['a', 'b'])

    g.tornaAConfiguracio()
    expect(g.fase).toBe('configuracio')
    expect(g.configuracio.nivell).toBe(0)
    expect(g.partida).toBeNull()

    g.reinicia()
    expect(g.configuracio.modalitat).toBeNull()
    expect(g.configuracio.nivell).toBeNull()
  })
})
