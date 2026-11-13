/**
 * Enllaç entre el guió del poema (terra-timeline.ts) i les escenes: quan entra
 * cada paraula i per on passa la càmera. Mòdul pur (sense DOM), testejable.
 *
 * Les escenes no porten cap segon escrit a mà: tot s'ancora a paraules del
 * poema amb `quan('rosa')`. Si es retoca el ritme del guió, les escenes el
 * segueixen soles.
 */
import { DURADA_TOTAL, FADE_OUT_FINAL, resolFrases, type FraseResolta } from '../terra-timeline'

/** Temps d'un grup de mitges frases dins el track, en segons. */
export interface TempsFrase {
  /** Entra la primera paraula. */
  entra: number
  /** Entra l'última paraula (la frase ja és escrita). */
  escrita: number
  /** Comença a fondre's (entra la frase següent, o arriba el fundit final). */
  surt: number
}

export interface Guio {
  /** Instant en què entra la n-èsima aparició (0 = primera) de la paraula. */
  quan(mot: string, n?: number): number
  /** Temps del grup que conté la n-èsima aparició de la paraula. */
  frase(mot: string, n?: number): TempsFrase
  /** Durada total del track. */
  durada: number
}

/** Paraula comparable: minúscules i sense la puntuació enganxada al final. */
export const normalitzaMot = (mot: string) => mot.toLowerCase().replace(/[.,!…]+$/, '')

export function creaGuio(resoltes: FraseResolta[] = resolFrases()): Guio {
  const aparicions = new Map<string, { t: number; iFrase: number }[]>()
  const frases: TempsFrase[] = resoltes.map(({ t, linies }, i) => ({
    entra: t,
    escrita: t + Math.max(0, ...linies.flat().map((p) => p.offset)),
    surt: resoltes[i + 1]?.t ?? DURADA_TOTAL - FADE_OUT_FINAL,
  }))

  resoltes.forEach(({ t, linies }, iFrase) => {
    for (const { mot, offset } of linies.flat()) {
      const clau = normalitzaMot(mot)
      const llista = aparicions.get(clau) ?? []
      llista.push({ t: t + offset, iFrase })
      aparicions.set(clau, llista)
    }
  })

  function troba(mot: string, n: number) {
    const aparicio = aparicions.get(normalitzaMot(mot))?.[n]
    if (!aparicio) throw new Error(`terra: el poema no té l'aparició ${n} de «${mot}»`)
    return aparicio
  }

  return {
    quan: (mot, n = 0) => troba(mot, n).t,
    frase: (mot, n = 0) => frases[troba(mot, n).iFrase]!,
    durada: DURADA_TOTAL,
  }
}

// ── Càmera ────────────────────────────────────────────────────────────────

/** Punt del perfil de velocitat de la càmera: a l'instant `t`, `v` píxels/segon. */
export type ClauVelocitat = [t: number, v: number]

export interface Camera {
  /** Posició x de la càmera a l'instant t (0 a l'inici; sempre creix). */
  x(t: number): number
}

/**
 * Càmera de tràveling lateral. En lloc de posicions, es defineix la VELOCITAT
 * en uns quants instants (interpolada en S entre claus) i la posició en surt
 * integrant: així el moviment mai fa estrebades, ni en els canvis d'escena.
 */
export function creaCamera(claus: ClauVelocitat[], durada: number, pas = 1 / 30): Camera {
  const ordenades = [...claus].sort((a, b) => a[0] - b[0])

  // Les mostres es demanen en ordre: `tram` recorda a quin tram de claus som.
  let tram = 1
  function velocitat(t: number): number {
    const primera = ordenades[0]
    const ultima = ordenades[ordenades.length - 1]
    if (!primera || !ultima) return 0
    if (t <= primera[0]) return primera[1]
    if (t >= ultima[0]) return ultima[1]
    while (tram < ordenades.length - 1 && ordenades[tram]![0] < t) tram++
    const [t0, v0] = ordenades[tram - 1]!
    const [t1, v1] = ordenades[tram]!
    const p = t1 === t0 ? 1 : (t - t0) / (t1 - t0)
    return v0 + (v1 - v0) * p * p * (3 - 2 * p)
  }

  // Integració pel mètode dels trapezis sobre una taula de mostres.
  const n = Math.ceil(durada / pas) + 1
  const taula = new Float64Array(n)
  let vAnterior = velocitat(0)
  for (let i = 1; i < n; i++) {
    const v = velocitat(i * pas)
    taula[i] = taula[i - 1]! + ((vAnterior + v) / 2) * pas
    vAnterior = v
  }

  return {
    x(t) {
      const pos = Math.min(Math.max(t / pas, 0), n - 1)
      const i = Math.min(Math.floor(pos), n - 2)
      return taula[i]! + (taula[i + 1]! - taula[i]!) * (pos - i)
    },
  }
}

/**
 * Perfil de velocitat de la càmera (píxels/segon), ancorat a paraules del
 * poema: avança a poc a poc dins de cada estrofa i fa un salt entre estrofes.
 */
export function clausCamera(guio: Guio): ClauVelocitat[] {
  const q = guio.quan
  return [
    [0, 0],
    // 1 · El mapa s'està quiet; amb els Pirineus arrenca el viatge…
    [q('admirada') - 0.3, 0],
    [q('pirineus') + 0.8, 14],
    // …i la tramuntana ens empeny cap al mar.
    [q('baixant') - 0.3, 14],
    [q('enrabiada') + 0.5, 235],
    [q('veu') - 0.2, 235],
    [q('esverant') + 0.5, 12],
    [q('sal') + 0.6, 12],
    // 2 · Passada la roca, els camps.
    [guio.frase('camps').entra - 0.3, 330],
    [guio.frase('camps').entra + 1.0, 330],
    [q('camps') + 1.5, 12],
    [q('garraf') + 0.3, 12],
    // 3 · La plaça: el castell demana càmera quieta.
    [guio.frase('castells').entra - 0.2, 330],
    [guio.frase('castells').entra + 0.8, 330],
    [q('castells'), 5],
    [q('cel') + 0.4, 5],
    // 4 · La cercavila: la càmera acompanya la corrua carrer avall.
    [guio.frase('gegants').entra - 0.4, 300],
    [guio.frase('gegants').entra + 0.2, 300],
    [q('gegants') + 0.6, 22],
    [q('nit') + 0.3, 22],
    // 5 · La sardana: plaça endins, i quieta per veure rodar la rotllana.
    [guio.frase('festiva').entra - 0.3, 320],
    [guio.frase('festiva').entra + 0.5, 320],
    [q('flabiol') + 0.1, 7],
    [q('tothom') + 0.2, 7],
    // 6 · Montserrat: nit i quietud.
    [guio.frase('rosa', 1).entra - 0.2, 320],
    [guio.frase('rosa', 1).entra + 0.6, 320],
    [q('rosa', 1) + 0.5, 5],
    [q('silenci') + 0.1, 5],
    // 7 · La taula: un salt per arribar-hi i un tràveling que la recorre.
    [guio.frase('taula').entra - 0.2, 340],
    [guio.frase('taula').entra + 0.8, 340],
    [q('visc', 1) + 1.6, 8],
    [q('taula') + 0.3, 8],
    [q('calçots') - 0.1, 52],
    [q('ronda') + 0.1, 52],
    // 8 i 9 · El final passa a càmera quieta.
    [guio.frase('mar', 1).entra + 0.3, 0],
    [guio.durada, 0],
  ]
}
