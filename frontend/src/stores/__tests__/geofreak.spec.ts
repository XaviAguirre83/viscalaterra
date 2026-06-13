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

  it('preparaPartida no arrenca el cronòmetre fins a arrencaPartida', () => {
    const g = configuraNivell0()
    g.preparaPartida(['a', 'b'])
    expect(g.fase).toBe('preparacio')
    expect(g.clicDemarcacio('a')).toBe('ignorat')
    g.arrencaPartida()
    expect(g.fase).toBe('partida')
    expect(g.tempsIniciMs).toBeGreaterThan(0)
  })

  it('la ratxa puja amb encerts consecutius i cau amb error o salt', () => {
    const g = configuraNivell0()
    g.comencaPartida(['a', 'b', 'c', 'd'])
    g.clicDemarcacio(g.partida!.objectiu!)
    g.clicDemarcacio(g.partida!.objectiu!)
    expect(g.ratxa).toBe(2)
    // Error sobre una pendent viva (no l'objectiu, no encertada).
    g.clicDemarcacio(g.partida!.pendents[0]!)
    expect(g.ratxa).toBe(0)
  })

  it('pista: una per ronda, l’encert la consumeix i compta 0,5', () => {
    const g = configuraNivell0()
    g.comencaPartida(['a', 'b', 'c'])

    g.activaPista(['a', 'b', 'c'])
    expect(g.pista).toEqual(['a', 'b', 'c'])
    // No es pot demanar una segona pista a la mateixa ronda.
    g.activaPista(['x'])
    expect(g.pista).toEqual(['a', 'b', 'c'])

    const objectiu = g.partida!.objectiu!
    g.clicDemarcacio(objectiu)
    expect(g.pista).toBeNull()
    expect(g.estatJugadors[0]!.encertsAmbPista).toBe(1)
  })

  it('errar amb la pista activa salta la ronda i la consumeix', () => {
    const g = configuraNivell0()
    g.comencaPartida(['a', 'b', 'c'])
    const objectiu = g.partida!.objectiu!
    const altra = ['a', 'b', 'c'].find((c) => c !== objectiu)!
    g.activaPista(['a', 'b', 'c'])

    expect(g.clicDemarcacio(altra)).toBe('salt')
    expect(g.pista).toBeNull()
    expect(g.partida!.errors).toBe(1)
    expect(g.partida!.objectiu).not.toBe(objectiu)
    expect(g.partida!.pendents).toContain(objectiu)
  })

  it('passaRonda re-encua l’objectiu i neteja la pista', () => {
    const g = configuraNivell0()
    g.comencaPartida(['a', 'b', 'c'])
    const objectiu = g.partida!.objectiu!
    g.activaPista(['a', 'b'])

    g.passaRonda()
    expect(g.partida!.objectiu).not.toBe(objectiu)
    expect(g.partida!.pendents).toContain(objectiu)
    expect(g.partida!.errors).toBe(0)
    expect(g.pista).toBeNull()
  })

  it('al tercer error de la ronda salta d’objectiu', () => {
    const g = configuraNivell0()
    g.comencaPartida(['a', 'b', 'c'])
    const objectiu = g.partida!.objectiu!
    const altra = ['a', 'b', 'c'].find((c) => c !== objectiu)!

    expect(g.clicDemarcacio(altra)).toBe('error')
    expect(g.clicDemarcacio(altra)).toBe('error')
    expect(g.clicDemarcacio(altra)).toBe('salt')
    expect(g.partida!.objectiu).not.toBe(objectiu)
    expect(g.partida!.errors).toBe(3)
  })

  it('pausa congela el cronòmetre i repren el reactiva sense comptar el temps pausat', async () => {
    const g = configuraNivell0()
    g.comencaPartida(['a', 'b'])
    const iniciAbans = g.tempsIniciMs

    g.pausa()
    expect(g.pausada).toBe(true)
    // Mentre pausat, una segona crida és idempotent.
    g.pausa()
    expect(g.pausada).toBe(true)

    await new Promise((r) => setTimeout(r, 20))
    g.repren()
    expect(g.pausada).toBe(false)
    // L'instant d'inici s'ha desplaçat cap endavant (el temps pausat no compta).
    expect(g.tempsIniciMs).toBeGreaterThan(iniciAbans)
    // Reprendre sense pausa prèvia no fa res.
    const iniciDespres = g.tempsIniciMs
    g.repren()
    expect(g.tempsIniciMs).toBe(iniciDespres)
  })

  it('no es pot pausar fora de partida', () => {
    const g = configuraNivell0()
    g.pausa()
    expect(g.pausada).toBe(false)
  })

  it('defineixJugadors només accepta d’1 a 4 jugadors', () => {
    const g = useGeofreakStore()
    const dos = [
      { nom: 'Anna', color: '#111111' },
      { nom: 'Biel', color: '#222222' },
    ]
    g.defineixJugadors(dos)
    expect(g.jugadors).toEqual(dos)
    g.defineixJugadors([])
    expect(g.jugadors).toEqual(dos)
    g.defineixJugadors(Array.from({ length: 5 }, () => ({ nom: 'x', color: '#000' })))
    expect(g.jugadors).toEqual(dos)
  })

  it('mode conquesta: torns alterns, colors al mapa i classificació', () => {
    const g = configuraNivell0()
    g.defineixJugadors([
      { nom: 'Anna', color: '#111111' },
      { nom: 'Biel', color: '#222222' },
    ])
    g.comencaPartida(['a', 'b', 'c'])
    expect(g.tornActual).toBe(0)

    // Anna encerta → conquesta amb el seu color i el torn passa a en Biel.
    const primerObjectiu = g.partida!.objectiu!
    expect(g.clicDemarcacio(primerObjectiu)).toBe('encert')
    expect(g.tornActual).toBe(1)
    expect(g.estatJugadors[0]!.conquestes).toEqual([primerObjectiu])
    expect(g.colorsConquestes[primerObjectiu]).toBe('#111111')

    // Biel falla un cop: l'error és seu i el torn NO passa (1r intent).
    g.clicDemarcacio(g.partida!.pendents[0]!)
    expect(g.tornActual).toBe(1)
    expect(g.estatJugadors[1]!.errors).toBe(1)
    expect(g.estatJugadors[0]!.errors).toBe(0)

    // Biel encerta → torn de l'Anna; Anna encerta l'última → resultats.
    expect(g.clicDemarcacio(g.partida!.objectiu!)).toBe('encert')
    expect(g.tornActual).toBe(0)
    expect(g.clicDemarcacio(g.partida!.objectiu!)).toBe('encert')

    expect(g.fase).toBe('resultats')
    expect(g.resultats).toHaveLength(2)
    const [anna, biel] = g.resultats
    expect(anna!.conquestes).toBe(2)
    expect(biel!.conquestes).toBe(1)
    expect(biel!.errors).toBe(1)
    expect(Object.keys(g.colorsConquestes)).toHaveLength(3)
  })

  it('en multijugador, Passa també tanca el torn', () => {
    const g = configuraNivell0()
    g.defineixJugadors([
      { nom: 'Anna', color: '#111111' },
      { nom: 'Biel', color: '#222222' },
    ])
    g.comencaPartida(['a', 'b', 'c'])
    g.passaRonda()
    expect(g.tornActual).toBe(1)
    expect(g.fase).toBe('partida')
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
