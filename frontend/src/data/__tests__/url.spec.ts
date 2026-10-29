import { describe, it, expect } from 'vitest'
import { urlSegura } from '../url'

describe('urlSegura — només enllaços http(s) de dades externes', () => {
  it('deixa passar https i http (en forma canònica)', () => {
    expect(urlSegura('https://mossos.gencat.cat/ca/')).toBe('https://mossos.gencat.cat/ca/')
    expect(urlSegura('http://www.balenya.cat')).toBe('http://www.balenya.cat/')
    expect(urlSegura('  https://ca.wikipedia.org/wiki/Balenyà  ')).toBe(
      'https://ca.wikipedia.org/wiki/Baleny%C3%A0'
    )
  })

  it('rebutja esquemes que executarien codi o no són web', () => {
    expect(urlSegura('javascript:alert(1)')).toBeNull()
    expect(urlSegura('  JavaScript:alert(1)')).toBeNull()
    expect(urlSegura('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(urlSegura('vbscript:msgbox(1)')).toBeNull()
    expect(urlSegura('ftp://exemple.cat/fitxer')).toBeNull()
  })

  it('rebutja adreces relatives, buides o mal formades', () => {
    expect(urlSegura('/ruta/relativa')).toBeNull()
    expect(urlSegura('www.sense-esquema.cat')).toBeNull()
    expect(urlSegura('')).toBeNull()
    expect(urlSegura(null)).toBeNull()
    expect(urlSegura(undefined)).toBeNull()
  })
})
