import { describe, expect, it } from 'vitest'
import { DURADA_TOTAL, FADE_OUT_FINAL, resolFrases } from '../../terra-timeline'
import { clausCamera, creaCamera, creaGuio, normalitzaMot } from '../guio'

describe('creaGuio', () => {
  const guio = creaGuio(
    resolFrases([
      {
        linies: ['Visc a la terra,'],
        tempsEntrada: 1,
        tempsParaules: [[0, 1, 2, 3]],
        posX: 50,
        posY: 50,
      },
      { linies: ['bella terra', 'mediterrània'], despres: 2, posX: 50, posY: 50 },
      {
        linies: ['VISCA LA TERRA!'],
        tempsEntrada: 20,
        tempsParaules: [[0, 0.5, 1]],
        posX: 50,
        posY: 50,
      },
    ])
  )

  it('normalitza majúscules i la puntuació enganxada', () => {
    expect(normalitzaMot('TERRA!')).toBe('terra')
    expect(normalitzaMot('terra,')).toBe('terra')
    expect(normalitzaMot('clamem...')).toBe('clamem')
    expect(normalitzaMot("l'onada")).toBe("l'onada")
  })

  it('troba l’instant de cada aparició d’una paraula', () => {
    expect(guio.quan('visc')).toBe(1)
    expect(guio.quan('terra')).toBe(4) // «terra,» de la primera frase
    expect(guio.quan('terra', 1)).toBeGreaterThan(6) // «bella terra»
    expect(guio.quan('Terra', 2)).toBe(21) // «TERRA!»
  })

  it('dona els temps del grup que conté la paraula', () => {
    expect(guio.frase('visc')).toEqual({ entra: 1, escrita: 4, surt: 6 })
    // L'última frase surt quan comença el fundit final.
    expect(guio.frase('visca').surt).toBe(DURADA_TOTAL - FADE_OUT_FINAL)
  })

  it('avisa si el poema ja no té la paraula (o l’aparició) que es demana', () => {
    expect(() => guio.quan('sardana')).toThrow(/sardana/)
    expect(() => guio.quan('terra', 3)).toThrow(/terra/)
  })
})

describe('creaCamera', () => {
  it('a velocitat constant, la posició és velocitat × temps', () => {
    const camera = creaCamera(
      [
        [0, 10],
        [20, 10],
      ],
      20
    )
    expect(camera.x(0)).toBe(0)
    expect(camera.x(5)).toBeCloseTo(50, 6)
    expect(camera.x(20)).toBeCloseTo(200, 6)
  })

  it('accelera i frena sense estrebades: la mitjana d’una rampa en S és la mitjana dels extrems', () => {
    const camera = creaCamera(
      [
        [0, 0],
        [10, 100],
      ],
      10
    )
    expect(camera.x(10)).toBeCloseTo(500, 1)
    // Fins a mig camí: ∫(3p² − 2p³) entre 0 i ½ = 3/32 del recorregut a velocitat màxima.
    expect(camera.x(5)).toBeCloseTo(93.75, 1)
  })

  it('no es mou abans de la primera clau ni més enllà de la durada', () => {
    const camera = creaCamera(
      [
        [0, 0],
        [4, 0],
        [6, 30],
      ],
      6
    )
    expect(camera.x(-3)).toBe(0)
    expect(camera.x(4)).toBe(0)
    expect(camera.x(99)).toBe(camera.x(6))
  })
})

// La càmera real del poema: el guió s'edita a mà, i aquests tests vigilen que
// cap retoc de temps la deixi incoherent.
describe('clausCamera (poema real)', () => {
  const guio = creaGuio()
  const claus = clausCamera(guio)

  it('les claus van en ordre de temps i no hi ha velocitats negatives', () => {
    for (let i = 1; i < claus.length; i++) {
      expect(claus[i]![0]).toBeGreaterThanOrEqual(claus[i - 1]![0])
    }
    for (const [, v] of claus) expect(v).toBeGreaterThanOrEqual(0)
  })

  it('arrenca aturada (el mapa) i acaba aturada (el clam final)', () => {
    const camera = creaCamera(claus, guio.durada)
    expect(camera.x(guio.quan('visc'))).toBe(0)
    expect(camera.x(guio.durada)).toBeCloseTo(camera.x(guio.quan('visca')), 6)
  })

  it('sempre avança: el viatge no torna mai enrere', () => {
    const camera = creaCamera(claus, guio.durada)
    for (let t = 0.5; t <= guio.durada; t += 0.5) {
      expect(camera.x(t)).toBeGreaterThanOrEqual(camera.x(t - 0.5))
    }
  })
})
