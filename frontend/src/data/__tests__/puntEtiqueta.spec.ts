import { describe, it, expect } from 'vitest'
import {
  areaAnell,
  centroide,
  distanciaVora,
  puntEtiqueta,
  puntEtiquetaPeces,
  type Poligon,
} from '../puntEtiqueta'

const quadrat = (x: number, y: number, costat: number): Poligon => [
  [
    [x, y],
    [x + costat, y],
    [x + costat, y + costat],
    [x, y + costat],
    [x, y],
  ],
]

describe('puntEtiqueta', () => {
  it('en un quadrat, el punt és al centre', () => {
    const [x, y] = puntEtiqueta(quadrat(0, 0, 100))
    expect(x).toBeCloseTo(50, 0)
    expect(y).toBeCloseTo(50, 0)
  })

  it('en una U, cau dins el traç i no al buit del mig (on cau el centroide)', () => {
    // U de 300×300 amb el forat obert per dalt entre x=100 i x=200.
    const u: Poligon = [
      [
        [0, 0],
        [300, 0],
        [300, 300],
        [200, 300],
        [200, 100],
        [100, 100],
        [100, 300],
        [0, 300],
        [0, 0],
      ],
    ]
    const [x, y] = puntEtiqueta(u)
    expect(distanciaVora(x, y, u)).toBeGreaterThan(0)
    // El centroide d'aquesta U (150, ~117) és a la vora del buit: el punt
    // triat s'allunya de les vores més que no pas el centroide.
    expect(distanciaVora(x, y, u)).toBeGreaterThan(distanciaVora(150, 117, u) + 20)
  })

  it('evita els forats', () => {
    // Quadrat de 300 amb un forat de 100 al mig: el centre és al forat.
    const anella: Poligon = [quadrat(0, 0, 300)[0]!, quadrat(100, 100, 100)[0]!]
    const [x, y] = puntEtiqueta(anella)
    expect(distanciaVora(x, y, anella)).toBeGreaterThan(0)
    expect(x > 100 && x < 200 && y > 100 && y < 200).toBe(false)
  })

  it('en una franja allargada, queda al mig (a l’eix i a mig llarg)', () => {
    const [x, y] = puntEtiqueta(quadratLlarg())
    expect(y).toBeCloseTo(10, 0)
    expect(x).toBeGreaterThan(450)
    expect(x).toBeLessThan(550)
  })

  it('en una franja que s’eixampla, no se’n va a l’extrem ample (el cas del Maresme)', () => {
    // Trapezi de 1000 de llarg: 20 d'ample a l'esquerra, 40 a la dreta. El
    // pol d'inaccessibilitat sol cauria a tocar de la punta dreta (x ≈ 980);
    // el centroide és a x ≈ 556.
    const franja: Poligon = [
      [
        [0, -10],
        [1000, -20],
        [1000, 20],
        [0, 10],
      ],
    ]
    const [x, y] = puntEtiqueta(franja)
    expect(x).toBeGreaterThan(450)
    expect(x).toBeLessThan(650)
    expect(y).toBeCloseTo(0, 0)
  })

  it('una punta prima no estira el nom fora del cos del territori', () => {
    // Quadrat de 200 amb una cua llarga i prima cap a la dreta: el centroide
    // s'hi desplaça, però el nom es queda al quadrat, ben lluny de les vores.
    const ambCua: Poligon = [
      [
        [0, 0],
        [200, 0],
        [200, 95],
        [900, 95],
        [900, 105],
        [200, 105],
        [200, 200],
        [0, 200],
      ],
    ]
    const [x, y] = puntEtiqueta(ambCua)
    expect(x).toBeLessThan(200)
    expect(distanciaVora(x, y, ambCua)).toBeGreaterThan(60)
  })

  it('un polígon degenerat no peta', () => {
    const linia: Poligon = [
      [
        [0, 0],
        [10, 0],
        [0, 0],
      ],
    ]
    expect(puntEtiqueta(linia)).toEqual([5, 0])
    expect(puntEtiqueta([[]])).toEqual([0, 0])
  })
})

describe('puntEtiquetaPeces', () => {
  it('tria la peça més gran (p. ex. no un enclavament ni una illa)', () => {
    const illa = quadrat(1000, 1000, 10)
    const gran = quadrat(0, 0, 200)
    const { punt, area } = puntEtiquetaPeces([illa, gran])
    expect(punt[0]).toBeCloseTo(100, 0)
    expect(punt[1]).toBeCloseTo(100, 0)
    expect(area).toBe(40000)
  })

  it('sense peces retorna un punt neutre', () => {
    expect(puntEtiquetaPeces([])).toEqual({ punt: [0, 0], area: 0 })
  })
})

describe('areaAnell i distanciaVora', () => {
  it('àrea sense signe, en qualsevol sentit de gir', () => {
    const anell = quadrat(0, 0, 10)[0]!
    expect(areaAnell(anell)).toBe(100)
    expect(areaAnell([...anell].reverse())).toBe(100)
  })

  it('centroide: el centre de masses de l’anell', () => {
    expect(centroide(quadrat(0, 0, 10)[0]!)).toEqual([5, 5])
  })

  it('distància positiva a dins i negativa a fora', () => {
    const q = quadrat(0, 0, 10)
    expect(distanciaVora(5, 5, q)).toBeCloseTo(5)
    expect(distanciaVora(15, 5, q)).toBeCloseTo(-5)
  })
})

function quadratLlarg(): Poligon {
  return [
    [
      [0, 0],
      [1000, 0],
      [1000, 20],
      [0, 20],
      [0, 0],
    ],
  ]
}
