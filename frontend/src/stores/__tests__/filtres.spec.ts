import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFiltresStore } from '../filtres'
import { TEMES_AGENDA, TEMES_LLOCS } from '@/data/categories'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('filtres — selecció temporal (Quan?)', () => {
  it('arrenca sense filtre temporal actiu', () => {
    const f = useFiltresStore()
    expect(f.temporal.mode).toBeNull()
    expect(f.teSeleccioTemporal).toBe(false)
    expect(f.teFiltresActius).toBe(false)
  })

  it('permanent activa el filtre immediatament', () => {
    const f = useFiltresStore()
    f.defineixModeTemporal('permanent')
    expect(f.teSeleccioTemporal).toBe(true)
    expect(f.teFiltresActius).toBe(true)
  })

  it('canviar de mode neteja els paràmetres del mode anterior', () => {
    const f = useFiltresStore()
    f.defineixModeTemporal('dates')
    f.defineixRangDates('2026-06-01', '2026-06-30')
    f.defineixModeTemporal('setmanal')
    expect(f.temporal.dataInici).toBeNull()
    expect(f.temporal.dataFi).toBeNull()
    expect(f.temporal.mode).toBe('setmanal')
  })

  it("mode dates només filtra amb data d'inici i interval vàlid", () => {
    const f = useFiltresStore()
    f.defineixModeTemporal('dates')
    expect(f.teSeleccioTemporal).toBe(false)
    f.defineixRangDates('2026-06-01', null)
    expect(f.teSeleccioTemporal).toBe(true)
    // Interval invàlid (fi < inici) desactiva el filtre.
    f.defineixRangDates('2026-06-10', '2026-06-01')
    expect(f.teSeleccioTemporal).toBe(false)
  })

  it("toggleDiaSetmana afegeix, treu i manté l'ordre ascendent", () => {
    const f = useFiltresStore()
    f.defineixModeTemporal('setmanal')
    f.toggleDiaSetmana(5, true)
    f.toggleDiaSetmana(1, true)
    f.toggleDiaSetmana(3, true)
    expect(f.temporal.diesSetmana).toEqual([1, 3, 5])
    expect(f.teSeleccioTemporal).toBe(true)
    f.toggleDiaSetmana(3, false)
    expect(f.temporal.diesSetmana).toEqual([1, 5])
  })

  it("toggleOrdinal manté l'ordre canònic (primer → últim)", () => {
    const f = useFiltresStore()
    f.defineixModeTemporal('mensual')
    f.toggleOrdinal('ultim', true)
    f.toggleOrdinal('primer', true)
    expect(f.temporal.ordinals).toEqual(['primer', 'ultim'])
  })

  it('mode mensual necessita ordinal I dia per filtrar', () => {
    const f = useFiltresStore()
    f.defineixModeTemporal('mensual')
    f.toggleOrdinal('primer', true)
    expect(f.teSeleccioTemporal).toBe(false)
    f.toggleDiaSetmana(1, true)
    expect(f.teSeleccioTemporal).toBe(true)
  })

  it('netejaTemporal torna a "qualsevol moment"', () => {
    const f = useFiltresStore()
    f.defineixModeTemporal('setmanal')
    f.toggleDiaSetmana(2, true)
    f.netejaTemporal()
    expect(f.temporal.mode).toBeNull()
    expect(f.temporal.diesSetmana).toEqual([])
    expect(f.teSeleccioTemporal).toBe(false)
  })

  it('netejaTotsFiltres esborra categories (de totes dues seccions) i temporal alhora', () => {
    const f = useFiltresStore()
    f.toggleSubtema('cat-1', true)
    f.defineixSeccio('agenda')
    f.toggleSubtema('cat-2', true)
    f.defineixModeTemporal('permanent')
    expect(f.teFiltresActius).toBe(true)
    f.netejaTotsFiltres()
    expect(f.categoriesActives.size).toBe(0)
    expect(f.temporal.mode).toBeNull()
    expect(f.teFiltresActius).toBe(false)
    f.defineixSeccio('llocs')
    expect(f.categoriesActives.size).toBe(0)
  })
})

describe('filtres — Què? per secció (Llocs / Agenda)', () => {
  it('arrenca a Llocs, amb el seu catàleg', () => {
    const f = useFiltresStore()
    expect(f.seccio).toBe('llocs')
    expect(f.temes).toBe(TEMES_LLOCS)
  })

  it("a l'Agenda el catàleg és el dels esdeveniments", () => {
    const f = useFiltresStore()
    f.defineixSeccio('agenda')
    expect(f.temes).toBe(TEMES_AGENDA)
  })

  it('cada secció guarda la seva selecció', () => {
    const f = useFiltresStore()
    f.toggleSubtema('cap', true)
    f.defineixSeccio('agenda')
    expect(f.categoriesActives.size).toBe(0)
    f.seleccionaTema(['concert', 'teatre'], true)
    expect(f.estatTema(['concert', 'teatre'])).toBe('total')
    f.defineixSeccio('llocs')
    expect([...f.categoriesActives]).toEqual(['cap'])
    expect(f.estatTema(['concert', 'teatre'])).toBe('cap')
    f.defineixSeccio('agenda')
    expect([...f.categoriesActives]).toEqual(['concert', 'teatre'])
  })

  it('netejaCategories només buida la secció activa', () => {
    const f = useFiltresStore()
    f.toggleSubtema('cap', true)
    f.defineixSeccio('agenda')
    f.toggleSubtema('concert', true)
    f.netejaCategories()
    expect(f.categoriesActives.size).toBe(0)
    f.defineixSeccio('llocs')
    expect(f.categoriesActives.has('cap')).toBe(true)
  })
})
