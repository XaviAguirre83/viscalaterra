/**
 * Nucli de les escenes il·lustrades de "La terra": utilitats SVG, paleta,
 * atzar determinista i les peces de timeline que comparteixen totes les escenes.
 *
 * Les unitats de l'SVG són píxels reals de la capçalera (110 d'alçada); la x = 0
 * és el centre de la pantalla i creix cap a la dreta.
 */
import gsap from 'gsap'
import type { Dia } from './dia'
import type { Guio } from './guio'

export const NS = 'http://www.w3.org/2000/svg'

/** Alçada de la capçalera, en píxels (= unitats de l'SVG). */
export const ALCADA = 110

/** Línia de terra: tot el que «trepitja» s'hi recolza. */
export const TERRA_Y = 88

// ── Paleta ────────────────────────────────────────────────────────────────
// Tinta crema (la mateixa del text del poema) i quatre accents, versions clares
// dels colors de les províncies perquè aguantin sobre el fons de nit.
export const TINTA = '#f5f1e8'
export const VERMELL = '#e4584b'
export const OR = '#ecbd4f'
export const BLAU = '#74acdf'
export const VERD = '#86c486'
// Tons opacs per a les figures (la tinta crema ja «barrejada» amb el fons de
// nit): sense transparència no es veuen les costures on se solapen les peces
// d'un cos, i les figures de davant tapen les de darrere.
export const COS = '#aeaca3'
export const COS_FOSC = '#7d7f7e'
export const NIT = '#172231'
// Fons de la capçalera: de nit, el seu color de sempre (--nit-900); de dia,
// més clar i menys saturat, però prou fosc perquè el poema (en crema) s'hi llegeixi.
export const FONS_NIT = '#131d29'
export const FONS_DIA = '#313b47'

// ── SVG ───────────────────────────────────────────────────────────────────

export type Atributs = Record<string, string | number | undefined>

/** Crea un element SVG amb els seus atributs i, si es dona, el penja de `pare`. */
export function crea<K extends keyof SVGElementTagNameMap>(
  etiqueta: K,
  atributs: Atributs = {},
  pare?: Element | null
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, etiqueta)
  for (const [nom, valor] of Object.entries(atributs)) {
    if (valor !== undefined) el.setAttribute(nom, String(valor))
  }
  pare?.appendChild(el)
  return el
}

export const grup = (pare?: Element | null, atributs: Atributs = {}) => crea('g', atributs, pare)

export const cami = (pare: Element | null | undefined, d: string, atributs: Atributs = {}) =>
  crea('path', { d, ...atributs }, pare)

export const cercle = (
  pare: Element | null | undefined,
  cx: number,
  cy: number,
  r: number,
  atributs: Atributs = {}
) => crea('circle', { cx, cy, r, ...atributs }, pare)

export const linia = (
  pare: Element | null | undefined,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  atributs: Atributs = {}
) => crea('line', { x1, y1, x2, y2, ...atributs }, pare)

/**
 * Cinta de gruix variable al voltant d'una espina: contorn tancat i suau per a
 * formes orgàniques (cos de drac, cues, flames, embotits…). `gruixos[i]` és
 * l'amplada total a `espina[i]`.
 */
export function cinta(espina: Punt[], gruixos: number[]): string {
  const esquerra: Punt[] = []
  const dreta: Punt[] = []
  espina.forEach(([x, y], i) => {
    const [xa, ya] = espina[Math.max(i - 1, 0)]!
    const [xb, yb] = espina[Math.min(i + 1, espina.length - 1)]!
    const llarg = Math.hypot(xb - xa, yb - ya) || 1
    const mig = (gruixos[Math.min(i, gruixos.length - 1)] ?? 1) / 2
    const nx = (-(yb - ya) / llarg) * mig
    const ny = ((xb - xa) / llarg) * mig
    esquerra.push([x + nx, y + ny])
    dreta.push([x - nx, y - ny])
  })
  return corba([...esquerra, ...dreta.reverse(), esquerra[0]!]) + 'Z'
}

/**
 * Defineix un degradat vertical d'un sol color (de `opDalt` a `opBaix`
 * d'opacitat). Amb `y0`/`y1` va en unitats de l'SVG (útil per a formes que
 * comparteixen un mateix horitzó); sense, s'ajusta a la caixa de cada forma.
 */
export function degradat(
  defs: SVGDefsElement,
  id: string,
  color: string,
  opDalt: number,
  opBaix: number,
  y0?: number,
  y1?: number
): void {
  const g = crea(
    'linearGradient',
    y0 === undefined
      ? { id, x1: 0, y1: 0, x2: 0, y2: 1 }
      : { id, gradientUnits: 'userSpaceOnUse', x1: 0, y1: y0, x2: 0, y2: y1 },
    defs
  )
  crea('stop', { offset: 0, 'stop-color': color, 'stop-opacity': opDalt }, g)
  crea('stop', { offset: 1, 'stop-color': color, 'stop-opacity': opBaix }, g)
}

/**
 * Afegeix un tram de terra ferma entre dues x de món: la línia que es trepitja
 * i, a sota, la franja de sòl (degradat `terra-sol`, definit a index.ts).
 */
export function tramTerra(terra: SVGGElement, x0: number, x1: number): void {
  crea(
    'rect',
    {
      x: x0,
      y: TERRA_Y,
      width: x1 - x0,
      height: ALCADA - TERRA_Y,
      fill: 'url(#terra-sol)',
      stroke: 'none',
    },
    terra
  )
  linia(terra, x0, TERRA_Y, x1, TERRA_Y)
}

/** y (en unitats de l'escena) que es veu arran del sostre de la capçalera amb l'escala donada. */
export const sostre = (escala: number) => ALCADA - ALCADA / escala

/**
 * Alçada d'una cosa del cel: `y` és on es vol veure si l'escena anés a mida
 * real (0 = sostre, TERRA_Y = horitzó). Quan l'escena s'encongeix, el cel
 * s'estira perquè continuï arribant fins al sostre de la capçalera.
 */
export const alCel = (y: number, escala: number) =>
  TERRA_Y - ((TERRA_Y - y) * (TERRA_Y - sostre(escala))) / TERRA_Y

/** Arrodoneix a una desena: prou precisió per a un camí i cadenes `d` curtes. */
export const f1 = (v: number) => Math.round(v * 10) / 10

export type Punt = [x: number, y: number]

/** Camí de segments rectes que passa pels punts donats. */
export function poligonal(punts: Punt[], tancat = false): string {
  return 'M' + punts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L') + (tancat ? 'Z' : '')
}

/**
 * Camí corb i continu que passa per tots els punts (spline de Catmull-Rom
 * convertida a Bézier cúbiques): per a turons, tiges, ratxes de vent…
 */
export function corba(punts: Punt[]): string {
  if (punts.length < 2) return ''
  const p = (i: number) => punts[Math.min(Math.max(i, 0), punts.length - 1)]!
  let d = `M${f1(p(0)[0])} ${f1(p(0)[1])}`
  for (let i = 0; i < punts.length - 1; i++) {
    const [x0, y0] = p(i - 1)
    const [x1, y1] = p(i)
    const [x2, y2] = p(i + 1)
    const [x3, y3] = p(i + 2)
    d +=
      `C${f1(x1 + (x2 - x0) / 6)} ${f1(y1 + (y2 - y0) / 6)} ` +
      `${f1(x2 - (x3 - x1) / 6)} ${f1(y2 - (y3 - y1) / 6)} ${f1(x2)} ${f1(y2)}`
  }
  return d
}

// ── Matemàtiques ──────────────────────────────────────────────────────────

export const limita = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v))

export const barreja = (a: number, b: number, p: number) => a + (b - a) * p

/** Color entre dos colors `#rrggbb` (p = 0: el primer; p = 1: el segon). */
export function barrejaColor(a: string, b: string, p: number): string {
  const canal = (i: number) =>
    Math.round(barreja(parseInt(a.slice(i, i + 2), 16), parseInt(b.slice(i, i + 2), 16), p))
  return `rgb(${canal(1)}, ${canal(3)}, ${canal(5)})`
}

/** Corba en S entre 0 i 1 (derivada nul·la als extrems). */
export const suau = (p: number) => {
  const q = limita(p)
  return q * q * (3 - 2 * q)
}

/** Progrés 0–1 de `t` dins el tram [t0, t1], ja retallat. */
export const tram = (t: number, t0: number, t1: number) => limita((t - t0) / (t1 - t0))

/**
 * Generador pseudoaleatori amb llavor (mulberry32). Les formes procedurals
 * (serralades, espurnes, estels…) surten idèntiques a cada muntatge.
 */
export function atzar(llavor: number): () => number {
  let a = llavor >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Timeline ──────────────────────────────────────────────────────────────

type Objectiu = Element | Element[]

/**
 * Amaga un element (o uns quants) d'entrada, sense passar per GSAP però tal com
 * ho faria ell (`autoAlpha: 0` = opacitat 0 i visibilitat amagada, en línia).
 * Ha de ser així, i no amb un atribut: quan el timeline torna enrere (a cada
 * volta del bucle), GSAP restitueix l'estat que va trobar en començar el tween,
 * i només el reconeix com a «amagat» si l'opacitat en línia és 0.
 */
export function amaga(el: Objectiu): void {
  for (const un of Array.isArray(el) ? el : [el]) {
    const estil = (un as SVGElement).style
    estil.opacity = '0'
    estil.visibility = 'hidden'
  }
}

/**
 * Timeline d'una escena. Es munten centenars de tweens de cop, i per fer-ho de
 * pressa té dues diferències amb un timeline normal de GSAP:
 *
 *  - Els `fromTo` no apliquen l'estat inicial fins que arriba el seu moment
 *    (immediateRender: false). Aplicar-lo en muntar obliga GSAP a llegir els
 *    estils calculats de cada element, i el navegador a recalcular-los cada
 *    vegada: muntar-ho tot costava quatre vegades més.
 *  - A canvi, si l'estat inicial amaga l'element (autoAlpha: 0), queda amagat
 *    d'entrada (vegeu `amaga`).
 *
 * Un `fromTo` que hagi d'ensenyar el seu estat inicial abans d'hora (sense
 * autoAlpha: 0) ho ha de demanar amb `immediateRender: true`.
 */
export function timelineEscena(): gsap.core.Timeline {
  const tl = gsap.timeline({ defaults: { immediateRender: false } })
  type FromTo = (
    objectius: gsap.TweenTarget,
    de: gsap.TweenVars,
    fins: gsap.TweenVars,
    posicio?: gsap.Position
  ) => gsap.core.Timeline
  const fromTo = tl.fromTo.bind(tl) as FromTo
  const mandros: FromTo = (objectius, de, fins, posicio) => {
    if (de.autoAlpha === 0) amaga(objectius as Objectiu)
    return fromTo(objectius, de, fins, posicio)
  }
  tl.fromTo = mandros as typeof tl.fromTo
  return tl
}

/**
 * Fixa el punt (en les unitats del propi element) al voltant del qual GSAP
 * l'escala i el gira, i retorna l'element. Es deixa escrit a l'atribut
 * `data-svg-origin`, que és on GSAP mira l'origen d'un element SVG el primer
 * cop que el transforma (i així no cal cridar-lo en muntar).
 */
export function pivot<T extends Element>(el: T, x: number, y: number): T {
  el.setAttribute('data-svg-origin', `${x} ${y}`)
  return el
}

/** Deixa `el` amagat i el fa aparèixer a l'instant `t` (fundit d'opacitat). */
export function entra(
  tl: gsap.core.Timeline,
  el: Objectiu,
  t: number,
  durada = 0.6,
  opacitat = 1
): void {
  amaga(el)
  tl.fromTo(
    el,
    { autoAlpha: 0 },
    { autoAlpha: opacitat, duration: durada, ease: 'power1.out', immediateRender: false },
    t
  )
}

/** Fon `el` fins a amagar-lo a partir de l'instant `t`. */
export function surt(tl: gsap.core.Timeline, el: Objectiu, t: number, durada = 0.8): void {
  tl.to(el, { autoAlpha: 0, duration: durada, ease: 'power1.in' }, t)
}

/**
 * Efecte d'un sol cop (espurna, anell que s'eixampla, pètal que surt
 * disparat…): `el` és invisible fins a l'instant t, fa el recorregut de `de` a
 * `fins` —que ha d'acabar amb autoAlpha 0— i torna a quedar amagat.
 */
export function esclat(
  tl: gsap.core.Timeline,
  el: Element,
  t: number,
  de: gsap.TweenVars,
  fins: gsap.TweenVars
): void {
  amaga(el)
  tl.fromTo(el, de, { ...fins, immediateRender: false }, t)
}

/**
 * Dibuixa el traç d'un camí de punta a punta (com una ploma). Normalitza la
 * llargada amb `pathLength` per no haver-la de mesurar.
 */
export function traca(
  tl: gsap.core.Timeline,
  camins: SVGPathElement | SVGPathElement[],
  t: number,
  durada: number,
  ease = 'power1.inOut'
): void {
  for (const c of Array.isArray(camins) ? camins : [camins]) {
    c.setAttribute('pathLength', '1')
    c.setAttribute('stroke-dasharray', '1 1')
    c.setAttribute('stroke-dashoffset', '1')
  }
  // Amagat fins que comença: un traç a zero amb puntes rodones deixaria un punt.
  entra(tl, camins, t, 0.05)
  tl.fromTo(
    camins,
    { attr: { 'stroke-dashoffset': 1 } },
    { attr: { 'stroke-dashoffset': 0 }, duration: durada, ease, immediateRender: false },
    t
  )
}

/** Fotogrames per segon dels moviments procedurals mentre el poema corre. */
let fpsPilots = 30

/**
 * Canvia el ritme dels moviments procedurals que es muntin a partir d'ara (els
 * dispositius petits van més justos: s'hi munta amb menys fotogrames).
 */
export function ritmePilots(fps: number): void {
  fpsPilots = fps
}

/**
 * Moviment procedural: crida `fn(p, s)` mentre el cap de lectura és dins
 * [t0, t0 + durada], amb el progrés p (0–1) i els segons s transcorreguts. Va
 * amb un setter en lloc d'onUpdate perquè també es redibuixi en saltar pel
 * timeline (seek), que no dispara callbacks.
 *
 * Amb el poema en marxa es limita a `fps` fotogrames per segon (n'hi ha prou
 * per a figures i partícules, i estalvia la meitat de la feina); `fps` = 0 el
 * deixa córrer a cada fotograma, com cal per a la càmera.
 */
export function pilot(
  tl: gsap.core.Timeline,
  t0: number,
  durada: number,
  fn: (p: number, s: number) => void,
  fps = fpsPilots
): void {
  let actual = 0
  let darrer = -Infinity
  const estat = {
    get p() {
      return actual
    },
    set p(v: number) {
      actual = v
      // Els extrems (0 i 1) i els salts amb el timeline aturat es pinten sempre.
      if (fps > 0 && v > 0 && v < 1 && tl.parent?.paused() === false) {
        const ara = performance.now()
        if (ara - darrer < 1000 / fps - 4) return
        darrer = ara
      }
      fn(v, v * durada)
    },
  }
  tl.fromTo(estat, { p: 0 }, { p: 1, duration: durada, ease: 'none', immediateRender: false }, t0)
}

/**
 * Escriu un atribut només si ha canviat. Als bucles de partícules, la majoria
 * d'escriptures (visibilitat, color…) repeteixen el valor del fotograma
 * anterior, i cada escriptura obliga el navegador a recalcular estils.
 */
const escrits = new WeakMap<Element, Record<string, string>>()
export function atribut(el: Element, nom: string, valor: string): void {
  let memoria = escrits.get(el)
  if (!memoria) {
    memoria = {}
    escrits.set(el, memoria)
  }
  if (memoria[nom] === valor) return
  memoria[nom] = valor
  el.setAttribute(nom, valor)
}

// ── Escenari ──────────────────────────────────────────────────────────────

/** Tot el que una escena necessita per muntar-se. */
export interface Escenari {
  /** Timeline de les escenes (fill del timeline mestre del poema). */
  tl: gsap.core.Timeline
  /** Temps del poema: quan entra cada paraula. */
  guio: Guio
  /** El dia: on són el sol i la lluna i quanta claror hi ha a cada instant. */
  dia: Dia
  /** Pinta el fons de tota la capçalera; amb '' torna a ser el de sempre. */
  pintaCel: (color: string) => void
  /** Capes, del fons cap endavant. `cel` i `davant` són fixes a la pantalla;
   *  `mon` es desplaça amb la càmera. */
  cel: SVGGElement
  mon: SVGGElement
  davant: SVGGElement
  /** Grup (dins `mon`) de la línia de terra: cada escena hi afegeix els seus trams. */
  terra: SVGGElement
  /** <defs> de l'SVG, per a degradats i màscares (ids amb prefix `terra-`). */
  defs: SVGDefsElement
  /**
   * Compressió horitzontal de la composició (1 en pantalles amples; menys en
   * estretes, perquè tot s'acosti al centre). `on` ja l'aplica; les posicions
   * de pantalla escrites a mà s'han de multiplicar per k.
   */
  k: number
  /** Posició x de la càmera (en unitats de món) a l'instant t. */
  cam: (t: number) => number
  /** x de món que, a l'instant t, cau a `sx` píxels del centre de la pantalla. */
  on: (t: number, sx: number) => number
  /** Meitat de l'amplada visible ara mateix, en unitats (canvia amb la finestra). */
  mig: () => number
  /**
   * Escala de l'escena ara mateix: 1 en pantalles amples; menys en estretes, on
   * tot s'encongeix ancorat a baix (i per dalt es veu més amunt de y = 0).
   */
  escala: () => number
  /** Programa una estrebada de la càmera a l'instant t (trets, trons…). */
  sacseja: (t: number, forca: number) => void
}
