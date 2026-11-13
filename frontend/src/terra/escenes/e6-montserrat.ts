/**
 * Escena 6 · Montserrat («Terra de la Rosa d'abril… posen veu al silenci»).
 *
 * La serra de les agulles s'alça mentre el sol es pon. Hi floreix la Rosa d'abril i,
 * en obrir-se, hi apareix la Moreneta, que vetlla el país: la seva claror
 * recorre la plana i els pobles s'hi van encenent. A sota, l'abadia; i al
 * davant, els escolanets, que posen veu al silenci.
 */
import { nota, persona } from './figures'
import {
  NIT,
  OR,
  TERRA_Y,
  TINTA,
  VERD,
  VERMELL,
  atzar,
  cami,
  cercle,
  corba,
  crea,
  degradat,
  esclat,
  f1,
  grup,
  pilot,
  pivot,
  surt,
  type Escenari,
  type Punt,
} from './nucli'

const PEDRA = '#5c6370'
const PELL_MORENA = '#4a3528'

/** Serra d'agulles: dits de roca arrodonits, més alts cap al centre. */
function agulles(rnd: () => number, x0: number, ampla: number, alt: number, n: number): string {
  const punts: Punt[] = [[x0, TERRA_Y]]
  let x = x0
  let hAnt = 0
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n
    const w = (ampla / n) * (0.75 + 0.5 * rnd())
    const h = alt * Math.sin(Math.PI * u) ** 0.6 * (0.6 + 0.4 * rnd())
    const yCim = TERRA_Y - h
    // Osca entre l'agulla anterior i aquesta.
    if (i > 0) punts.push([x, TERRA_Y - Math.min(hAnt, h) * (0.6 + 0.25 * rnd())])
    punts.push(
      [x + w * 0.16, yCim + w * 0.34],
      [x + w * 0.5, yCim],
      [x + w * 0.84, yCim + w * 0.34]
    )
    x += w
    hAnt = h
  }
  punts.push([x, TERRA_Y])
  return `${corba(punts)}Z`
}

export function escenaMontserrat(e: Escenari): void {
  const { tl, guio } = e
  const q = guio.quan
  const rnd = atzar(1025)

  const tEntra = guio.frase('rosa', 1).entra
  const tRosa = q('rosa', 1)
  const tMorena = q('morena')
  const tVetlla = q('vetlla')
  const tPais = q('país')
  const tAbadia = q("l'abadia")
  const tEscolanets = q('escolanets')
  const tVeu = q('veu', 1) // la primera «veu» és la de la tramuntana
  const tFi = guio.frase('taula').entra

  const xM = e.on(tMorena, 50)
  const yM = 37

  // ── La serra ────────────────────────────────────────────────────────────
  const serra = grup(e.mon)
  const plans = [
    { ampla: 600, alt: 84, n: 15, op: 0.15, dx: -310 },
    { ampla: 520, alt: 58, n: 17, op: 0.2, dx: -250 },
  ]
  plans.forEach((pla, i) => {
    degradat(
      e.defs,
      `terra-montserrat-${i}`,
      TINTA,
      pla.op * 1.7,
      pla.op * 0.25,
      TERRA_Y - pla.alt,
      TERRA_Y
    )
    const g = pivot(grup(serra), xM, TERRA_Y)
    cami(g, agulles(rnd, xM + pla.dx, pla.ampla, pla.alt, pla.n), {
      fill: `url(#terra-montserrat-${i})`,
      stroke: TINTA,
      'stroke-opacity': 0.2,
    })
    tl.fromTo(
      g,
      { scaleY: 0, autoAlpha: 0 },
      { scaleY: 1, autoAlpha: 1, duration: 1.4, ease: 'power3.out' },
      tEntra - 0.5 + i * 0.25
    )
  })
  surt(tl, serra, tFi + 0.7, 0.9)

  // ── Vetlla el país: claror que escombra la plana i pobles que s'encenen ─
  const claror = grup(e.mon, { transform: `translate(${f1(xM)} ${yM})` })
  const feixos = pivot(grup(claror), 0, 0)
  const feix = crea('linearGradient', { id: 'terra-feix', x1: 0, y1: 0, x2: 0, y2: 1 }, e.defs)
  crea('stop', { offset: 0, 'stop-color': OR, 'stop-opacity': 0.26 }, feix)
  crea('stop', { offset: 1, 'stop-color': OR, 'stop-opacity': 0 }, feix)
  cami(feixos, 'M0 0L-240 62L-120 62ZM0 0L130 62L250 62Z', { fill: 'url(#terra-feix)' })
  tl.fromTo(
    feixos,
    { autoAlpha: 0, rotation: 16 },
    { autoAlpha: 1, rotation: 6, duration: 0.7, ease: 'sine.out' },
    tVetlla - 0.3
  )
  tl.to(
    feixos,
    { rotation: -16, duration: 2.1, ease: 'sine.inOut', yoyo: true, repeat: 2 },
    tVetlla + 0.4
  )
  surt(tl, feixos, tFi - 0.4, 1)

  const pobles = grup(e.mon)
  for (let i = 0; i < 46; i++) {
    const costat = i % 2 ? 1 : -1
    const lluny = 60 + rnd() * 470
    const llum = cercle(
      pobles,
      f1(xM + costat * lluny),
      f1(TERRA_Y - 1.5 - rnd() * 5),
      f1(0.7 + rnd() * 0.6),
      { fill: OR }
    )
    // S'encenen del peu de la serra cap enfora, quan sona «el país».
    tl.fromTo(
      llum,
      { autoAlpha: 0 },
      { autoAlpha: 0.45 + rnd() * 0.45, duration: 0.3 },
      tPais - 0.3 + (lluny / 530) * 1.6 + rnd() * 0.2
    )
  }
  surt(tl, pobles, tFi + 0.3, 0.8)

  // ── L'abadia ────────────────────────────────────────────────────────────
  const yAbadia = TERRA_Y - 15
  const abadia = pivot(grup(e.mon, { transform: `translate(${f1(xM)} ${yAbadia})` }), 0, 0)
  const pis = pivot(grup(abadia), 0, 0)
  const pedra = {
    fill: PEDRA,
    stroke: TINTA,
    'stroke-opacity': 0.3,
    'stroke-width': 0.7,
    'stroke-linejoin': 'round',
  }
  // Terrassa sobre la roca, cos del monestir, campanars i façana de la basílica.
  cami(pis, 'M-74 0H74L70 4.5H-70Z', pedra)
  cami(pis, 'M-60 0V-19H60V0Z', pedra)
  cami(pis, 'M-39 0V-33L-34.5 -40L-30 -33V0ZM30 0V-33L34.5 -40L39 -33V0Z', pedra)
  cami(pis, 'M-14 0V-27L0 -34L14 -27V0Z', pedra)
  cami(pis, 'M-3.4 0V-8.5A3.4 3.4 0 0 1 3.4 -8.5V0Z', { fill: NIT })
  cami(pis, 'M-36 -24v-4a1.5 1.5 0 0 1 3 0v4ZM33 -24v-4a1.5 1.5 0 0 1 3 0v4Z', { fill: NIT })
  // Finestres: dues fileres a cada ala i la rosassa.
  const finestres: SVGElement[] = [cercle(pis, 0, -21.5, 3, { fill: OR })]
  for (const costat of [-1, 1]) {
    for (let c = 0; c < 6; c++) {
      for (let f = 0; f < 2; f++) {
        finestres.push(
          crea(
            'rect',
            { x: f1(costat * (19 + c * 6.6) - 1), y: -15 + f * 7, width: 2, height: 3, fill: OR },
            pis
          )
        )
      }
    }
  }
  tl.fromTo(
    pis,
    { scaleY: 0, autoAlpha: 0 },
    { scaleY: 1, autoAlpha: 1, duration: 0.8, ease: 'back.out(1.4)' },
    tAbadia - 0.55
  )
  finestres.forEach((f, i) => {
    tl.fromTo(
      f,
      { autoAlpha: 0 },
      { autoAlpha: 0.85, duration: 0.25 },
      tAbadia + 0.1 + (i ? 0.25 + rnd() * 0.9 : 0)
    )
  })
  surt(tl, abadia, tFi + 0.5, 0.9)

  // ── La Rosa d'abril i la Moreneta ───────────────────────────────────────
  const halo = crea('radialGradient', { id: 'terra-halo-morena' }, e.defs)
  crea('stop', { offset: 0, 'stop-color': OR, 'stop-opacity': 0.5 }, halo)
  crea('stop', { offset: 0.45, 'stop-color': OR, 'stop-opacity': 0.16 }, halo)
  crea('stop', { offset: 1, 'stop-color': OR, 'stop-opacity': 0 }, halo)
  const altar = grup(e.mon, { transform: `translate(${f1(xM)} ${yM})` })
  const resplendor = pivot(cercle(altar, 0, -3, 34, { fill: 'url(#terra-halo-morena)' }), 0, -3)
  tl.fromTo(
    resplendor,
    { scale: 0.3, autoAlpha: 0 },
    { scale: 1, autoAlpha: 1, duration: 1.1, ease: 'power2.out' },
    tMorena - 0.35
  )
  tl.to(
    resplendor,
    { scale: 1.16, duration: 1.5, ease: 'sine.inOut', yoyo: true, repeat: 5 },
    tMorena + 0.8
  )

  const moreneta = pivot(grup(altar), 0, -4)
  // Cambril: l'arc que l'emmarca.
  cami(moreneta, 'M-12.5 8V-9A12.5 12.5 0 0 1 12.5 -9V8Z', {
    fill: OR,
    'fill-opacity': 0.13,
    stroke: OR,
    'stroke-opacity': 0.7,
    'stroke-width': 0.9,
  })
  // Mantell daurat, cara morena i corona; el Nen a la falda i la bola a la mà.
  cami(moreneta, 'M-8 7Q-9.4 -4 -4.6 -9.4L4.6 -9.4Q9.4 -4 8 7Z', { fill: OR })
  cami(moreneta, 'M-2.4 6.4Q-3 -1 0.7 -2.4Q4.4 -1 3.8 6.4Z', { fill: '#f3dc9c' })
  cercle(moreneta, 0.7, -4.4, 1.9, { fill: PELL_MORENA })
  cercle(moreneta, 0, -12.6, 3.1, { fill: PELL_MORENA })
  cami(moreneta, 'M-3.5 -14.8L-4 -19.4L-1.7 -17L0 -20.2L1.7 -17L4 -19.4L3.5 -14.8Z', {
    fill: OR,
    stroke: '#f3dc9c',
    'stroke-width': 0.5,
  })
  cercle(moreneta, -7, -2.6, 1.9, { fill: TINTA })
  tl.fromTo(
    moreneta,
    { scale: 0.4, autoAlpha: 0 },
    { scale: 1, autoAlpha: 1, duration: 0.7, ease: 'back.out(1.8)' },
    tMorena - 0.25
  )

  // La rosa: floreix amb «Rosa d'abril» i s'obre per deixar veure la Moreneta.
  const rosa = pivot(grup(altar), 0, -4)
  cami(rosa, 'M-9 -3Q-11 -15 0 -17Q11 -15 9 -3Q0 5 -9 -3Z', { fill: VERMELL })
  cami(rosa, 'M-6 -6Q-2 -14 4.6 -9.6Q7 -4.4 1 -3Q-3 -4.8 0.8 -8', {
    fill: 'none',
    stroke: '#b23a31',
    'stroke-width': 1.5,
    'stroke-linecap': 'round',
  })
  cami(rosa, 'M-8 -1.4L0 3.4L8 -1.4L0 7.4Z', { fill: VERD })
  tl.fromTo(
    rosa,
    { scale: 0, rotation: -70, autoAlpha: 0 },
    { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.7, ease: 'back.out(2.2)' },
    tRosa - 0.15
  )
  tl.to(
    rosa,
    { scale: 2.5, rotation: 30, autoAlpha: 0, duration: 0.75, ease: 'power2.in' },
    tMorena - 0.4
  )
  // Pètals que es desprenen en obrir-se.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const petal = pivot(cami(altar, 'M0 -3Q3 -1 0 3Q-3 -1 0 -3Z', { fill: VERMELL }), 0, 0)
    esclat(
      tl,
      petal,
      tMorena - 0.25,
      { x: 0, y: -5, rotation: 0, autoAlpha: 0.95 },
      {
        x: Math.cos(a) * (22 + rnd() * 14),
        y: -5 + Math.sin(a) * 15 + 20,
        rotation: 200 + rnd() * 200,
        autoAlpha: 0,
        duration: 1.5 + rnd() * 0.5,
        ease: 'power1.out',
      }
    )
  }
  surt(tl, altar, tFi + 0.3, 0.9)

  // ── Els escolanets ──────────────────────────────────────────────────────
  const cor = grup(e.mon, { transform: `translate(${f1(xM)} ${yAbadia})` })
  const escolans = Array.from({ length: 7 }, (_, i) => {
    const lloc = grup(cor)
    const p = persona(lloc, (i - 3) * 8.4, 3 + (i % 2), {
      alt: 16.5,
      roba: 'tunica',
      toRoba: '#e8e5db',
      camisa: '#e8e5db',
    })
    // Les mans al davant, amb el cantoral.
    p.posa({ bracE: 22, avantE: 62, bracD: -22, avantD: -62 })
    crea('rect', { x: -2.2, y: -10.4, width: 4.4, height: 3, fill: '#8a5148' }, p.cos)
    tl.fromTo(
      lloc,
      { y: 9, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.45, ease: 'back.out(1.6)' },
      tEscolanets - 0.45 + Math.abs(i - 3) * 0.09
    )
    return p
  })
  pilot(tl, tVeu - 0.3, tFi - tVeu + 0.8, (_p, s) => {
    // Canten: es gronxen tots alhora, molt a poc a poc.
    escolans.forEach((p, i) => p.posa({ inclina: 2.6 * Math.sin(s * 2.1 + i * 0.2) }))
  })
  // La veu: notes que pugen a poc a poc i ones que s'eixamplen en el silenci.
  for (let i = 0; i < 9; i++) {
    const x0 = (i % 7) * 8.4 - 25 + rnd() * 3
    const n = pivot(
      nota(grup(cor, { transform: `translate(${f1(x0)} -16)` }), i % 3 ? TINTA : OR),
      0,
      0
    )
    const t = tVeu - 0.15 + i * 0.27
    tl.fromTo(
      n,
      { x: 0, y: 0, scale: 0.5, autoAlpha: 0 },
      {
        x: (i % 2 ? 1 : -1) * (4 + rnd() * 6),
        y: -20 - rnd() * 12,
        scale: 1.1,
        autoAlpha: 0.95,
        duration: 1,
        ease: 'sine.out',
      },
      t
    )
    tl.to(
      n,
      { x: `+=${(i % 2 ? -1 : 1) * 6}`, y: '-=16', autoAlpha: 0, duration: 1.1, ease: 'sine.in' },
      t + 1
    )
  }
  for (let i = 0; i < 3; i++) {
    const ona = pivot(
      cami(cor, 'M-30 -17A30 30 0 0 1 30 -17', {
        fill: 'none',
        stroke: TINTA,
        'stroke-width': 1,
        'stroke-linecap': 'round',
      }),
      0,
      -2
    )
    esclat(
      tl,
      ona,
      tVeu + i * 0.42,
      { scale: 0.5, autoAlpha: 0.6 },
      { scale: 2.6, autoAlpha: 0, duration: 1.9, ease: 'power1.out' }
    )
  }
  surt(tl, cor, tFi + 0.4, 0.9)
}
