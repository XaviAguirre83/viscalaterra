import { describe, it, expect } from 'vitest'
import {
  creaPartida,
  responRonda,
  partidaCompletada,
  puntuacio,
  barreja,
  triaDistractors,
  passaRonda,
  formataTemps,
  MAX_INTENTS_RONDA,
} from '../partida'

describe('partida — rondes', () => {
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
    const { estat, resultat } = responRonda(p, 'a', primer)
    expect(resultat).toBe('encert')
    expect(estat.encertades).toEqual(['a'])
    expect(estat.objectiu).toBe('b')
    expect(estat.pendents).toEqual([])
  })

  it("error: suma l'error i l'objectiu no canvia", () => {
    const p = creaPartida(['a', 'b'], primer)
    const { estat, resultat } = responRonda(p, 'b', primer)
    expect(resultat).toBe('error')
    expect(estat.errors).toBe(1)
    expect(estat.objectiu).toBe('a')
    expect(estat.encertades).toEqual([])
  })

  it("re-clicar una encertada s'ignora (ni encert ni error)", () => {
    const p = creaPartida(['a', 'b'], primer)
    const despresEncert = responRonda(p, 'a', primer).estat
    const { estat, resultat } = responRonda(despresEncert, 'a', primer)
    expect(resultat).toBe('ignorat')
    expect(estat).toBe(despresEncert)
  })

  it('la partida es completa en encertar totes les demarcacions', () => {
    let estat = creaPartida(['a', 'b'], primer)
    estat = responRonda(estat, 'a', primer).estat
    expect(partidaCompletada(estat)).toBe(false)
    estat = responRonda(estat, 'b', primer).estat
    expect(partidaCompletada(estat)).toBe(true)
    expect(estat.objectiu).toBeNull()
    // Amb la partida completada, qualsevol clic s'ignora.
    expect(responRonda(estat, 'a', primer).resultat).toBe('ignorat')
  })

  it("responRonda mai muta l'estat anterior", () => {
    const p = creaPartida(['a', 'b'], primer)
    responRonda(p, 'a', primer)
    responRonda(p, 'b', primer)
    expect(p.objectiu).toBe('a')
    expect(p.pendents).toEqual(['b'])
    expect(p.encertades).toEqual([])
    expect(p.errors).toBe(0)
  })

  it('al tercer error de la ronda, salta: l’objectiu torna a la cua i en surt un altre', () => {
    let estat = creaPartida(['a', 'b', 'c'], primer) // objectiu 'a'
    estat = responRonda(estat, 'b', primer).estat
    estat = responRonda(estat, 'b', primer).estat
    expect(estat.intentsRonda).toBe(2)
    const { estat: despres, resultat } = responRonda(estat, 'b', primer)
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
    estat = responRonda(estat, 'b', primer).estat // error: intents 1
    const { estat: despres } = responRonda(estat, 'a', primer)
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
    estat = responRonda(estat, 'a', primer).estat // queda només 'b'
    const despres = passaRonda(estat, primer)
    expect(despres.objectiu).toBe('b')
    expect(despres.pendents).toEqual([])
  })

  it('amb maxIntents = 1 (multijugador), el primer error ja salta la ronda', () => {
    const p = creaPartida(['a', 'b', 'c'], primer) // objectiu 'a'
    const { estat, resultat } = responRonda(p, 'b', primer, 1)
    expect(resultat).toBe('salt')
    expect(estat.errors).toBe(1)
    expect(estat.objectiu).not.toBe('a')
    expect(estat.pendents).toContain('a')
  })

  it('un objectiu saltat no torna fins que no han sortit tots els altres pendents', () => {
    const codis = ['a', 'b', 'c', 'd', 'e']
    let estat = creaPartida(codis, primer) // 'a'
    // Es passen totes les rondes de la primera passada: cada objectiu surt un
    // sol cop abans que en repeteixi cap.
    const sortits = [estat.objectiu!]
    for (let i = 1; i < codis.length; i++) {
      estat = passaRonda(estat, primer)
      sortits.push(estat.objectiu!)
    }
    expect([...sortits].sort()).toEqual(codis)
    // Passada nova: tornen a sortir, però mai el que s'acaba de saltar.
    const ultim = estat.objectiu
    estat = passaRonda(estat, primer)
    expect(estat.objectiu).not.toBe(ultim)
    expect(estat.vistos).toEqual([estat.objectiu])
  })

  it('les passades també valen amb errors i amb RNG qualsevol', () => {
    const codis = Array.from({ length: 12 }, (_, i) => `m${i}`)
    let estat = creaPartida(codis)
    const sortits = [estat.objectiu!]
    for (let i = 1; i < codis.length; i++) {
      estat = responRonda(estat, 'no-es-cap', Math.random, 1).estat
      sortits.push(estat.objectiu!)
    }
    expect(new Set(sortits).size).toBe(codis.length)
  })

  it('els encerts no trenquen la passada: els saltats esperen igualment', () => {
    let estat = creaPartida(['a', 'b', 'c', 'd'], primer) // 'a'
    estat = passaRonda(estat, primer) // 'a' saltat → 'b'
    estat = responRonda(estat, 'b', primer).estat // encert → 'c'
    expect(estat.objectiu).toBe('c')
    estat = responRonda(estat, 'c', primer).estat // encert → 'd' (no 'a')
    expect(estat.objectiu).toBe('d')
    estat = passaRonda(estat, primer) // passada nova → 'a'
    expect(estat.objectiu).toBe('a')
  })
})

describe('partida — puntuacio', () => {
  // 5 s per encert → bonus_temps exactament 0,5 (sense errors d'arrodoniment).
  const base = { encerts: 43, errors: 0, segons: 215 }

  it('sense encerts no hi ha punts', () => {
    expect(puntuacio({ encerts: 0, errors: 5, segons: 10 })).toBe(0)
  })

  it('sense multiplicador val 1000 × ràtio × bonus_temps', () => {
    expect(puntuacio(base)).toBe(500)
    expect(puntuacio({ ...base, multiplicador: 1 })).toBe(500)
  })

  it('el multiplicador escala la puntuació', () => {
    expect(puntuacio({ ...base, multiplicador: 3 })).toBe(1500)
  })

  it('més errors i més temps → menys punts', () => {
    expect(puntuacio({ ...base, errors: 10 })).toBeLessThan(puntuacio(base))
    expect(puntuacio({ ...base, segons: base.segons * 4 })).toBeLessThan(puntuacio(base))
  })

  it("l'encert amb pista compta mig encert al ràtio", () => {
    expect(puntuacio({ ...base, encertsAmbPista: base.encerts })).toBe(250)
  })
})

describe('partida — pista (distractors i barreja)', () => {
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

describe('partida — formataTemps', () => {
  it('mostra minuts i segons amb dues xifres', () => {
    expect(formataTemps(0)).toBe('0:00')
    expect(formataTemps(65)).toBe('1:05')
    expect(formataTemps(3600)).toBe('60:00')
  })
})
