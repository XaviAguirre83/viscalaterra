import { describe, it, expect } from 'vitest'
import { analitzaTextLegal, TEXTOS_LEGALS, type DadesTitular } from '../legal'

const PLENES: DadesTitular = { nom: 'Persona Titular', email: 'titular@exemple.cat' }
const BUIDES: DadesTitular = { nom: '', email: '' }

const FONTS = import.meta.glob<string>('../../legal/*/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('analitzaTextLegal — blocs', () => {
  it('separa títols, paràgrafs i llistes', () => {
    const { blocs } = analitzaTextLegal(
      '# Títol\n\nUna línia\nque continua.\n\n## Apartat\n- u\n- dos\n\n### Sub',
      PLENES
    )
    expect(blocs.map((b) => b.tipus)).toEqual(['titol', 'paragraf', 'titol', 'llista', 'titol'])
    expect(blocs[0]).toMatchObject({ nivell: 1 })
    expect(blocs[1]).toEqual({
      tipus: 'paragraf',
      contingut: [{ tipus: 'text', text: 'Una línia que continua.' }],
    })
    expect(blocs[3]).toEqual({
      tipus: 'llista',
      elements: [[{ tipus: 'text', text: 'u' }], [{ tipus: 'text', text: 'dos' }]],
    })
  })

  it('reconeix negreta (també amb codi a dins), codi i enllaços', () => {
    const [bloc] = analitzaTextLegal(
      '**`__Host-sessio`** i `codi`, [intern](/legal/cookies), [web](https://www.aepd.es)',
      PLENES
    ).blocs
    expect(bloc).toEqual({
      tipus: 'paragraf',
      contingut: [
        { tipus: 'negreta', fills: [{ tipus: 'codi', text: '__Host-sessio' }] },
        { tipus: 'text', text: ' i ' },
        { tipus: 'codi', text: 'codi' },
        { tipus: 'text', text: ', ' },
        {
          tipus: 'enllac',
          href: '/legal/cookies',
          desti: 'intern',
          fills: [{ tipus: 'text', text: 'intern' }],
        },
        { tipus: 'text', text: ', ' },
        {
          tipus: 'enllac',
          href: 'https://www.aepd.es/',
          desti: 'web',
          fills: [{ tipus: 'text', text: 'web' }],
        },
      ],
    })
  })

  it('marca els [[PENDENT: …]]', () => {
    const text = analitzaTextLegal('Data: [[PENDENT: data de publicació]]', PLENES)
    expect(text.tePendents).toBe(true)
    expect(text.blocs[0]).toMatchObject({
      contingut: [
        { tipus: 'text', text: 'Data: ' },
        { tipus: 'pendent', text: 'data de publicació' },
      ],
    })
    expect(analitzaTextLegal('# Net\n\nSense res pendent.', PLENES).tePendents).toBe(false)
  })

  it('rebutja els enllaços que no són pàgines del lloc, web o correu', () => {
    expect(() => analitzaTextLegal('[x](javascript:alert(1))', PLENES)).toThrow(/no permès/)
    expect(() => analitzaTextLegal('[x](//altre.cat)', PLENES)).toThrow(/no permès/)
  })
})

describe('analitzaTextLegal — camps del titular', () => {
  it('posa els valors, també dins dels enllaços', () => {
    const [bloc] = analitzaTextLegal(
      'De {{titular.nom}}: [{{titular.email}}](mailto:{{titular.email}})',
      PLENES
    ).blocs
    expect(bloc).toEqual({
      tipus: 'paragraf',
      contingut: [
        { tipus: 'text', text: 'De ' },
        { tipus: 'text', text: 'Persona Titular' },
        { tipus: 'text', text: ': ' },
        {
          tipus: 'enllac',
          href: 'mailto:titular@exemple.cat',
          desti: 'correu',
          fills: [{ tipus: 'text', text: 'titular@exemple.cat' }],
        },
      ],
    })
  })

  it('marca com a pendents el nom i el correu si falten', () => {
    const text = analitzaTextLegal('De {{titular.nom}}: [correu](mailto:{{titular.email}})', BUIDES)
    expect(text.tePendents).toBe(true)
    expect(text.blocs[0]).toMatchObject({
      contingut: [
        { tipus: 'text', text: 'De ' },
        { tipus: 'pendent', text: 'falta TITULAR_NOM al .env' },
        { tipus: 'text', text: ': ' },
        { tipus: 'pendent', text: 'falta TITULAR_EMAIL al .env' },
      ],
    })
  })

  it('rebutja els camps que no existeixen', () => {
    expect(() => analitzaTextLegal('{{titular.telefon}}', PLENES)).toThrow(/telefon/)
    // El NIF i el domicili no es publiquen (vegeu frontend/src/legal/README.md).
    expect(() => analitzaTextLegal('NIF: {{titular.nif}}', PLENES)).toThrow(/nif/)
  })
})

describe('textos de frontend/src/legal', () => {
  it('hi ha tots els textos en català, la versió que mana', () => {
    for (const nom of TEXTOS_LEGALS) expect(FONTS[`../../legal/ca/${nom}.md`]).toBeTypeOf('string')
  })

  it.each(Object.keys(FONTS))("%s: s'analitza sense errors i comença pel títol", (camí) => {
    for (const dades of [PLENES, BUIDES]) {
      const { blocs } = analitzaTextLegal(FONTS[camí]!, dades)
      expect(blocs[0]).toMatchObject({ tipus: 'titol', nivell: 1 })
      expect(blocs.filter((b) => b.tipus === 'titol' && b.nivell === 1)).toHaveLength(1)
    }
  })

  // Mana el català: una traducció ha de tenir els mateixos apartats, paràgrafs,
  // elements de llista i pendents, en el mateix ordre. Si es toca el català i no
  // les traduccions (o al revés), falla.
  function estructura(font: string): string[] {
    const blocs = analitzaTextLegal(font, PLENES).blocs.map((b) =>
      b.tipus === 'titol'
        ? `h${b.nivell}`
        : b.tipus === 'llista'
          ? `llista ×${b.elements.length}`
          : 'p'
    )
    return [...blocs, `pendents ×${font.match(/\[\[PENDENT:/g)?.length ?? 0}`]
  }

  it.each(Object.keys(FONTS).filter((camí) => !camí.includes('/ca/')))(
    '%s: té la mateixa estructura que el català',
    (camí) => {
      const catala = FONTS[camí.replace(/\/legal\/[^/]+\//, '/legal/ca/')]
      expect(catala).toBeTypeOf('string')
      expect(estructura(FONTS[camí]!)).toEqual(estructura(catala!))
    }
  )
})
