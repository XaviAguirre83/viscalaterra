import { describe, it, expect } from 'vitest'
import {
  temaPerProvincia,
  temaPerVegueria,
  temaPerComarca,
  nomProvinciesPerComarca,
  nomVeguiesPerComarca,
  TEMA_NEUTRE,
  TEMA_PROVINCIA,
} from '../provincies'

describe('temaPerProvincia', () => {
  it('retorna el color propi de Barcelona (08)', () => {
    expect(temaPerProvincia('08').base).toBe('#c4382e')
  })

  it('cau al tema neutre amb un codi desconegut', () => {
    expect(temaPerProvincia('99')).toBe(TEMA_NEUTRE)
  })

  it('cau al tema neutre amb codi undefined', () => {
    expect(temaPerProvincia(undefined)).toBe(TEMA_NEUTRE)
  })
})

describe('temaPerVegueria', () => {
  it('Penedès (08) usa la seva paleta vi/magenta, no la provincial', () => {
    expect(temaPerVegueria('08').base).toBe('#8b3a6e')
  })

  it('cau al tema neutre amb un codi desconegut', () => {
    expect(temaPerVegueria('zz')).toBe(TEMA_NEUTRE)
  })
})

describe('temaPerComarca', () => {
  it("una comarca d'una sola província hereta el color provincial (Maresme 21 → Barcelona)", () => {
    expect(temaPerComarca('21')).toEqual(TEMA_PROVINCIA['08'])
  })

  it('una comarca transfronterera (Cerdanya 15) té un color propi calculat (verd oliva)', () => {
    expect(temaPerComarca('15').base).toBe('#5e7421')
  })

  it('cau al tema neutre amb un codi desconegut', () => {
    expect(temaPerComarca('99')).toBe(TEMA_NEUTRE)
  })
})

describe('noms territorials per comarca', () => {
  it('Berguedà (14) és transfronterera: Barcelona i Lleida en ordre de dominància', () => {
    expect(nomProvinciesPerComarca('14')).toEqual(['Barcelona', 'Lleida'])
  })

  it('Anoia (06) pertany a dues vegueries (Penedès i Catalunya Central)', () => {
    expect(nomVeguiesPerComarca('06')).toEqual(['Penedès', 'Catalunya Central'])
  })

  it("una comarca d'una sola província retorna un únic element", () => {
    expect(nomProvinciesPerComarca('21')).toEqual(['Barcelona'])
  })

  it('un codi inexistent retorna una llista buida', () => {
    expect(nomProvinciesPerComarca('zz')).toEqual([])
  })
})
