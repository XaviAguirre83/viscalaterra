/**
 * Ambient: el que no és de cap escena i les relliga totes. El poema passa en un
 * dia —surt el sol sobre el mar, es pon darrere el castell i la festa s'acaba
 * de nit— i una serra llunyana acompanya tot el viatge de la càmera.
 */
import {
  OR,
  TERRA_Y,
  TINTA,
  atribut,
  atzar,
  barreja,
  cami,
  cercle,
  crea,
  degradat,
  entra,
  f1,
  grup,
  pilot,
  suau,
  surt,
  type Escenari,
  type Punt,
} from './nucli'

/** Fotograma clau d'un astre: a l'instant t, posició de pantalla i opacitat. */
type ClauAstre = [t: number, sx: number, y: number, opacitat: number]

/** Mou `el` per les claus (interpolació en S) durant tot el seu recorregut. */
function orbita(e: Escenari, el: SVGGElement, claus: ClauAstre[]): void {
  const t0 = claus[0]![0]
  const t1 = claus[claus.length - 1]![0]
  atribut(el, 'visibility', 'hidden')
  pilot(e.tl, t0, t1 - t0, (p, s) => {
    const t = t0 + s
    let i = 1
    while (i < claus.length - 1 && claus[i]![0] < t) i++
    const [ta, xa, ya, oa] = claus[i - 1]!
    const [tb, xb, yb, ob] = claus[i]!
    const k = suau((t - ta) / (tb - ta))
    const opacitat = barreja(oa, ob, k)
    atribut(el, 'visibility', p > 0 && p < 1 && opacitat > 0.01 ? 'visible' : 'hidden')
    atribut(el, 'opacity', opacitat.toFixed(2))
    // Les x van en posicions de pantalla: s'acosten al centre amb la compressió.
    el.setAttribute(
      'transform',
      `translate(${f1(barreja(xa, xb, k) * e.k)} ${f1(barreja(ya, yb, k))})`
    )
  })
}

export function muntaAmbient(e: Escenari): void {
  const { tl, guio } = e
  const q = guio.quan
  const rnd = atzar(2026)
  const tNit = guio.frase('gegants').entra

  // ── Estels: s'encenen quan es fa fosc i fan pampallugues ────────────────
  const estels = grup(e.cel)
  const llista = Array.from({ length: 64 }, () => ({
    el: cercle(estels, f1(-1300 + rnd() * 2600), f1(5 + rnd() * 58), f1(0.5 + rnd() * 0.75), {
      fill: TINTA,
    }),
    base: 0.3 + rnd() * 0.5,
    ritme: 1.2 + rnd() * 2.4,
    fase: rnd() * Math.PI * 2,
  }))
  entra(tl, estels, tNit - 1.2, 3)
  surt(tl, estels, guio.frase('visca').surt, guio.durada - guio.frase('visca').surt - 0.05)
  pilot(
    tl,
    tNit - 1.2,
    guio.durada - (tNit - 1.2),
    (_p, s) => {
      for (const estel of llista) {
        atribut(
          estel.el,
          'fill-opacity',
          (estel.base * (0.62 + 0.38 * Math.sin(s * estel.ritme + estel.fase))).toFixed(2)
        )
      }
    },
    12
  )

  // ── Sol: surt sobre el mar, passa arran del sostre i es pon a ponent ────
  const halo = crea('radialGradient', { id: 'terra-halo-sol' }, e.defs)
  crea('stop', { offset: 0, 'stop-color': OR, 'stop-opacity': 0.42 }, halo)
  crea('stop', { offset: 0.35, 'stop-color': OR, 'stop-opacity': 0.14 }, halo)
  crea('stop', { offset: 1, 'stop-color': OR, 'stop-opacity': 0 }, halo)
  const sol = grup(e.cel)
  cercle(sol, 0, 0, 52, { fill: 'url(#terra-halo-sol)' })
  cercle(sol, 0, 0, 6.5, { fill: OR, 'fill-opacity': 0.6 })
  const tAlba = q('bella') - 0.4
  orbita(e, sol, [
    [tAlba, 340, TERRA_Y + 12, 0],
    [tAlba + 0.8, 340, TERRA_Y + 4, 1],
    [q('pirineus'), 336, 58, 1],
    [q('baixant'), 310, 44, 1],
    [q('esverant'), 236, 25, 1],
    [guio.frase('camps').entra, 226, 17, 1],
    [q('rosa'), 215, 11, 1],
    [q('garraf'), 150, 7, 1],
    [q('gralla'), -220, 22, 1],
    [q('cel'), -330, 56, 1],
    [tNit, -370, TERRA_Y - 4, 0.9],
    [tNit + 1, -380, TERRA_Y + 12, 0],
  ])

  // ── Lluna: mitja lluna que puja quan arriben els gegants ────────────────
  const lluna = grup(e.cel)
  cercle(lluna, 0, 0, 30, { fill: TINTA, 'fill-opacity': 0.05 })
  cami(lluna, 'M3 -9A9.5 9.5 0 1 0 3 9A13 13 0 0 1 3 -9Z', { fill: TINTA, 'fill-opacity': 0.8 })
  orbita(e, lluna, [
    [tNit - 0.5, 330, TERRA_Y + 6, 0],
    [tNit + 0.5, 330, 64, 1],
    [tNit + 2.4, 330, 28, 1],
    [q('diables'), 324, 24, 1],
    [q('silenci'), 290, 18, 1],
    [guio.frase('visca').surt, 270, 20, 1],
    [guio.durada - 0.1, 268, 22, 0],
  ])

  // ── Serra llunyana: silueta suau que es mou més a poc a poc que el món ──
  // És periòdica (suma de sinus de freqüència entera): es pot repetir sense costura.
  const PERIODE = 1500
  const fases = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28]
  const perfil: Punt[] = []
  for (let x = -PERIODE * 2; x <= PERIODE * 3; x += 14) {
    const a = (x / PERIODE) * Math.PI * 2
    const h =
      15 +
      7 * Math.sin(a * 2 + fases[0]!) +
      5 * Math.sin(a * 5 + fases[1]!) +
      3 * Math.sin(a * 11 + fases[2]!) +
      1.6 * Math.sin(a * 23 + fases[3]!)
    perfil.push([x, TERRA_Y - Math.max(2, h)])
  }
  degradat(e.defs, 'terra-llunyania', TINTA, 0.11, 0.01, TERRA_Y - 30, TERRA_Y)
  const serra = cami(
    e.cel,
    'M' +
      perfil.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L') +
      `L${PERIODE * 3} ${TERRA_Y}L${-PERIODE * 2} ${TERRA_Y}Z`,
    { fill: 'url(#terra-llunyania)' }
  )
  entra(tl, serra, q('admirada') - 0.2, 1.6)
  surt(tl, serra, guio.frase('copes').entra - 0.6, 1.2)
  pilot(
    tl,
    0,
    guio.durada,
    (_p, s) => {
      serra.setAttribute('transform', `translate(${(-(e.cam(s) * 0.22) % PERIODE).toFixed(2)} 0)`)
    },
    0
  )
}
