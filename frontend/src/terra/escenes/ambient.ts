/**
 * Ambient: el que no és de cap escena i les relliga totes. El poema passa en un
 * dia sencer (vegeu dia.ts): de nit hi ha lluna i estels; amb el sol, el fons de
 * la capçalera s'aclareix i perd saturació, i quan es pon torna a ser nit. Una
 * serra llunyana acompanya el viatge de la càmera.
 */
import type { Astre } from './dia'
import {
  FONS_DIA,
  FONS_NIT,
  OR,
  TERRA_Y,
  TINTA,
  alCel,
  atribut,
  atzar,
  barrejaColor,
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

/** Color del sol arran de l'horitzó (a l'alba i a la posta). */
const SOL_BAIX = '#f2a25c'

/** Claror a partir de la qual ja no es veu cap estel. */
const LLUM_SENSE_ESTELS = 0.5

export function muntaAmbient(e: Escenari): void {
  const { tl, guio, dia } = e
  const q = guio.quan
  const rnd = atzar(2026)

  // ── Estels: de nit fan pampallugues; la claror del sol els apaga ────────
  // Cada estel fa un nombre enter de pampallugues per volta del poema: així
  // el bucle empalma sense cap salt de brillantor.
  const estels = grup(e.cel)
  const voltes = (ritme: number) => Math.round((ritme * guio.durada) / (2 * Math.PI))
  const llista = Array.from({ length: 90 }, () => ({
    el: cercle(estels, f1(-1300 + rnd() * 2600), 0, f1(0.5 + rnd() * 0.75), { fill: TINTA }),
    y: 5 + rnd() * 58,
    base: 0.3 + rnd() * 0.5,
    ritme: (voltes(1.2 + rnd() * 2.4) * 2 * Math.PI) / guio.durada,
    fase: rnd() * Math.PI * 2,
  }))
  pilot(
    tl,
    0,
    guio.durada,
    (_p, s) => {
      const foscor = 1 - suau(dia.llum(s) / LLUM_SENSE_ESTELS)
      atribut(estels, 'visibility', foscor > 0.01 ? 'visible' : 'hidden')
      if (foscor <= 0.01) return
      atribut(estels, 'opacity', foscor.toFixed(2))
      const escala = e.escala()
      for (const estel of llista) {
        atribut(estel.el, 'cy', f1(alCel(estel.y, escala)).toString())
        atribut(
          estel.el,
          'fill-opacity',
          (estel.base * (0.62 + 0.38 * Math.sin(s * estel.ritme + estel.fase))).toFixed(2)
        )
      }
    },
    12
  )

  // ── Sol: surt sobre el mar, fa el cim al mig del poema i es pon a ponent ─
  const halo = crea('radialGradient', { id: 'terra-halo-sol' }, e.defs)
  const aturades = [
    crea('stop', { offset: 0, 'stop-color': OR, 'stop-opacity': 0.42 }, halo),
    crea('stop', { offset: 0.35, 'stop-color': OR, 'stop-opacity': 0.14 }, halo),
    crea('stop', { offset: 1, 'stop-color': OR, 'stop-opacity': 0 }, halo),
  ]
  const sol = grup(e.cel)
  const resplendor = cercle(sol, 0, 0, 52, { fill: 'url(#terra-halo-sol)' })
  const disc = cercle(sol, 0, 0, 6.5, { fill: OR, 'fill-opacity': 0.6 })

  // ── Lluna: mitja lluna, a l'altra banda del cel ─────────────────────────
  const lluna = grup(e.cel)
  cercle(lluna, 0, 0, 30, { fill: TINTA, 'fill-opacity': 0.05 })
  cami(lluna, 'M3 -9A9.5 9.5 0 1 0 3 9A13 13 0 0 1 3 -9Z', { fill: TINTA, 'fill-opacity': 0.8 })

  /**
   * Posa un astre al seu lloc. Les x són de pantalla: s'acosten al centre amb la
   * compressió. Les y són alçades del cel: arriben al sostre encara que l'escena s'encongeixi.
   */
  const posa = (el: SVGGElement, { x, y, opacitat }: Astre) => {
    atribut(el, 'visibility', opacitat > 0.01 ? 'visible' : 'hidden')
    if (opacitat <= 0.01) return
    atribut(el, 'opacity', opacitat.toFixed(2))
    atribut(el, 'transform', `translate(${f1(x * e.k)} ${f1(alCel(y, e.escala()))})`)
  }

  // ── El dia: astres i color del cel ──────────────────────────────────────
  pilot(tl, 0, guio.durada, (_p, s) => {
    posa(sol, dia.sol(s))
    posa(lluna, dia.lluna(s))
    const llum = dia.llum(s)
    // Arran de l'horitzó el sol és més vermell i gros; amunt, daurat.
    const color = barrejaColor(SOL_BAIX, OR, llum)
    atribut(disc, 'fill', color)
    for (const aturada of aturades) atribut(aturada, 'stop-color', color)
    atribut(resplendor, 'r', f1(52 + 22 * (1 - llum)).toString())
    // El cel: de nit, el fons de sempre de la capçalera; de dia, més clar.
    e.pintaCel(llum < 0.004 ? '' : barrejaColor(FONS_NIT, FONS_DIA, llum))
  })

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
