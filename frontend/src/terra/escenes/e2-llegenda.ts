/**
 * Escena 2 · Història i llegenda («Terra de camps… de l'Aran al Garraf»).
 *
 * Passada la roca, els camps. Un castell hi creix, arriba el cavaller, s'alça
 * el drac i la princesa treu el cap: Sant Jordi. De la sang del drac en neix
 * la rosa, al costat s'obre el llibre, i el vent s'endú pètals i llegendes
 * fins a escampar-los per tot el mapa.
 */
import { bufaVent, type Paisatge, type Ratxa } from './e1-paisatge'
import { estel, persona, ull } from './figures'
import { CONTORN, PUNTS } from './mapa-dades'
import {
  ALCADA,
  COS,
  NIT,
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
  degradat,
  entra,
  esclat,
  f1,
  grup,
  limita,
  linia,
  pilot,
  pivot,
  suau,
  surt,
  traca,
  tram,
  type Escenari,
  type Punt,
} from './nucli'

const PEDRA = '#6d7483'
const DRAC = '#6f9c74'
const DRAC_FOSC = '#557a5b'
const CAVALL = '#d5d2c8'
const ROSA_FOSC = '#b23a31'

export interface Llegenda {
  /** x de món on s'acaben els camps i comença el poble. */
  xFiCamps: number
}

export function escenaLlegenda(e: Escenari, paisatge: Paisatge): Llegenda {
  const { tl, guio } = e
  const q = guio.quan
  const rnd = atzar(423)

  const tEntra = guio.frase('camps').entra
  const tCamps = q('camps')
  const tRespiren = q('respiren')
  const tCavallers = q('cavallers')
  const tDracs = q('dracs')
  const tPrinceses = q('princeses')
  const tSant = q('sant')
  const tJordi = q('jordi')
  const tLlibre = q('llibre')
  const tRosa = q('rosa')
  const tLlegendes = q('llegendes')
  const tVent = q('vent')
  const tEscampa = q('escampa')
  const tFi = guio.frase('castells').entra

  // ── Geografia ───────────────────────────────────────────────────────────
  const xDrac = e.on(tDracs, -120)
  const xCastell = xDrac + 112
  const xRosa = xDrac + 3
  const xLlibre = xDrac + 54
  const xCamps0 = paisatge.xFiRoca - 60
  const xCamps1 = e.on(q('garraf'), 520)

  // ── Camps: turons suaus, solcs en perspectiva i blat ────────────────────
  const perfil: Punt[] = []
  for (let x = xCamps0; x <= xCamps1; x += 55) {
    const u = (x - xCamps0) / (xCamps1 - xCamps0)
    const vores = suau(u / 0.12) * suau((1 - u) / 0.12)
    const turo = 13 * Math.exp(-(((x - xCastell - 14) / 90) ** 2))
    perfil.push([x, TERRA_Y - vores * (3 + 9 * rnd() + turo)])
  }
  /** Alçada del turó (y) a la x de món. */
  const yTuro = (x: number): number => {
    const i = limita(Math.floor((x - xCamps0) / 55), 0, perfil.length - 2)
    const [xa, ya] = perfil[i]!
    const [, yb] = perfil[i + 1]!
    return barreja(ya, yb, suau((x - xa) / 55))
  }
  const camps = grup(e.mon)
  degradat(e.defs, 'terra-camps', VERD, 0.24, 0.05, TERRA_Y - 26, TERRA_Y)
  const turons = pivot(grup(camps), 0, TERRA_Y)
  cami(turons, `${corba(perfil)}L${f1(xCamps1)} ${TERRA_Y}L${f1(xCamps0)} ${TERRA_Y}Z`, {
    fill: 'url(#terra-camps)',
  })
  cami(turons, corba(perfil), { fill: 'none', stroke: TINTA, 'stroke-opacity': 0.34 })
  tl.fromTo(
    turons,
    { scaleY: 0, autoAlpha: 0 },
    { scaleY: 1, autoAlpha: 1, duration: 1.3, ease: 'power2.out' },
    tEntra - 0.3
  )
  // «que respiren història»: els turons s'inflen i es desinflen, com un pit.
  tl.to(
    turons,
    { scaleY: 1.14, duration: 1.15, ease: 'sine.inOut', yoyo: true, repeat: 3 },
    tRespiren - 0.2
  )

  const solcs = cami(camps, '', {
    fill: 'none',
    stroke: TINTA,
    'stroke-opacity': 0.2,
    'stroke-width': 1,
  })
  const blat = cami(camps, '', {
    fill: 'none',
    stroke: OR,
    'stroke-opacity': 0.62,
    'stroke-width': 1,
    'stroke-linecap': 'round',
  })
  const tiges = Array.from({ length: 150 }, () => ({
    x: xCamps0 + 40 + rnd() * (xCamps1 - xCamps0 - 80),
    alt: 4 + rnd() * 4.5,
    fase: rnd() * 6.28,
  })).filter(({ x }) => Math.abs(x - xCastell - 12) > 34)
  entra(tl, [solcs, blat], tCamps - 0.3, 1.1)
  pilot(tl, tEntra - 0.4, tFi + 1.6 - (tEntra - 0.4), (_p, s) => {
    const t = tEntra - 0.4 + s
    const c = e.cam(t)
    const x0 = Math.max(xCamps0, c - e.mig() - 30)
    const x1 = Math.min(xCamps1, c + e.mig() + 30)
    // Solcs: surten de la línia de terra i s'obren cap avall en ventall des del
    // centre de la pantalla, com fileres de conreu vistes en perspectiva.
    let d = ''
    for (let x = Math.ceil(x0 / 17) * 17; x < x1; x += 17) {
      d += `M${x} ${TERRA_Y + 1.5}L${f1(x + (x - c) * 0.55)} ${ALCADA}`
    }
    solcs.setAttribute('d', d)
    // Blat: tiges que el vent pentina (més fort quan bufa a «vent»).
    const forca =
      1.4 +
      4 * suau(tram(t, tVent - 0.4, tVent + 0.3)) * (1 - suau(tram(t, tEscampa, tEscampa + 1.5)))
    let b = ''
    for (const tija of tiges) {
      if (tija.x < x0 || tija.x > x1) continue
      const y = yTuro(tija.x)
      const dx = forca * (0.6 + Math.sin(t * 2.4 + tija.fase))
      b += `M${f1(tija.x)} ${f1(y)}q${f1(dx * 0.3)} ${f1(-tija.alt * 0.6)} ${f1(dx)} ${f1(-tija.alt)}`
    }
    blat.setAttribute('d', b)
  })
  surt(tl, camps, tFi + 0.8, 0.8)

  // ── Castell: torre de l'homenatge, muralla i torre de la princesa ───────
  const castell = grup(e.mon, {
    transform: `translate(${f1(xCastell)} ${f1(yTuro(xCastell + 12) + 1.5)})`,
  })
  const pisCastell = pivot(grup(castell), 0, 0)
  // La princesa va darrere la torre: en treu el cap quan sona el seu vers.
  const princesaPis = grup(pisCastell)
  const princesa = persona(princesaPis, -0.5, -29, {
    alt: 21,
    roba: 'tunica',
    toRoba: '#9bbfe3',
    camisa: '#9bbfe3',
    cap: 'con',
  })
  const pedra = {
    fill: PEDRA,
    stroke: TINTA,
    'stroke-opacity': 0.4,
    'stroke-width': 0.8,
    'stroke-linejoin': 'round',
  }
  cami(pisCastell, 'M27 0V-38h11V0Z', pedra)
  cami(pisCastell, 'M24.5 -37.5L32.5 -52L40.5 -37.5Z', { ...pedra, fill: '#8a5148' })
  cami(pisCastell, 'M8 0V-15h3v2.4h3v-2.4h3v2.4h3v-2.4h3v2.4h3v-2.4h3V0Z', pedra)
  cami(pisCastell, 'M-9 0V-30h3.6v3h3.2v-3h3.6v3h3.2v-3h3.6V0Z', pedra)
  cami(
    pisCastell,
    'M14.5 0v-6a3.2 3.2 0 0 1 6.4 0v6ZM-2.2 -17v-4.5a1.7 1.7 0 0 1 3.4 0v4.5ZM31 -27v-3.5a1.5 1.5 0 0 1 3 0v3.5Z',
    {
      fill: NIT,
    }
  )
  linia(pisCastell, 32.5, -52, 32.5, -60, {
    stroke: TINTA,
    'stroke-opacity': 0.7,
    'stroke-width': 0.8,
  })
  const bandera = pivot(
    cami(pisCastell, 'M32.5 -60L40 -58L32.5 -55.5Z', { fill: VERMELL }),
    32.5,
    -58
  )
  tl.fromTo(
    pisCastell,
    { scaleY: 0, autoAlpha: 0 },
    { scaleY: 1, autoAlpha: 1, duration: 0.9, ease: 'back.out(1.5)' },
    q('història') - 0.5
  )
  tl.to(
    bandera,
    { scaleX: 0.72, duration: 0.42, ease: 'sine.inOut', yoyo: true, repeat: 34 },
    q('història') + 0.4
  )
  surt(tl, pisCastell, tFi + 0.4, 0.8)
  // Princesa: puja darrere els merlets i fa senyals amb els braços.
  tl.fromTo(
    princesaPis,
    { y: 22 },
    { y: 0, duration: 0.55, ease: 'back.out(1.8)', immediateRender: true },
    tPrinceses - 0.25
  )
  pilot(tl, tPrinceses - 0.25, tLlegendes - tPrinceses, (_p, s) => {
    const t = tPrinceses - 0.25 + s
    // Abans de la llançada, demana auxili; després, celebra.
    const festa = suau(tram(t, tJordi + 0.3, tJordi + 0.9))
    const bat = Math.sin(t * (9 - 3 * festa))
    princesa.posa({
      bracE: barreja(-118 + 22 * bat, -160 + 12 * bat, festa),
      bracD: barreja(128 - 22 * bat, 160 - 12 * bat, festa),
      avantE: 20,
      avantD: -20,
    })
  })

  // ── Drac ────────────────────────────────────────────────────────────────
  const dracPis = grup(e.mon, { transform: `translate(${f1(xDrac)} ${TERRA_Y})` })
  const drac = grup(dracPis)
  const cosDrac = pivot(grup(drac), 14, 0)
  // Ala (darrere el cos): bat al voltant de l'espatlla.
  const ala = cami(cosDrac, 'M-7 -22L1 -47L25 -53Q19 -45 27 -41Q19 -36 23 -28Q13 -28 7 -17Z', {
    fill: DRAC_FOSC,
    stroke: TINTA,
    'stroke-opacity': 0.35,
    'stroke-width': 0.8,
    'stroke-linejoin': 'round',
  })
  pivot(ala, -7, -22)
  // Potes.
  cami(cosDrac, 'M-11 -12L-13 -2L-17 0H-9L-8 -10ZM8 -9L7 -2L3 0H11L12 -8Z', { fill: DRAC_FOSC })
  // Cua, cos i coll en una sola cinta que s'aprima als extrems.
  const espina: Punt[] = [
    [40, -9],
    [33, -3],
    [25, -4],
    [16, -10],
    [6, -16],
    [-6, -18],
    [-14, -23],
    [-19, -32],
    [-18.5, -40],
    [-21, -46],
  ]
  const gruixos = [0.6, 2.6, 5, 9, 13.5, 14, 11, 7.2, 6, 6.4]
  // Cresta de punxes a la vora de l'esquena (es pinta abans que el cos, que en tapa la base).
  let punxes = ''
  for (let i = 1; i < espina.length - 1; i++) {
    const [x, y] = espina[i]!
    const [xb, yb] = espina[i + 1]!
    const l = Math.hypot(xb - x, yb - y) || 1
    // Direcció de l'espina (de la cua al cap) i normal cap a l'esquena.
    const ux = (xb - x) / l
    const uy = (yb - y) / l
    const nx = -uy
    const ny = ux
    const mig = (gruixos[i]! + gruixos[i + 1]!) / 4
    const alt = 2.2 + mig * 0.55
    const bx = (x + xb) / 2 + nx * (mig - 1)
    const by = (y + yb) / 2 + ny * (mig - 1)
    punxes += `M${f1(bx - ux * 2.6)} ${f1(by - uy * 2.6)}L${f1(bx + nx * alt - ux)} ${f1(by + ny * alt - uy)}L${f1(bx + ux * 2.6)} ${f1(by + uy * 2.6)}Z`
  }
  cami(cosDrac, punxes, { fill: DRAC_FOSC })
  cami(cosDrac, cinta(espina, gruixos), { fill: DRAC })
  // Cap: mandíbules obertes cap a l'esquerra, banya i ull.
  cami(cosDrac, 'M-18 -50L-37 -47.5L-36 -44.5L-24 -43L-34 -39L-33 -37L-20 -39.5L-17 -43Z', {
    fill: DRAC,
  })
  cami(cosDrac, 'M-19 -50L-12 -57L-15.5 -48.5Z', { fill: DRAC_FOSC })
  ull(cosDrac, -23.5, -47, 1)

  // Surt de sota terra amb les ales plegades i les desplega.
  tl.fromTo(
    drac,
    { y: 58, autoAlpha: 0 },
    { y: 0, autoAlpha: 1, duration: 0.75, ease: 'back.out(1.3)' },
    tDracs - 0.35
  )
  tl.fromTo(
    ala,
    { scaleY: 0.15 },
    { scaleY: 1, duration: 0.5, ease: 'back.out(2)', immediateRender: true },
    tDracs
  )
  tl.to(
    ala,
    { rotation: -11, duration: 0.55, ease: 'sine.inOut', yoyo: true, repeat: 3 },
    tDracs + 0.5
  )
  // Llançada: recula, s'esfondra i s'esvaeix.
  tl.to(cosDrac, { rotation: 15, duration: 0.22, ease: 'power2.out' }, tJordi)
  tl.to(drac, { y: 40, autoAlpha: 0, duration: 0.95, ease: 'power2.in' }, tJordi + 0.25)

  // Foc: glopades cap al cavaller mentre s'hi acosta.
  const tFoc0 = tDracs + 0.45
  const tFoc1 = tSant
  const VIDA_FLAMA = 0.5
  const flames = Array.from({ length: 22 }, (_, i) => ({
    el: cercle(dracPis, 0, 0, 2, { fill: OR, visibility: 'hidden' }),
    desfas: (i / 22) * VIDA_FLAMA,
    angle: (188 + (rnd() - 0.5) * 30) * (Math.PI / 180),
    v: 60 + rnd() * 50,
  }))
  pilot(tl, tFoc0, tFoc1 - tFoc0 + VIDA_FLAMA, (p, s) => {
    for (const f of flames) {
      const edat = (s + f.desfas) % VIDA_FLAMA
      const naix = s - edat
      const viva = p > 0 && p < 1 && naix >= -0.05 && naix <= tFoc1 - tFoc0
      atribut(f.el, 'visibility', viva ? 'visible' : 'hidden')
      if (!viva) continue
      const k = edat / VIDA_FLAMA
      f.el.setAttribute('cx', f1(-37 + Math.cos(f.angle) * f.v * edat).toString())
      f.el.setAttribute('cy', f1(-43 - Math.sin(f.angle) * f.v * edat - 14 * k * k).toString())
      f.el.setAttribute('r', f1(1 + 3.2 * Math.sin(Math.PI * Math.min(1, k * 1.25))).toString())
      atribut(f.el, 'fill', k < 0.45 ? OR : VERMELL)
      atribut(f.el, 'fill-opacity', (0.95 - 0.7 * k).toFixed(2))
    }
  })

  // ── Cavaller ────────────────────────────────────────────────────────────
  const cavallerPis = grup(e.mon)
  const cavaller = grup(cavallerPis)
  const muntura = grup(cavaller)
  const potes = [
    [-14, 0.8],
    [-10.5, 0],
    [9, 0.8],
    [12.5, 0],
  ].map(([x, fase]) => {
    const g = grup(grup(muntura, { transform: `translate(${x} -13)` }))
    linia(g, 0, 0, 0, 12, { stroke: CAVALL, 'stroke-width': 2.6, 'stroke-linecap': 'round' })
    return { g, davantera: x! > 0, fase: fase! }
  })
  cami(
    muntura,
    cinta(
      [
        [-17, -20],
        [-23, -17],
        [-26, -10],
        [-25, -4],
      ],
      [2.4, 3.2, 2.2, 0.6]
    ),
    { fill: CAVALL }
  )
  cami(
    muntura,
    corba([
      [-16, -22],
      [-18, -17],
      [-15, -12],
      [-9, -11.5],
      [4, -11],
      [11, -12.5],
      [14, -17],
      [15, -24],
      [18, -30.5],
      [22, -30],
      [27, -28.5],
      [29, -31],
      [24, -36],
      [20, -41],
      [18.5, -38],
      [13, -32],
      [7, -24.5],
      [-4, -22.5],
      [-16, -22],
    ]) + 'Z',
    { fill: CAVALL }
  )
  ull(muntura, 24.2, -33.6, 0.7)
  // Genet: cama, tors, cap amb casc i plomall, escut amb la creu.
  const genet = grup(muntura)
  linia(genet, 0, -23, 3.5, -12.5, { stroke: COS, 'stroke-width': 3, 'stroke-linecap': 'round' })
  linia(genet, 0, -24, 1.6, -35, { stroke: COS, 'stroke-width': 5.4, 'stroke-linecap': 'round' })
  cercle(genet, 2.2, -40.6, 3.2, { fill: COS })
  cami(genet, 'M-1.3 -40.2A3.5 3.5 0 0 1 5.7 -40.2Z', { fill: TINTA })
  cami(genet, 'M2 -43.8Q-3 -49 -7.5 -45.5Q-3 -46 -0.5 -43Z', { fill: VERMELL })
  const llanca = grup(grup(genet, { transform: 'translate(3 -29.5)' }))
  linia(llanca, -15, 0, 42, 0, { stroke: TINTA, 'stroke-width': 1.3, 'stroke-linecap': 'round' })
  cami(llanca, 'M42 -1.6L47.5 0L42 1.6Z', { fill: TINTA })
  cami(llanca, 'M30 0V-6.5L37 -3.2Z', { fill: VERMELL })
  cami(genet, 'M-2.5 -33.5H4.5V-28.5Q4.5 -24.5 1 -23Q-2.5 -24.5 -2.5 -28.5Z', { fill: TINTA })
  cami(genet, 'M1 -33V-24M-2 -29.6H4', { fill: 'none', stroke: VERMELL, 'stroke-width': 1.3 })

  const tGalop0 = tCavallers - 0.5
  const tFre = tSant - 0.6
  const tCarrega = tSant - 0.2
  // Surt de dalt de la roca, baixa el vessant al galop, frena davant el drac,
  // s'encabrita i carrega.
  const xSortida = paisatge.xRoca + 86
  const xParada = xDrac - 165
  const xCavaller = (t: number): number => {
    const arriba = tram(t, tGalop0, tFre)
    const carrega = tram(t, tCarrega, tJordi)
    return barreja(xSortida, xParada, 1 - (1 - arriba) ** 2) + 104 * carrega * carrega
  }
  entra(tl, cavaller, tGalop0, 0.5)
  pilot(tl, tGalop0, tRosa - tGalop0, (_p, s) => {
    const t = tGalop0 + s
    const x = xCavaller(t)
    const galop = (x - xSortida) / 8.5
    // Només galopa mentre avança.
    const moviment =
      t < tFre
        ? 1 - tram(t, tFre - 0.4, tFre) * 0.8
        : tram(t, tCarrega, tCarrega + 0.1) * (1 - tram(t, tJordi, tJordi + 0.3))
    const encabrita =
      suau(tram(t, tFre, tFre + 0.2)) * (1 - suau(tram(t, tCarrega - 0.05, tCarrega + 0.15)))
    // El cavall segueix el terreny: de baixada, va inclinat com el pendent.
    const pendent =
      (Math.atan2(paisatge.yTerra(x + 7) - paisatge.yTerra(x - 7), 14) * 180) / Math.PI
    cavallerPis.setAttribute(
      'transform',
      `translate(${f1(x)} ${f1(paisatge.yTerra(x) - 1.6 * moviment * Math.abs(Math.sin(galop)))})`
    )
    muntura.setAttribute(
      'transform',
      `rotate(${f1(pendent - 13 * encabrita + 3.5 * moviment * Math.sin(galop + 1))} -12 0)`
    )
    for (const pota of potes) {
      const a =
        34 * moviment * Math.sin(galop + pota.fase + (pota.davantera ? 0 : 2.6)) +
        (pota.davantera ? 38 * encabrita : 0)
      pota.g.setAttribute('transform', `rotate(${f1(-a)})`)
    }
    // Llança: enlaire mentre cavalca, baixa per carregar i torna a pujar.
    const baixa = suau(tram(t, tFre, tCarrega)) * (1 - suau(tram(t, tJordi + 0.5, tJordi + 1.1)))
    llanca.setAttribute('transform', `rotate(${f1(barreja(-58, 4, baixa))})`)
  })
  surt(tl, cavaller, tLlibre + 0.1, 0.9)

  // El cop: una espurna al pit del drac.
  const cop = pivot(
    estel(grup(e.mon, { transform: `translate(${f1(xDrac - 15)} ${TERRA_Y - 27})` }), 9),
    0,
    0
  )
  esclat(
    tl,
    cop,
    tJordi - 0.03,
    { scale: 0.1, rotation: -30, autoAlpha: 1 },
    { scale: 1.5, rotation: 30, autoAlpha: 0, duration: 0.45, ease: 'power2.out' }
  )

  // ── La rosa: neix on ha caigut el drac ──────────────────────────────────
  const roser = grup(e.mon, { transform: `translate(${f1(xRosa)} ${f1(yTuro(xRosa) + 1)})` })
  const rosa = pivot(grup(roser), 0, 0)
  const tija = cami(rosa, 'M0 0C-4 -9 4 -17 0.5 -27', {
    fill: 'none',
    stroke: VERD,
    'stroke-width': 1.5,
    'stroke-linecap': 'round',
  })
  const fulles = [
    pivot(cami(rosa, 'M-1.2 -9Q-9 -13 -11 -7Q-5 -5 -1.2 -9Z', { fill: VERD }), -1.2, -9),
    pivot(cami(rosa, 'M1.8 -16Q9 -21 11.5 -15Q6 -12 1.8 -16Z', { fill: VERD }), 1.8, -16),
  ]
  const flor = pivot(grup(rosa), 0.5, -27)
  cami(flor, 'M-5 -27Q-6 -34 0.5 -35.5Q7 -34 6 -27Q0.5 -23.5 -5 -27Z', { fill: VERMELL })
  cami(flor, 'M-3.4 -29.5Q-1 -34 2.6 -31.4Q4 -28.4 0.6 -27.6Q-1.6 -28.6 0.4 -30.4', {
    fill: 'none',
    stroke: ROSA_FOSC,
    'stroke-width': 1,
    'stroke-linecap': 'round',
  })
  cami(flor, 'M-4.6 -26.6L0.5 -24L5.6 -26.6L0.5 -22.2Z', { fill: VERD })
  traca(tl, tija, tLlibre + 0.2, tRosa - tLlibre - 0.3, 'power1.out')
  fulles.forEach((fullaRosa, i) => {
    tl.fromTo(
      fullaRosa,
      { scale: 0, autoAlpha: 0 },
      { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2)' },
      tLlibre + 0.55 + i * 0.25
    )
  })
  tl.fromTo(
    flor,
    { scale: 0, rotation: -50, autoAlpha: 0 },
    { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.6, ease: 'back.out(2.6)' },
    tRosa - 0.1
  )
  tl.to(
    rosa,
    { rotation: 5, duration: 1.3, ease: 'sine.inOut', yoyo: true, repeat: 5 },
    tRosa + 0.5
  )
  surt(tl, roser, tFi + 0.3, 0.8)

  // ── El llibre: s'obre i passa pàgines ───────────────────────────────────
  const llibrePis = grup(e.mon, {
    transform: `translate(${f1(xLlibre)} ${f1(yTuro(xLlibre) - 1)})`,
  })
  const llibre = pivot(grup(llibrePis), 0, 0)
  cami(llibre, 'M-19 -1.5L0 2L19 -1.5V-14L0 -10.5L-19 -14Z', { fill: '#8a5148' })
  const fulla = 'M0 -1Q-9 -6 -17.5 -3V-15.5Q-9 -18.5 0 -13.5Z'
  cami(llibre, fulla, { fill: TINTA })
  cami(llibre, fulla, { fill: '#e2ddd0', transform: 'scale(-1 1)' })
  cami(
    llibre,
    'M-14 -12.6Q-8 -14.4 -3 -11.6M-14 -9.6Q-8 -11.4 -3 -8.6M-14 -6.6Q-8 -8.4 -3 -5.6M14 -12.6Q8 -14.4 3 -11.6M14 -9.6Q8 -11.4 3 -8.6M14 -6.6Q8 -8.4 3 -5.6',
    {
      fill: 'none',
      stroke: NIT,
      'stroke-opacity': 0.45,
      'stroke-width': 0.7,
    }
  )
  const pagina = pivot(cami(llibre, fulla, { fill: '#fffdf6' }), 0, 0)
  tl.fromTo(
    llibre,
    { scaleX: 0.06, y: 8, autoAlpha: 0 },
    { scaleX: 1, y: 0, autoAlpha: 1, duration: 0.55, ease: 'back.out(1.6)' },
    tLlibre - 0.2
  )
  for (const t of [tLlibre + 0.5, tRosa + 0.4, tLlegendes - 0.3, tLlegendes + 0.5, tVent]) {
    tl.fromTo(
      pagina,
      { scaleX: -1 },
      { scaleX: 1, duration: 0.5, ease: 'sine.inOut', immediateRender: true },
      t
    )
  }
  surt(tl, llibrePis, tFi + 0.3, 0.8)

  // ── Llegendes i pètals: surten del llibre i de la rosa, i el vent se'ls endú ─
  // Mapa al cel, fix a la pantalla: és on aniran a parar.
  const MAPA_X = -30 * e.k
  const MAPA_Y = 45
  const MAPA_ESCALA = 0.72
  const aMapa = ([x, y]: readonly [number, number]): Punt => [
    MAPA_X + x * MAPA_ESCALA,
    MAPA_Y + y * MAPA_ESCALA,
  ]
  const cel = grup(e.davant)
  const mapaCel = grup(cel, { transform: `translate(${MAPA_X} ${MAPA_Y}) scale(${MAPA_ESCALA})` })
  cami(mapaCel, CONTORN, { fill: TINTA, 'fill-opacity': 0.1 })
  cami(mapaCel, CONTORN, {
    fill: 'none',
    stroke: TINTA,
    'stroke-opacity': 0.9,
    'stroke-width': 1.5,
    'stroke-linecap': 'round',
    'stroke-dasharray': '0.1 3',
    'vector-effect': 'non-scaling-stroke',
  })
  entra(tl, mapaCel, tEscampa + 0.1, 1.1)
  surt(tl, cel, tFi - 0.5, 0.9)

  // Les quatre comarques del vers: hi arriba un pètal i s'hi encén un punt.
  const fites = [
    { mot: "l'empordà", punt: aMapa(PUNTS.emporda) },
    { mot: 'montsià', punt: aMapa(PUNTS.montsia) },
    { mot: "l'aran", punt: aMapa(PUNTS.aran) },
    { mot: 'garraf', punt: aMapa(PUNTS.garraf) },
  ].map((fita) => ({ ...fita, t: q(fita.mot) }))
  for (const [a, b] of [
    [fites[0]!, fites[1]!],
    [fites[2]!, fites[3]!],
  ] as const) {
    // Arc d'una comarca a l'altra, bombat cap a ponent.
    const mx = (a.punt[0] + b.punt[0]) / 2 - 9
    const my = (a.punt[1] + b.punt[1]) / 2 - 7
    const arc = cami(
      cel,
      `M${f1(a.punt[0])} ${f1(a.punt[1])}Q${f1(mx)} ${f1(my)} ${f1(b.punt[0])} ${f1(b.punt[1])}`,
      {
        fill: 'none',
        stroke: VERMELL,
        'stroke-opacity': 0.85,
        'stroke-width': 1.2,
        'stroke-linecap': 'round',
      }
    )
    traca(tl, arc, a.t, b.t - a.t, 'sine.inOut')
  }
  for (const fita of fites) {
    const punt = grup(cel, { transform: `translate(${f1(fita.punt[0])} ${f1(fita.punt[1])})` })
    const anell = pivot(
      cercle(punt, 0, 0, 3, { fill: 'none', stroke: TINTA, 'stroke-width': 1 }),
      0,
      0
    )
    const nucli = pivot(
      cercle(punt, 0, 0, 2.3, { fill: VERMELL, stroke: TINTA, 'stroke-width': 0.8 }),
      0,
      0
    )
    tl.fromTo(
      nucli,
      { scale: 0, autoAlpha: 0 },
      { scale: 1, autoAlpha: 1, duration: 0.3, ease: 'back.out(3)' },
      fita.t
    )
    esclat(
      tl,
      anell,
      fita.t,
      { scale: 0.5, autoAlpha: 0.9 },
      { scale: 3.4, autoAlpha: 0, duration: 0.9, ease: 'power1.out' }
    )
  }

  // Volves: fulls del llibre (crema) i pètals de la rosa (vermells). Pugen a
  // poc a poc fins que arriba el vent i llavors volen cap al mapa.
  const volves = Array.from({ length: 30 }, (_, i) => {
    const petal = i % 2 === 0
    const g = grup(cel, { visibility: 'hidden' })
    cami(g, petal ? 'M0 -2.6Q2.6 -1 0 2.6Q-2.6 -1 0 -2.6Z' : 'M-2.2 -1.4H2.2V1.4H-2.2Z', {
      fill: petal ? VERMELL : TINTA,
      'fill-opacity': petal ? 0.95 : 0.8,
    })
    // Destí: un punt del mapa (les quatre primeres volves, les quatre comarques).
    const desti: Punt =
      i < 4 ? fites[i]!.punt : [MAPA_X + (rnd() - 0.5) * 70, MAPA_Y + (rnd() - 0.5) * 70]
    return {
      g,
      petal,
      desti,
      // Les quatre primeres arriben just quan sona la seva comarca.
      arriba: i < 4 ? fites[i]!.t : tEscampa + 0.4 + rnd() * 2.6,
      surt: (petal ? tRosa + 0.6 : tLlegendes - 0.3) + rnd() * (tVent - tLlegendes),
      dx: (rnd() - 0.5) * 16,
      alt: 10 + rnd() * 20,
      fase: rnd() * 6.28,
      gir: (rnd() - 0.5) * 900,
    }
  })
  const tVolves0 = tRosa + 0.5
  pilot(tl, tVolves0, tFi - 0.5 - tVolves0, (p, s) => {
    const t = tVolves0 + s
    for (const v of volves) {
      const viva = p > 0 && p < 1 && t > v.surt
      atribut(v.g, 'visibility', viva ? 'visible' : 'hidden')
      if (!viva) continue
      // Origen (en pantalla): la flor de la rosa o el llibre obert, que es mouen amb la càmera.
      const ox = (v.petal ? xRosa : xLlibre) - e.cam(t) + v.dx
      const oy =
        (v.petal ? yTuro(xRosa) - 30 : yTuro(xLlibre) - 14) -
        v.alt * suau(tram(t, v.surt, v.surt + 1.6))
      // Vol: del lloc on flotava fins al seu punt del mapa, fent ziga-zagues.
      const tVol = Math.max(tVent - 0.2 + (v.surt - tVolves0) * 0.08, v.surt + 0.4)
      const k = suau(tram(t, tVol, v.arriba))
      const onada = Math.sin(k * Math.PI) * (9 * Math.sin(t * 5 + v.fase))
      const x = barreja(ox + 2.5 * Math.sin(t * 2.2 + v.fase), v.desti[0], k)
      const y = barreja(oy, v.desti[1], k) + onada - 14 * Math.sin(k * Math.PI)
      v.g.setAttribute(
        'transform',
        `translate(${f1(x)} ${f1(y)}) rotate(${f1(v.gir * (t - v.surt) * 0.3)})`
      )
      // Un cop posades al mapa, s'apaguen a poc a poc (les fites, de seguida: hi queda el punt).
      const apaga = 1 - tram(t, v.arriba + (v.desti === fites[0]?.punt ? 0 : 0.2), v.arriba + 1.4)
      atribut(v.g, 'opacity', (tram(t, v.surt, v.surt + 0.3) * apaga).toFixed(2))
    }
  })

  // «que el vent encara escampa»: les mateixes ratxes de la tramuntana.
  const ratxes: Ratxa[] = Array.from({ length: 6 }, (_, i) => ({
    t: barreja(tVent - 0.5, tEscampa + 0.3, i / 5) + rnd() * 0.15,
    durada: 1.3 + rnd() * 0.5,
    x: (-460 + i * 105 + rnd() * 50) * e.k,
    y: 26 + rnd() * 40,
    llarg: 230 + rnd() * 130,
    baixa: -14 + rnd() * 20,
    rinxol: i % 2 === 0,
    gruix: 1.3,
    opacitat: 0.5,
  }))
  bufaVent(e, grup(e.davant), rnd, ratxes)

  return { xFiCamps: xCamps1 }
}
