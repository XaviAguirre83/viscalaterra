/**
 * Escena 7 · La taula («Visc a la terra que ens asseu a taula… un porró que ronda»).
 *
 * Una taula llarga, parada al carrer sota un fil de bombetes. La gent s'hi
 * asseu i la càmera la recorre de cap a cap: els calçots (i les mans brutes),
 * la botifarra amb mongetes, el fuet, el pa amb tomàquet, l'allioli… i el
 * porró, que va passant de mà en mà.
 */
import {
  COS,
  COS_FOSC,
  OR,
  TERRA_Y,
  TINTA,
  VERD,
  VERMELL,
  atribut,
  atzar,
  barreja,
  cami,
  cercle,
  cinta,
  corba,
  crea,
  entra,
  f1,
  grup,
  limita,
  linia,
  pilot,
  pivot,
  suau,
  surt,
  tram,
  type Escenari,
  type Punt,
} from './nucli'

/** Alçada del tauler respecte del terra. */
const TAULA = 19
const FUSTA = '#8a6a4f'
const CAMISES = ['#dedbd1', '#6d9fcf', '#c4574b', '#86a886', '#c9a857', '#b9b6ac']
const PELLS = [COS, '#c7c4ba', COS_FOSC]

interface Comensal {
  g: SVGGElement
  cap: SVGGElement
  camisa: string
}

/** Comensal assegut darrere la taula: se'n veu el bust. Origen al tauler. */
function comensal(pare: Element, x: number, i: number): Comensal {
  const g = grup(pare, { transform: `translate(${f1(x)} 0)` })
  const camisa = CAMISES[i % CAMISES.length]!
  cami(g, 'M-8 0.5Q-8.6 -9 -3 -10.6L3 -10.6Q8.6 -9 8 0.5Z', { fill: camisa })
  const cap = grup(g)
  cercle(cap, 0, -15.4, 4, { fill: PELLS[i % PELLS.length]! })
  // Barretina, monyo o res, perquè no siguin tots iguals.
  if (i % 4 === 0)
    cami(cap, 'M-4 -15.8Q-3 -22 3.4 -19.6Q8.4 -17.6 6.8 -12.6Q4.8 -16.6 4 -15.8Z', {
      fill: VERMELL,
    })
  else if (i % 4 === 2)
    cami(
      cap,
      'M-4.2 -15Q-5 -20.6 0 -20.4Q5 -20.6 4.2 -15Q2.6 -18 0 -17.8Q-2.6 -18 -4.2 -15ZM3 -20.6A2.3 2.3 0 1 1 3.1 -20.5Z',
      { fill: '#5b4636' }
    )
  return { g, cap, camisa }
}

export function escenaTaula(e: Escenari): void {
  const { tl, guio } = e
  const q = guio.quan
  const rnd = atzar(604)

  const tEntra = guio.frase('taula').entra
  const tAsseu = q('asseu')
  const tCalcots = q('calçots')
  const tMans = q('mans')
  const tBotifarra = q('botifarra')
  const tFuet = q('fuet')
  const tPa = q('pa')
  const tTomaquet = q('tomàquet')
  const tAllioli = q('allioli')
  const tPorro = q('porró')
  const tRonda = q('ronda')
  const tFi = guio.frase('mar', 1).entra

  // ── On és cada cosa (x de món): el que es canta cau a prop del centre ───
  const xCalcots = e.on(tCalcots, -95)
  const xBotifarra = e.on(tBotifarra, -92)
  const xFuet = e.on(tFuet, 62)
  const xPa = e.on(tPa + 0.2, 80)
  const xAllioli = e.on(tAllioli, 74)
  const xPorro = e.on(tPorro, 92)
  const xT0 = e.on(tCalcots, -330)
  const xT1 = xPorro + 150
  const yT = TERRA_Y - TAULA

  const escena = grup(e.mon)
  tl.fromTo(escena, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, tEntra - 0.3)

  // ── Fil de bombetes sobre la taula ──────────────────────────────────────
  const bombetes = grup(escena)
  const llums: SVGCircleElement[] = []
  for (let x = xT0 + 40; x < xT1; x += 150) {
    const fil: Punt[] = []
    for (let i = 0; i <= 10; i++) {
      const u = i / 10
      fil.push([x + 150 * u, 5 + 10 * 4 * u * (1 - u)])
    }
    cami(bombetes, corba(fil), {
      fill: 'none',
      stroke: TINTA,
      'stroke-opacity': 0.3,
      'stroke-width': 0.7,
    })
    for (let i = 1; i < 10; i += 2)
      llums.push(cercle(bombetes, f1(fil[i]![0]), f1(fil[i]![1] + 2), 1.7, { fill: OR }))
  }
  // S'encenen d'una en una i després fan pampallugues (a poc a poc: n'hi ha
  // prou amb pocs fotogrames per segon).
  const bombetesEnceses = llums.map((el) => ({
    el,
    retard: rnd() * 1.2,
    ritme: 2 + rnd() * 3,
    fase: rnd() * 6.28,
  }))
  for (const { el } of bombetesEnceses) el.setAttribute('fill-opacity', '0')
  const tLlums = tEntra + 0.5
  pilot(
    tl,
    tLlums,
    tFi + 0.8 - tLlums,
    (_p, s) => {
      for (const b of bombetesEnceses) {
        const encesa = limita((s - b.retard) / 0.2)
        atribut(
          b.el,
          'fill-opacity',
          (encesa * (0.7 + 0.2 * Math.sin(s * b.ritme + b.fase))).toFixed(1)
        )
      }
    },
    10
  )

  // ── Comensals (darrere la taula) ────────────────────────────────────────
  const gent = grup(escena, { transform: `translate(0 ${yT})` })
  const xerraires: { g: SVGGElement; x: number; amplitud: number; ritme: number; fase: number }[] =
    []
  /** Llocs amb paper propi: no hi va un comensal qualsevol. */
  const reservats = [xCalcots, xPorro, xPorro + 46, xPorro + 92]
  let i = 0
  for (let x = xT0 + 30; x < xT1 - 20; x += 42 + rnd() * 10) {
    i++
    if (reservats.some((r) => Math.abs(r - x) < 30)) continue
    const c = comensal(gent, x, i)
    const seient = pivot(grup(gent), x, 0)
    seient.appendChild(c.g)
    // «que ens asseu a taula»: s'asseuen l'un rere l'altre, d'esquerra a dreta.
    const t = tAsseu - 0.5 + ((x - xT0) / 700) * 1.4
    tl.fromTo(
      seient,
      { y: -7, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.5, ease: 'bounce.out' },
      Math.max(tEntra, t)
    )
    xerraires.push({
      g: c.g,
      x,
      amplitud: (i % 2 ? 1 : -1) * (3 + rnd() * 3),
      ritme: 2.2 + rnd() * 2,
      fase: rnd() * 6.28,
    })
  }
  // Xerren: es giren ara cap a un veí, ara cap a l'altre.
  const tXerren = tAsseu + 0.9
  pilot(tl, tXerren, tFi + 0.7 - tXerren, (_p, s) => {
    const calma = suau(tram(s, 0, 1.2))
    for (const c of xerraires) {
      atribut(
        c.g,
        'transform',
        `translate(${f1(c.x)} 0) rotate(${f1(calma * c.amplitud * Math.sin(s * c.ritme + c.fase))})`
      )
    }
  })

  // ── La taula: tauler, estovalles de quadres i cavallets ─────────────────
  const vichy = crea(
    'pattern',
    { id: 'terra-vichy', width: 8, height: 8, patternUnits: 'userSpaceOnUse' },
    e.defs
  )
  crea('rect', { width: 8, height: 8, fill: '#77777a' }, vichy)
  crea('rect', { width: 4, height: 4, fill: '#a9524b' }, vichy)
  crea('rect', { x: 4, y: 4, width: 4, height: 4, fill: '#a9524b' }, vichy)
  const taula = grup(escena)
  for (let x = xT0 + 30; x < xT1; x += 96) {
    cami(taula, `M${f1(x - 5)} ${TERRA_Y}L${f1(x)} ${yT + 8}L${f1(x + 5)} ${TERRA_Y}`, {
      fill: 'none',
      stroke: FUSTA,
      'stroke-width': 1.6,
    })
  }
  const estovalles = pivot(grup(taula), xT0, yT)
  // Vora de les estovalles en puntes, com un serrell.
  let vora = `M${f1(xT0)} ${yT}H${f1(xT1)}V${yT + 8}`
  for (let x = xT1; x > xT0; x -= 8) vora += `L${f1(x - 4)} ${yT + 11}L${f1(x - 8)} ${yT + 8}`
  cami(estovalles, `${vora}Z`, { fill: 'url(#terra-vichy)' })
  linia(estovalles, xT0, yT, xT1, yT, {
    stroke: TINTA,
    'stroke-opacity': 0.75,
    'stroke-width': 1.1,
  })
  tl.fromTo(taula, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, tEntra + 0.1)

  // Parament: un plat i un got davant de cada lloc sense plat estrella.
  const plats = grup(escena, { transform: `translate(0 ${yT})` })
  const estrelles = [xCalcots, xBotifarra, xFuet, xPa, xAllioli]
  for (let x = xT0 + 52; x < xT1 - 20; x += 46) {
    if (estrelles.some((r) => Math.abs(r - x) < 34)) continue
    crea(
      'ellipse',
      { cx: f1(x), cy: -1.2, rx: 6, ry: 1.5, fill: TINTA, 'fill-opacity': 0.85 },
      plats
    )
    cami(plats, `M${f1(x + 9)} -0.6V-5.2H${f1(x + 12)}V-0.6Z`, {
      fill: TINTA,
      'fill-opacity': 0.4,
      stroke: TINTA,
      'stroke-opacity': 0.6,
      'stroke-width': 0.5,
    })
  }
  entra(tl, plats, tAsseu - 0.2, 0.8)

  /** Fa aparèixer un plat a taula amb un saltiró, quan sona el seu nom. */
  const serveix = (x: number, t: number): SVGGElement => {
    const lloc = grup(escena, { transform: `translate(${f1(x)} ${yT})` })
    const plat = pivot(grup(lloc), 0, 0)
    tl.fromTo(
      plat,
      { scale: 0.2, y: -9, autoAlpha: 0 },
      { scale: 1, y: 0, autoAlpha: 1, duration: 0.45, ease: 'back.out(2.2)' },
      t - 0.2
    )
    return plat
  }

  // ── Calçots: la teula a taula i algú que se'n menja un com mana la tradició ─
  const teula = serveix(xCalcots + 22, tCalcots)
  cami(teula, 'M-15 -1Q0 -6.5 15 -1L14 1Q0 -3.6 -14 1Z', { fill: '#b5654a' })
  for (let k = 0; k < 6; k++) {
    const x0 = -11 + k * 3.6
    linia(teula, x0, -3.4, x0 + 9, -8.6 - (k % 2), {
      stroke: '#ebe6d2',
      'stroke-width': 1.5,
      'stroke-linecap': 'round',
    })
    linia(teula, x0 + 9, -8.6 - (k % 2), x0 + 12.6, -10.8 - (k % 2), {
      stroke: VERD,
      'stroke-width': 1.3,
      'stroke-linecap': 'round',
    })
    linia(teula, x0 - 1.2, -2.8, x0 + 1, -4, {
      stroke: '#2e2823',
      'stroke-width': 1.7,
      'stroke-linecap': 'round',
    })
  }
  // Cassoleta de romesco.
  const romesco = serveix(xCalcots - 21, tCalcots + 0.15)
  cami(romesco, 'M-5.4 -4.2H5.4L4 0H-4Z', { fill: '#a8674f' })
  crea('ellipse', { cx: 0, cy: -4.2, rx: 5.4, ry: 1.4, fill: '#d9703a' }, romesco)

  // El calçotaire: cap enrere, braç enlaire i el calçot baixant cap a la boca.
  const calcotaire = comensal(gent, xCalcots, 4)
  calcotaire.g.insertBefore(cami(null, 'M-4.6 0.5V-7.6H4.6V0.5Z', { fill: TINTA }), calcotaire.cap) // pitet
  const brac = cami(calcotaire.g, '', {
    fill: 'none',
    stroke: calcotaire.camisa,
    'stroke-width': 2.8,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  })
  const calcot = grup(calcotaire.g)
  const tall = linia(calcot, 0, 0, 0, 0, {
    stroke: '#ebe6d2',
    'stroke-width': 1.6,
    'stroke-linecap': 'round',
  })
  const fulles = linia(calcot, 0, 0, 0, 0, {
    stroke: VERD,
    'stroke-width': 1.3,
    'stroke-linecap': 'round',
  })
  const ma = cercle(calcotaire.g, 0, 0, 1.9, { fill: COS })
  const maBruta = cercle(calcotaire.g, 0, 0, 1.9, { fill: '#2e2823' })
  cercle(calcotaire.g, -8.6, -1.6, 1.9, { fill: COS })
  const altraBruta = cercle(calcotaire.g, -8.6, -1.6, 1.9, { fill: '#2e2823' })
  tl.fromTo(calcotaire.g, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, tAsseu + 0.2)
  // «i mans brutes»: se li ennegreixen de la cendra.
  tl.fromTo([maBruta, altraBruta], { autoAlpha: 0 }, { autoAlpha: 0.9, duration: 0.5 }, tMans - 0.1)
  pilot(tl, tAsseu, tFi - tAsseu, (_p, s) => {
    const t = tAsseu + s
    // Alça el calçot (amb «calçots») i el va fent baixar a mossegades.
    const alca = suau(tram(t, tCalcots - 0.5, tCalcots))
    const mossega = alca * (0.5 + 0.5 * Math.sin((t - tCalcots) * 4.2))
    const xMa = barreja(8.6, 5.2, alca)
    const yMa = barreja(-1.6, -27 + 3.4 * mossega, alca)
    brac.setAttribute(
      'd',
      `M6.4 -8.6L${f1(barreja(9.5, 9.8, alca))} ${f1(barreja(-4, -17, alca))}L${f1(xMa)} ${f1(yMa)}`
    )
    for (const m of [ma, maBruta]) {
      m.setAttribute('cx', f1(xMa).toString())
      m.setAttribute('cy', f1(yMa).toString())
    }
    calcotaire.cap.setAttribute('transform', `rotate(${f1(24 * alca)} 0 -11)`)
    // El calçot penja de la mà: les fulles a dalt, el blanc cap a la boca.
    const llarg = 9.5 * alca * (1 - 0.35 * tram(t, tCalcots + 0.6, tFi))
    tall.setAttribute('x1', f1(xMa - 0.6).toString())
    tall.setAttribute('y1', f1(yMa + 1).toString())
    tall.setAttribute('x2', f1(xMa - 2.2).toString())
    tall.setAttribute('y2', f1(yMa + 1 + llarg).toString())
    fulles.setAttribute('x1', f1(xMa - 0.4).toString())
    fulles.setAttribute('y1', f1(yMa + 0.6).toString())
    fulles.setAttribute('x2', f1(xMa + 1.2).toString())
    fulles.setAttribute('y2', f1(yMa - 3.4 * alca).toString())
    atribut(calcot, 'visibility', alca > 0.05 ? 'visible' : 'hidden')
  })

  // ── Botifarra amb mongetes ──────────────────────────────────────────────
  const botifarra = serveix(xBotifarra, tBotifarra)
  crea(
    'ellipse',
    { cx: 0, cy: -1.4, rx: 15, ry: 2.5, fill: TINTA, 'fill-opacity': 0.92 },
    botifarra
  )
  cami(
    botifarra,
    cinta(
      [
        [-10, -3.4],
        [-5, -6.6],
        [2, -6.8],
        [8, -4.6],
        [10.5, -2.6],
      ],
      [2.6, 4, 4.2, 4, 2.6]
    ),
    { fill: '#a8674f' }
  )
  cami(botifarra, 'M-5.4 -7.6L-4.2 -4.6M-1.4 -8.2L-0.6 -5M2.8 -8L3.2 -5M6.6 -6.6L6.4 -3.8', {
    fill: 'none',
    stroke: '#5b3a2c',
    'stroke-width': 0.8,
  })
  const tMongetes = q('mongetes')
  ;[
    [-11.5, -2.2],
    [-8.4, -1.2],
    [-4.6, -2.2],
    [-1, -1.4],
    [3, -2],
    [7.4, -1.2],
    [11, -2.2],
    [0.6, -3.2],
    [5.4, -3],
  ].forEach(([x, y], k) => {
    const mongeta = pivot(
      crea('ellipse', { cx: x!, cy: y!, rx: 1.5, ry: 1, fill: '#f1e9cd' }, botifarra),
      x!,
      y!
    )
    tl.fromTo(
      mongeta,
      { scale: 0, autoAlpha: 0 },
      { scale: 1, autoAlpha: 1, duration: 0.2, ease: 'back.out(3)' },
      tMongetes - 0.2 + k * 0.05
    )
  })

  // ── Fuet: a la post, amb quatre rodanxes tallades ───────────────────────
  const fuet = serveix(xFuet, tFuet)
  crea('rect', { x: -15, y: -2.6, width: 30, height: 2.6, rx: 1, fill: FUSTA }, fuet)
  cami(
    fuet,
    cinta(
      [
        [-13, -4.4],
        [-6, -5],
        [2, -4.6],
        [8.5, -4.8],
      ],
      [1.6, 3.4, 3.4, 3]
    ),
    { fill: '#b98f89' }
  )
  cami(fuet, 'M-13 -4.4Q-16.6 -6.6 -14.4 -9', {
    fill: 'none',
    stroke: TINTA,
    'stroke-width': 0.6,
    'stroke-opacity': 0.8,
  })
  ;[11, 14.6, 18.2].forEach((x, k) => {
    const rodanxa = pivot(grup(fuet), x, -3.6)
    cercle(rodanxa, x, -3.6, 1.9, { fill: '#b98f89' })
    cercle(rodanxa, x, -3.6, 1.25, { fill: '#8d3f3a' })
    tl.fromTo(
      rodanxa,
      { x: -6, scale: 0.3, autoAlpha: 0 },
      { x: 0, scale: 1, autoAlpha: 1, duration: 0.25, ease: 'power2.out' },
      tFuet + 0.15 + k * 0.14
    )
  })

  // ── Pa amb tomàquet: la llesca, i el tomàquet que s'hi refrega ──────────
  const pa = serveix(xPa, tPa)
  cami(pa, 'M-10 -1Q-11 -7.4 -4 -8.4Q4 -9.4 9 -7.4Q11.4 -4.4 10 -1Z', {
    fill: '#e2c491',
    stroke: '#b98d5e',
    'stroke-width': 1,
  })
  const sucat = pivot(
    cami(pa, 'M-8.6 -2Q-9 -6.4 -3.6 -7.2Q3.6 -8 8 -6.4Q9.6 -4 8.6 -2Z', {
      fill: VERMELL,
      'fill-opacity': 0.62,
    }),
    -8.6,
    -4
  )
  tl.fromTo(
    sucat,
    { scaleX: 0, autoAlpha: 0 },
    { scaleX: 1, autoAlpha: 1, duration: 0.9, ease: 'sine.inOut' },
    tTomaquet - 0.3
  )
  const tomaquet = grup(pa)
  cami(tomaquet, 'M-4 -8.6A4 4 0 0 1 4 -8.6Z', { fill: VERMELL })
  cami(tomaquet, 'M-1.2 -12.4L0 -13.8L1.2 -12.4Z', { fill: VERD })
  tl.fromTo(
    tomaquet,
    { autoAlpha: 0, x: -9, y: -7 },
    { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power2.in' },
    tTomaquet - 0.5
  )
  tl.to(
    tomaquet,
    { x: 8, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 3 },
    tTomaquet - 0.25
  )
  tl.to(
    tomaquet,
    { x: 15, y: 6.4, rotation: 180, duration: 0.3, ease: 'power1.inOut' },
    tTomaquet + 0.95
  )

  // ── Allioli: morter groc i mà de morter que no para ─────────────────────
  const allioli = serveix(xAllioli, tAllioli)
  const maMorter = pivot(grup(allioli), 0, -4)
  linia(maMorter, 0, -4, 5.6, -15.5, {
    stroke: '#c9a36b',
    'stroke-width': 2.1,
    'stroke-linecap': 'round',
  })
  cami(allioli, 'M-7.4 -8.6H7.4L5.4 0H-5.4Z', { fill: '#e3b23c' })
  cami(allioli, 'M-9.4 -8.8L-7 -8.8L-6.6 -6.6ZM9.4 -8.8L7 -8.8L6.6 -6.6Z', { fill: '#e3b23c' })
  cami(allioli, 'M-3.6 -6.4Q-2.6 -3.6 -4 -2M2.4 -6Q4 -3.6 2.6 -1.4', {
    fill: 'none',
    stroke: '#5d9e5d',
    'stroke-width': 1.5,
    'stroke-linecap': 'round',
  })
  crea('ellipse', { cx: 0, cy: -8.6, rx: 7.4, ry: 1.5, fill: '#f3e7b5' }, allioli)
  tl.to(
    maMorter,
    { rotation: -32, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: 15 },
    tAllioli
  )

  // ── El porró que ronda ──────────────────────────────────────────────────
  const bevedors = [0, 46, 92].map((dx, k) => {
    const c = comensal(gent, xPorro + dx, k + 7)
    tl.fromTo(c.g, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, tAsseu + 0.3)
    const brac_ = cami(c.g, '', {
      fill: 'none',
      stroke: c.camisa,
      'stroke-width': 2.8,
      'stroke-linecap': 'round',
    })
    return { c, x: xPorro + dx, brac: brac_ }
  })
  const porroPis = grup(escena, { visibility: 'hidden' })
  const raig = cami(porroPis, '', {
    fill: 'none',
    stroke: '#b5333f',
    'stroke-width': 1,
    'stroke-linecap': 'round',
  })
  const porro = grup(porroPis)
  cami(
    porro,
    'M-6 4Q-7 -3 -2 -6L2 -6Q7 -3 6 4Q0 6 -6 4ZM-2 -6L-5.6 -13L-1.4 -13.6L1.2 -6ZM5 -2L15 -7L15.4 -6L5.6 1Z',
    {
      fill: TINTA,
      'fill-opacity': 0.3,
      stroke: TINTA,
      'stroke-opacity': 0.85,
      'stroke-width': 0.7,
      'stroke-linejoin': 'round',
    }
  )
  cami(porro, 'M-6 3.8Q-6.6 0 -5 -1.2L5.4 -1.2Q6.6 0.6 6 3.8Q0 5.8 -6 3.8Z', { fill: '#9e2f3a' })
  // Cada glop: el porró s'atura damunt d'un comensal, s'inclina i raja.
  const GLOP = tRonda - tPorro
  const tPorro0 = tPorro - 0.45
  pilot(tl, tPorro0, tFi + 0.9 - tPorro0, (p, s) => {
    const t = tPorro0 + s
    atribut(porroPis, 'visibility', p > 0 && p < 1 ? 'visible' : 'hidden')
    atribut(porroPis, 'opacity', tram(t, tPorro0, tPorro0 + 0.3).toFixed(2))
    // Torn actual (0, 1, 2…) i en quin punt del glop som.
    const torn = Math.min(bevedors.length - 1, Math.max(0, Math.floor((t - tPorro + 0.25) / GLOP)))
    const dins = t - (tPorro - 0.25 + torn * GLOP)
    const passa = torn > 0 ? suau(tram(dins, 0, 0.3)) : 1
    const beu =
      suau(tram(dins, torn > 0 ? 0.25 : 0, 0.45)) *
      (1 - suau(tram(dins, GLOP - 0.12, GLOP + 0.05)) * (torn < bevedors.length - 1 ? 1 : 0))
    const b = bevedors[torn]!
    const xDe = bevedors[Math.max(0, torn - 1)]!.x
    const x = barreja(xDe, b.x, passa) - 12.5
    const y = yT - 23.5 - 5 * Math.sin(Math.PI * passa) * (torn > 0 ? 1 : 0)
    const tomb = 27 * beu
    porro.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${f1(tomb)})`)
    // Punta del broc, un cop girat, i raig fins a la boca.
    const a = (tomb * Math.PI) / 180
    const xb = x + 15.2 * Math.cos(a) + 6.5 * Math.sin(a)
    const yb = y + 15.2 * Math.sin(a) - 6.5 * Math.cos(a)
    const raja = beu > 0.75
    raig.setAttribute(
      'd',
      raja
        ? `M${f1(xb)} ${f1(yb)}Q${f1(xb + 2.4)} ${f1(yb + 3 + Math.sin(t * 30))} ${f1(b.x + 0.6)} ${f1(yT - 13.4)}`
        : ''
    )
    // El porró el té qui beu; mentre passa, primer qui el dona i després qui el rep.
    const quiElTe = torn > 0 && passa < 0.5 ? torn - 1 : torn
    bevedors.forEach((bv, k) => {
      // Qui beu tira el cap enrere i aguanta el porró amb el braç estirat.
      bv.c.cap.setAttribute('transform', `rotate(${f1(k === torn ? -22 * beu : 0)} 0 -11)`)
      bv.brac.setAttribute(
        'd',
        k === quiElTe ? `M-6.4 -8.6L${f1(x - bv.x + 1)} ${f1(y - yT + 4)}` : ''
      )
    })
  })

  surt(tl, escena, tFi - 0.1, 0.8)
}
