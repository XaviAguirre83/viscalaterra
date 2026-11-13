/**
 * Escena 4 · Cercavila i foc («Terra de gegants… que fan tronar la nit»).
 *
 * En ple migdia la festa surt al carrer: desfilen els gegants, els capgrossos i
 * els bastoners; els trabucaires engeguen un tret que desperta el poble (les
 * finestres s'encenen), i els diables tanquen la corrua sota una pluja
 * d'espurnes.
 */
import { camina, estel, persona, ull, type Persona } from './figures'
import {
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
  f1,
  grup,
  limita,
  linia,
  pilot,
  pivot,
  suau,
  tram,
  type Escenari,
} from './nucli'
import type { Poble } from './poble'

const PELL = '#d6c7b3'
const FUSTA = '#c9a36b'

interface Gegant {
  g: SVGGElement
  /** Balla: gronxa el cos i obre els braços. `fase` en radians. */
  balla(fase: number): void
}

/** Gegant de cercavila amb la base a (x, y): faldó ample, braços que volen i corona. */
function gegant(pare: Element, x: number, y: number, rei: boolean): Gegant {
  const g = grup(pare, { transform: `translate(${f1(x)} ${f1(y)})` })
  const roba = rei ? '#b5483e' : '#5d8ebd'
  // Peus del portador, que treuen el nas per sota el faldó.
  const peus = [-3.6, 3.6].map((px) =>
    crea('ellipse', { cx: px, cy: -0.8, rx: 2.6, ry: 1.3, fill: NIT }, g)
  )
  const cos = grup(g)
  const bracos = [-1, 1].map((costat) => {
    const b = grup(grup(cos, { transform: `translate(${costat * 9.3} -45.5)` }))
    linia(b, 0, 0, 0, 12, { stroke: roba, 'stroke-width': 3.4, 'stroke-linecap': 'round' })
    cercle(b, 0, 13.2, 1.9, { fill: PELL })
    return { b, costat }
  })
  cami(cos, 'M-12.5 -1Q-13.5 -20 -8.6 -37L-9.6 -46.5Q0 -51 9.6 -46.5L8.6 -37Q13.5 -20 12.5 -1Z', {
    fill: roba,
  })
  // Sanefa del faldó i tira del davant.
  cami(cos, 'M-12.4 -5.5Q0 -3 12.4 -5.5M0 -47V-4.5', {
    fill: 'none',
    stroke: OR,
    'stroke-width': 1.3,
    'stroke-opacity': 0.85,
  })
  cami(cos, 'M-3.2 -50V-46.5H3.2V-50Z', { fill: PELL })
  crea('ellipse', { cx: 0, cy: -55, rx: 4.9, ry: 5.7, fill: PELL }, cos)
  if (rei) {
    cami(cos, 'M-4.9 -55Q-5 -47.5 0 -46.5Q5 -47.5 4.9 -55Q2.6 -51.5 0 -52.2Q-2.6 -51.5 -4.9 -55Z', {
      fill: '#5b4636',
    })
    cami(cos, 'M-5 -58.6L-5.6 -65L-2.5 -61.6L0 -66L2.5 -61.6L5.6 -65L5 -58.6Z', { fill: OR })
  } else {
    cami(cos, 'M-5.2 -54Q-6.4 -62.5 0 -62.5Q6.4 -62.5 5.2 -54Q3.6 -59 0 -59Q-3.6 -59 -5.2 -54Z', {
      fill: '#5b4636',
    })
    cami(cos, 'M-3.6 -61.4L-4 -65.2L-1.8 -63L0 -66L1.8 -63L4 -65.2L3.6 -61.4Z', { fill: OR })
  }
  ull(cos, -1.9, -55.4, 0.75)
  ull(cos, 1.9, -55.4, 0.75)
  return {
    g,
    balla(fase) {
      const s = Math.sin(fase)
      // El gir es fingeix aprimant el cos; els braços s'obren amb l'embranzida.
      cos.setAttribute(
        'transform',
        `translate(0 ${f1(-0.9 * Math.abs(Math.cos(fase)))}) rotate(${f1(4.5 * s)}) scale(${f1(0.84 + 0.16 * Math.abs(Math.cos(fase * 0.5)))} 1)`
      )
      for (const { b, costat } of bracos)
        b.setAttribute('transform', `rotate(${f1(-costat * (26 + 22 * s * costat))})`)
      peus.forEach((peu, i) =>
        peu.setAttribute(
          'cx',
          f1((i ? 3.6 : -3.6) + 1.4 * Math.sin(fase * 2 + i * Math.PI)).toString()
        )
      )
    },
  }
}

/** Capgròs: cos de criatura i un cap de cartró enorme. */
function capgros(pare: Element, x: number, y: number, variant: number): Persona {
  const p = persona(pare, x, y, { alt: 17, camisa: ['#6f9c74', '#d9d6cc', '#5d8ebd'][variant % 3] })
  const cap = grup(p.cos, { transform: 'translate(0 -21.5)' })
  cercle(cap, 0, 0, 7.4, { fill: PELL })
  // Barret, cabells o boina segons el personatge.
  if (variant % 3 === 0)
    cami(cap, 'M-7.4 -1.2A7.4 7.4 0 0 1 7.4 -1.2Q0 -4.4 -7.4 -1.2Z', { fill: VERMELL })
  else if (variant % 3 === 1)
    cami(
      cap,
      'M-7.2 -1.8Q-8.6 -8.6 -2.6 -7.6Q0 -10.6 2.8 -7.6Q8.6 -8.4 7.2 -1.8Q3.6 -5.4 0 -4.6Q-3.6 -5.4 -7.2 -1.8Z',
      { fill: '#5b4636' }
    )
  else cami(cap, 'M-7.8 -2.4Q-6.6 -9.4 1 -8.4Q8.4 -7.4 7.4 -2.2Q0 -5 -7.8 -2.4Z', { fill: NIT })
  ull(cap, -2.6, -0.4, 1)
  ull(cap, 2.6, -0.4, 1)
  cercle(cap, 0, 1.6, 1.3, { fill: '#c58f7a' })
  cercle(cap, -4.6, 2.2, 1.3, { fill: VERMELL, 'fill-opacity': 0.55 })
  cercle(cap, 4.6, 2.2, 1.3, { fill: VERMELL, 'fill-opacity': 0.55 })
  cami(cap, 'M-3 3.6Q0 6.2 3 3.6', {
    fill: 'none',
    stroke: NIT,
    'stroke-width': 0.9,
    'stroke-linecap': 'round',
  })
  return p
}

export function escenaCercavila(e: Escenari, poble: Poble): void {
  const { tl, guio } = e
  const q = guio.quan
  const rnd = atzar(907)

  const tFi = guio.frase('festiva').entra
  /** Velocitat de la corrua, en unitats de món per segon (cap a l'esquerra). */
  const PAS = -22

  /**
   * Colla de la cercavila: entra a `sx` de la pantalla quan sona el seu vers
   * (`t`) i avança cap a l'esquerra. `mou(g, x, s)` col·loca cada figura.
   */
  function colla(
    t: number,
    sx: number,
    velocitat: number,
    dibuixa: (g: SVGGElement) => (x: number, s: number, t: number) => void
  ) {
    const g = grup(e.mon, { visibility: 'hidden' })
    const mou = dibuixa(g)
    const x0 = e.on(t, sx)
    const t0 = t - 0.45
    pilot(tl, t0, tFi + 0.4 - t0, (p, s) => {
      const ara = t0 + s
      const x = x0 + velocitat * (ara - t) + 40 * (1 - suau(tram(ara, t0, t0 + 0.7)))
      atribut(g, 'visibility', p > 0 && p < 1 ? 'visible' : 'hidden')
      atribut(
        g,
        'opacity',
        (tram(ara, t0, t0 + 0.5) * (1 - tram(ara, tFi - 0.5, tFi + 0.35))).toFixed(2)
      )
      g.setAttribute('transform', `translate(${f1(x)} ${TERRA_Y})`)
      mou(x, s, ara)
    })
  }

  // ── Gegants ─────────────────────────────────────────────────────────────
  colla(q('gegants'), -60, PAS, (g) => {
    const rei = gegant(g, 0, 0, true)
    const reina = gegant(g, 31, 0, false)
    return (_x, s) => {
      rei.balla(s * 2.6)
      reina.balla(s * 2.6 + 1.9)
    }
  })

  // ── Capgrossos ──────────────────────────────────────────────────────────
  colla(q('capgrossos'), -12, PAS, (g) => {
    const caps = [0, 1, 2].map((i) => capgros(g, i * 19, 0, i))
    return (x, s) => {
      caps.forEach((cap, i) => {
        camina(cap, x / 3.4 + i * 2, 28)
        cap.posa({
          inclina: 9 * Math.sin(s * 5.5 + i * 2.1),
          salt: 1.8 * Math.abs(Math.sin(s * 5.5 + i * 2.1)),
        })
      })
    }
  })

  // ── Bastoners: dues parelles que piquen al compàs ───────────────────────
  const tPiquen = q('piquen')
  const COMPAS = q('fort') - tPiquen
  colla(q('bastoners'), 40, PAS, (g) => {
    const parelles = [0, 44].map((dx) => {
      const ball = [0, 19].map((px, i) => {
        const b = persona(g, dx + px, 0, {
          alt: 28,
          camisa: '#dedbd1',
          to: '#dedbd1',
          faixa: VERMELL,
          cap: 'mocador',
        })
        for (const ma of [b.maE, b.maD]) {
          linia(ma, 0, -1, 0, 9.5, {
            stroke: FUSTA,
            'stroke-width': 1.6,
            'stroke-linecap': 'round',
          })
        }
        return { b, esquerra: i === 0 }
      })
      // Espurna del cop, entre tots dos, a l'alçada dels bastons.
      const cop = estel(grup(g, { transform: `translate(${dx + 9.5} -34)` }), 5, TINTA)
      return { ball, cop }
    })
    return (x, _s, t) => {
      // Cop a cada compàs; «piquen» i «fort» hi cauen de ple.
      const fase = ((t - tPiquen) / COMPAS) * Math.PI * 2
      const cop = Math.max(0, Math.cos(fase)) ** 6
      for (const { ball, cop: espurna } of parelles) {
        for (const { b, esquerra } of ball) {
          const k = esquerra ? 1 : -1
          camina(b, x / 4.4 + (esquerra ? 0 : 3), 16)
          // El braç de dins puja a picar; el de fora acompanya.
          b.posa({
            bracD: esquerra ? barreja(70, 138, cop) : 30,
            avantD: esquerra ? barreja(60, 12, cop) : 50,
            bracE: esquerra ? -30 : barreja(-70, -138, cop),
            avantE: esquerra ? -50 : barreja(-60, -12, cop),
            inclina: 5 * k * cop,
            salt: 2.2 * cop,
          })
        }
        espurna.setAttribute('transform', `scale(${f1(cop * 1.2)}) rotate(${f1(fase * 20)})`)
        atribut(espurna, 'opacity', cop.toFixed(2))
      }
    }
  })

  // ── Trabucaires: el tret que fa saltar del llit ─────────────────────────
  const tTrets = [q('saltar'), q('llit')]
  colla(q('trabucaires'), 36, PAS, (g) => {
    const homes = [0, 21, 42].map((dx, i) => {
      // Miren cap on avança la corrua: tot el ninot va emmirallat.
      const mirall = grup(g, { transform: `translate(${dx} 0) scale(-1 1)` })
      const p = persona(mirall, 0, 0, {
        alt: 30,
        cap: 'barretina',
        faixa: VERMELL,
        camisa: '#8d877c',
      })
      p.posa({ bracD: 72, avantD: 46, bracE: 38, avantE: 92 })
      // Trabuc: culata de fusta i canó de boca ampla, apuntant enlaire.
      const trabuc = grup(p.cos)
      linia(trabuc, -3.5, -15.5, 5, -21.5, {
        stroke: '#8a5a44',
        'stroke-width': 2.6,
        'stroke-linecap': 'round',
      })
      linia(trabuc, 5, -21.5, 14, -29, {
        stroke: '#a3a9b2',
        'stroke-width': 2.3,
        'stroke-linecap': 'round',
      })
      cami(trabuc, 'M12.4 -29.6L17.6 -30.4L15.6 -35.2Z', { fill: '#a3a9b2' })
      // Fogonada i fum a la boca del canó.
      const boca = grup(p.cos, { transform: 'translate(17.5 -33.5)' })
      const flama = estel(boca, 8, OR)
      const nucli = cercle(boca, 0, 0, 2.6, { fill: TINTA })
      const fum = [0, 1, 2].map(() => cercle(boca, 0, 0, 3, { fill: TINTA }))
      return { p, flama, nucli, fum, i }
    })
    return (x, _s, t) => {
      for (const { p, flama, nucli, fum, i } of homes) {
        camina(p, x / 4.6 + i * 1.7, 15)
        // Cada tret: fogonada curta, reculada i una fumera que puja.
        let reculada = 0
        let foc = 0
        let edatFum = -1
        for (const tTret of tTrets) {
          const dt = t - (tTret + i * 0.07)
          if (dt < 0) continue
          reculada = Math.max(reculada, Math.exp(-dt * 6))
          foc = Math.max(foc, 1 - tram(dt, 0, 0.22))
          edatFum = dt
        }
        p.posa({ bracD: 72, avantD: 46, bracE: 38, avantE: 92, inclina: -11 * reculada })
        flama.setAttribute('transform', `scale(${f1(0.3 + foc * 1.1)}) rotate(${f1(foc * 40)})`)
        atribut(flama, 'opacity', foc.toFixed(2))
        atribut(nucli, 'opacity', foc.toFixed(2))
        fum.forEach((bola, j) => {
          const viu = edatFum >= 0 && edatFum < 1.9
          atribut(bola, 'opacity', viu ? (0.34 * (1 - edatFum / 1.9)).toFixed(2) : '0')
          if (!viu) return
          bola.setAttribute('cx', f1((j - 1) * 3.5 * edatFum + 2 * edatFum).toString())
          bola.setAttribute('cy', f1(-7 * edatFum * (1 + j * 0.4)).toString())
          bola.setAttribute('r', f1(2.5 + edatFum * (4 + j)).toString())
        })
      }
    }
  })
  // Cada tret fa tremolar el carrer… i desperta el veïnat.
  tTrets.forEach((t, i) => {
    e.sacseja(t, 2.6)
    poble.encen(t + 0.15, i === 0 ? 0.3 : 0.4, e.on(t, -30))
  })

  // ── Diables: correfoc. Forques amb carretilles i pluja d'espurnes ───────
  const tDiables = q('diables')
  const tTrons = [q('tronar'), q('tronar') + 0.4, q('nit')]
  const X_DIABLES = 14
  const xDiables = e.on(tDiables, X_DIABLES)
  const VEL_DIABLES = -9
  const diables = [0, 27, 54].map((dx, i) => ({ dx, i, forca: { x: 0, y: 0 } }))
  colla(tDiables, X_DIABLES, VEL_DIABLES, (g) => {
    const colla_ = diables.map((d) => {
      const p = persona(g, d.dx, 0, { alt: 30, to: '#a83f37', camisa: '#a83f37', cap: 'banyes' })
      // Forca: pal llarg amb tres pues; a dalt hi crema la carretilla.
      const forca = grup(p.cos)
      cami(forca, 'M5.5 -9L9.5 -45M9.5 -45L6.2 -51M9.5 -45L10 -52M9.5 -45L13.2 -50', {
        fill: 'none',
        stroke: '#cfccc2',
        'stroke-width': 1.3,
        'stroke-linecap': 'round',
      })
      const brasa = cercle(forca, 9.6, -49, 2.2, { fill: OR })
      const tro = pivot(estel(grup(forca, { transform: 'translate(9.6 -49)' }), 10, TINTA), 0, 0)
      return { p, d, brasa, tro }
    })
    return (_x, s, t) => {
      for (const { p, d, brasa, tro } of colla_) {
        // Salten i fan giravoltar la forca.
        const bot = Math.abs(Math.sin(s * 6.2 + d.i * 1.3))
        const inclina = 9 * Math.sin(s * 3.1 + d.i * 2)
        p.posa({
          bracD: 128,
          avantD: 34,
          bracE: -60 - 40 * bot,
          avantE: -30,
          inclina,
          salt: 3.2 * bot,
          camaE: -14 * bot,
          camaD: 14 * bot,
        })
        // Punta de la forca (en coordenades de la colla), d'on surten les espurnes.
        const a = (inclina * Math.PI) / 180
        d.forca.x = d.dx + 9.6 * Math.cos(a) + 49 * Math.sin(a)
        d.forca.y = -3.2 * bot + 9.6 * Math.sin(a) - 49 * Math.cos(a)
        brasa.setAttribute('r', f1(1.8 + 0.9 * Math.sin(s * 31 + d.i)).toString())
        let esclat = 0
        for (const tTro of tTrons)
          esclat = Math.max(esclat, 1 - tram(t - (tTro + d.i * 0.05), 0, 0.3))
        tro.setAttribute('transform', `scale(${f1(esclat * 1.3)}) rotate(${f1(esclat * 50)})`)
        atribut(tro, 'opacity', (t >= tTrons[0]! ? esclat : 0).toFixed(2))
      }
    }
  })
  tTrons.forEach((t) => e.sacseja(t, 2.2))

  // Espurnes: neixen a la punta de cada forca, surten disparades en roda i
  // cauen fent pluja. Amb cada tro, n'esclata una rotllana de cop.
  const VIDA = 0.95
  const espurnes = grup(e.mon)
  const guspires = diables.flatMap((d) =>
    Array.from({ length: 24 }, (_, j) => ({
      d,
      el: cercle(espurnes, 0, 0, 0.8 + rnd() * 0.7, { fill: OR, visibility: 'hidden' }),
      desfas: (j / 24) * VIDA + rnd() * 0.05,
      angle: rnd() * Math.PI * 2,
      v: 22 + rnd() * 46,
      vida: VIDA * (0.6 + rnd() * 0.4),
    }))
  )
  const tFoc0 = tDiables - 0.1
  pilot(tl, tFoc0, tFi + 0.3 - tFoc0, (p, s) => {
    const t = tFoc0 + s
    const xColla = xDiables + VEL_DIABLES * (t - tDiables)
    // Amb els trons, les espurnes surten més de pressa i més lluny.
    let tro = 0
    for (const tTro of tTrons) tro = Math.max(tro, 1 - tram(t - tTro, 0, 0.7))
    const apaga = 1 - tram(t, tFi - 0.6, tFi + 0.2)
    for (const g of guspires) {
      const edat = (s + g.desfas) % VIDA
      const viva = p > 0 && p < 1 && edat < g.vida && s - edat > -0.02
      atribut(g.el, 'visibility', viva ? 'visible' : 'hidden')
      if (!viva) continue
      const k = edat / g.vida
      const v = g.v * (1 + 0.9 * tro)
      g.el.setAttribute('cx', f1(xColla + g.d.forca.x + Math.cos(g.angle) * v * edat).toString())
      g.el.setAttribute(
        'cy',
        f1(TERRA_Y + g.d.forca.y + Math.sin(g.angle) * v * edat + 62 * edat * edat).toString()
      )
      atribut(g.el, 'fill', k < 0.25 ? TINTA : k < 0.7 ? OR : VERMELL)
      atribut(g.el, 'fill-opacity', (limita(1.1 - k) * apaga).toFixed(1))
    }
  })
}
