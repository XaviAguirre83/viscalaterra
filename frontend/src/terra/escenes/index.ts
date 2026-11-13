/**
 * Escenes il·lustrades de "La terra" — fase 2 de l'animació de la capçalera.
 *
 * Una capa SVG sota el text del poema que il·lustra cada vers a temps. Tot és
 * un sol viatge: una càmera de tràveling lateral recorre el país (del mapa als
 * Pirineus, al mar, als camps, a la plaça, a Montserrat i a la taula) i cada
 * escena planta les seves figures allà on la càmera passarà quan soni el vers.
 *
 * Les escenes pengen d'un timeline fill del timeline mestre del poema: mateix
 * rellotge, mateix bucle, i es poden treure sense tocar el text.
 */
import type gsap from 'gsap'
import { DURADA_TOTAL } from '../terra-timeline'
import { muntaAmbient } from './ambient'
import { escenaPaisatge, type Paisatge } from './e1-paisatge'
import { escenaLlegenda, type Llegenda } from './e2-llegenda'
import { escenaCastell } from './e3-castell'
import { escenaCercavila } from './e4-cercavila'
import { escenaSardana } from './e5-sardana'
import { escenaMontserrat } from './e6-montserrat'
import { escenaTaula } from './e7-taula'
import { escenaVisca } from './e8-visca'
import { clausCamera, creaCamera, creaGuio } from './guio'
import {
  ALCADA,
  TINTA,
  crea,
  degradat,
  entra,
  grup,
  limita,
  pilot,
  ritmePilots,
  surt,
  timelineEscena,
  type Escenari,
} from './nucli'
import { muntaPoble, type Poble } from './poble'

export interface Escenes {
  destrueix: () => void
}

/** Amplada a partir de la qual l'escena es veu a mida real; per sota, s'encongeix. */
const AMPLADA_PLENA = 900
const ESCALA_MINIMA = 0.6

/** Amplada a partir de la qual cada cosa és al seu lloc; per sota, tot s'acosta al centre. */
const AMPLADA_COMPOSICIO = 1000
const COMPRESSIO_MINIMA = 0.45

/** En pantalles estretes el logo tapa mitja capçalera: l'escena es corre cap a la dreta. */
const AMPLADA_ESTRETA = 700
const DESPLACAMENT_ESTRET = 60

/**
 * Compressió horitzontal de la composició per a una amplada de capçalera, en
 * passos de 0,05 (perquè no canviï a cada píxel mentre s'estira la finestra).
 */
function compressio(ampla: number): number {
  return Math.round(limita(ampla / AMPLADA_COMPOSICIO, COMPRESSIO_MINIMA, 1) * 20) / 20
}

interface Muntatge {
  k: number
  ajusta: () => void
  destrueix: () => void
}

/** Executa `feina` quan el navegador tingui un moment lliure; retorna com anul·lar-ho. */
function quanPugui(feina: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(feina, { timeout: 500 })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(feina, 40)
  return () => clearTimeout(id)
}

/**
 * Munta les escenes amb la compressió `k` i les penja del timeline mestre.
 *
 * Cada escena va al seu propi timeline. Només la primera (el mapa i el
 * paisatge, que surten de seguida) es munta a l'acte; la resta s'afegeixen
 * una a una en estones lliures del navegador, perquè muntar-ho tot de cop el
 * tindria ocupat massa estona. Amb `deCop` es munta tot seguit.
 */
function construeix(
  capa: HTMLElement,
  mestre: gsap.core.Timeline,
  k: number,
  deCop: boolean
): Muntatge {
  const svg = crea('svg', { class: 'terra-escenes', 'aria-hidden': 'true', focusable: 'false' })
  capa.prepend(svg)
  const defs = crea('defs', {}, svg)
  const arrel = grup(svg)
  const cel = grup(arrel)
  const mon = grup(arrel)
  const davant = grup(arrel)
  const terra = grup(mon, { stroke: TINTA, 'stroke-opacity': 0.32, 'stroke-width': 1 })
  degradat(defs, 'terra-sol', TINTA, 0.1, 0.02)

  // L'origen (x = 0) és al centre de l'escena. En pantalles estretes tot
  // s'encongeix ancorat a baix, perquè hi càpiga més escena.
  let mig = 800
  function ajusta() {
    const ampla = capa.clientWidth || 1600
    const escala = limita(ampla / AMPLADA_PLENA, ESCALA_MINIMA, 1)
    const centre =
      ampla / 2 + DESPLACAMENT_ESTRET * limita((AMPLADA_ESTRETA - ampla) / (AMPLADA_ESTRETA - 400))
    mig = Math.max(centre, ampla - centre) / escala
    arrel.setAttribute(
      'transform',
      `translate(${centre} ${ALCADA}) scale(${escala}) translate(0 ${-ALCADA})`
    )
  }
  ajusta()

  // En pantalles estretes (mòbils), figures i partícules es mouen a 20 fotogrames
  // per segon en lloc de 30: la càmera continua anant fina i el processador descansa.
  ritmePilots(k < 0.8 ? 20 : 30)

  const guio = creaGuio()
  const sacsejades: { t: number; forca: number }[] = []
  const camera = creaCamera(clausCamera(guio), DURADA_TOTAL)
  const timelines: gsap.core.Timeline[] = []

  /** Munta una part de l'animació al seu propi timeline i la penja del mestre. */
  function munta(part: (e: Escenari) => void) {
    const tl = timelineEscena()
    part({
      tl,
      guio,
      cel,
      mon,
      davant,
      terra,
      defs,
      k,
      cam: camera.x,
      on: (t, sx) => camera.x(t) + sx * k,
      mig: () => mig,
      sacseja: (t, forca) => sacsejades.push({ t, forca }),
    })
    // En afegir-lo, GSAP el pinta de seguida a l'instant en què ja va el poema.
    mestre.add(tl, 0)
    timelines.push(tl)
  }

  let paisatge: Paisatge | undefined
  let llegenda: Llegenda | undefined
  let poble: Poble | undefined
  const parts: (() => void)[] = [
    () =>
      munta((e) => {
        // La càmera: el món es desplaça cap a l'esquerra mentre ella avança. Les
        // estrebades (trets, trons) la fan tremolar un instant amunt i avall.
        pilot(
          e.tl,
          0,
          DURADA_TOTAL,
          (_p, s) => {
            let y = 0
            for (const cop of sacsejades) {
              const dt = s - cop.t
              if (dt > 0 && dt < 0.45) y += cop.forca * Math.exp(-dt * 9) * Math.sin(dt * 58)
            }
            mon.setAttribute('transform', `translate(${(-camera.x(s)).toFixed(2)} ${y.toFixed(2)})`)
          },
          0
        )
        entra(e.tl, terra, guio.quan('admirada') - 0.2, 1.2)
        surt(e.tl, terra, guio.quan('cava') - 0.6, 0.8)
        muntaAmbient(e)
        paisatge = escenaPaisatge(e)
      }),
    () => munta((e) => (llegenda = escenaLlegenda(e, paisatge!))),
    () =>
      munta((e) => {
        // El poble fa de decorat de les tres escenes de festa.
        poble = muntaPoble(
          e,
          llegenda!.xFiCamps + 30,
          camera.x(guio.quan('tothom')) + 1100,
          guio.frase('castells').entra - 1.2,
          guio.frase('rosa', 1).entra + 1.6
        )
        escenaCastell(e)
      }),
    () => munta((e) => escenaCercavila(e, poble!)),
    () => munta(escenaSardana),
    () => munta(escenaMontserrat),
    () => munta(escenaTaula),
    () => munta(escenaVisca),
  ]

  let anulaPendent: (() => void) | null = null
  function seguent() {
    anulaPendent = null
    parts.shift()?.()
    if (parts.length === 0) {
      // Marca per a tests i eines: ja hi són totes les escenes.
      svg.setAttribute('data-llest', '')
    } else if (deCop) {
      seguent()
    } else {
      anulaPendent = quanPugui(seguent)
    }
  }
  seguent()

  return {
    k,
    ajusta,
    destrueix() {
      anulaPendent?.()
      for (const tl of timelines) tl.kill()
      svg.remove()
    },
  }
}

export interface OpcionsEscenes {
  /** Munta totes les escenes de cop, sense repartir la feina (tests i eines). */
  deCop?: boolean
}

export function muntaEscenes(
  capa: HTMLElement,
  mestre: gsap.core.Timeline,
  opcions: OpcionsEscenes = {}
): Escenes {
  const amplada = () => capa.clientWidth || 1600
  let muntatge = construeix(capa, mestre, compressio(amplada()), opcions.deCop === true)

  // En canviar l'amplada, l'escena es recentra; i si la composició ja no hi cap
  // igual (canvia la compressió), es torna a muntar sencera al mateix instant
  // (de cop: enmig del poema no pot faltar l'escena que toca).
  const observador =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          const k = compressio(amplada())
          if (k === muntatge.k) {
            muntatge.ajusta()
          } else {
            muntatge.destrueix()
            muntatge = construeix(capa, mestre, k, true)
          }
        })
  observador?.observe(capa)

  return {
    destrueix() {
      observador?.disconnect()
      muntatge.destrueix()
    },
  }
}
