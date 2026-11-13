import gsap from 'gsap'
import { afterEach, describe, expect, it } from 'vitest'
import { DURADA_TOTAL } from '../../terra-timeline'
import { muntaEscenes } from '../index'
import { PECES } from '../mapa-dades'

// Prova de fum: munta totes les escenes de debò (en jsdom) i passeja el cap de
// lectura per tot el poema. No mira com queden —per a això cal un navegador—,
// però enxampa el que més fàcilment es trenca en retocar el guió: una escena
// ancorada a una paraula que ja no hi és, o un tween que allarga el bucle.
describe('escenes de "La terra"', () => {
  let neteja: (() => void) | null = null
  /** Colors del cel que les escenes han anat avisant. */
  let cels: string[] = []
  afterEach(() => {
    neteja?.()
    neteja = null
    cels = []
  })

  function munta() {
    const capa = document.createElement('div')
    document.body.appendChild(capa)
    const mestre = gsap.timeline({ paused: true })
    // El mestre real fa DURADA_TOTAL exactes; aquí n'hi ha prou amb el mateix topall.
    mestre.call(() => {}, undefined, DURADA_TOTAL)
    const escenes = muntaEscenes(capa, mestre, { deCop: true, enCanviarCel: (c) => cels.push(c) })
    neteja = () => {
      escenes.destrueix()
      mestre.kill()
      capa.remove()
    }
    return { capa, mestre, escenes }
  }

  it('es munten totes, sota el que ja hi havia a la capa', () => {
    const { capa } = munta()
    const svg = capa.querySelector('svg.terra-escenes')
    expect(svg).not.toBeNull()
    expect(svg!.hasAttribute('data-llest')).toBe(true)
    expect(capa.firstElementChild).toBe(svg)
    expect(svg!.querySelectorAll('path').length).toBeGreaterThan(100)
  })

  it('no allarguen el bucle del poema', () => {
    const { mestre } = munta()
    expect(mestre.duration()).toBeCloseTo(DURADA_TOTAL, 6)
  })

  // jsdom és lent amb tants elements: se li dona marge de temps.
  it('es poden recórrer de cap a cap, endavant i enrere, sense errors', { timeout: 30_000 }, () => {
    const { mestre } = munta()
    for (let t = 0; t <= DURADA_TOTAL; t += 1.7) mestre.seek(t)
    for (let t = DURADA_TOTAL; t >= 0; t -= 7.3) mestre.seek(t)
    expect(mestre.time()).toBeLessThan(7.3)
  })

  it(
    'de dia aclareixen el fons de la capçalera, i de nit el deixen com era',
    {
      timeout: 30_000,
    },
    () => {
      const { capa, mestre } = munta()
      mestre.seek(0)
      expect(capa.style.backgroundColor).toBe('')
      mestre.seek(DURADA_TOTAL / 2)
      expect(capa.style.backgroundColor).not.toBe('')
      // El text del poema en rep l'avís, per a la seva clariana.
      expect(cels[cels.length - 1]).toBe(capa.style.backgroundColor)
      mestre.seek(DURADA_TOTAL)
      expect(capa.style.backgroundColor).toBe('')
      expect(cels[cels.length - 1]).toBe('')
    }
  )

  it('el mapa del principi es trenca en les peces de comarca i totes surten de l’escena', () => {
    const { capa, mestre } = munta()
    const peces = () => [...capa.querySelectorAll('path[fill^="#"][stroke-linejoin="round"]')]
    const visibles = () =>
      peces().filter((p) => p.getAttribute('visibility') === 'visible' && p.hasAttribute('opacity'))
    mestre.seek(5.5)
    expect(visibles()).toHaveLength(PECES.length)
    mestre.seek(12)
    expect(visibles()).toHaveLength(0)
    // I en tornar enrere (una altra volta del bucle), tornen a ser al seu lloc.
    mestre.seek(5.5)
    expect(visibles()).toHaveLength(PECES.length)
    expect(visibles().every((p) => !p.getAttribute('transform'))).toBe(true)
  })

  it('en destruir-les no deixen res enrere', () => {
    const { capa, mestre, escenes } = munta()
    mestre.seek(DURADA_TOTAL / 2)
    escenes.destrueix()
    expect(capa.style.backgroundColor).toBe('')
    expect(capa.querySelector('svg')).toBeNull()
    expect(mestre.getChildren(false, false, true)).toHaveLength(0)
  })
})
