import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTerritorisStore } from '../territoris'
import type { Municipi, Provincia } from '@/types/territori'

function muni(codi: string, comarca: string, provincia: string, vegueria = '01'): Municipi {
  return {
    codi,
    nom: `Municipi ${codi}`,
    es_cap_comarca: false,
    comarca_codi: comarca,
    vegueria_codi: vegueria,
    provincia_codi: provincia,
  }
}

// Arbre de prova amb una comarca transfronterera (Berguedà '14'), present sota
// dues províncies: Barcelona ('08') amb m1, m2 i Lleida ('25') amb m5.
// El Maresme ('21') només és a Barcelona amb m3, m4.
function arbreDeProva(): Provincia[] {
  return [
    {
      codi: '08',
      nom: 'Barcelona',
      comarques: [
        {
          codi: '14',
          nom: 'Berguedà',
          cap: 'Berga',
          municipis: [muni('m1', '14', '08'), muni('m2', '14', '08')],
        },
        {
          codi: '21',
          nom: 'Maresme',
          cap: 'Mataró',
          municipis: [muni('m3', '21', '08'), muni('m4', '21', '08')],
        },
      ],
    },
    {
      codi: '25',
      nom: 'Lleida',
      comarques: [
        { codi: '14', nom: 'Berguedà', cap: 'Berga', municipis: [muni('m5', '14', '25')] },
      ],
    },
  ]
}

describe('store territoris — selecció', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seleccionaMunicipi afegeix i treu un municipi', () => {
    const store = useTerritorisStore()
    store.arbre = arbreDeProva()

    store.seleccionaMunicipi('m1', true)
    expect(store.municipisSeleccionats.has('m1')).toBe(true)

    store.seleccionaMunicipi('m1', false)
    expect(store.municipisSeleccionats.has('m1')).toBe(false)
  })

  it('seleccionaComarca selecciona TOTS els municipis de la comarca, també els transfronterers', () => {
    const store = useTerritorisStore()
    store.arbre = arbreDeProva()

    store.seleccionaComarca('14', true)
    // Berguedà inclou m1, m2 (Barcelona) i m5 (Lleida)
    expect(store.municipisSeleccionats.size).toBe(3)
    expect(store.municipisSeleccionats.has('m5')).toBe(true)
    expect(store.estatSeleccioComarca('14')).toBe('total')
  })

  it('estatSeleccioComarca distingeix cap / parcial / total', () => {
    const store = useTerritorisStore()
    store.arbre = arbreDeProva()

    expect(store.estatSeleccioComarca('14')).toBe('cap')
    store.seleccionaMunicipi('m1', true)
    expect(store.estatSeleccioComarca('14')).toBe('parcial')
  })

  it('la selecció per província (tall transfronterer) no marca la comarca sencera com a total', () => {
    const store = useTerritorisStore()
    store.arbre = arbreDeProva()

    // Selecciona només el tall de Berguedà a Barcelona (m1, m2)
    store.seleccionaComarcaEnProvincia('14', '08', true)
    expect(store.estatSeleccioComarcaEnProvincia('14', '08')).toBe('total')
    // Globalment encara falta m5 (Lleida) → parcial
    expect(store.estatSeleccioComarca('14')).toBe('parcial')
  })

  it('seleccionaProvincia selecciona tots els municipis de la província', () => {
    const store = useTerritorisStore()
    store.arbre = arbreDeProva()

    store.seleccionaProvincia('08', true)
    // Barcelona: m1, m2 (Berguedà) + m3, m4 (Maresme)
    expect(store.municipisSeleccionats.size).toBe(4)
    expect(store.estatSeleccioProvincia('08')).toBe('total')
    // m5 (Lleida) no s'ha tocat
    expect(store.municipisSeleccionats.has('m5')).toBe(false)
  })

  it('netejaSeleccio buida la selecció', () => {
    const store = useTerritorisStore()
    store.arbre = arbreDeProva()

    store.seleccionaProvincia('08', true)
    expect(store.municipisSeleccionats.size).toBeGreaterThan(0)
    store.netejaSeleccio()
    expect(store.municipisSeleccionats.size).toBe(0)
  })
})
