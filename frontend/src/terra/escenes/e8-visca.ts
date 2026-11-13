/**
 * Escenes 8 i 9 · El brindis i el clam («Del mar a la muntanya… VISCA LA TERRA!»).
 *
 * El viatge es resumeix en quatre emblemes —el mar, la muntanya, la plaça i
 * la taula—, salta el tap del cava, s'alcen les copes i, amb el clam final,
 * torna el mapa del principi: ara amb les quatre províncies de colors i focs
 * d'artifici.
 */
import { serralada } from './e1-paisatge'
import { casteller } from './e3-castell'
import { estel } from './figures'
import { CENTRES, CONTORN, PROVINCIES } from './mapa-dades'
import {
  BLAU,
  COS,
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
  crea,
  degradat,
  esclat,
  f1,
  grup,
  limita,
  linia,
  pilot,
  pivot,
  poligonal,
  surt,
  traca,
  tram,
  type Escenari,
  type Punt,
} from './nucli'

/** Colors de les províncies: els del mapa de la web, una mica més vius. */
const COLOR_PROVINCIA: Record<string, string> = {
  '25': '#dba51f',
  '43': '#3f82cc',
  '08': '#d94a3d',
  '17': '#43943f',
}

export function escenaVisca(e: Escenari): void {
  const { tl, guio } = e
  const q = guio.quan
  const rnd = atzar(2606)

  const tEntra = guio.frase('mar', 1).entra
  const tCava = q('cava')
  const tCopes = q('copes')
  const tPlegats = q('plegats')
  const tClamem = q('clamem')
  const tVisca = q('visca')
  const tTerra = guio.frase('visca').escrita
  const tSurt = guio.frase('visca').surt

  // Tot el final és fix a la pantalla: la càmera ja s'ha aturat.
  const final = grup(e.davant)

  // ── Del mar a la muntanya, de la plaça a la taula: quatre emblemes ──────
  // En pantalles estretes van més junts i, perquè no es trepitgin, més petits.
  const fris = grup(final)
  const mida = Math.min(1, e.k * 1.45)
  const emblema = (sx: number, t: number): SVGGElement => {
    const lloc = grup(fris, { transform: `translate(${f1(sx * e.k)} ${TERRA_Y}) scale(${mida})` })
    const g = pivot(grup(lloc), 0, 0)
    tl.fromTo(
      g,
      { scale: 0.5, y: 8, autoAlpha: 0 },
      { scale: 1, y: 0, autoAlpha: 1, duration: 0.5, ease: 'back.out(1.8)' },
      t - 0.2
    )
    return g
  }

  // El mar: onades i un llagut de vela llatina.
  const mar = emblema(-300, q('mar', 1))
  const aigua = cami(mar, '', { fill: 'url(#terra-mar)', stroke: TINTA, 'stroke-opacity': 0.6 })
  const llagut = grup(mar)
  cami(llagut, 'M-10 -5Q0 -0.5 10 -5L7.6 -1.6H-7.6Z', { fill: COS })
  linia(llagut, -0.5, -5, -0.5, -19, { stroke: COS, 'stroke-width': 1 })
  cami(llagut, 'M-1.5 -21L10.5 -7.5L-1.5 -8.4Z', { fill: TINTA, 'fill-opacity': 0.9 })
  pilot(tl, tEntra, tCava - tEntra + 0.6, (_p, s) => {
    const punts: Punt[] = []
    for (let x = -42; x <= 42; x += 6) punts.push([x, -3.4 + 1.9 * Math.sin(x * 0.19 - s * 3.2)])
    aigua.setAttribute('d', `${poligonal(punts)}L42 9L-42 9Z`)
    llagut.setAttribute(
      'transform',
      `translate(0 ${f1(1.2 * Math.sin(s * 3.2))}) rotate(${f1(5 * Math.sin(s * 3.2 + 1))})`
    )
  })

  // La muntanya.
  const muntanya = emblema(-172, q('muntanya'))
  degradat(e.defs, 'terra-fris-muntanya', TINTA, 0.42, 0.06, -46, 0)
  const cims = serralada(rnd, -42, 84, 46, 4, 0.55, 0)
  cami(muntanya, cims.d, {
    fill: 'url(#terra-fris-muntanya)',
    stroke: TINTA,
    'stroke-opacity': 0.4,
    'stroke-linejoin': 'round',
  })
  if (cims.neu) cami(muntanya, cims.neu, { fill: TINTA, 'fill-opacity': 0.75 })

  // La plaça: un castell en miniatura (pinya, tres pisos i l'enxaneta).
  const placa = emblema(172, q('plaça'))
  for (let k = 0; k < 3; k++) {
    const y = -8 - k * 10
    casteller(placa, 0, y - 0.6, 0.94, true)
    casteller(placa, -6.4, y)
    casteller(placa, 6.4, y)
  }
  casteller(placa, 0, -38, 0.7)
  linia(placa, 1.6, -44, 3.2, -49, {
    stroke: '#c4574b',
    'stroke-width': 1.1,
    'stroke-linecap': 'round',
  })
  for (let i = 0; i < 11; i++) {
    const x = -20 + i * 4
    crea(
      'ellipse',
      { cx: x, cy: -1.4 - (i % 2) * 2.4, rx: 3.2, ry: 2.4, fill: i % 3 ? '#c4574b' : '#8d928f' },
      placa
    )
    cercle(placa, x, -4.6 - (i % 2) * 2.4, 1.9, { fill: i % 4 ? COS : '#c7c4ba' })
  }

  // La taula.
  const taula = emblema(300, q('taula', 1))
  for (const x of [-17, 0, 17]) {
    cami(
      taula,
      `M${x - 6.4} -13Q${x - 6.8} -20 ${x - 2.4} -21.4L${x + 2.4} -21.4Q${x + 6.8} -20 ${x + 6.4} -13Z`,
      {
        fill: x === 0 ? '#6d9fcf' : '#dedbd1',
      }
    )
    cercle(taula, x, -25.4, 3.3, { fill: COS })
  }
  cami(taula, 'M-24 0L-20 -8L-16 0M16 0L20 -8L24 0', {
    fill: 'none',
    stroke: '#8a6a4f',
    'stroke-width': 1.4,
  })
  crea('rect', { x: -30, y: -13.5, width: 60, height: 6.4, fill: 'url(#terra-vichy)' }, taula)
  linia(taula, -30, -13.5, 30, -13.5, { stroke: TINTA, 'stroke-opacity': 0.8 })
  cami(taula, 'M7 -13.6V-18.6Q7 -20 8 -20.6V-23.4H9.6V-20.6Q10.6 -20 10.6 -18.6V-13.6Z', {
    fill: '#4f7f5c',
  })

  // «Del… a la…»: un arc de punts lliga cada parella.
  for (const [x0, x1, t0, t1] of [
    [-300, -172, q('mar', 1), q('muntanya')],
    [172, 300, q('plaça'), q('taula', 1)],
  ] as const) {
    const xa = x0 * e.k + 36 * mida
    const xb = x1 * e.k - 32 * mida
    const d =
      `M${f1(xa)} ${f1(TERRA_Y - 36 * mida)}` +
      `Q${f1((xa + xb) / 2)} ${f1(TERRA_Y - 62 * mida)} ${f1(xb)} ${f1(TERRA_Y - 38 * mida)}`
    const arc = cami(fris, d, {
      fill: 'none',
      stroke: TINTA,
      'stroke-opacity': 0.55,
      'stroke-width': 1.2,
      'stroke-linecap': 'round',
    })
    traca(tl, arc, t0 + 0.15, t1 - t0 - 0.2, 'sine.inOut')
  }
  surt(tl, fris, tCava - 0.5, 0.7)

  // ── Amb cava a les copes ────────────────────────────────────────────────
  const brindis = grup(final)
  // L'ampolla: la sacsegen i salta el tap.
  const INCLINA = 28
  const X_AMPOLLA = -122 * e.k
  const ampolla = pivot(
    grup(grup(brindis, { transform: `translate(${f1(X_AMPOLLA)} ${TERRA_Y + 2})` })),
    0,
    0
  )
  cami(ampolla, 'M-4.8 0V-13Q-4.8 -17.4 -1.9 -19.6V-27H1.9V-19.6Q4.8 -17.4 4.8 -13V0Z', {
    fill: '#3f6b4a',
    stroke: TINTA,
    'stroke-opacity': 0.35,
    'stroke-width': 0.6,
  })
  crea('rect', { x: -2.1, y: -27.4, width: 4.2, height: 5.6, fill: OR }, ampolla)
  crea(
    'rect',
    { x: -3.7, y: -11.6, width: 7.4, height: 6.2, fill: TINTA, 'fill-opacity': 0.88 },
    ampolla
  )
  tl.fromTo(
    ampolla,
    { y: 34, rotation: INCLINA, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, duration: 0.4, ease: 'back.out(1.6)' },
    tCava - 0.75
  )
  tl.to(
    ampolla,
    { rotation: INCLINA + 9, duration: 0.07, ease: 'sine.inOut', yoyo: true, repeat: 3 },
    tCava - 0.32
  )
  tl.to(ampolla, { y: 40, autoAlpha: 0, duration: 0.5, ease: 'power1.in' }, tCopes + 0.2)

  // Boca de l'ampolla (ja inclinada), d'on surten el tap i l'escuma.
  const a = (INCLINA * Math.PI) / 180
  const xBoca = X_AMPOLLA + 27.5 * Math.sin(a)
  const yBoca = TERRA_Y + 2 - 27.5 * Math.cos(a)
  const tap = grup(brindis, { visibility: 'hidden' })
  crea('rect', { x: -1.9, y: -2.6, width: 3.8, height: 5.2, rx: 1, fill: '#c9a36b' }, tap)
  const escuma = Array.from({ length: 22 }, () => {
    const angle = a - Math.PI / 2 + (rnd() - 0.5) * 1.1
    const v = 50 + rnd() * 120
    return {
      el: cercle(brindis, 0, 0, 0.8 + rnd() * 1.1, { fill: TINTA, visibility: 'hidden' }),
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      vida: 0.5 + rnd() * 0.6,
    }
  })
  pilot(tl, tCava, 1.3, (p, s) => {
    const viu = p > 0 && p < 1
    // El tap fa una paràbola per damunt del vers i cau a l'altra banda.
    atribut(tap, 'visibility', viu ? 'visible' : 'hidden')
    tap.setAttribute(
      'transform',
      `translate(${f1(xBoca + 215 * e.k * s)} ${f1(yBoca - 150 * s + 215 * s * s)}) rotate(${f1(INCLINA + 900 * s)})`
    )
    atribut(tap, 'opacity', (1 - tram(s, 0.95, 1.3)).toFixed(2))
    for (const g of escuma) {
      const viva = viu && s < g.vida
      atribut(g.el, 'visibility', viva ? 'visible' : 'hidden')
      if (!viva) continue
      g.el.setAttribute('cx', f1(xBoca + g.vx * s).toString())
      g.el.setAttribute('cy', f1(yBoca + g.vy * s + 170 * s * s).toString())
      atribut(g.el, 'fill-opacity', (0.9 * (1 - s / g.vida)).toFixed(2))
    }
  })

  // Les copes: braços que s'alcen des de baix, a banda i banda del vers.
  const llocs = [-266, -222, -178, -134, 134, 178, 222, 266].map((sx) => sx * e.k)
  const manigues = ['#dedbd1', '#6d9fcf', '#c4574b', '#86a886']
  const copes = llocs.map((sx, i) => {
    const lloc = grup(brindis, { transform: `translate(${sx} ${TERRA_Y + 4})` })
    const copa = pivot(grup(lloc), 0, 12)
    linia(copa, 0, 30, 0, 3, {
      stroke: manigues[i % manigues.length]!,
      'stroke-width': 4.4,
      'stroke-linecap': 'round',
    })
    cercle(copa, 0, 0.6, 2.9, { fill: COS })
    cami(copa, 'M0 0V-9M-2.6 0.4H2.6', {
      fill: 'none',
      stroke: TINTA,
      'stroke-opacity': 0.85,
      'stroke-width': 0.9,
    })
    cami(copa, 'M-3 -9.6L-3.3 -20H3.3L3 -9.6Q0 -8 -3 -9.6Z', { fill: OR, 'fill-opacity': 0.85 })
    cami(copa, 'M-3.1 -9L-3.5 -24H3.5L3.1 -9Q0 -7.2 -3.1 -9Z', {
      fill: TINTA,
      'fill-opacity': 0.14,
      stroke: TINTA,
      'stroke-opacity': 0.85,
      'stroke-width': 0.8,
    })
    // Pugen (amb «copes») del centre cap enfora…
    const ordre = Math.abs(sx) / (44 * e.k) - 3
    tl.fromTo(
      copa,
      { y: 46, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.5, ease: 'back.out(1.5)' },
      tCopes - 0.4 + ordre * 0.09
    )
    // …s'alcen totes alhora («tots plegats») i dringuen de dues en dues («clamem»).
    const cap = i % 2 === 0 ? 1 : -1
    tl.to(copa, { y: -9, rotation: cap * 6, duration: 0.45, ease: 'power2.out' }, tPlegats - 0.25)
    tl.to(
      copa,
      { rotation: cap * 19, duration: 0.14, ease: 'power2.in', yoyo: true, repeat: 1 },
      tClamem - 0.14
    )
    tl.to(
      copa,
      { y: 46, autoAlpha: 0, duration: 0.45, ease: 'power1.in' },
      tVisca - 0.5 + ordre * 0.04
    )
    return { sx, copa }
  })
  // El dring: una espurna entre cada parella de copes.
  for (let i = 0; i < copes.length; i += 2) {
    const x = (copes[i]!.sx + copes[i + 1]!.sx) / 2
    const dring = pivot(
      estel(grup(brindis, { transform: `translate(${x} ${TERRA_Y - 24})` }), 6, TINTA),
      0,
      0
    )
    esclat(
      tl,
      dring,
      tClamem,
      { scale: 0.2, rotation: -40, autoAlpha: 1 },
      { scale: 1.3, rotation: 30, autoAlpha: 0, duration: 0.5, ease: 'power2.out' }
    )
  }

  // Bombolles: pugen per tota la capçalera fins al final.
  const bombolles = Array.from({ length: 54 }, () => ({
    el: cercle(final, 0, 0, 0.7 + rnd() * 1.2, {
      fill: rnd() < 0.6 ? OR : TINTA,
      visibility: 'hidden',
    }),
    x: -600 + rnd() * 1200,
    v: 15 + rnd() * 26,
    desfas: rnd() * 8,
    fase: rnd() * 6.28,
  }))
  const tBombolles = tCava + 0.1
  pilot(tl, tBombolles, guio.durada - tBombolles, (p, s) => {
    const t = tBombolles + s
    const força = tram(t, tBombolles, tBombolles + 1.2) * (1 - tram(t, tSurt, guio.durada - 0.05))
    for (const b of bombolles) {
      // Cada bombolla fa el seu cicle de pujada i torna a néixer a baix.
      const cicle = 100 / b.v
      const edat = (s + b.desfas) % cicle
      const neix = s - edat
      const viva = p > 0 && p < 1 && neix > -0.01
      atribut(b.el, 'visibility', viva ? 'visible' : 'hidden')
      if (!viva) continue
      b.el.setAttribute('cx', f1(b.x + 2.6 * Math.sin(edat * 3 + b.fase)).toString())
      b.el.setAttribute('cy', f1(98 - b.v * edat).toString())
      atribut(
        b.el,
        'fill-opacity',
        (0.55 * força * limita(edat * 3) * limita((cicle - edat) * 2)).toFixed(2)
      )
    }
  })

  // ── VISCA LA TERRA! El mapa, ara de colors ──────────────────────────────
  const marc = grup(final, { transform: 'translate(0 55) scale(0.92)' })
  const mapa = pivot(grup(marc), 0, 0)
  const provincies = ['25', '43', '08', '17'].map((codi, i) => {
    const [cx, cy] = CENTRES[codi]!
    const p = pivot(
      cami(mapa, PROVINCIES[codi]!, {
        fill: COLOR_PROVINCIA[codi]!,
        stroke: COLOR_PROVINCIA[codi]!,
        'stroke-width': 0.5,
      }),
      cx,
      cy
    )
    // Cada província creix des del seu centre, l'una rere l'altra.
    tl.fromTo(
      p,
      { scale: 0.2, autoAlpha: 0 },
      { scale: 1, autoAlpha: 0.4, duration: 0.5, ease: 'back.out(1.7)' },
      tVisca - 0.12 + i * 0.17
    )
    return p
  })
  const contorn = cami(mapa, CONTORN, {
    fill: 'none',
    stroke: TINTA,
    'stroke-opacity': 0.9,
    'stroke-width': 1.3,
    'stroke-linejoin': 'round',
    'vector-effect': 'non-scaling-stroke',
  })
  traca(tl, contorn, tVisca - 0.5, 1.1)
  // «TERRA!»: batec fort, i després respira fins al fosc final.
  tl.to(mapa, { scale: 1.09, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1 }, tTerra)
  tl.to(
    provincies,
    { autoAlpha: 0.72, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1 },
    tTerra
  )
  tl.to(
    mapa,
    { scale: 1.035, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: 2 },
    tTerra + 0.6
  )

  // Focs d'artifici a banda i banda.
  const colorsFoc = [OR, VERMELL, TINTA, BLAU, VERD]
  const focs = [
    { dt: 0, sx: -205, y: 30 },
    { dt: 0.35, sx: 232, y: 26 },
    { dt: 0.8, sx: -350, y: 38 },
    { dt: 1.3, sx: 362, y: 34 },
    { dt: 1.9, sx: -128, y: 20 },
    { dt: 2.4, sx: 150, y: 22 },
    { dt: 3.0, sx: -285, y: 27 },
    { dt: 3.5, sx: 300, y: 30 },
    { dt: 4.0, sx: -420, y: 40 },
    { dt: 4.3, sx: 440, y: 36 },
  ]
  const VIDA_FOC = 1.2
  const PUJADA = 0.4
  focs.forEach(({ dt, sx, y }, i) => {
    const foc = { dt, sx: sx * e.k, y }
    const color = colorsFoc[i % colorsFoc.length]!
    const coet = linia(final, 0, 0, 0, 0, {
      stroke: TINTA,
      'stroke-opacity': 0.6,
      'stroke-width': 1,
      'stroke-linecap': 'round',
      visibility: 'hidden',
    })
    const espurnes = Array.from({ length: 22 }, (_, j) => ({
      el: linia(final, 0, 0, 0, 0, {
        stroke: color,
        'stroke-width': 1.6,
        'stroke-linecap': 'round',
        visibility: 'hidden',
      }),
      angle: (j / 22) * Math.PI * 2 + rnd() * 0.25,
      abast: 24 + rnd() * 20,
    }))
    const t0 = tVisca + foc.dt - PUJADA
    pilot(tl, t0, PUJADA + VIDA_FOC, (p, s) => {
      const viu = p > 0 && p < 1
      // El coet puja deixant un rastre i esclata en rotllana.
      const puja = tram(s, 0, PUJADA)
      atribut(coet, 'visibility', viu && s < PUJADA ? 'visible' : 'hidden')
      const yCoet = barreja(TERRA_Y + 14, foc.y, 1 - (1 - puja) ** 2)
      coet.setAttribute('x1', foc.sx.toString())
      coet.setAttribute('x2', foc.sx.toString())
      coet.setAttribute('y1', f1(yCoet).toString())
      coet.setAttribute('y2', f1(yCoet + 9 * (1 - puja) + 2).toString())
      const tau = (s - PUJADA) / VIDA_FOC
      for (const g of espurnes) {
        const viva = viu && tau > 0
        atribut(g.el, 'visibility', viva ? 'visible' : 'hidden')
        if (!viva) continue
        // Surten de pressa i es frenen; al final cauen una mica.
        const r1 = g.abast * (1 - (1 - tau) ** 3)
        const r0 = g.abast * (1 - (1 - Math.max(0, tau - 0.14)) ** 3)
        const cau = 9 * tau * tau
        g.el.setAttribute('x1', f1(foc.sx + Math.cos(g.angle) * r0).toString())
        g.el.setAttribute('y1', f1(foc.y + Math.sin(g.angle) * r0 + cau).toString())
        g.el.setAttribute('x2', f1(foc.sx + Math.cos(g.angle) * r1).toString())
        g.el.setAttribute('y2', f1(foc.y + Math.sin(g.angle) * r1 + cau).toString())
        atribut(g.el, 'stroke-opacity', ((1 - tau) ** 1.4).toFixed(2))
      }
    })
  })

  // Fosc final: tot s'esvaeix alhora que el vers.
  surt(tl, final, tSurt, guio.durada - tSurt - 0.05)
}
