/**
 * Animació tipogràfica "La terra" — fase 1: només les frases.
 *
 * Mòdul autònom que es munta sobre un contenidor de la capçalera. Tot penja
 * d'un únic timeline GSAP de DURADA_TOTAL segons, perquè les fases futures
 * (línia SVG animada, pista d'àudio amb locució) s'hi puguin sincronitzar.
 *
 * El guió (frases, temps, posicions) viu a ./terra-timeline.ts.
 */
import gsap from 'gsap'
import {
  DERIVA_PX,
  DURADA_TOTAL,
  FADE_IN,
  FADE_OUT,
  FADE_OUT_FINAL,
  FRASES,
  OPACITAT_REPOS,
  PAUSA_BUCLE,
  RETARD_SEGONA_LINIA,
  type Deriva,
} from './terra-timeline'
import './terra-animation.css'

const VECTOR_DERIVA: Record<Deriva, [number, number]> = {
  amunt: [0, -1],
  avall: [0, 1],
  esquerra: [-1, 0],
  dreta: [1, 0],
  cap: [0, 0],
}

export interface TerraAnimacio {
  timeline: gsap.core.Timeline
  destrueix: () => void
}

/**
 * Munta l'animació dins `contenidor` i arrenca el timeline.
 * Retorna null si l'usuari prefereix moviment reduït (no es munta res).
 */
export function muntaTerraAnimacio(
  contenidor: HTMLElement,
  opcions: { controlsDev?: boolean } = {}
): TerraAnimacio | null {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null

  const capa = document.createElement('div')
  capa.className = 'terra-anim'
  capa.setAttribute('aria-hidden', 'true')
  contenidor.appendChild(capa)

  // Bucle infinit amb una pausa en negre entre passades.
  const tl = gsap.timeline({ repeat: -1, repeatDelay: PAUSA_BUCLE })

  FRASES.forEach((frase, i) => {
    const grup = document.createElement('div')
    grup.className = 'terra-frase'
    if (frase.centrat) grup.classList.add('terra-frase--centrada')
    if (frase.destacat) grup.classList.add('terra-frase--destacada')
    grup.style.left = `${frase.posX}%`
    grup.style.top = `${frase.posY}%`

    const linies = frase.linies.map((text, j) => {
      const linia = document.createElement('div')
      linia.className = 'terra-frase__linia'
      if (j > 0) linia.classList.add('terra-frase__linia--sagnada')
      linia.textContent = text
      grup.appendChild(linia)
      return linia
    })
    capa.appendChild(grup)

    // Les centrades s'ancoren pel seu centre; xPercent/yPercent conviuen
    // amb els x/y de la deriva sense trepitjar-se.
    if (frase.centrat) gsap.set(grup, { xPercent: -50, yPercent: -50 })
    gsap.set(linies, { autoAlpha: 0 })

    const t = frase.tempsEntrada
    const opacitat = frase.destacat ? 1 : OPACITAT_REPOS

    // Label per ancorar-hi el futur efecte especial del clímax.
    if (frase.destacat) tl.addLabel('visca', t)

    linies.forEach((linia, j) => {
      tl.to(
        linia,
        { autoAlpha: opacitat, duration: FADE_IN, ease: 'power1.out' },
        t + j * RETARD_SEGONA_LINIA
      )
    })

    // El grup mor quan entra el següent (solapament entrada/sortida);
    // l'últim (VISCA LA TERRA!) aguanta i es fon just abans del final del
    // track, perquè el bucle empalmi net.
    const seguent = FRASES[i + 1]
    const fiVisible = seguent ? seguent.tempsEntrada : DURADA_TOTAL - FADE_OUT_FINAL
    const duradaFade = seguent ? FADE_OUT : FADE_OUT_FINAL
    tl.to(grup, { autoAlpha: 0, duration: duradaFade, ease: 'power1.in' }, fiVisible)

    const [dx, dy] = VECTOR_DERIVA[frase.deriva ?? 'amunt']
    if (dx !== 0 || dy !== 0) {
      const duradaDeriva = fiVisible + duradaFade - t
      tl.to(grup, { x: dx * DERIVA_PX, y: dy * DERIVA_PX, duration: duradaDeriva, ease: 'none' }, t)
    }
  })

  // Estira el timeline fins a DURADA_TOTAL exacte: és l'ancoratge de l'àudio
  // futur, i el punt on comença la pausa del bucle.
  tl.call(() => {}, undefined, DURADA_TOTAL)

  let desmuntaControls: (() => void) | null = null
  if (opcions.controlsDev) desmuntaControls = muntaControlsDev(capa, tl)

  return {
    timeline: tl,
    destrueix() {
      desmuntaControls?.()
      tl.kill()
      capa.remove()
    },
  }
}

/**
 * Controls provisionals de desenvolupament: play/pausa, reinici, barra de
 * scrub i segon actual. Es retiraran quan la sincronització estigui fixada.
 */
function muntaControlsDev(capa: HTMLElement, tl: gsap.core.Timeline): () => void {
  const panell = document.createElement('div')
  panell.className = 'terra-dev'

  const btnPlay = document.createElement('button')
  btnPlay.type = 'button'
  btnPlay.className = 'terra-dev__btn'

  const btnReinici = document.createElement('button')
  btnReinici.type = 'button'
  btnReinici.className = 'terra-dev__btn'
  btnReinici.textContent = '↺'
  btnReinici.setAttribute('aria-label', 'Reinicia')

  const barra = document.createElement('input')
  barra.type = 'range'
  barra.className = 'terra-dev__barra'
  barra.min = '0'
  barra.max = String(DURADA_TOTAL)
  barra.step = '0.1'
  barra.value = '0'

  const temps = document.createElement('span')
  temps.className = 'terra-dev__temps'

  panell.append(btnPlay, btnReinici, barra, temps)
  capa.appendChild(panell)

  function refresca() {
    const s = tl.time()
    temps.textContent = `${s.toFixed(1)} s`
    barra.value = String(s)
    btnPlay.textContent = tl.paused() ? '⏵' : '⏸'
    btnPlay.setAttribute('aria-label', tl.paused() ? 'Reprodueix' : 'Pausa')
  }

  btnPlay.addEventListener('click', () => {
    tl.paused(!tl.paused())
    refresca()
  })
  btnReinici.addEventListener('click', () => {
    tl.restart()
    refresca()
  })
  barra.addEventListener('input', () => {
    tl.pause()
    tl.seek(Number(barra.value))
    refresca()
  })
  tl.eventCallback('onUpdate', refresca)
  refresca()

  return () => panell.remove()
}
