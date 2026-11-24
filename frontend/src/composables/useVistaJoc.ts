import { computed, nextTick, onMounted, onUnmounted, ref, watch, type UnwrapNestedRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { formataTemps, MAX_INTENTS_RONDA, type ResultatRonda } from '@/data/partida'
import { colorsInicials, jugadorsDelWizard } from '@/data/jugadors'
import type { useMotorJoc } from '@/composables/useMotorJoc'

// Store d'un joc tal com el veu una vista: el motor de partida desembolcallat
// (Pinia desembolcalla els refs del setup store).
export type MotorJocStore = UnwrapNestedRefs<ReturnType<typeof useMotorJoc>>

export interface OpcionsVistaJoc {
  // El jugador respon escrivint (hi ha caixa de resposta a enfocar).
  ambResposta: () => boolean
  focusResposta: () => void
  // Torna al wizard (des de Surt o des dels resultats).
  obreConfiguracio: () => void
}

// Peces de la vista comunes als jocs: el cronòmetre que es veu, la pausa
// mentre el mòbil és en horitzontal o es confirma la sortida, l'estat del pas
// «Jugadors» del wizard, les dades del HUD i el feedback per a lectors de
// pantalla. Cada vista hi afegeix el seu mapa, la pregunta i els passos propis.
export function useVistaJoc(joc: MotorJocStore, opcions: OpcionsVistaJoc) {
  const { t } = useI18n()

  // ── Cronòmetre visual ────────────────────────────────────────────────────
  // El store guarda els instants; aquí només es fa el tic-tac. Mentre la
  // partida està pausada no s'actualitza (el rellotge mostrat es congela; el
  // store ja no compta el temps pausat).
  const araMs = ref(Date.now())
  let ticker: ReturnType<typeof setInterval> | null = null

  // Bloqueig en landscape (mateixa media query que l'overlay "Gira el
  // dispositiu" a App.vue): mentre l'app està bloquejada, la partida es pausa.
  const mqLandscape =
    typeof window !== 'undefined'
      ? window.matchMedia('(orientation: landscape) and (max-height: 600px)')
      : null

  // També es pausa mentre es demana confirmació per sortir de la partida.
  const confirmantSortida = ref(false)

  function aplicaPausa() {
    if (mqLandscape?.matches || confirmantSortida.value) joc.pausa()
    else joc.repren()
  }

  // Amplada de pantalla: el HUD canvia de forma (i el mapa hi deixa marges).
  const mqMobil = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)') : null
  const mqAmple = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1100px)') : null
  const esMobil = ref(mqMobil?.matches ?? false)
  const esAmple = ref(mqAmple?.matches ?? false)
  function actualitzaAmplada() {
    esMobil.value = mqMobil?.matches ?? false
    esAmple.value = mqAmple?.matches ?? false
  }

  onMounted(() => {
    ticker = setInterval(() => {
      if (!joc.pausada) araMs.value = Date.now()
    }, 500)
    mqLandscape?.addEventListener('change', aplicaPausa)
    mqMobil?.addEventListener('change', actualitzaAmplada)
    mqAmple?.addEventListener('change', actualitzaAmplada)
  })
  onUnmounted(() => {
    if (ticker) clearInterval(ticker)
    mqLandscape?.removeEventListener('change', aplicaPausa)
    mqMobil?.removeEventListener('change', actualitzaAmplada)
    mqAmple?.removeEventListener('change', actualitzaAmplada)
  })

  // ── Wizard: pas actual i pas «Jugadors» ──────────────────────────────────
  // L'estat viu aquí perquè es conservi en anar endavant i enrere.
  const pasWizard = ref(1)
  const numJugadors = ref(1)
  const nomsJugadors = ref(['', '', '', ''])
  const colorsJugadors = ref(colorsInicials())

  // Confirma el wizard: fixa els jugadors (nom + color de conquesta) i
  // prepara la partida (el compte enrere arrenca amb la fase 'preparacio').
  function confirmaISomhi(codis: string[]) {
    joc.defineixJugadors(
      jugadorsDelWizard(numJugadors.value, nomsJugadors.value, colorsJugadors.value, (n) =>
        t('partida.jugadorN', { n })
      )
    )
    joc.preparaPartida(codis)
  }

  // ── Dades del HUD ────────────────────────────────────────────────────────

  const cronoText = computed(() => {
    // Multijugador: el rellotge personal del jugador del torn (pausat la resta).
    if (joc.esMultijugador && joc.fase === 'partida') {
      return formataTemps(Math.floor(joc.tempsJugadorMs(joc.tornActual, araMs.value) / 1000))
    }
    const fi = joc.fase === 'partida' ? araMs.value : joc.tempsFiMs
    return formataTemps(Math.max(0, Math.floor((fi - joc.tempsIniciMs) / 1000)))
  })

  // Errors i pistes a la vista: els del jugador del torn (multi) o els de la
  // partida (un sol jugador, que sempre té el torn).
  const errorsMostrats = computed(() =>
    joc.esMultijugador ? (joc.jugadorActual?.errors ?? 0) : (joc.partida?.errors ?? 0)
  )
  const pistesMostrades = computed(() => joc.jugadorActual?.pistes ?? 0)

  // Intents restants de la ronda, com a puntets al HUD (●●● → ●●○ → …).
  // null en multijugador: hi ha una sola oportunitat i no cal comptar-la.
  const intentsRestants = computed(() =>
    joc.esMultijugador ? null : Math.max(0, MAX_INTENTS_RONDA - (joc.partida?.intentsRonda ?? 0))
  )

  // Es pot passar quan hi ha algun altre objectiu a la cua.
  const passaDisponible = computed(() => (joc.partida?.pendents.length ?? 0) > 0)

  // Jugador del torn per a la barra de navegació (null amb un sol jugador).
  const jugadorBarra = computed(() =>
    joc.esMultijugador && joc.jugadorActual
      ? { nom: joc.jugadorActual.nom, color: joc.jugadorActual.color }
      : null
  )

  // "Torn de {nom}" del jugador del torn (null amb un sol jugador).
  const textTorn = computed(() =>
    joc.esMultijugador ? t('partida.torn', { nom: joc.jugadors[joc.tornActual]?.nom ?? '' }) : null
  )

  // Canvia a cada ronda: re-munta la pregunta i llança l'anunci.
  const clauRonda = computed(() => `${joc.tornActual}·${joc.partida?.objectiu ?? ''}`)

  // ── Feedback per a lectors de pantalla (aria-live) ───────────────────────
  // L'encert i l'error es comuniquen també per text, no només per color i
  // animació.
  const anunciResultat = ref('')
  function anunciaA11y(text: string) {
    // Es reassigna a buit primer perquè el lector reanunciï un missatge repetit.
    anunciResultat.value = ''
    void nextTick(() => (anunciResultat.value = text))
  }
  function anunciaResultat(resultat: ResultatRonda) {
    if (resultat === 'encert') anunciaA11y(t('partida.a11y.encert'))
    else if (resultat === 'salt') anunciaA11y(t('partida.a11y.salt'))
    else if (resultat === 'error') anunciaA11y(t('partida.a11y.error'))
  }

  // ── Sortida ──────────────────────────────────────────────────────────────

  // «Surt» en plena partida: si ja hi ha progrés, primer es demana
  // confirmació (un clic per error llençava la partida); sense res jugat, surt
  // directament.
  function demanaSortida() {
    const p = joc.partida
    if (!p || p.encertades.length + p.errors === 0) {
      opcions.obreConfiguracio()
      return
    }
    confirmantSortida.value = true
    joc.pausa()
  }

  function continuaPartida() {
    confirmantSortida.value = false
    aplicaPausa()
    if (opcions.ambResposta()) void nextTick(() => opcions.focusResposta())
  }

  function confirmaSortida() {
    confirmantSortida.value = false
    joc.repren()
    opcions.obreConfiguracio()
  }

  // ── Revisió del mapa (en acabar) ─────────────────────────────────────────
  // Des dels resultats es pot amagar el modal i mirar el mapa complet, amb
  // els noms de tots els territoris (per memoritzar-los o situar-se), fins que
  // es torna als resultats. `nomsRevisio` es conserva d'una revisió a l'altra.
  const revisant = ref(false)
  // Ja s'ha revisat en aquests resultats: en tornar-hi, el modal no repeteix
  // la celebració (confeti i recompte de punts).
  const haRevisat = ref(false)
  const nomsRevisio = ref(true)

  function revisaMapa() {
    if (joc.fase !== 'resultats') return
    revisant.value = true
    haRevisat.value = true
  }

  function tornaAResultats() {
    revisant.value = false
  }

  // Franges del mapa que tapa la barra de la revisió (px), lligades al CSS de
  // BarraRevisio: a baix, la barra (amb la llegenda dels jugadors a sobre en
  // multijugador, que en mòbil pot ocupar dues files).
  const margesRevisio = computed(() => ({
    dalt: 16,
    baix: 84 + (joc.esMultijugador ? (esMobil.value ? 72 : 40) : 0),
    esquerra: 0,
  }))

  // Fora dels resultats (torna a jugar, configuració…) no hi ha revisió.
  watch(
    () => joc.fase,
    (fase) => {
      if (fase === 'resultats') return
      revisant.value = false
      haRevisat.value = false
    }
  )

  // En arrencar la partida (després del compte enrere): si el mòbil s'ha
  // girat durant el compte (quan pausa() encara era un no-op perquè la fase no
  // era 'partida'), pausa des del primer instant — si no, el rellotge corria
  // sota l'overlay "Gira el dispositiu". I, si es respon escrivint, focus a la
  // caixa.
  watch(
    () => joc.fase,
    async (fase) => {
      if (fase !== 'partida') return
      aplicaPausa()
      if (opcions.ambResposta()) {
        await nextTick()
        opcions.focusResposta()
      }
    }
  )

  return {
    confirmantSortida,
    esMobil,
    esAmple,
    pasWizard,
    numJugadors,
    nomsJugadors,
    colorsJugadors,
    confirmaISomhi,
    cronoText,
    errorsMostrats,
    pistesMostrades,
    intentsRestants,
    passaDisponible,
    jugadorBarra,
    textTorn,
    clauRonda,
    anunciResultat,
    anunciaResultat,
    demanaSortida,
    continuaPartida,
    confirmaSortida,
    revisant,
    haRevisat,
    nomsRevisio,
    revisaMapa,
    tornaAResultats,
    margesRevisio,
  }
}
