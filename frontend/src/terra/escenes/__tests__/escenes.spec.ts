import gsap from 'gsap'
import { afterEach, describe, expect, it } from 'vitest'
import { DURADA_TOTAL } from '../../terra-timeline'
import { muntaEscenes } from '../index'

// Prova de fum: munta totes les escenes de debò (en jsdom) i passeja el cap de
// lectura per tot el poema. No mira com queden —per a això cal un navegador—,
// però enxampa el que més fàcilment es trenca en retocar el guió: una escena
// ancorada a una paraula que ja no hi és, o un tween que allarga el bucle.
describe('escenes de "La terra"', () => {
  let neteja: (() => void) | null = null
  afterEach(() => {
    neteja?.()
    neteja = null
  })

  function munta() {
    const capa = document.createElement('div')
    document.body.appendChild(capa)
    const mestre = gsap.timeline({ paused: true })
    // El mestre real fa DURADA_TOTAL exactes; aquí n'hi ha prou amb el mateix topall.
    mestre.call(() => {}, undefined, DURADA_TOTAL)
    const escenes = muntaEscenes(capa, mestre, { deCop: true })
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

  it('en destruir-les no deixen res enrere', () => {
    const { capa, mestre, escenes } = munta()
    escenes.destrueix()
    expect(capa.querySelector('svg')).toBeNull()
    expect(mestre.getChildren(false, false, true)).toHaveLength(0)
  })
})
