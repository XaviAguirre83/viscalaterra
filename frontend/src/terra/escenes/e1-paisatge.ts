/**
 * Escena 1 · El paisatge («Visc a la terra… a cop de sal»).
 *
 * El mapa de Catalunya es dibuixa sota «Visc a la terra», s'ajeu i es fa
 * paisatge: els Pirineus a un costat, el mar a l'altre. La tramuntana baixa de
 * les muntanyes i ens empeny cap al mar, on l'onada trenca contra la roca.
 */
import { CONTORN, COSTA } from './mapa-dades'
import {
  ALCADA,
  BLAU,
  TERRA_Y,
  TINTA,
  VERD,
  atribut,
  atzar,
  barreja,
  cami,
  cercle,
  corba,
  degradat,
  entra,
  f1,
  grup,
  limita,
  pilot,
  pivot,
  poligonal,
  suau,
  surt,
  traca,
  tram,
  tramTerra,
  type Escenari,
  type Punt,
} from './nucli'

/** Centre vertical i escala del mapa inicial (les dades fan 100 d'alçada). */
const MAPA_Y = 55
const MAPA_ESCALA = 0.92

export interface Paisatge {
  /** x de món on la roca toca l'aigua: allà comença la terra de l'escena 2. */
  xRoca: number
  /** x de món on el promontori de la roca torna a baixar a la línia de terra. */
  xFiRoca: number
  /** Alçada del terreny (y) a la x de món: el vessant de la roca i, després, el pla. */
  yTerra: (x: number) => number
}

/**
 * Perfil de la roca, en coordenades locals (l'origen és on toca l'aigua): la
 * paret de mar, el cim i el vessant que baixa cap als camps.
 */
const PERFIL_ROCA: Punt[] = [
  [-5, 8],
  [0, 0],
  [5, -13],
  [1, -23],
  [8, -36],
  [19, -48],
  [35, -53],
  [52, -49],
  [70, -40],
  [97, -29],
  [128, -15],
  [160, -5],
  [188, 0],
  [188, 8],
]
/** Índex del cim dins el perfil: d'aquí en avall és el vessant de terra. */
const CIM_ROCA = 6

// ── Serralades ────────────────────────────────────────────────────────────

export interface Serralada {
  /** Silueta tancada (per farcir). */
  d: string
  /** Només la carena (per perfilar). */
  carena: string
  /** Congestes dels cims més alts. */
  neu: string
  /** Cims, d'esquerra a dreta. */
  cims: Punt[]
}

/**
 * Serralada procedural: `pics` cims repartits al llarg de `amplada`, més alts
 * cap al centre, amb colls i espatlles irregulars. `nevat` (0–1) és la fracció
 * de l'alçada màxima a partir de la qual un cim porta congesta.
 */
export function serralada(
  rnd: () => number,
  x0: number,
  amplada: number,
  alcada: number,
  pics: number,
  nevat = 2,
  base = TERRA_Y
): Serralada {
  const punts: Punt[] = [[x0, base]]
  const iCims: number[] = []
  let xAnt = x0
  let hAnt = 0
  for (let i = 0; i < pics; i++) {
    const u = (i + 0.5) / pics
    const x = x0 + amplada * (u + ((rnd() - 0.5) * 0.5) / pics)
    const h = alcada * Math.sin(Math.PI * u) ** 0.55 * (0.5 + 0.5 * rnd())
    if (i > 0) {
      // Coll entre el cim anterior i aquest.
      const hColl = Math.min(hAnt, h) * (0.3 + 0.35 * rnd())
      punts.push([barreja(xAnt, x, 0.4 + 0.2 * rnd()), base - hColl])
    }
    // Espatlla a mig pendent: trenca la recta de pujada.
    const [xp, yp] = punts[punts.length - 1]!
    const k = 0.45 + 0.25 * rnd()
    punts.push([barreja(xp, x, k), barreja(yp, base - h, k) + (rnd() - 0.35) * h * 0.14])
    iCims.push(punts.length)
    punts.push([x, base - h])
    xAnt = x
    hAnt = h
  }
  punts.push([x0 + amplada, base])

  let neu = ''
  for (const i of iCims) {
    const [x, y] = punts[i]!
    if (base - y < alcada * nevat) continue
    const [xe, ye] = punts[i - 1]!
    const [xd, yd] = punts[i + 1]!
    const e: Punt = [barreja(x, xe, 0.34), barreja(y, ye, 0.34)]
    const d: Punt = [barreja(x, xd, 0.3), barreja(y, yd, 0.3)]
    const m = (p: number, dy: number): Punt => [barreja(d[0], e[0], p), barreja(d[1], e[1], p) + dy]
    neu += poligonal([e, [x, y], d, m(0.28, -2.2), m(0.5, 1.6), m(0.74, -1.8)], true)
  }

  return {
    d: poligonal(punts, true),
    carena: poligonal(punts),
    neu,
    cims: iCims.map((i) => punts[i]!),
  }
}

// ── Vent ──────────────────────────────────────────────────────────────────

/** Forma d'una ratxa de vent (les bessones comparteixen ondulació). */
interface FormaRatxa {
  fase: number
  ona: number
  /** Radi del rínxol final; 0 = sense rínxol. */
  rinxol: number
}

/** Ratxa de vent: línia ondulada que avança cap a la dreta i, si cal, s'enrotlla. */
function ratxa(x0: number, y0: number, llarg: number, baixa: number, forma: FormaRatxa): string {
  const punts: Punt[] = []
  const n = 6
  for (let i = 0; i <= n; i++) {
    const u = i / n
    punts.push([
      x0 + llarg * u,
      y0 + baixa * suau(u) + Math.sin(u * Math.PI * 2.6 + forma.fase) * forma.ona * (1 - u * 0.5),
    ])
  }
  if (forma.rinxol > 0) {
    // Espiral final: el vent puja, torna enrere i es cargola.
    const [xf, yf] = punts[punts.length - 1]!
    const r0 = forma.rinxol
    for (let k = 1; k <= 11; k++) {
      const a = Math.PI / 2 - (k / 11) * Math.PI * 2.5
      const r = r0 * (1 - (k / 11) * 0.66)
      punts.push([xf + Math.cos(a) * r, yf - r0 + Math.sin(a) * r])
    }
  }
  return corba(punts)
}

export interface Ratxa {
  t: number
  durada: number
  x: number
  y: number
  llarg: number
  baixa: number
  rinxol?: boolean
  gruix?: number
  opacitat?: number
}

/**
 * Afegeix ratxes de vent a `capa`: cada una és un traç que recorre el seu
 * camí, frena i s'esvaeix, amb una bessona més curta a sota. La comparteixen
 * la tramuntana i el vent que escampa les llegendes.
 */
export function bufaVent(e: Escenari, capa: SVGGElement, rnd: () => number, ratxes: Ratxa[]): void {
  const traca = (d: string, tros: number, r: Ratxa, t: number, opacitat: number) => {
    const c = cami(capa, d, {
      fill: 'none',
      stroke: TINTA,
      'stroke-width': r.gruix ?? 1.2,
      'stroke-linecap': 'round',
      pathLength: 1,
      'stroke-dasharray': `${tros} 2`,
      'stroke-dashoffset': tros,
    })
    e.tl.fromTo(c, { autoAlpha: 0 }, { autoAlpha: opacitat, duration: r.durada * 0.2 }, t)
    e.tl.fromTo(
      c,
      { attr: { 'stroke-dashoffset': tros } },
      {
        attr: { 'stroke-dashoffset': -(1 - tros) },
        duration: r.durada,
        ease: 'power2.out',
        immediateRender: false,
      },
      t
    )
    e.tl.to(c, { autoAlpha: 0, duration: r.durada * 0.4, ease: 'power1.in' }, t + r.durada * 0.62)
  }
  for (const r of ratxes) {
    const forma: FormaRatxa = {
      fase: rnd() * Math.PI * 2,
      ona: 4 + rnd() * 4.5,
      rinxol: r.rinxol ? 6 + rnd() * 4.5 : 0,
    }
    const opacitat = r.opacitat ?? 0.5
    traca(ratxa(r.x, r.y, r.llarg, r.baixa, forma), 0.55, r, r.t, opacitat)
    traca(
      ratxa(r.x + r.llarg * 0.12, r.y + 6, r.llarg * 0.62, r.baixa * 0.7, { ...forma, rinxol: 0 }),
      0.6,
      r,
      r.t + 0.09,
      opacitat * 0.6
    )
  }
}

// ── Escena ────────────────────────────────────────────────────────────────

export function escenaPaisatge(e: Escenari): Paisatge {
  const { tl, guio } = e
  const q = guio.quan
  const rnd = atzar(1714)

  const tVisc = q('visc')
  const tTerra = q('terra')
  const tBella = q('bella')
  const tAdmirada = q('admirada')
  const tPirineus = q('pirineus')
  const tTossen = q('tossen')
  const tBaixant = q('baixant')
  const tAlcant = q('alçant')
  const tEsverant = q('esverant')
  const tOnada = q("l'onada")
  const tCop = q('cop')
  const tFi = guio.frase('camps').entra

  // ── El mapa: es dibuixa sota «Visc», s'omple amb «a la terra» ───────────
  const marc = grup(e.cel, { transform: `translate(0 ${MAPA_Y}) scale(${MAPA_ESCALA})` })
  const mapa = pivot(grup(marc), 0, 0)
  const farcit = cami(mapa, CONTORN, { fill: TINTA, 'fill-opacity': 0.12 })
  const vora = cami(mapa, CONTORN, {
    fill: 'none',
    stroke: TINTA,
    'stroke-opacity': 0.8,
    'stroke-width': 1.2,
    'stroke-linejoin': 'round',
    'vector-effect': 'non-scaling-stroke',
  })
  traca(tl, vora, tVisc - 1, tTerra - tVisc + 0.8)
  entra(tl, farcit, tVisc + 0.2, tTerra - tVisc)
  // Batec en arribar «terra».
  tl.to(mapa, { scale: 1.045, duration: 0.4, ease: 'sine.inOut', yoyo: true, repeat: 1 }, tTerra)
  tl.to(
    farcit,
    { attr: { 'fill-opacity': 0.26 }, duration: 0.4, ease: 'sine.inOut', yoyo: true, repeat: 1 },
    tTerra
  )

  // «bella terra mediterrània»: la costa fa ones cap a mar, com en una carta nàutica.
  const ecos = [0, 1, 2].map((i) =>
    cami(mapa, COSTA, {
      fill: 'none',
      stroke: BLAU,
      'stroke-opacity': 0.75 - i * 0.2,
      'stroke-width': 1.1,
      'stroke-linejoin': 'round',
      'vector-effect': 'non-scaling-stroke',
    })
  )
  ecos.forEach((eco, i) => {
    tl.fromTo(
      eco,
      { autoAlpha: 0, x: 1, y: 0.5 },
      { autoAlpha: 1, x: 5 + i * 5.5, y: 2 + i * 1.6, duration: 1.1, ease: 'power2.out' },
      tBella + i * 0.3
    )
  })

  // El mapa s'ajeu: s'aplana sobre la línia de terra i es fa paisatge.
  const tAjeu = tAdmirada - 0.45
  tl.to(
    mapa,
    {
      scaleX: 4.4,
      scaleY: 0.05,
      y: (TERRA_Y - MAPA_Y) / MAPA_ESCALA,
      duration: 1.2,
      ease: 'power2.inOut',
    },
    tAjeu
  )
  surt(tl, mapa, tAjeu + 0.7, 0.5)

  // ── Geografia de l'escena (coordenades de món) ──────────────────────────
  const xPirineus = e.on(tPirineus, -190)
  const xCosta = e.on(tEsverant, -360)
  const xRoca = e.on(tCop, 290)
  const xFiRoca = xRoca + 188
  const yTerra = (x: number): number => {
    const lx = x - xRoca
    for (let i = CIM_ROCA + 1; i < PERFIL_ROCA.length - 1; i++) {
      const [xb, yb] = PERFIL_ROCA[i]!
      if (lx <= xb) {
        const [xa, ya] = PERFIL_ROCA[i - 1]!
        return TERRA_Y + barreja(ya, yb, limita((lx - xa) / (xb - xa)))
      }
    }
    return TERRA_Y
  }

  tramTerra(e.terra, -4000, xCosta)
  tramTerra(e.terra, xRoca, 40000)

  // ── Pirineus: tres plans que s'alcen de la línia de terra ───────────────
  const pirineus = grup(e.mon)
  const plans = [
    { ampla: 660, alt: 76, pics: 7, nevat: 0.62, op: 0.1, dx: -20 },
    { ampla: 600, alt: 56, pics: 8, nevat: 0.8, op: 0.13, dx: 30 },
    { ampla: 640, alt: 34, pics: 10, nevat: 2, op: 0.16, dx: -6 },
  ]
  const cimsAlts: Punt[] = []
  plans.forEach((pla, i) => {
    const s = serralada(
      rnd,
      xPirineus + pla.dx - pla.ampla / 2,
      pla.ampla,
      pla.alt,
      pla.pics,
      pla.nevat
    )
    const g = pivot(grup(pirineus), xPirineus, TERRA_Y)
    // Més tinta als cims i boira a la falda: els plans es llegeixen sense tapar-se.
    degradat(
      e.defs,
      `terra-pirineus-${i}`,
      TINTA,
      pla.op * 2.1,
      pla.op * 0.2,
      TERRA_Y - pla.alt,
      TERRA_Y
    )
    cami(g, s.d, { fill: `url(#terra-pirineus-${i})` })
    cami(g, s.carena, {
      fill: 'none',
      stroke: TINTA,
      'stroke-opacity': 0.26,
      'stroke-linejoin': 'round',
    })
    if (s.neu) cami(g, s.neu, { fill: TINTA, 'fill-opacity': 0.6 })
    if (i === 0) cimsAlts.push(...[...s.cims].sort((a, b) => a[1] - b[1]).slice(0, 3))
    tl.fromTo(
      g,
      { scaleY: 0, autoAlpha: 0 },
      {
        scaleY: 1,
        autoAlpha: 1,
        duration: 1.3,
        ease: 'back.out(1.25)',
      },
      tAdmirada - 0.25 + i * 0.22
    )
  })
  surt(tl, pirineus, tEsverant + 2.5, 1.5)

  // «que tossen tramuntana»: cada cim alt estossega un parell de bufades.
  cimsAlts
    .sort((a, b) => a[0] - b[0])
    .forEach(([x, y], i) => {
      for (let k = 0; k < 2; k++) {
        const bufada = grup(e.mon, { transform: `translate(${f1(x + 4)} ${f1(y + 3)})` })
        const nuvol = pivot(grup(bufada), 0, 0)
        cercle(nuvol, 0, 0, 4.2, { fill: TINTA })
        cercle(nuvol, 5, -2, 5.4, { fill: TINTA })
        cercle(nuvol, 10.5, 0.5, 3.8, { fill: TINTA })
        const t = tTossen + i * 0.22 + k * 0.42
        tl.fromTo(
          nuvol,
          { scale: 0.15, x: 0, y: 0, autoAlpha: 0 },
          { scale: 1.25, x: 12, y: -3, autoAlpha: 0.55, duration: 0.3, ease: 'power2.out' },
          t
        )
        tl.to(
          nuvol,
          { scale: 1.9, x: 50 + k * 12, y: 3, autoAlpha: 0, duration: 1.1, ease: 'power1.out' },
          t + 0.3
        )
      }
    })

  // ── Tramuntana: baixa enrabiada (ratxes) i alça la veu (més i més gruixudes) ─
  // Cada ràfega escombra la pantalla d'esquerra a dreta: les ratxes de més a
  // la dreta arrenquen més tard.
  const vent = grup(e.davant)
  const ratxes: Ratxa[] = []
  const rafega = (
    t0: number,
    t1: number,
    n: number,
    o: { x: Punt; y: Punt; llarg: Punt; baixa: Punt; gruix: number; op: number }
  ) => {
    for (let i = 0; i < n; i++) {
      const u = (i + rnd()) / n
      const llarg = barreja(o.llarg[0], o.llarg[1], rnd())
      ratxes.push({
        t: barreja(t0, t1, u * 0.75 + rnd() * 0.25),
        durada: 0.95 + llarg / 520 + rnd() * 0.3,
        x: barreja(o.x[0], o.x[1], u) * e.k,
        y: barreja(o.y[0], o.y[1], rnd()),
        llarg,
        baixa: barreja(o.baixa[0], o.baixa[1], rnd()),
        rinxol: rnd() < 0.6,
        gruix: o.gruix,
        opacitat: o.op,
      })
    }
  }
  // «tossen tramuntana»: les primeres, curtes, arran dels cims.
  rafega(q('tramuntana') - 0.3, tBaixant - 0.6, 3, {
    x: [-330, -60],
    y: [22, 44],
    llarg: [150, 220],
    baixa: [6, 14],
    gruix: 1.1,
    op: 0.45,
  })
  // «baixant enrabiada»
  rafega(tBaixant - 0.2, tAlcant - 0.3, 6, {
    x: [-620, 180],
    y: [14, 50],
    llarg: [230, 340],
    baixa: [14, 30],
    gruix: 1.25,
    op: 0.5,
  })
  // «alçant la veu»: més ratxes, més llargues i més gruixudes.
  rafega(tAlcant - 0.1, tEsverant - 0.2, 9, {
    x: [-700, 260],
    y: [8, 52],
    llarg: [280, 430],
    baixa: [16, 34],
    gruix: 1.8,
    op: 0.64,
  })
  // «esverant un mar»: les últimes, baixes, arran d'aigua.
  rafega(tEsverant - 0.2, tEsverant + 1.2, 4, {
    x: [-420, 60],
    y: [52, 70],
    llarg: [200, 300],
    baixa: [4, 12],
    gruix: 1.2,
    op: 0.45,
  })
  bufaVent(e, vent, rnd, ratxes)

  // ── El mar ──────────────────────────────────────────────────────────────
  degradat(e.defs, 'terra-mar', BLAU, 0.4, 0.1)
  const NIVELL = TERRA_Y + 2
  const mar = grup(e.mon)
  const aigua = cami(mar, '', { fill: 'url(#terra-mar)' })
  const ones = [0.3, 0.22, 0.15].map((op) =>
    cami(mar, '', { fill: 'none', stroke: TINTA, 'stroke-opacity': op, 'stroke-width': 1 })
  )
  const superficie = cami(mar, '', {
    fill: 'none',
    stroke: TINTA,
    'stroke-opacity': 0.65,
    'stroke-width': 1.2,
    'stroke-linejoin': 'round',
  })
  const escuma = cami(mar, '', {
    fill: 'none',
    stroke: TINTA,
    'stroke-opacity': 0.9,
    'stroke-width': 1.5,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  })

  // Onades grans: neixen mar endins i creixen fins a trencar contra la roca.
  const onades = [
    { t0: tOnada - 0.3, t1: tCop, recorregut: 520, alt: 32 },
    { t0: tCop + 0.5, t1: tCop + 1.65, recorregut: 300, alt: 18 },
  ]
  const tMar0 = tBella - 0.3
  const tMar1 = guio.frase('castells').entra

  // Onatge de fons: dues ones sumades que corren cap a la costa.
  const K1 = 0.043
  const W1 = 2.3
  /** Amplitud de l'onatge: mar plana fins que arriba la tramuntana; després
   *  s'esvera i es va calmant. */
  const amplitud = (t: number) =>
    1 + 4 * suau(tram(t, tAlcant, tEsverant + 0.6)) - 2.6 * suau(tram(t, tCop + 0.5, tFi + 1))

  /** Alçada de l'aigua (y) a la x de món, a l'instant t. */
  function nivell(x: number, t: number): number {
    const vora = suau((x - xCosta) / 46) // sense onatge just a la platja
    let y =
      NIVELL +
      vora *
        amplitud(t) *
        (0.62 * Math.sin(x * K1 - t * W1) + 0.38 * Math.sin(x * 0.097 - t * 3.7 + 1.3))
    for (const o of onades) {
      if (t < o.t0 || t > o.t1 + 0.45) continue
      const p = tram(t, o.t0, o.t1)
      const xo = xRoca - 10 - o.recorregut * (1 - p)
      // Creix en acostar-se a la costa i s'esfondra en trencar.
      const h = o.alt * (0.18 + 0.82 * p * p) * (1 - tram(t, o.t1, o.t1 + 0.45))
      const dx = x - xo
      y -= h * Math.exp(-((dx / (dx > 0 ? 13 : 34)) ** 2))
    }
    return y
  }

  pilot(tl, tMar0, tMar1 - tMar0, (_p, s) => {
    const t = tMar0 + s
    const c = e.cam(t)
    const x0 = Math.max(xCosta, c - e.mig() - 24)
    const x1 = Math.min(xRoca + 8, c + e.mig() + 24)
    if (x1 <= x0) {
      for (const el of [aigua, superficie, escuma, ...ones]) el.setAttribute('d', '')
      return
    }
    const punts: Punt[] = []
    for (let x = x0; x < x1; x += 6) punts.push([x, nivell(x, t)])
    punts.push([x1, nivell(x1, t)])
    const d = poligonal(punts)
    superficie.setAttribute('d', d)
    aigua.setAttribute('d', `${d}L${f1(x1)} ${ALCADA + 2}L${f1(x0)} ${ALCADA + 2}Z`)
    ones.forEach((ona, i) => {
      const fons: Punt[] = []
      for (let x = x0; x < x1; x += 9) {
        fons.push([
          x,
          NIVELL +
            5 +
            i * 4.4 +
            1.3 * Math.sin(x * (0.06 + i * 0.021) - t * (1.5 + i * 0.5) + i * 2),
        ])
      }
      ona.setAttribute('d', fons.length > 1 ? poligonal(fons) : '')
    })

    let blanc = ''
    // Cabretes: una pinzellada d'escuma a cada cresta quan la mar s'esvera.
    const amp = amplitud(t)
    if (amp > 2.6) {
      const k0 = Math.ceil((x0 * K1 - t * W1 - Math.PI * 1.5) / (Math.PI * 2))
      for (let k = k0; ; k++) {
        const x = (Math.PI * 1.5 + Math.PI * 2 * k + t * W1) / K1
        if (x > x1 - 30) break
        if (x < xCosta + 60) continue
        const y = nivell(x, t)
        const m = (amp - 2.6) * 2.2
        blanc += `M${f1(x - m)} ${f1(y + 0.8)}Q${f1(x + 1)} ${f1(y - 1.6)} ${f1(x + m + 2)} ${f1(y + 1.4)}`
      }
    }
    // Llavi de l'onada gran quan ja s'alça prou.
    for (const o of onades) {
      if (t < o.t0 || t > o.t1) continue
      const p = tram(t, o.t0, o.t1)
      const h = o.alt * (0.18 + 0.82 * p * p)
      if (h < 9) continue
      const xo = xRoca - 10 - o.recorregut * (1 - p)
      const yo = nivell(xo, t)
      const k = h / 30
      blanc += corba([
        [xo - 8 * k, yo + 1.5],
        [xo + 4 * k, yo - 2.5 * k],
        [xo + 13 * k, yo + 2 * k],
        [xo + 13 * k, yo + 9 * k],
        [xo + 8 * k, yo + 11 * k],
      ])
    }
    escuma.setAttribute('d', blanc)
  })
  entra(tl, mar, tMar0, 1.4)
  surt(tl, mar, tMar1 - 0.8, 0.8)

  // ── La roca: promontori amb un pi, on trenca l'onada ────────────────────
  degradat(e.defs, 'terra-roca', TINTA, 0.34, 0.1)
  const roca = grup(e.mon, { transform: `translate(${f1(xRoca)} ${TERRA_Y})` })
  cami(roca, poligonal(PERFIL_ROCA, true), {
    fill: 'url(#terra-roca)',
    stroke: TINTA,
    'stroke-opacity': 0.5,
    'stroke-linejoin': 'round',
  })
  // Arestes de la paret.
  cami(roca, 'M19 -48L27 -30L21 -9M35 -53L44 -34L39 -15M8 -36L16 -25', {
    fill: 'none',
    stroke: TINTA,
    'stroke-opacity': 0.26,
    'stroke-linejoin': 'round',
  })
  // Pi pinyer de capçada plana, torçat pel vent.
  const pi = grup(roca, { transform: 'translate(63 -44)' })
  cami(pi, 'M0 0C1 -7 -1 -11 3 -17', {
    fill: 'none',
    stroke: TINTA,
    'stroke-opacity': 0.6,
    'stroke-width': 1.5,
  })
  cami(pi, 'M-9 -17C-8 -24 2 -27 11 -25C19 -24 21 -19 17 -17C10 -15 -3 -15 -9 -17Z', {
    fill: VERD,
    'fill-opacity': 0.4,
    stroke: TINTA,
    'stroke-opacity': 0.4,
  })
  entra(tl, roca, tEsverant - 1.5, 1)
  surt(tl, roca, guio.frase('castells').entra - 0.4, 0.8)

  // ── A cop de sal: l'esquitx de cada onada ───────────────────────────────
  onades.forEach((o, k) => {
    const n = k === 0 ? 34 : 18
    const forca = k === 0 ? 1 : 0.62
    const gotes = Array.from({ length: n }, () => {
      const angle = (-158 + rnd() * 128) * (Math.PI / 180)
      const v = (55 + rnd() * 170) * forca
      return {
        el: cercle(e.mon, 0, 0, 0.7 + rnd() * 1.3, { fill: TINTA, visibility: 'hidden' }),
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        vida: 0.8 + rnd() * 0.9,
        retard: rnd() * 0.12,
      }
    })
    const durada = 1.9
    pilot(tl, o.t1, durada, (p, s) => {
      for (const g of gotes) {
        const tg = s - g.retard
        const x = xRoca + 3 + g.vx * tg
        const y = TERRA_Y - 9 + g.vy * tg + 150 * tg * tg
        const viva = p > 0 && p < 1 && tg > 0 && tg < g.vida && y < TERRA_Y + 3
        atribut(g.el, 'visibility', viva ? 'visible' : 'hidden')
        if (!viva) continue
        g.el.setAttribute('cx', f1(x).toString())
        g.el.setAttribute('cy', f1(y).toString())
        atribut(g.el, 'fill-opacity', (limita(1.15 - tg / g.vida) * 0.9).toFixed(2))
      }
    })
  })

  return { xRoca, xFiRoca, yTerra }
}
