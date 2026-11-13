/**
 * Figures humanes de les escenes: un ninot articulat molt senzill (cap, tors,
 * braços de dos trams i cames) que cada escena vesteix i fa moure.
 *
 * Coordenades locals: l'origen és a terra, entre els peus; amunt és y negativa.
 * Tots els angles van en graus des de «penjant cap avall», positius cap a la
 * dreta de la pantalla (90 = horitzontal a la dreta, ±180 = amunt).
 */
import { COS, NIT, TINTA, VERMELL, atribut, cami, cercle, crea, f1, grup, linia } from './nucli'

export interface Posa {
  /** Braç esquerre i dret (des de l'espatlla) i els seus avantbraços (respecte del braç). */
  bracE: number
  avantE: number
  bracD: number
  avantD: number
  camaE: number
  camaD: number
  /** Inclinació de tot el cos al voltant dels peus (positiva: cap a la dreta). */
  inclina: number
  /** Salt: alçada dels peus sobre el terra, en unitats. */
  salt: number
}

export interface OpcionsPersona {
  /** Alçada total, en unitats. Per defecte 34. */
  alt?: number
  /** Color del cos. */
  to?: string
  camisa?: string
  /** Faixa a la cintura (color) — castellers, bastoners, trabucaires… */
  faixa?: string
  roba?: 'pantalons' | 'faldilla' | 'tunica'
  /** Color de la faldilla o la túnica (per defecte, el del cos). */
  toRoba?: string
  cap?: 'res' | 'barretina' | 'corona' | 'banyes' | 'mocador' | 'casc' | 'con'
}

export interface Persona {
  /** Grup arrel: se li dona la posició (transform) des de fora. */
  g: SVGGElement
  /** Cos sencer (dins `g`): s'inclina i salta amb la posa; per penjar-hi complements. */
  cos: SVGGElement
  /** Mans (extrems dels avantbraços): per penjar-hi el que portin. */
  maE: SVGGElement
  maD: SVGGElement
  alt: number
  posa(p: Partial<Posa>): void
}

const REPOS: Posa = {
  bracE: -8,
  avantE: 0,
  bracD: 8,
  avantD: 0,
  camaE: -5,
  camaD: 5,
  inclina: 0,
  salt: 0,
}

/** Crea un ninot dins `pare`, amb els peus a (x, y). */
export function persona(pare: Element, x: number, y: number, o: OpcionsPersona = {}): Persona {
  const alt = o.alt ?? 34
  const to = o.to ?? COS
  const rCap = alt * 0.105
  const yEspatlla = -alt * 0.77
  const yMaluc = -alt * 0.45
  const mEspatlla = alt * 0.1
  const mMaluc = alt * 0.065
  const brac = alt * 0.17
  const cama = -yMaluc
  const gruix = alt * 0.085

  const g = grup(pare, { transform: `translate(${f1(x)} ${f1(y)})` })
  const cos = grup(g)
  const tros = { stroke: to, 'stroke-width': f1(gruix), 'stroke-linecap': 'round' }

  // Cames (darrere de la roba).
  const cames = [-1, 1].map((costat) => {
    const maluc = grup(cos, { transform: `translate(${f1(costat * mMaluc * 0.6)} ${f1(yMaluc)})` })
    const c = grup(maluc)
    linia(c, 0, 0, 0, cama - gruix / 2, { ...tros, 'stroke-width': f1(gruix * 1.15) })
    return c
  })

  // Roba llarga: tapa les cames.
  if (o.roba === 'faldilla' || o.roba === 'tunica') {
    const yBaix = o.roba === 'tunica' ? -1 : -alt * 0.2
    const mBaix = o.roba === 'tunica' ? alt * 0.17 : alt * 0.16
    cami(
      cos,
      `M${f1(-mMaluc - 1)} ${f1(yMaluc - 2)}L${f1(mMaluc + 1)} ${f1(yMaluc - 2)}L${f1(mBaix)} ${f1(yBaix)}L${f1(-mBaix)} ${f1(yBaix)}Z`,
      {
        fill: o.toRoba ?? to,
        stroke: o.toRoba ?? to,
        'stroke-width': 1.2,
        'stroke-linejoin': 'round',
      }
    )
  }

  // Tors.
  cami(
    cos,
    `M${f1(-mEspatlla)} ${f1(yEspatlla)}L${f1(mEspatlla)} ${f1(yEspatlla)}L${f1(mMaluc)} ${f1(yMaluc)}L${f1(-mMaluc)} ${f1(yMaluc)}Z`,
    {
      fill: o.camisa ?? to,
      stroke: o.camisa ?? to,
      'stroke-width': f1(gruix * 0.8),
      'stroke-linejoin': 'round',
    }
  )
  if (o.faixa) {
    linia(cos, -mMaluc - 0.6, yMaluc - gruix * 0.2, mMaluc + 0.6, yMaluc - gruix * 0.2, {
      stroke: o.faixa,
      'stroke-width': f1(gruix * 1.1),
      'stroke-linecap': 'round',
    })
  }

  // Cap i barret.
  const yCap = -alt + rCap
  cercle(cos, 0, f1(yCap), f1(rCap), { fill: to })
  const r = rCap
  switch (o.cap) {
    case 'barretina':
      cami(
        cos,
        `M${f1(-r)} ${f1(yCap - r * 0.2)}Q${f1(-r * 0.6)} ${f1(yCap - r * 1.9)} ${f1(r * 0.9)} ${f1(yCap - r * 1.2)}Q${f1(r * 2.2)} ${f1(yCap - r * 0.6)} ${f1(r * 1.7)} ${f1(yCap + r * 0.7)}Q${f1(r * 1.2)} ${f1(yCap - r * 0.3)} ${f1(r)} ${f1(yCap - r * 0.2)}Z`,
        { fill: VERMELL }
      )
      break
    case 'mocador':
      cami(
        cos,
        `M${f1(-r)} ${f1(yCap - r * 0.1)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(r)} ${f1(yCap - r * 0.1)}Z`,
        {
          fill: VERMELL,
        }
      )
      break
    case 'corona':
      cami(
        cos,
        `M${f1(-r)} ${f1(yCap - r * 0.6)}L${f1(-r * 1.1)} ${f1(yCap - r * 2)}L${f1(-r * 0.45)} ${f1(yCap - r * 1.3)}L0 ${f1(yCap - r * 2.2)}L${f1(r * 0.45)} ${f1(yCap - r * 1.3)}L${f1(r * 1.1)} ${f1(yCap - r * 2)}L${f1(r)} ${f1(yCap - r * 0.6)}Z`,
        { fill: '#ecbd4f' }
      )
      break
    case 'banyes':
      cami(
        cos,
        `M${f1(-r * 0.8)} ${f1(yCap - r * 0.6)}Q${f1(-r * 1.9)} ${f1(yCap - r * 1.4)} ${f1(-r * 1.3)} ${f1(yCap - r * 2.3)}Q${f1(-r * 0.9)} ${f1(yCap - r * 1.4)} ${f1(-r * 0.2)} ${f1(yCap - r)}Z` +
          `M${f1(r * 0.8)} ${f1(yCap - r * 0.6)}Q${f1(r * 1.9)} ${f1(yCap - r * 1.4)} ${f1(r * 1.3)} ${f1(yCap - r * 2.3)}Q${f1(r * 0.9)} ${f1(yCap - r * 1.4)} ${f1(r * 0.2)} ${f1(yCap - r)}Z`,
        { fill: VERMELL }
      )
      break
    case 'casc':
      cami(
        cos,
        `M${f1(-r * 1.08)} ${f1(yCap + r * 0.1)}A${f1(r * 1.08)} ${f1(r * 1.08)} 0 0 1 ${f1(r * 1.08)} ${f1(yCap + r * 0.1)}Z`,
        {
          fill: TINTA,
        }
      )
      break
    case 'con':
      // Barret punxegut de princesa, amb el vel.
      cami(
        cos,
        `M${f1(-r * 0.9)} ${f1(yCap - r * 0.4)}L${f1(r * 0.5)} ${f1(yCap - r * 3.4)}L${f1(r * 0.9)} ${f1(yCap - r * 0.5)}Z`,
        {
          fill: TINTA,
        }
      )
      cami(
        cos,
        `M${f1(r * 0.5)} ${f1(yCap - r * 3.4)}Q${f1(r * 2.6)} ${f1(yCap - r * 2.4)} ${f1(r * 2.2)} ${f1(yCap)}`,
        {
          fill: 'none',
          stroke: TINTA,
          'stroke-width': 0.8,
          'stroke-opacity': 0.8,
        }
      )
      break
  }

  // Braços (davant del tors): espatlla → colze → mà.
  const bracos = [-1, 1].map((costat) => {
    const espatlla = grup(cos, {
      transform: `translate(${f1(costat * mEspatlla)} ${f1(yEspatlla + gruix * 0.3)})`,
    })
    const b = grup(espatlla)
    linia(b, 0, 0, 0, brac, tros)
    const colze = grup(b, { transform: `translate(0 ${f1(brac)})` })
    const a = grup(colze)
    linia(a, 0, 0, 0, brac, tros)
    const ma = grup(a, { transform: `translate(0 ${f1(brac)})` })
    return { b, a, ma }
  })

  const actual: Posa = { ...REPOS }
  const gira = (el: SVGGElement, graus: number) => atribut(el, 'transform', `rotate(${f1(-graus)})`)
  function posa(p: Partial<Posa>) {
    Object.assign(actual, p)
    gira(bracos[0]!.b, actual.bracE)
    gira(bracos[0]!.a, actual.avantE)
    gira(bracos[1]!.b, actual.bracD)
    gira(bracos[1]!.a, actual.avantD)
    gira(cames[0]!, actual.camaE)
    gira(cames[1]!, actual.camaD)
    atribut(cos, 'transform', `translate(0 ${f1(-actual.salt)}) rotate(${f1(actual.inclina)})`)
  }
  posa({})

  return { g, cos, maE: bracos[0]!.ma, maD: bracos[1]!.ma, alt, posa }
}

/** Pas de caminar: cames i braços alterns i un petit vaivé. `fase` en radians. */
export function camina(p: Persona, fase: number, obertura = 22): void {
  const s = Math.sin(fase)
  p.posa({
    camaE: -obertura * s,
    camaD: obertura * s,
    bracE: obertura * 0.8 * s - 6,
    bracD: -obertura * 0.8 * s + 6,
    salt: Math.abs(Math.cos(fase)) * 0.9,
  })
}

/** Nota musical (corxera) centrada a l'origen del grup que retorna. */
export function nota(pare: Element, color = TINTA): SVGGElement {
  const g = grup(pare)
  crea(
    'ellipse',
    { cx: -1.2, cy: 3, rx: 2.1, ry: 1.5, fill: color, transform: 'rotate(-20 -1.2 3)' },
    g
  )
  cami(g, 'M0.7 2.6V-5.2Q3.4 -4.4 4 -1.6', {
    fill: 'none',
    stroke: color,
    'stroke-width': 1.1,
    'stroke-linecap': 'round',
  })
  return g
}

/** Estel de quatre puntes centrat a l'origen del grup que retorna. */
export function estel(pare: Element, r: number, color = TINTA): SVGGElement {
  const g = grup(pare)
  const k = r * 0.22
  cami(g, `M0 ${-r}L${k} ${-k}L${r} 0L${k} ${k}L0 ${r}L${-k} ${k}L${-r} 0L${-k} ${-k}Z`, {
    fill: color,
  })
  return g
}

/** Ull fosc (per a dracs, gegants…). */
export const ull = (pare: Element, x: number, y: number, r = 0.9) =>
  cercle(pare, x, y, r, { fill: NIT })
