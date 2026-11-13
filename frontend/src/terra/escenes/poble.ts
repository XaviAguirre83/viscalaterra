/**
 * El poble: rengle de cases amb el campanar i el terra de la plaça. És el
 * decorat de les escenes de festa (castell, cercavila i sardana).
 */
import {
  ALCADA,
  NIT,
  OR,
  TERRA_Y,
  TINTA,
  amaga,
  atzar,
  cami,
  entra,
  f1,
  grup,
  pilot,
  surt,
  type Escenari,
} from './nucli'

export interface Poble {
  /**
   * Encén finestres a l'instant t: `fraccio` (0–1) de les que encara són
   * fosques, començant per les més properes a la x de món `xFocus`.
   */
  encen(t: number, fraccio: number, xFocus: number): void
}

export function muntaPoble(e: Escenari, x0: number, x1: number, t0: number, t1: number): Poble {
  const { tl } = e
  const rnd = atzar(88)
  const poble = grup(e.mon)
  const cases = grup(poble)
  // N'hi ha centenars: en lloc d'un element per finestra, totes les fosques van
  // en un sol camí i les que s'encenen, en uns quants camins per tongada.
  const finestres: { x: number; y: number; encesa: boolean }[] = []
  const finestra = (x: number, y: number) => finestres.push({ x, y, encesa: false })
  const rectangles = (llista: { x: number; y: number }[]) =>
    llista.map((f) => `M${f1(f.x)} ${f1(f.y)}h2.4v3.4h-2.4Z`).join('')

  let x = x0
  let comptador = 0
  while (x < x1) {
    const campanar = comptador % 9 === 4
    const w = campanar ? 15 : 24 + rnd() * 22
    const h = campanar ? 62 : 22 + rnd() * 22
    const y = TERRA_Y - h
    const to = { fill: TINTA, 'fill-opacity': f1(0.07 + rnd() * 0.05) }
    if (campanar) {
      // Campanar: torre quadrada, finestrals del cos de campanes i teulat en punta.
      cami(cases, `M${f1(x)} ${TERRA_Y}V${f1(y)}h${w}V${TERRA_Y}Z`, to)
      cami(
        cases,
        `M${f1(x - 1.5)} ${f1(y)}L${f1(x + w / 2)} ${f1(y - 13)}L${f1(x + w + 1.5)} ${f1(y)}Z`,
        {
          fill: TINTA,
          'fill-opacity': 0.14,
        }
      )
      cami(
        cases,
        `M${f1(x + 3)} ${f1(y + 14)}v-6a2 2 0 0 1 4 0v6ZM${f1(x + 8)} ${f1(y + 14)}v-6a2 2 0 0 1 4 0v6Z`,
        { fill: NIT, 'fill-opacity': 0.6 }
      )
    } else {
      const teulada = rnd() < 0.6
      cami(
        cases,
        teulada
          ? `M${f1(x)} ${TERRA_Y}V${f1(y)}L${f1(x + w / 2)} ${f1(y - 6 - rnd() * 4)}L${f1(x + w)} ${f1(y)}V${TERRA_Y}Z`
          : `M${f1(x)} ${TERRA_Y}V${f1(y)}h${f1(w)}V${TERRA_Y}Z`,
        to
      )
      if (!teulada)
        cami(cases, `M${f1(x - 1)} ${f1(y)}h${f1(w + 2)}`, { stroke: TINTA, 'stroke-opacity': 0.2 })
      // Finestres en graella i, de tant en tant, un portal d'arc.
      const columnes = Math.max(2, Math.floor(w / 9))
      const pisos = Math.max(1, Math.floor((h - 12) / 10))
      for (let p = 0; p < pisos; p++) {
        for (let c = 0; c < columnes; c++) {
          if (rnd() < 0.2) continue
          finestra(x + ((c + 0.5) * w) / columnes - 1.2, y + 5 + p * 10)
        }
      }
      if (rnd() < 0.5) {
        const xp = x + w * (0.3 + rnd() * 0.4)
        cami(cases, `M${f1(xp - 3)} ${TERRA_Y}v-7a3 3 0 0 1 6 0v7Z`, {
          fill: NIT,
          'fill-opacity': 0.45,
        })
      }
    }
    x += w + (rnd() < 0.25 ? 6 + rnd() * 14 : 0.5)
    comptador++
  }
  cami(cases, rectangles(finestres), { fill: NIT, 'fill-opacity': 0.5 })
  const llums = grup(poble)

  // Terra de la plaça: llambordes en perspectiva, amb el punt de fuga al centre
  // de la pantalla (com els solcs dels camps).
  const paviment = cami(poble, '', { fill: 'none', stroke: TINTA, 'stroke-opacity': 0.14 })
  pilot(tl, t0, t1 - t0, (_p, s) => {
    const c = e.cam(t0 + s)
    const xa = Math.max(x0, c - e.mig() - 40)
    const xb = Math.min(x1, c + e.mig() + 40)
    if (xb <= xa) {
      paviment.setAttribute('d', '')
      return
    }
    let d = `M${f1(xa)} ${TERRA_Y + 4.5}H${f1(xb)}M${f1(xa)} ${TERRA_Y + 10.5}H${f1(xb)}`
    for (let xl = Math.ceil(xa / 30) * 30; xl < xb; xl += 30) {
      d += `M${xl} ${TERRA_Y + 1}L${f1(xl + (xl - c) * 0.5)} ${ALCADA}`
    }
    paviment.setAttribute('d', d)
  })

  entra(tl, poble, t0, 1.2)
  surt(tl, poble, t1 - 1, 1)

  return {
    encen(t, fraccio, xFocus) {
      const fosques = finestres
        .filter((f) => !f.encesa)
        .sort((a, b) => Math.abs(a.x - xFocus) - Math.abs(b.x - xFocus))
      const tongada = fosques.slice(0, Math.round(fosques.length * fraccio))
      for (const f of tongada) f.encesa = true
      // S'encenen en vuit glopades seguides, de més a prop a més lluny.
      const GLOPADES = 8
      const mida = Math.ceil(tongada.length / GLOPADES)
      for (let i = 0; i < GLOPADES && i * mida < tongada.length; i++) {
        const llum = cami(llums, rectangles(tongada.slice(i * mida, (i + 1) * mida)), { fill: OR })
        amaga(llum)
        tl.to(llum, { autoAlpha: 0.62, duration: 0.25 }, t + (i / GLOPADES) * 0.7)
      }
    },
  }
}
