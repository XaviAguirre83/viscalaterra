/**
 * Animació "La terra" de la capçalera: les frases del poema (fase 1) i, a
 * sota, les escenes il·lustrades que les acompanyen (fase 2).
 *
 * Mòdul autònom que es munta sobre un contenidor de la capçalera. Tot penja
 * d'un únic timeline GSAP de DURADA_TOTAL segons, perquè les escenes i la
 * futura pista d'àudio amb locució hi vagin sincronitzades.
 *
 * El guió (frases, temps, posicions) viu a ./terra-timeline.ts; les escenes,
 * a ./escenes/ (es carreguen a part, quan el text ja ha arrencat).
 */
import gsap from 'gsap'
import { AMPLADA_ESTRETA } from './composicio'
import { emplaca, type Caixa } from './emplacament'
import {
  DERIVA_PX,
  DURADA_TOTAL,
  FADE_IN,
  FADE_OUT,
  FADE_OUT_ESTRET,
  FADE_OUT_FINAL,
  OPACITAT_CLARIANA,
  OPACITAT_REPOS,
  PAUSA_BUCLE,
  resolFrases,
  type Deriva,
  type FraseTerra,
} from './terra-timeline'

// Tipografia pròpia del poema (cursiva variable), independent de la resta de la web.
import '@fontsource-variable/cormorant-garamond/wght-italic.css'
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

export interface OpcionsTerra {
  /** Controls de revisió (play/pausa, reinici i barra de temps). */
  controlsDev?: boolean
  /** Escenes il·lustrades sota el text. Per defecte: sí. */
  escenes?: boolean
  /**
   * Zones de la capçalera on no pot anar text (logo, nom, controls), en píxels
   * respecte del contenidor. Es demanen cada cop que cal recol·locar el text.
   */
  reserves?: () => Caixa[]
}

declare global {
  interface Window {
    /** Només en desenvolupament: l'animació, a mà des de la consola. */
    __terra?: TerraAnimacio
  }
}

/**
 * Munta l'animació dins `contenidor` i arrenca el timeline.
 * Retorna null si l'usuari prefereix moviment reduït (no es munta res).
 */
export function muntaTerraAnimacio(
  contenidor: HTMLElement,
  opcions: OpcionsTerra = {}
): TerraAnimacio | null {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null

  const capa = document.createElement('div')
  capa.className = 'terra-anim'
  capa.setAttribute('aria-hidden', 'true')
  contenidor.appendChild(capa)

  // Bucle infinit amb una pausa (de nit) entre passades.
  const tl = gsap.timeline({ repeat: -1, repeatDelay: PAUSA_BUCLE })
  let viva = true

  // Temps del guió ja resolts: entrada absoluta de cada frase (àncora
  // tempsEntrada o cadena de `despres`) i offset de cada paraula.
  const resoltes = resolFrases()

  // Totes les frases pengen d'una capa pròpia: les variables que comparteixen
  // (tinta i color del cel) es posen aquí i no a `capa`, perquè canviar-les no
  // obligui el navegador a recalcular l'estil dels milers d'elements de l'SVG.
  const text = document.createElement('div')
  text.className = 'terra-text'
  capa.appendChild(text)
  // La tinta del text va al color (no a l'opacitat de l'element): així l'ombra
  // que el separa del fons es veu sencera encara que la tinta sigui tènue.
  text.style.setProperty('--terra-tinta', String(OPACITAT_REPOS))

  const blocs: { el: HTMLElement; frase: FraseTerra }[] = []
  const estret = () => (capa.clientWidth || 1600) < AMPLADA_ESTRETA

  resoltes.forEach(({ frase, t, linies }, i) => {
    const grup = document.createElement('div')
    grup.className = 'terra-frase'
    if (frase.centrat) grup.classList.add('terra-frase--centrada')
    if (frase.destacat) grup.classList.add('terra-frase--destacada')

    // Clariana: una taca difosa del color del cel, sota el text.
    const clariana = document.createElement('div')
    clariana.className = 'terra-frase__clariana'
    grup.appendChild(clariana)

    const paraules: { el: HTMLElement; offset: number }[] = []
    linies.forEach((mots, j) => {
      const linia = document.createElement('div')
      linia.className = 'terra-frase__linia'
      if (j > 0) linia.classList.add('terra-frase__linia--sagnada')
      mots.forEach(({ mot, offset }, k) => {
        if (k > 0) linia.appendChild(document.createTextNode(' '))
        const span = document.createElement('span')
        span.className = 'terra-frase__paraula'
        span.textContent = mot
        linia.appendChild(span)
        paraules.push({ el: span, offset })
      })
      grup.appendChild(linia)
    })
    text.appendChild(grup)
    blocs.push({ el: grup, frase })

    gsap.set([clariana, ...paraules.map((p) => p.el)], { autoAlpha: 0 })

    // Label per ancorar-hi el futur efecte especial del clímax.
    if (frase.destacat) tl.addLabel('visca', t)

    // La clariana s'obre un instant abans que entri la primera paraula.
    const tClariana = Math.max(0, t - 0.25)
    tl.to(
      clariana,
      { autoAlpha: OPACITAT_CLARIANA, duration: t - tClariana + 0.5, ease: 'power1.out' },
      tClariana
    )
    paraules.forEach(({ el, offset }) => {
      tl.to(el, { autoAlpha: 1, duration: FADE_IN, ease: 'power1.out' }, t + offset)
    })

    // El grup mor quan entra el següent (solapament entrada/sortida);
    // l'últim (VISCA LA TERRA!) aguanta i es fon just abans del final del
    // track, perquè el bucle empalmi net.
    const seguent = resoltes[i + 1]
    const fiVisible = seguent ? seguent.t : DURADA_TOTAL - FADE_OUT_FINAL
    const duradaFade = seguent ? FADE_OUT : FADE_OUT_FINAL
    // El fundit va amb un setter (i no amb un tween d'opacitat) perquè depèn de
    // l'amplada del moment: en pantalles estretes la frase següent entra al
    // mateix lloc, i aquesta ha de desaparèixer de seguida.
    const fundit = {
      valor: 0,
      get p() {
        return this.valor
      },
      set p(v: number) {
        this.valor = v
        const avanc = seguent && estret() ? Math.min(1, v / FADE_OUT_ESTRET) : v
        const opacitat = 1 - avanc * avanc
        grup.style.opacity = opacitat.toFixed(3)
        grup.style.visibility = opacitat > 0.004 ? 'visible' : 'hidden'
      },
    }
    tl.fromTo(
      fundit,
      { p: 0 },
      { p: 1, duration: duradaFade, ease: 'none', immediateRender: false },
      fiVisible
    )

    const [dx, dy] = VECTOR_DERIVA[frase.deriva ?? 'amunt']
    if (dx !== 0 || dy !== 0) {
      const duradaDeriva = fiVisible + duradaFade - t
      tl.to(grup, { x: dx * DERIVA_PX, y: dy * DERIVA_PX, duration: duradaDeriva, ease: 'none' }, t)
    }
  })

  // Cada frase al seu lloc: depèn de l'amplada de la capçalera, de la mida del
  // bloc (i, per tant, de la tipografia carregada) i de les zones reservades.
  function colloca() {
    const ampla = capa.clientWidth || 1600
    const alcada = capa.clientHeight || 110
    const reserves = opcions.reserves?.() ?? []
    // Primer es llegeixen totes les mides i després s'escriu: un sol càlcul de disposició.
    const mides = blocs.map(({ el }) => ({ w: el.offsetWidth, h: el.offsetHeight }))
    blocs.forEach(({ el, frase }, i) => {
      const { left, top } = emplaca(frase, mides[i]!, ampla, alcada, reserves)
      el.style.left = `${left}px`
      el.style.top = `${top}px`
    })
  }
  colloca()
  const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(colloca)
  observador?.observe(capa)
  void document.fonts?.ready.then(() => {
    if (viva) colloca()
  })

  // Estira el timeline fins a DURADA_TOTAL exacte: és l'ancoratge de l'àudio
  // futur, i el punt on comença la pausa del bucle.
  tl.call(() => {}, undefined, DURADA_TOTAL)

  let desmuntaControls: (() => void) | null = null
  if (opcions.controlsDev) desmuntaControls = muntaControlsDev(capa, tl)

  // Escenes il·lustrades: s'importen a part perquè no pesin a l'arrencada (el
  // text ja corre mentre arriben) i s'afegeixen al mateix timeline. Si la
  // càrrega falla, el poema continua sol.
  let escenes: { destrueix: () => void } | null = null
  if (opcions.escenes !== false) {
    import('./escenes')
      .then(({ muntaEscenes }) => {
        if (!viva) return
        escenes = muntaEscenes(capa, tl, {
          // Les clarianes del text agafen el color del cel de cada moment.
          enCanviarCel(color) {
            if (color) text.style.setProperty('--terra-cel', color)
            else text.style.removeProperty('--terra-cel')
          },
        })
      })
      .catch((error: unknown) => {
        console.warn('La terra: no s’han pogut carregar les escenes', error)
      })
  }

  const animacio: TerraAnimacio = {
    timeline: tl,
    destrueix() {
      viva = false
      observador?.disconnect()
      escenes?.destrueix()
      desmuntaControls?.()
      tl.kill()
      capa.remove()
    },
  }
  // En desenvolupament queda a mà des de la consola del navegador, per saltar
  // a qualsevol segon: `__terra.timeline.pause().seek(40)`.
  if (import.meta.env.DEV) window.__terra = animacio
  return animacio
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
