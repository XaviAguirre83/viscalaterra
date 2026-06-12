import { describe, it, expect } from 'vitest'
import { articleComarca, articleVegueria, nomAmbArticle, nomAmbDe } from '../articles'

describe('articles — formes nominatives i amb "de"', () => {
  it('construeix la forma nominativa segons l’article', () => {
    expect(nomAmbArticle('Maresme', 'el')).toBe('el Maresme')
    expect(nomAmbArticle('Anoia', "l'")).toBe("l'Anoia")
    expect(nomAmbArticle('Selva', 'la')).toBe('la Selva')
    expect(nomAmbArticle('Garrigues', 'les')).toBe('les Garrigues')
    expect(nomAmbArticle('Osona', '')).toBe('Osona')
  })

  it('construeix la forma amb "de" (contraccions i apostrofació)', () => {
    expect(nomAmbDe('Maresme', 'el')).toBe('del Maresme')
    expect(nomAmbDe('Anoia', "l'")).toBe("de l'Anoia")
    expect(nomAmbDe('Selva', 'la')).toBe('de la Selva')
    expect(nomAmbDe('Garrigues', 'les')).toBe('de les Garrigues')
    // Sense article: apostrofa davant de vocal, "de" davant de consonant.
    expect(nomAmbDe('Osona', '')).toBe("d'Osona")
    expect(nomAmbDe('Barcelona', '')).toBe('de Barcelona')
  })

  it('coneix l’article de totes les comarques de mostra', () => {
    expect(articleComarca('21')).toBe('el') // Maresme
    expect(articleComarca('06')).toBe("l'") // Anoia
    expect(articleComarca('34')).toBe('la') // Selva
    expect(articleComarca('18')).toBe('les') // Garrigues
    expect(articleComarca('24')).toBe('') // Osona
    expect(articleComarca('inexistent')).toBe('')
  })

  it('coneix l’article de les vegueries', () => {
    expect(articleVegueria('06')).toBe("l'") // Alt Pirineu
    expect(articleVegueria('05')).toBe('les') // Terres de l'Ebre
    expect(articleVegueria('01')).toBe('') // Barcelona
    expect(articleVegueria('00')).toBe('la') // Val d'Aran
  })
})
