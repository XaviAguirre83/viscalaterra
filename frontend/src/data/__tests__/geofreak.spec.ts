import { describe, it, expect } from 'vitest'
import {
  NIVELLS,
  nivellPerId,
  nivellNecessitaContenidor,
  configuracioBuida,
  configuracioCompleta,
  creaPartida,
  responClic,
  partidaCompletada,
  calculaPunts,
  barreja,
  triaDistractors,
  passaRonda,
  MAX_INTENTS_RONDA,
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

describe('geofreak — partida (rondes)', () => {
  // RNG determinista: sempre 0 → l'objectiu és sempre el primer pendent.
  const primer = () => 0

  it('creaPartida treu un objectiu i deixa la resta pendents', () => {
    const p = creaPartida(['a', 'b', 'c'], primer)
    expect(p.objectiu).toBe('a')
    expect(p.pendents).toEqual(['b', 'c'])
    expect(p.encertades).toEqual([])
    expect(p.errors).toBe(0)
    expect(partidaCompletada(p)).toBe(false)
  })

  it('encert: marca la demarcació, no torna a sortir i en surt una altra', () => {
    const p = creaPartida(['a', 'b'], primer)
    const { estat, resultat } = responClic(p, 'a', primer)
    expect(resultat).toBe('encert')
    expect(estat.encertades).toEqual(['a'])
    expect(estat.objectiu).toBe('b')
    expect(estat.pendents).toEqual([])
  })

  it("error: suma l'error i l'objectiu no canvia", () => {
    const p = creaPartida(['a', 'b'], primer)
    const { estat, resultat } = responClic(p, 'b', primer)
    expect(resultat).toBe('error')
    expect(estat.errors).toBe(1)
    expect(estat.objectiu).toBe('a')
    expect(estat.encertades).toEqual([])
  })

  it("re-clicar una encertada s'ignora (ni encert ni error)", () => {
    const p = creaPartida(['a', 'b'], primer)
    const despresEncert = responClic(p, 'a', primer).estat
    const { estat, resultat } = responClic(despresEncert, 'a', primer)
    expect(resultat).toBe('ignorat')
    expect(estat).toBe(despresEncert)
  })

  it('la partida es completa en encertar totes les demarcacions', () => {
    let estat = creaPartida(['a', 'b'], primer)
    estat = responClic(estat, 'a', primer).estat
    expect(partidaCompletada(estat)).toBe(false)
    estat = responClic(estat, 'b', primer).estat
    expect(partidaCompletada(estat)).toBe(true)
    expect(estat.objectiu).toBeNull()
    // Amb la partida completada, qualsevol clic s'ignora.
    expect(responClic(estat, 'a', primer).resultat).toBe('ignorat')
  })

  it("responClic mai muta l'estat anterior", () => {
    const p = creaPartida(['a', 'b'], primer)
    responClic(p, 'a', primer)
    responClic(p, 'b', primer)
    expect(p.objectiu).toBe('a')
    expect(p.pendents).toEqual(['b'])
    expect(p.encertades).toEqual([])
    expect(p.errors).toBe(0)
  })

  it('al tercer error de la ronda, salta: l’objectiu torna a la cua i en surt un altre', () => {
    let estat = creaPartida(['a', 'b', 'c'], primer) // objectiu 'a'
    estat = responClic(estat, 'b', primer).estat
    estat = responClic(estat, 'b', primer).estat
    expect(estat.intentsRonda).toBe(2)
    const { estat: despres, resultat } = responClic(estat, 'b', primer)
    expect(resultat).toBe('salt')
    expect(despres.errors).toBe(MAX_INTENTS_RONDA)
    expect(despres.intentsRonda).toBe(0)
    // L'objectiu nou no és l'anterior, i 'a' segueix pendent.
    expect(despres.objectiu).not.toBe('a')
    expect(despres.pendents).toContain('a')
    expect(despres.encertades).toEqual([])
  })

  it("l'encert reinicia el comptador d'intents de la ronda", () => {
    let estat = creaPartida(['a', 'b'], primer)
    estat = responClic(estat, 'b', primer).estat // error: intents 1
    const { estat: despres } = responClic(estat, 'a', primer)
    expect(despres.intentsRonda).toBe(0)
  })

  it('passaRonda re-encua l’objectiu sense sumar error', () => {
    const p = creaPartida(['a', 'b', 'c'], primer) // objectiu 'a'
    const despres = passaRonda(p, primer)
    expect(despres.errors).toBe(0)
    expect(despres.objectiu).not.toBe('a')
    expect(despres.pendents).toContain('a')
    // Total de demarcacions en joc es conserva.
    expect(despres.pendents.length + despres.encertades.length + 1).toBe(3)
  })

  it('passaRonda amb un únic objectiu el torna a treure (no hi ha alternativa)', () => {
    let estat = creaPartida(['a', 'b'], primer)
    estat = responClic(estat, 'a', primer).estat // queda només 'b'
    const despres = passaRonda(estat, primer)
    expect(despres.objectiu).toBe('b')
    expect(despres.pendents).toEqual([])
  })
})

describe('geofreak — calculaPunts', () => {
  // 5 s per demarcació → bonus_temps exactament 0,5 (sense errors d'arrodoniment).
  const base = { nivell: 4, encerts: 43, errors: 0, segons: 215 }

  it('sense encerts no hi ha punts', () => {
    expect(calculaPunts({ nivell: 8, encerts: 0, errors: 5, segons: 10 })).toBe(0)
  })

  it('més errors → menys punts', () => {
    const net = calculaPunts(base)
    const ambErrors = calculaPunts({ ...base, errors: 10 })
    expect(ambErrors).toBeLessThan(net)
    expect(ambErrors).toBeGreaterThan(0)
  })

  it('més temps → menys punts', () => {
    const rapid = calculaPunts(base)
    const lent = calculaPunts({ ...base, segons: base.segons * 4 })
    expect(lent).toBeLessThan(rapid)
  })

  it('el nivell multiplica la puntuació', () => {
    const nivellBaix = calculaPunts({ ...base, nivell: 0 })
    const nivellAlt = calculaPunts({ ...base, nivell: 8 })
    expect(nivellAlt).toBe(nivellBaix * 9)
  })

  it("l'encert amb pista compta mig encert al ràtio", () => {
    const sense = calculaPunts(base)
    const totesAmbPista = calculaPunts({ ...base, encertsAmbPista: base.encerts })
    expect(totesAmbPista).toBe(Math.round(sense / 2))
  })
})

describe('geofreak — pista (distractors i barreja)', () => {
  const primer = () => 0

  it('triaDistractors prefereix el primer grup i mai inclou l’objectiu', () => {
    const distractors = triaDistractors('x', [['x', 'a', 'b', 'c', 'd'], ['llunyans']], primer)
    expect(distractors).toHaveLength(3)
    expect(distractors).not.toContain('x')
    expect(distractors.every((d) => ['a', 'b', 'c', 'd'].includes(d))).toBe(true)
  })

  it('si el primer grup no arriba a 3, es completa amb el següent sense repetir', () => {
    const distractors = triaDistractors(
      'x',
      [
        ['x', 'a'],
        ['a', 'b'],
        ['c', 'd'],
      ],
      primer
    )
    expect(distractors).toHaveLength(3)
    expect(new Set(distractors).size).toBe(3)
    expect(distractors).not.toContain('x')
  })

  it('amb poques candidates retorna les que hi ha', () => {
    expect(triaDistractors('x', [['x', 'a']], primer)).toEqual(['a'])
    expect(triaDistractors('x', [['x']], primer)).toEqual([])
  })

  it('barreja retorna una permutació en còpia nova', () => {
    const original = ['a', 'b', 'c', 'd']
    const barrejada = barreja(original, primer)
    expect(barrejada).toHaveLength(4)
    expect([...barrejada].sort()).toEqual([...original].sort())
    expect(original).toEqual(['a', 'b', 'c', 'd'])
  })
})
