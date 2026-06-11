import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGeofreakStore } from '../geofreak'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('geofreak — configuració de la partida', () => {
  it('arrenca en fase de configuració, buida i incompleta', () => {
    const g = useGeofreakStore()
    expect(g.fase).toBe('configuracio')
    expect(g.configuracio.modalitat).toBeNull()
    expect(g.configuracio.nivell).toBeNull()
    expect(g.configCompleta).toBe(false)
    expect(g.nivellActual).toBeNull()
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

  it('comencaPartida només arrenca amb configuració completa', () => {
    const g = useGeofreakStore()
    g.comencaPartida()
    expect(g.fase).toBe('configuracio')
    g.defineixModalitat('onEs')
    g.defineixNivell(4)
    g.comencaPartida()
    expect(g.fase).toBe('partida')
  })

  it('tornaAConfiguracio conserva la configuració; reinicia la buida', () => {
    const g = useGeofreakStore()
    g.defineixModalitat('onEs')
    g.defineixNivell(4)
    g.comencaPartida()

    g.tornaAConfiguracio()
    expect(g.fase).toBe('configuracio')
    expect(g.configuracio.nivell).toBe(4)

    g.reinicia()
    expect(g.fase).toBe('configuracio')
    expect(g.configuracio.modalitat).toBeNull()
    expect(g.configuracio.nivell).toBeNull()
  })
})
