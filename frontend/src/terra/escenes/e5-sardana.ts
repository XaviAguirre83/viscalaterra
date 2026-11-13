/**
 * Escena 5 · La sardana («Festiva. On flabiol, tible i tenora… obert a tothom»).
 *
 * La plaça s'engalana amb banderoles, la cobla puja a l'empostissat i la
 * rotllana es posa a rodar. El cercle es tanca… i es torna a obrir perquè hi
 * entri qui arriba.
 */
import { camina, nota, persona, type Persona } from './figures'
import {
  BLAU,
  COS_FOSC,
  OR,
  TERRA_Y,
  TINTA,
  VERD,
  VERMELL,
  atribut,
  barreja,
  cami,
  cercle,
  corba,
  crea,
  entra,
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

const FUSTA = '#b98d5e'

export function escenaSardana(e: Escenari): void {
  const { tl, guio } = e
  const q = guio.quan

  const tFestiva = q('festiva')
  const tRodar = q('rodar')
  const tSardana = q('sardana')
  const tTancat = q('tancat')
  const tObert = q('obert')
  const tTothom = q('tothom')
  const tFi = guio.frase('rosa', 1).entra

  const xRotllana = e.on(tSardana, -150)
  const xCobla = e.on(q('tible'), 262)

  // ── «Festiva.»: banderoles d'un cap a l'altre de la plaça ───────────────
  const garlanda = grup(e.mon)
  const colors = [VERMELL, VERD, OR, BLAU]
  const xA = e.on(tFestiva, -560)
  const xB = e.on(tTothom, 560)
  const TRAM = 176
  let n = 0
  for (let x = xA; x < xB; x += TRAM) {
    // Cada tram penja entre dos punts alts i fa panxa al mig.
    const fil: Punt[] = []
    for (let i = 0; i <= 12; i++) {
      const u = i / 12
      fil.push([x + TRAM * u, 3 + 9 * 4 * u * (1 - u)])
    }
    cami(garlanda, corba(fil), {
      fill: 'none',
      stroke: TINTA,
      'stroke-opacity': 0.35,
      'stroke-width': 0.8,
    })
    for (let i = 0; i < 12; i++) {
      const [bx, by] = fil[i]!
      const [cx, cy] = fil[i + 1]!
      const mx = (bx + cx) / 2
      const my = (by + cy) / 2
      const el = pivot(
        cami(
          garlanda,
          `M${f1(mx - 3.8)} ${f1(my)}L${f1(mx + 3.8)} ${f1(my)}L${f1(mx)} ${f1(my + 8.5)}Z`,
          {
            fill: colors[n % 4]!,
            'fill-opacity': 0.72,
          }
        ),
        mx,
        my
      )
      // Es despleguen d'esquerra a dreta, com si algú estirés el fil.
      tl.fromTo(
        el,
        { scale: 0, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2.2)' },
        tFestiva - 0.25 + ((mx - xA) / (xB - xA)) * 1.5
      )
      n++
    }
  }
  tl.fromTo(garlanda, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, tFestiva - 0.4)
  surt(tl, garlanda, tFi + 0.3, 0.9)

  // ── La cobla, dalt de l'empostissat ─────────────────────────────────────
  const cobla = grup(e.mon, { transform: `translate(${f1(xCobla)} ${TERRA_Y})` })
  const empostissat = grup(cobla)
  crea('rect', { x: -46, y: -6, width: 92, height: 6, fill: '#5d5148' }, empostissat)
  cami(empostissat, 'M-46 -6H46M-30 -6V0M0 -6V0M30 -6V0', {
    fill: 'none',
    stroke: TINTA,
    'stroke-opacity': 0.3,
    'stroke-width': 0.8,
  })
  entra(tl, empostissat, tFestiva + 0.2, 0.7)

  // Cada músic entra amb el nom del seu instrument i ja no para de tocar.
  const instruments = [
    { mot: 'flabiol', x: -27, llarg: 6.5, campana: false },
    { mot: 'tible', x: 0, llarg: 11, campana: false },
    { mot: 'tenora', x: 27, llarg: 15, campana: true },
  ]
  const boques: { x: number; y: number; t: number }[] = []
  for (const ins of instruments) {
    const t = q(ins.mot)
    // Miren cap a la rotllana (a l'esquerra): el ninot va emmirallat.
    const lloc = grup(cobla, { transform: `translate(${ins.x} -6) scale(-1 1)` })
    const music = persona(lloc, 0, 0, { alt: 26, camisa: '#dedbd1', to: COS_FOSC })
    // Instrument de vent: de la boca cap avall i endavant.
    const yBoca = -26 + 4.6
    const dx = ins.llarg * 0.84
    const dy = ins.llarg * 0.55
    const instrument = grup(music.cos)
    linia(instrument, 1.6, yBoca, 1.6 + dx, yBoca + dy, {
      stroke: FUSTA,
      'stroke-width': ins.campana ? 1.8 : 1.5,
      'stroke-linecap': 'round',
    })
    if (ins.campana) {
      // La tenora acaba en campana de metall.
      cami(
        instrument,
        `M${f1(dx)} ${f1(yBoca + dy - 2.6)}L${f1(dx + 5.4)} ${f1(yBoca + dy + 1.4)}L${f1(dx + 1.2)} ${f1(yBoca + dy + 3.6)}Z`,
        { fill: OR }
      )
    }
    if (ins.mot === 'flabiol') {
      // El flabiolaire porta el tamborí penjat del braç.
      cercle(instrument, -5.4, -13.4, 3.1, { fill: '#dedbd1', stroke: FUSTA, 'stroke-width': 1 })
    }
    music.posa(
      ins.mot === 'flabiol'
        ? { bracD: 62, avantD: 78, bracE: -34, avantE: -40 }
        : { bracD: 46, avantD: 58, bracE: 22, avantE: 86 }
    )
    tl.fromTo(lloc, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, t - 0.25)
    pilot(tl, t - 0.25, tFi - t, (_p, s) => {
      music.posa({
        inclina: 3.5 * Math.sin(s * 5.6 + ins.x),
        salt: 0.7 * Math.abs(Math.sin(s * 5.6 + ins.x)),
      })
    })
    boques.push({ x: ins.x - 1.6 - dx - 3, y: -6 + yBoca + dy - 3, t })
  }
  // Notes: la primera de cada instrument surt amb la seva paraula; després, per torns.
  const notes: { boca: (typeof boques)[number]; t: number }[] = boques.map((boca) => ({
    boca,
    t: boca.t,
  }))
  for (let t = tRodar - 0.2, i = 0; t < tFi - 1.4; t += 0.62, i++)
    notes.push({ boca: boques[i % 3]!, t })
  notes.forEach(({ boca, t }, i) => {
    const el = pivot(
      nota(
        grup(cobla, { transform: `translate(${f1(boca.x)} ${f1(boca.y)})` }),
        i % 3 === 2 ? OR : TINTA
      ),
      0,
      0
    )
    tl.fromTo(
      el,
      { x: 0, y: 0, scale: 0.5, rotation: 15, autoAlpha: 0 },
      {
        x: -8 - (i % 4) * 5,
        y: -14 - (i % 3) * 6,
        scale: 1.1,
        rotation: -12,
        autoAlpha: 0.95,
        duration: 0.6,
        ease: 'power1.out',
      },
      t
    )
    tl.to(
      el,
      { x: `-=${6 + (i % 3) * 3}`, y: '-=9', autoAlpha: 0, duration: 0.7, ease: 'power1.in' },
      t + 0.6
    )
  })
  surt(tl, cobla, tFi + 0.3, 0.9)

  // ── La rotllana ─────────────────────────────────────────────────────────
  const RX0 = 72
  const RY = 8.5
  const DE_CASA = 10
  const FORASTERS = 3
  const Y_ROTLLANA = TERRA_Y - 1.5
  const rotllana = grup(e.mon)

  // Cercle a terra: es va tancant mentre sona «formant un cercle tancat».
  const cercleTerra = cami(rotllana, '', {
    fill: 'none',
    stroke: OR,
    'stroke-opacity': 0.7,
    'stroke-width': 1.3,
    'stroke-linecap': 'round',
    pathLength: 1,
  })

  const robes = [VERMELL, '#6d9fcf', '#dedbd1', '#c9a857', VERD]
  const dansaires: { p: Persona; foraster: number; ordre: number }[] = []
  for (let i = 0; i < DE_CASA + FORASTERS; i++) {
    const dona = i % 2 === 1
    const p = persona(rotllana, 0, 0, {
      alt: 25,
      ...(dona
        ? { roba: 'faldilla' as const, toRoba: robes[i % robes.length]!, camisa: '#dedbd1' }
        : {
            camisa: '#dedbd1',
            faixa: VERMELL,
            cap: i % 4 === 0 ? ('barretina' as const) : ('res' as const),
          }),
    })
    atribut(p.g, 'visibility', 'hidden')
    dansaires.push({ p, foraster: i - DE_CASA, ordre: i })
  }

  const tForma = tRodar - 0.6
  pilot(tl, tForma, tFi + 0.5 - tForma, (pr, s) => {
    const t = tForma + s
    const viu = pr > 0 && pr < 1
    // Obertura: de 10 a 13 llocs, i la rotllana s'eixampla per fer-los lloc.
    const obre = suau(tram(t, tObert - 0.3, tTothom + 0.2))
    const pas = (Math.PI * 2) / barreja(DE_CASA, DE_CASA + FORASTERS, obre)
    const rx = RX0 + 13 * obre
    // Gir de sardana: avança i recula, però sempre guanya una mica cap a un costat.
    const gir = 0.34 * s + 0.16 * Math.sin(s * 2.7)
    const forma = suau(tram(t, tForma, tSardana))
    const profunditats: { d: (typeof dansaires)[number]; y: number }[] = []
    for (const d of dansaires) {
      const angle = gir + d.ordre * pas - Math.PI * 0.7
      let x = xRotllana + rx * (1 + 0.9 * (1 - forma)) * Math.cos(angle)
      let y = Y_ROTLLANA + RY * Math.sin(angle)
      let opacitat = tram(t, tForma + d.ordre * 0.05, tForma + 0.5 + d.ordre * 0.05)
      let caminant = 0
      if (d.foraster >= 0) {
        // Qui arriba de fora: ve caminant des de la dreta i s'afegeix al seu lloc.
        const arriba = suau(
          tram(t, tObert - 0.5 + d.foraster * 0.22, tTothom + 0.1 + d.foraster * 0.2)
        )
        const xFora = xRotllana + 215 + d.foraster * 24
        opacitat = tram(t, tObert - 0.7 + d.foraster * 0.2, tObert - 0.2 + d.foraster * 0.2)
        x = barreja(xFora, x, arriba)
        y = barreja(TERRA_Y, y, arriba)
        caminant = 1 - arriba
      }
      const fons = (Math.sin(angle) + 1) / 2 // 0 = al fons, 1 = a primera fila
      const escala = 0.86 + 0.14 * fons
      atribut(d.p.g, 'visibility', viu && opacitat > 0 ? 'visible' : 'hidden')
      atribut(d.p.g, 'opacity', (opacitat * (0.72 + 0.28 * fons)).toFixed(2))
      d.p.g.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) scale(${f1(escala)})`)
      if (caminant > 0.05) {
        camina(d.p, x / 4, 20)
        d.p.posa({ avantE: 0, avantD: 0 })
      } else {
        // Punteig: braços enlaire agafats i saltironets curts al compàs.
        const compas = s * 6.4 + d.ordre * Math.PI
        d.p.posa({
          bracE: -124,
          avantE: -38,
          bracD: 124,
          avantD: 38,
          camaE: -9 * Math.max(0, Math.sin(compas)),
          camaD: 9 * Math.max(0, -Math.sin(compas)),
          salt: 1.3 * Math.abs(Math.sin(compas)),
          inclina: 0,
        })
      }
      profunditats.push({ d, y })
    }
    // Qui és més avall (més a prop) es pinta al damunt.
    profunditats.sort((a, b) => a.y - b.y)
    profunditats.forEach(({ d }, i) => {
      if (rotllana.children[i + 1] !== d.p.g)
        rotllana.insertBefore(d.p.g, rotllana.children[i + 1] ?? null)
    })
    // Cercle de terra: el·lipse que comença per la dreta. Amb «obert» s'hi fa un pas.
    const punts: Punt[] = []
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2
      punts.push([xRotllana + (rx + 3) * Math.cos(a), Y_ROTLLANA + 2 + (RY + 1.5) * Math.sin(a)])
    }
    atribut(cercleTerra, 'd', corba(punts))
    const tancat = suau(tram(t, q('formant') - 0.2, tTancat + 0.1))
    const pasObert = 0.13 * Math.sin(Math.PI * tram(t, tObert - 0.4, tTothom + 0.6))
    cercleTerra.setAttribute('stroke-dasharray', `${f1(tancat * (1 - pasObert) * 100) / 100} 2`)
    cercleTerra.setAttribute('stroke-dashoffset', `${(-pasObert / 2).toFixed(3)}`)
    atribut(cercleTerra, 'visibility', viu && tancat > 0.01 ? 'visible' : 'hidden')
  })
  // En tancar-se del tot, el cercle fa una lluïssor.
  tl.fromTo(
    cercleTerra,
    { attr: { 'stroke-width': 1.3 } },
    {
      attr: { 'stroke-width': 2.8 },
      duration: 0.22,
      yoyo: true,
      repeat: 1,
      immediateRender: false,
    },
    tTancat + 0.05
  )
  surt(tl, rotllana, tFi + 0.2, 0.9)
}
