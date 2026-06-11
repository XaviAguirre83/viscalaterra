import { describe, it, expect } from 'vitest'
import {
  NIVELLS,
  nivellPerId,
  nivellNecessitaContenidor,
  configuracioBuida,
  configuracioCompleta,
} from '../geofreak'

describe('geofreak — taula de nivells', () => {
  it('té 9 nivells amb ids consecutius 0..8', () => {
    expect(NIVELLS).toHaveLength(9)
    NIVELLS.forEach((n, i) => expect(n.id).toBe(i))
  })

  it('els nivells "a triar" (2, 3, 5, 6, 7) demanen contenidor; la resta no', () => {
    const ambContenidor = [2, 3, 5, 6, 7]
    NIVELLS.forEach((n) => {
      expect(nivellNecessitaContenidor(n.id)).toBe(ambContenidor.includes(n.id))
    })
  })

  it('el contenidor sempre és un nivell territorial superior a la demarcació', () => {
    // comarques es juguen dins vegueria/província; municipis dins comarca/vegueria/província.
    expect(nivellPerId(2)).toMatchObject({ demarcacio: 'comarca', contenidor: 'vegueria' })
    expect(nivellPerId(3)).toMatchObject({ demarcacio: 'comarca', contenidor: 'provincia' })
    expect(nivellPerId(5)).toMatchObject({ demarcacio: 'municipi', contenidor: 'comarca' })
    expect(nivellPerId(6)).toMatchObject({ demarcacio: 'municipi', contenidor: 'vegueria' })
    expect(nivellPerId(7)).toMatchObject({ demarcacio: 'municipi', contenidor: 'provincia' })
  })

  it('nivellPerId retorna undefined per a ids inexistents', () => {
    expect(nivellPerId(9)).toBeUndefined()
    expect(nivellPerId(-1)).toBeUndefined()
  })
})

describe('geofreak — configuracioCompleta', () => {
  it('la configuració buida no és completa', () => {
    expect(configuracioCompleta(configuracioBuida())).toBe(false)
  })

  it('cal modalitat I nivell', () => {
    expect(configuracioCompleta({ modalitat: 'onEs', nivell: null, codiContenidor: null })).toBe(
      false
    )
    expect(configuracioCompleta({ modalitat: null, nivell: 0, codiContenidor: null })).toBe(false)
  })

  it('un nivell sense contenidor és complet amb modalitat + nivell', () => {
    expect(configuracioCompleta({ modalitat: 'onEs', nivell: 0, codiContenidor: null })).toBe(true)
    expect(configuracioCompleta({ modalitat: 'comEsDiu', nivell: 8, codiContenidor: null })).toBe(
      true
    )
  })

  it('un nivell "a triar" no és complet fins que es tria el contenidor', () => {
    expect(configuracioCompleta({ modalitat: 'onEs', nivell: 5, codiContenidor: null })).toBe(false)
    expect(configuracioCompleta({ modalitat: 'onEs', nivell: 5, codiContenidor: '21' })).toBe(true)
  })

  it('un nivell inexistent mai és complet', () => {
    expect(configuracioCompleta({ modalitat: 'onEs', nivell: 99, codiContenidor: null })).toBe(
      false
    )
  })
})
