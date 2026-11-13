/**
 * El trencadís: el mapa del principi s'esquerda per les fronteres de les
 * comarques, cada peça pren el seu color (els del mapa de comarques de la marca,
 * docs/marca/comarques.svg) i, al final, tot esclata: les peces surten
 * disparades del centre cap a fora de la capçalera.
 *
 * Ho mou tot un sol `pilot`, en lloc d'uns quants tweens per peça: muntar-ho no
 * costa res (és a la primera escena, que es munta d'entrada) i es pot saltar a
 * qualsevol instant.
 */
import { ESQUERDES, PECES } from './mapa-dades'
import {
  ALCADA,
  TINTA,
  atribut,
  atzar,
  cami,
  f1,
  limita,
  pilot,
  poligonal,
  sostre,
  type Escenari,
  type Punt,
} from './nucli'

/** On cau el cop que esquerda el mapa (coordenades del mapa): al bell mig del país. */
const COP: Punt = [0, 0]
/** Velocitat a què s'escampen les esquerdes, en unitats de mapa per segon. */
const VELOCITAT_ESQUERDA = 75
/** Una peça pren color una mica després que l'esquerda hi arribi. */
const RETARD_COLOR = 0.3
const DURADA_COLOR = 0.5
const OPACITAT_PECA = 0.95
/** Just abans d'esclatar, les peces s'encongeixen un instant: les juntes s'obren. */
export const PREPARACIO_ESCLAT = 0.35
/** Temps que tenen les peces per sortir de la capçalera. */
const DURADA_ESCLAT = 3
/** Velocitat de sortida de les peces (px/s): la capçalera és molt més ampla que alta. */
const VELOCITAT_X: [min: number, max: number] = [620, 920]
const VELOCITAT_Y: [min: number, max: number] = [110, 190]
/** Fregament de l'aire: les peces surten de pressa i van perdent empenta. */
const FREGAMENT = 0.6

export interface OpcionsTrencadis {
  /** Instant en què el mapa es comença a esquerdar. */
  tQuebra: number
  /** Instant en què esclata. */
  tEsclat: number
  /** Píxels per unitat de mapa, i y de pantalla del centre del mapa. */
  escala: number
  yCentre: number
}

const puntsDe = (d: string): Punt[] =>
  d
    .slice(1)
    .split('L')
    .map((p) => p.split(' ').map(Number) as Punt)

const clauDe = ([x, y]: Punt) => `${x} ${y}`

/**
 * Per on i quan passa cada esquerda: la xarxa de fronteres es recorre des del
 * nus més proper al cop (camí més curt per la xarxa), i cada frontera es dibuixa
 * des de l'extrem per on li arriba l'esquerda. Així cap tros apareix deslligat.
 */
function recorregutEsquerdes(): { punts: Punt[]; t0: number; durada: number }[] {
  const lluny = ([x, y]: Punt) => Math.hypot(x - COP[0], y - COP[1])
  const arcs = ESQUERDES.map((d) => {
    const punts = puntsDe(d)
    let llarg = 0
    for (let i = 1; i < punts.length; i++) {
      llarg += Math.hypot(punts[i]![0] - punts[i - 1]![0], punts[i]![1] - punts[i - 1]![1])
    }
    return { punts, llarg, a: punts[0]!, b: punts[punts.length - 1]! }
  })

  // Distància per la xarxa des de l'origen fins a cada nus (Dijkstra; n'hi ha pocs).
  const distancia = new Map<string, number>()
  const origen = arcs.flatMap((arc) => [arc.a, arc.b]).sort((p, r) => lluny(p) - lluny(r))[0]
  if (origen) distancia.set(clauDe(origen), lluny(origen))
  const fets = new Set<string>()
  for (;;) {
    let actual: string | undefined
    for (const [nus, d] of distancia) {
      if (!fets.has(nus) && (actual === undefined || d < distancia.get(actual)!)) actual = nus
    }
    if (actual === undefined) break
    fets.add(actual)
    for (const arc of arcs) {
      const [ka, kb] = [clauDe(arc.a), clauDe(arc.b)]
      const altre = ka === actual ? kb : kb === actual ? ka : undefined
      if (altre === undefined) continue
      const d = distancia.get(actual)! + arc.llarg
      if (d < (distancia.get(altre) ?? Infinity)) distancia.set(altre, d)
    }
  }

  return arcs.map((arc) => {
    // Les fronteres que no toquen la xarxa (van de costa a costa) surten per proximitat.
    const da = distancia.get(clauDe(arc.a)) ?? lluny(arc.a) * 1.3
    const db = distancia.get(clauDe(arc.b)) ?? lluny(arc.b) * 1.3
    return {
      punts: da <= db ? arc.punts : [...arc.punts].reverse(),
      t0: Math.min(da, db) / VELOCITAT_ESQUERDA,
      durada: Math.max(0.08, arc.llarg / VELOCITAT_ESQUERDA),
    }
  })
}

/**
 * Munta el trencadís: les esquerdes a `capaEsquerdes` i les peces a `capaPeces`
 * (totes dues en coordenades del mapa).
 */
export function muntaTrencadis(
  e: Escenari,
  capaPeces: SVGGElement,
  capaEsquerdes: SVGGElement,
  { tQuebra, tEsclat, escala, yCentre }: OpcionsTrencadis
): void {
  const rnd = atzar(1852)
  const entre = ([min, max]: [number, number]) => min + rnd() * (max - min)

  const esquerdes = recorregutEsquerdes().map((esquerda) => ({
    ...esquerda,
    el: cami(capaEsquerdes, poligonal(esquerda.punts), {
      fill: 'none',
      stroke: TINTA,
      'stroke-opacity': 0.9,
      'stroke-width': f1(0.9 / escala),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      pathLength: 1,
      'stroke-dasharray': '1 1',
      visibility: 'hidden',
    }),
  }))

  const peces = PECES.map((peca) => {
    const [cx, cy] = peca.centre
    const lluny = Math.hypot(cx - COP[0], cy - COP[1])
    // Cada peça surt en la direcció que la separa del centre (les del mig, a l'atzar).
    const angle =
      (lluny < 5 ? rnd() * Math.PI * 2 : Math.atan2(cy - COP[1], cx - COP[0])) + (rnd() - 0.5) * 0.5
    return {
      el: cami(capaPeces, peca.d, {
        fill: peca.color,
        stroke: TINTA,
        'stroke-width': f1(0.8 / escala),
        'stroke-linejoin': 'round',
        visibility: 'hidden',
      }),
      cx,
      cy,
      tColor: lluny / VELOCITAT_ESQUERDA + RETARD_COLOR,
      // Velocitats en unitats de mapa per segon.
      vx: (Math.cos(angle) * entre(VELOCITAT_X)) / escala,
      vy: (Math.sin(angle) * entre(VELOCITAT_Y)) / escala,
      gir: (rnd() < 0.5 ? -1 : 1) * (140 + rnd() * 260),
      creix: 0.15 + rnd() * 0.5,
    }
  })

  pilot(
    e.tl,
    tQuebra,
    tEsclat + DURADA_ESCLAT - tQuebra,
    (p, s) => {
      const viu = p > 0 && p < 1
      /** Segons des de l'esclat (negatiu: encara no). */
      const se = s - (tEsclat - tQuebra)

      for (const esquerda of esquerdes) {
        const u = viu && se < 0 ? limita((s - esquerda.t0) / esquerda.durada) : 0
        atribut(esquerda.el, 'visibility', u > 0 ? 'visible' : 'hidden')
        if (u > 0) atribut(esquerda.el, 'stroke-dashoffset', (1 - u * (2 - u)).toFixed(3))
      }

      const obre = limita((se + PREPARACIO_ESCLAT) / PREPARACIO_ESCLAT)
      const vol = Math.max(0, se)
      const recorregut = (1 - Math.exp(-FREGAMENT * vol)) / FREGAMENT
      const mig = e.mig()
      const dalt = sostre(e.escala())
      for (const peca of peces) {
        const color = limita((s - peca.tColor) / DURADA_COLOR)
        const x = peca.cx + peca.vx * recorregut
        const y = peca.cy + peca.vy * recorregut
        const [sx, sy] = [x * escala, yCentre + y * escala]
        const visible =
          viu && color > 0 && Math.abs(sx) < mig + 40 && sy > dalt - 30 && sy < ALCADA + 30
        atribut(peca.el, 'visibility', visible ? 'visible' : 'hidden')
        if (!visible) continue
        atribut(peca.el, 'opacity', (OPACITAT_PECA * color).toFixed(2))
        const mida = 1 - 0.07 * obre * obre + peca.creix * limita(vol * 1.5)
        atribut(
          peca.el,
          'transform',
          obre <= 0
            ? ''
            : `translate(${f1(x)} ${f1(y)}) rotate(${f1(peca.gir * recorregut)}) ` +
                `scale(${mida.toFixed(3)}) translate(${-peca.cx} ${-peca.cy})`
        )
      }
    },
    0
  )
}
