import { describe, it, expect } from 'vitest'
import {
  MODES_TEMPORALS,
  ORDINALS,
  DIES_SETMANA,
  rangDatesValid,
  seleccioTemporalBuida,
  seleccioTemporalCompleta,
  type SeleccioTemporal,
} from '../temporal'

function selec(parcial: Partial<SeleccioTemporal>): SeleccioTemporal {
  return { ...seleccioTemporalBuida(), ...parcial }
}

describe('constants temporals', () => {
  it('hi ha 4 modes, 5 ordinals i 7 dies', () => {
    expect(MODES_TEMPORALS).toEqual(['permanent', 'dates', 'setmanal', 'mensual'])
    expect(ORDINALS).toHaveLength(5)
    expect(DIES_SETMANA).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})

describe('seleccioTemporalBuida', () => {
  it('representa "qualsevol moment" (mode null, sense paràmetres)', () => {
    expect(seleccioTemporalBuida()).toEqual({
      mode: null,
      dataInici: null,
      dataFi: null,
      diesSetmana: [],
      ordinals: [],
    })
  })
})

describe('rangDatesValid', () => {
  it('és vàlid quan falta algun extrem', () => {
    expect(rangDatesValid(null, null)).toBe(true)
    expect(rangDatesValid('2026-06-01', null)).toBe(true)
    expect(rangDatesValid(null, '2026-06-01')).toBe(true)
  })

  it('accepta fi igual o posterior a inici', () => {
    expect(rangDatesValid('2026-06-01', '2026-06-01')).toBe(true)
    expect(rangDatesValid('2026-06-01', '2026-08-31')).toBe(true)
  })

  it('rebutja fi anterior a inici', () => {
    expect(rangDatesValid('2026-06-10', '2026-06-09')).toBe(false)
    expect(rangDatesValid('2026-12-01', '2026-01-01')).toBe(false)
  })
})

describe('seleccioTemporalCompleta', () => {
  it('mode null mai és complet', () => {
    expect(seleccioTemporalCompleta(seleccioTemporalBuida())).toBe(false)
  })

  it('permanent sempre és complet', () => {
    expect(seleccioTemporalCompleta(selec({ mode: 'permanent' }))).toBe(true)
  })

  it("dates requereix com a mínim la data d'inici", () => {
    expect(seleccioTemporalCompleta(selec({ mode: 'dates' }))).toBe(false)
    expect(seleccioTemporalCompleta(selec({ mode: 'dates', dataInici: '2026-06-01' }))).toBe(true)
  })

  it('dates amb interval invàlid no és complet', () => {
    expect(
      seleccioTemporalCompleta(
        selec({ mode: 'dates', dataInici: '2026-06-10', dataFi: '2026-06-01' })
      )
    ).toBe(false)
  })

  it('setmanal requereix com a mínim un dia', () => {
    expect(seleccioTemporalCompleta(selec({ mode: 'setmanal' }))).toBe(false)
    expect(seleccioTemporalCompleta(selec({ mode: 'setmanal', diesSetmana: [1] }))).toBe(true)
  })

  it('mensual requereix ordinal I dia', () => {
    expect(seleccioTemporalCompleta(selec({ mode: 'mensual', ordinals: ['primer'] }))).toBe(false)
    expect(seleccioTemporalCompleta(selec({ mode: 'mensual', diesSetmana: [1] }))).toBe(false)
    expect(
      seleccioTemporalCompleta(selec({ mode: 'mensual', ordinals: ['primer'], diesSetmana: [1] }))
    ).toBe(true)
  })
})
