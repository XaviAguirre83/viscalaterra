/**
 * Escena 3 · Castellers («Ferma terra de castells… fins a tocar el cel»).
 *
 * A la plaça, la pinya s'aplega i fa de terra ferma; pis a pis s'aixeca el
 * castell a toc de gralla, i l'enxaneta s'enfila fins a dalt de tot i fa
 * l'aleta: toca el cel, i s'hi encén un estel.
 */
import { estel, nota, persona } from './figures'
import {
  COS,
  COS_FOSC,
  NIT,
  OR,
  TERRA_Y,
  TINTA,
  VERMELL,
  atribut,
  atzar,
  barreja,
  cami,
  cercle,
  crea,
  entra,
  esclat,
  f1,
  grup,
  linia,
  pilot,
  pivot,
  suau,
  surt,
  tram,
  type Escenari,
  type Punt,
} from './nucli'

const CAMISA = '#c4574b'
const PANTALO = '#dad7cd'
const FAIXA = '#1c2632'
/** Alçada d'un pis del tronc. */
const PIS = 10
/** Alçada de la pinya: on trepitgen els segons. */
const PINYA = 15

/** Casteller vist de cara, amb els peus a (x, y): camisa, faixa i pantaló blanc. */
export function casteller(
  pare: Element,
  x: number,
  y: number,
  escala = 1,
  fosc = false
): SVGGElement {
  const g = grup(pare, { transform: `translate(${f1(x)} ${f1(y)}) scale(${escala})` })
  const camisa = fosc ? '#a3483f' : CAMISA
  cami(g, 'M-1.6 0V-4.6M1.6 0V-4.6', {
    fill: 'none',
    stroke: fosc ? '#b7b4ab' : PANTALO,
    'stroke-width': 2.1,
  })
  // Braços oberts cap als companys de pis.
  cami(g, 'M-2.6 -8.6L-6.6 -6.8M2.6 -8.6L6.6 -6.8', {
    fill: 'none',
    stroke: camisa,
    'stroke-width': 1.7,
    'stroke-linecap': 'round',
  })
  crea('rect', { x: -2.8, y: -9.8, width: 5.6, height: 4.6, rx: 1.2, fill: camisa }, g)
  linia(g, -2.8, -5, 2.8, -5, { stroke: FAIXA, 'stroke-width': 1.6 })
  cercle(g, 0, -11.5, 1.9, { fill: fosc ? COS_FOSC : COS })
  return g
}

export function escenaCastell(e: Escenari): void {
  const { tl, guio } = e
  const q = guio.quan
  const rnd = atzar(1801)

  const tEntra = guio.frase('castells').entra
  const tEnxaneta = q("l'enxaneta")
  const tCel = q('cel')
  const tFi = guio.frase('gegants').entra

  const xTorre = e.on(q('castells'), 300)
  const colla = grup(e.mon, { transform: `translate(${f1(xTorre)} ${TERRA_Y})` })

  // ── Pom de dalt i tronc (es pinten darrere la pinya) ────────────────────
  const tronc = pivot(grup(colla), 0, -PINYA)
  const puja = (g: SVGGElement, t: number) =>
    tl.fromTo(
      g,
      { y: 9, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.55, ease: 'back.out(1.7)' },
      t
    )

  // Pisos del tronc, de baix a dalt: cadascun puja amb una paraula del vers.
  const tPisos = [
    q('castells') - 0.15,
    q('castellers') - 0.15,
    q('germanor') - 0.1,
    q('torres') - 0.2,
  ]
  tPisos.forEach((t, k) => {
    const pis = grup(tronc)
    const y = -PINYA - k * PIS
    casteller(pis, 0, y - 0.6, 0.94, true)
    casteller(pis, -6.4, y)
    casteller(pis, 6.4, y)
    puja(pis, t)
  })
  // Pom de dalt: dosos, acotxador i, a dalt de tot, l'enxaneta.
  const yDosos = -PINYA - tPisos.length * PIS
  const dosos = grup(tronc)
  casteller(dosos, -3.4, yDosos, 0.82)
  casteller(dosos, 3.4, yDosos, 0.82)
  puja(dosos, q('alçant', 1) - 0.1)
  const yAcotxador = yDosos - 9.2
  const acotxador = grup(tronc)
  crea('ellipse', { cx: 0, cy: f1(yAcotxador - 1.6), rx: 4.2, ry: 2.4, fill: CAMISA }, acotxador)
  cercle(acotxador, 3.2, f1(yAcotxador - 3.2), 1.5, { fill: COS })
  puja(acotxador, tEnxaneta - 0.45)
  // El castell tremola una mica: fan força.
  tl.to(
    tronc,
    { rotation: 1.1, duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: 9 },
    q('germanor')
  )

  // ── L'enxaneta: s'enfila per l'esquena del castell i fa l'aleta ─────────
  const yCim = yAcotxador - 4.2
  const enxaneta = grup(tronc, { visibility: 'hidden' })
  const cosEnxaneta = grup(enxaneta)
  cami(cosEnxaneta, 'M-1.1 0V-3.2M1.1 0V-3.2', {
    fill: 'none',
    stroke: PANTALO,
    'stroke-width': 1.5,
  })
  crea('rect', { x: -2, y: -6.8, width: 4, height: 3.6, rx: 1, fill: CAMISA }, cosEnxaneta)
  cercle(cosEnxaneta, 0, -8.2, 1.5, { fill: COS })
  cami(cosEnxaneta, 'M-1.7 -8.1A1.7 1.7 0 0 1 1.7 -8.1Z', { fill: TINTA })
  const bracos = [-1, 1].map((costat) =>
    linia(grup(cosEnxaneta, { transform: `translate(${costat * 1.8} -6.2)` }), 0, 0, 0, 3.4, {
      stroke: CAMISA,
      'stroke-width': 1.3,
      'stroke-linecap': 'round',
    })
  )
  const cami_: Punt[] = [
    [10.5, -PINYA + 2],
    [10.5, yDosos - 2],
    [6, yDosos - 7],
    [3.5, yAcotxador - 2],
    [0, yCim],
  ]
  const tPuja0 = tEnxaneta - 0.15
  const tDalt = q('tocar') + 0.25
  const tAleta = tCel - 0.2
  pilot(tl, tPuja0, tFi - tPuja0, (p, s) => {
    const t = tPuja0 + s
    atribut(enxaneta, 'visibility', p > 0 ? 'visible' : 'hidden')
    // Posició al llarg del camí d'ascens (trams de la mateixa durada).
    const k = suau(tram(t, tPuja0, tDalt)) * (cami_.length - 1)
    const i = Math.min(Math.floor(k), cami_.length - 2)
    const [xa, ya] = cami_[i]!
    const [xb, yb] = cami_[i + 1]!
    const grimpa = t < tDalt ? Math.sin(t * 15) : 0
    enxaneta.setAttribute(
      'transform',
      `translate(${f1(barreja(xa, xb, k - i))} ${f1(barreja(ya, yb, k - i))})`
    )
    // Mentre grimpa, braços alterns amunt; a dalt, alça el braç dret: l'aleta.
    const aleta = suau(tram(t, tAleta, tAleta + 0.2))
    bracos[0]!.setAttribute('transform', `rotate(${f1(t < tDalt ? 150 + 25 * grimpa : 12)})`)
    bracos[1]!.setAttribute(
      'transform',
      `rotate(${f1(t < tDalt ? -150 + 25 * grimpa : barreja(-12, -172, aleta))})`
    )
  })

  // Tocar el cel: s'hi encén un estel, i espurnes al voltant.
  const cel = grup(tronc, { transform: `translate(2.2 ${f1(yCim - 12.5)})` })
  const estelGran = pivot(estel(cel, 5.2, OR), 0, 0)
  tl.fromTo(
    estelGran,
    { scale: 0, rotation: -60, autoAlpha: 0 },
    { scale: 1.15, rotation: 0, autoAlpha: 1, duration: 0.35, ease: 'back.out(3)' },
    tCel
  )
  tl.to(
    estelGran,
    { scale: 0.8, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 3 },
    tCel + 0.35
  )
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4
    const espurna = pivot(estel(cel, 1.6 + rnd() * 1.4, TINTA), 0, 0)
    esclat(
      tl,
      espurna,
      tCel + 0.05,
      { x: 0, y: 0, scale: 0.3, autoAlpha: 0.95 },
      {
        x: Math.cos(a) * (13 + rnd() * 8),
        y: Math.sin(a) * (10 + rnd() * 6),
        scale: 1,
        autoAlpha: 0,
        duration: 0.9 + rnd() * 0.4,
        ease: 'power2.out',
      }
    )
  }

  // ── La pinya: terra ferma. Gent que s'aplega dels dos costats ───────────
  const pinya = pivot(grup(colla), 0, 0)
  const files = [
    { n: 6, y: -13.5, ampla: 17 },
    { n: 9, y: -10.3, ampla: 31 },
    { n: 11, y: -6.8, ampla: 43 },
    { n: 13, y: -3.2, ampla: 54 },
  ]
  const camises = [CAMISA, CAMISA, CAMISA, '#8d928f', '#6f7d8c', '#b9b6ac']
  const pells = [COS, COS_FOSC, '#c7c4ba']
  files.forEach((fila, f) => {
    for (let i = 0; i < fila.n; i++) {
      const x =
        barreja(-fila.ampla, fila.ampla, fila.n === 1 ? 0.5 : i / (fila.n - 1)) + (rnd() - 0.5) * 2
      const membre = grup(pinya)
      crea(
        'ellipse',
        {
          cx: f1(x),
          cy: f1(fila.y + 3.4),
          rx: 3.5,
          ry: 2.6,
          fill: camises[Math.floor(rnd() * camises.length)]!,
        },
        membre
      )
      cercle(membre, f1(x), f1(fila.y), 2.05, { fill: pells[Math.floor(rnd() * pells.length)]! })
      const costat = x === 0 ? (rnd() < 0.5 ? -1 : 1) : Math.sign(x)
      tl.fromTo(
        membre,
        { x: costat * (60 + rnd() * 110), autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.9, ease: 'power2.out' },
        tEntra - 0.3 + (3 - f) * 0.12 + rnd() * 0.85
      )
    }
  })
  // «Ferma»: la pinya s'estreny. Al final, quan l'enxaneta fa l'aleta, salta d'alegria.
  tl.to(
    pinya,
    { scaleX: 0.94, duration: 0.3, ease: 'power2.inOut', yoyo: true, repeat: 1 },
    q('ferma') + 1.45
  )
  tl.to(pinya, { y: -1.8, duration: 0.16, ease: 'power1.out', yoyo: true, repeat: 7 }, tCel + 0.15)

  // ── A toc de gralla ─────────────────────────────────────────────────────
  const graller = persona(colla, -78, 0, {
    alt: 27,
    cap: 'barretina',
    faixa: VERMELL,
    camisa: '#cfccc2',
  })
  graller.posa({ bracD: 52, avantD: 62, bracE: 26, avantE: 96 })
  const gralla = grup(graller.g)
  linia(gralla, 2.2, -21.2, 12.5, -14.5, {
    stroke: '#b98d5e',
    'stroke-width': 1.5,
    'stroke-linecap': 'round',
  })
  cami(gralla, 'M11 -17.2L15.4 -12.8L12.4 -12.2Z', { fill: '#b98d5e' })
  entra(tl, graller.g, q('toc') - 0.9, 0.5)
  const tToc = q('toc')
  pilot(tl, tToc - 0.9, tFi - tToc, (_p, s) => {
    // Es gronxa al compàs mentre toca.
    graller.posa({ inclina: 4 * Math.sin(s * 5.2), salt: 0.6 * Math.abs(Math.sin(s * 5.2)) })
  })
  const tNotes = [
    tToc - 0.1,
    tToc + 0.35,
    q('gralla') - 0.05,
    q('gralla') + 0.45,
    q('gralla') + 0.95,
    q('gralla') + 1.6,
  ]
  tNotes.forEach((t, i) => {
    const n = pivot(
      nota(grup(colla, { transform: 'translate(-62 -15)' }), i % 2 ? OR : TINTA),
      0,
      0
    )
    tl.fromTo(
      n,
      { x: 0, y: 0, scale: 0.5, rotation: -20, autoAlpha: 0 },
      {
        x: 9 + (i % 3) * 7,
        y: -17 - (i % 2) * 7,
        scale: 1.15,
        rotation: 14,
        autoAlpha: 0.95,
        duration: 0.55,
        ease: 'power1.out',
      },
      t
    )
    tl.to(
      n,
      { x: `+=${5 + i}`, y: '-=10', autoAlpha: 0, duration: 0.7, ease: 'power1.in' },
      t + 0.55
    )
  })

  // Ombra de la colla a terra (ajuda a llegir que trepitgen la plaça).
  crea('ellipse', { cx: 0, cy: 1.2, rx: 60, ry: 2.6, fill: NIT, 'fill-opacity': 0.5 }, colla)

  surt(tl, colla, tFi - 0.5, 0.8)
}
