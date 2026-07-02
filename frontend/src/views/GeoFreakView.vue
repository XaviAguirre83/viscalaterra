<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import MapaLeaflet from '@/components/mapa/MapaLeaflet.vue'
import PanellFiltres from '@/components/filtres/PanellFiltres.vue'
import { useTerritorisStore } from '@/stores/territoris'
import { useGeofreakStore } from '@/stores/geofreak'
import {
  barreja,
  CAPA_PER_DEMARCACIO,
  MAX_INTENTS_RONDA,
  MODALITATS,
  NIVELLS,
  triaDistractors,
  type ResultatClic,
  type TipusDemarcacio,
} from '@/data/geofreak'
import { normalitza } from '@/data/text'
import { useFocusTrap } from '@/composables/useFocusTrap'
import {
  articleComarca,
  articleVegueria,
  nomAmbArticle,
  nomAmbDe,
  type Article,
} from '@/data/articles'
import type { ModeJocMapa } from '@/stores/mapa'

// GeoFreak — joc d'identificació territorial (spec: viscalaterra_plan.md § GeoFreak).
// Dues modalitats jugables: «On és...?» (clic al mapa) i «Com es diu...?»
// (el mapa il·lumina l'objectiu i s'escriu el nom, amb autocomplete).

const { t } = useI18n()
const territoris = useTerritorisStore()
const geofreak = useGeofreakStore()

const mapaRef = ref<InstanceType<typeof MapaLeaflet> | null>(null)

// Cronòmetre visual: el store guarda els instants; aquí només es fa el tic-tac.
// Mentre la partida està pausada no s'actualitza (el rellotge mostrat es
// congela; el store ja no compta el temps pausat).
const araMs = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null

// Bloqueig en landscape (mateixa media query que l'overlay "Gira el dispositiu"
// a App.vue): mentre l'app està bloquejada, la partida es pausa.
const mqLandscape =
  typeof window !== 'undefined'
    ? window.matchMedia('(orientation: landscape) and (max-height: 600px)')
    : null

function aplicaPausaLandscape() {
  if (mqLandscape?.matches) geofreak.pausa()
  else geofreak.repren()
}

onMounted(() => {
  territoris.carregaArbre()
  ticker = setInterval(() => {
    if (!geofreak.pausada) araMs.value = Date.now()
  }, 500)
  mqLandscape?.addEventListener('change', aplicaPausaLandscape)
})
// En sortir del joc (navegar a una altra secció) la configuració es reinicia.
onUnmounted(() => {
  if (ticker) clearInterval(ticker)
  mqLandscape?.removeEventListener('change', aplicaPausaLandscape)
  geofreak.reinicia()
})

// Estat de càrrega / error de les dades territorials (la partida no es pot
// configurar sense l'arbre). La vista del wizard ho reflecteix.
const dadesCarregant = computed(() => territoris.carregant || territoris.arbre === null)
const dadesError = computed(() => territoris.error !== null && territoris.arbre === null)

// El nom oficial d'alguna demarcació porta un aclariment entre parèntesis
// ("Val d'Aran (entitat territorial singular)") — al joc només volem el nom.
const nomCurt = (nom: string) => nom.replace(/\s*\(.+\)\s*$/, '')

// Comarques úniques per codi: les transfrontereres apareixen sota dues
// províncies a l'arbre, però al joc són una sola comarca.
const comarquesUniques = computed(() => {
  const m = new Map<string, string>()
  territoris.arbre?.forEach((p) =>
    p.comarques.forEach((c) => {
      if (!m.has(c.codi)) m.set(c.codi, nomCurt(c.nom))
    })
  )
  return [...m.entries()]
    .map(([codi, nom]) => ({ codi, nom }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'ca'))
})

const tipusContenidor = computed<TipusDemarcacio | null>(
  () => geofreak.nivellActual?.contenidor ?? null
)

const opcionsContenidor = computed<{ codi: string; nom: string }[]>(() => {
  switch (tipusContenidor.value) {
    case 'provincia':
      return territoris.arbre?.map((p) => ({ codi: p.codi, nom: nomCurt(p.nom) })) ?? []
    case 'vegueria':
      return territoris.vegueries
        .map((v) => ({ codi: v.codi, nom: nomCurt(v.nom) }))
        .sort((a, b) => a.nom.localeCompare(b.nom, 'ca'))
    case 'comarca':
      return comarquesUniques.value
    default:
      return []
  }
})

// ── Quantitats per als nivells fixos (les dels nivells "a triar" depenen
//    del contenidor i es veuran durant la partida) ──────────────────────────

function quantitatNivell(id: number): number | null {
  switch (id) {
    case 0:
      return territoris.arbre?.length ?? null
    case 1:
      return territoris.vegueries.length || null
    case 4:
      return comarquesUniques.value.length || null
    case 8:
      return territoris.municipiPerCodi.size || null
    default:
      return null
  }
}

// Els <select> deleguen l'escriptura al store (patró get/set). El valor ''
// és el placeholder ("Tria'n una…"), deshabilitat: el set mai el rep.
const modalitatSeleccionada = computed({
  get: () => geofreak.configuracio.modalitat ?? '',
  set: (m: (typeof MODALITATS)[number] | '') => {
    if (m !== '') geofreak.defineixModalitat(m)
  },
})

const nivellSeleccionat = computed({
  get: () => geofreak.configuracio.nivell ?? '',
  set: (id: number | '') => {
    if (id !== '') geofreak.defineixNivell(id)
  },
})

const contenidorSeleccionat = computed({
  get: () => geofreak.configuracio.codiContenidor ?? '',
  set: (codi: string) => geofreak.defineixContenidor(codi || null),
})

// ── Wizard de configuració (3 passos: jugadors → modalitat → nivell) ───────

const pasWizard = ref(1)
const numJugadors = ref(1)
const nomsJugadors = ref(['', '', '', ''])

// Paleta de colors de conquesta (distingibles entre ells i del vermell
// d'error i el daurat de la pista). Per defecte, un per ordre de jugador.
const COLORS_JUGADOR = ['#2b6cb0', '#c0392b', '#27a35f', '#8e44ad', '#d68910', '#16a085']
const colorsJugadors = ref(COLORS_JUGADOR.slice(0, 4))

// Tria el color d'un jugador; si un altre ja el tenia, s'intercanvien.
function triaColor(i: number, color: string) {
  const previ = colorsJugadors.value[i]
  const altre = colorsJugadors.value.findIndex((c, j) => j !== i && c === color)
  const nous = [...colorsJugadors.value]
  nous[i] = color
  if (altre !== -1 && previ) nous[altre] = previ
  colorsJugadors.value = nous
}

// El pas 1 sempre és vàlid (amb un sol jugador no calen noms); el 2 demana
// modalitat; el 3 valida amb configCompleta directament al botó Som-hi.
const pasValid = computed(() => {
  if (pasWizard.value === 2) return geofreak.configuracio.modalitat !== null
  return true
})

// 🎲 Tria un territori contenidor a l'atzar (nivells "a triar").
function triaContenidorAleatori() {
  const opcions = opcionsContenidor.value
  const tria = opcions[Math.floor(Math.random() * opcions.length)]
  if (tria) geofreak.defineixContenidor(tria.codi)
}

// Torna al wizard (des de Surt o des dels resultats), directe al pas del
// nivell — el més habitual de retocar; els altres passos queden amb Enrere.
function obreConfiguracio() {
  geofreak.tornaAConfiguracio()
  pasWizard.value = 3
}

// ── Demarcacions jugables i els seus noms ──────────────────────────────────

// Codis de les features jugables dins el contenidor triat; null = totes les
// del nivell. Les comarques transfrontereres compten a totes dues bandes
// (mateix criteri que el panell On?).
const codisPermesos = computed<string[] | null>(() => {
  const nivell = geofreak.nivellActual
  const codi = geofreak.configuracio.codiContenidor
  if (!nivell?.contenidor || !codi) return null
  if (nivell.demarcacio === 'municipi') {
    switch (nivell.contenidor) {
      case 'comarca':
        return territoris.municipisDeComarca(codi).map((m) => m.codi)
      case 'vegueria':
        return territoris.municipisDeVegueria(codi).map((m) => m.codi)
      default:
        return territoris.municipisDeProvincia(codi).map((m) => m.codi)
    }
  }
  // Comarques dins una província o una vegueria.
  if (nivell.contenidor === 'provincia') {
    return territoris.arbre?.find((p) => p.codi === codi)?.comarques.map((c) => c.codi) ?? null
  }
  return [...new Set(territoris.municipisDeVegueria(codi).map((m) => m.comarca_codi))]
})

// Mapa codi → nom de les demarcacions del nivell jugat (per al prompt del HUD).
const nomsJoc = computed<Map<string, string>>(() => {
  const m = new Map<string, string>()
  switch (geofreak.nivellActual?.demarcacio) {
    case 'provincia':
      territoris.arbre?.forEach((p) => m.set(p.codi, nomCurt(p.nom)))
      break
    case 'vegueria':
      territoris.vegueries.forEach((v) => m.set(v.codi, nomCurt(v.nom)))
      break
    case 'comarca':
      comarquesUniques.value.forEach((c) => m.set(c.codi, c.nom))
      break
    case 'municipi':
      territoris.municipiPerCodi.forEach((mu, codi) => m.set(codi, mu.nom))
      break
  }
  return m
})

// Totes les demarcacions que entren en joc: les del contenidor o totes les del nivell.
const codisJoc = computed<string[]>(() => codisPermesos.value ?? [...nomsJoc.value.keys()])

// ── Mode joc per al mapa (partida i resultats) ─────────────────────────────

// Dins la vista del joc, el mapa està SEMPRE en mode joc — també sota el
// modal de configuració (tiles sense etiquetes, sense panell territorial).
// Mentre es configura, la tria de nivell/contenidor es previsualitza al fons.
const modeJocMapa = computed<ModeJocMapa | null>(() => {
  const nivell = geofreak.nivellActual
  const codi = geofreak.configuracio.codiContenidor
  const enPartida = geofreak.fase === 'partida'
  return {
    // Sense nivell triat encara, el fons mostra la capa de comarques.
    nivell: nivell ? CAPA_PER_DEMARCACIO[nivell.demarcacio] : 'comarques',
    contenidor:
      nivell?.contenidor && codi ? { nivell: CAPA_PER_DEMARCACIO[nivell.contenidor], codi } : null,
    codisPermesos: codisPermesos.value,
    codisEncertats: geofreak.partida?.encertades ?? [],
    // Mode conquesta: cada encertada amb el color del seu jugador.
    colorsEncertats: geofreak.esMultijugador ? geofreak.colorsConquestes : null,
    // L'objectiu només s'il·lumina a «Com es diu...?» (a «On és...?» és
    // secret) i mai durant la configuració.
    codiObjectiu:
      geofreak.fase !== 'configuracio' && geofreak.configuracio.modalitat === 'comEsDiu'
        ? (geofreak.partida?.objectiu ?? null)
        : null,
    // La pista al mapa només aplica a «On és...?» (a l'altra modalitat són botons).
    codisPista: geofreak.configuracio.modalitat === 'onEs' ? geofreak.pista : null,
    interactiu: enPartida && geofreak.configuracio.modalitat === 'onEs',
  }
})

// ── HUD ────────────────────────────────────────────────────────────────────

// Article de la demarcació (les comarques i vegueries van sense article a la
// BD; els municipis ja el porten al nom i les províncies no en duen).
function articleDemarcacio(tipus: TipusDemarcacio, codi: string): Article {
  if (tipus === 'comarca') return articleComarca(codi)
  if (tipus === 'vegueria') return articleVegueria(codi)
  return ''
}

const objectiuNom = computed(() => {
  const codi = geofreak.partida?.objectiu
  if (!codi) return ''
  const nom = nomsJoc.value.get(codi) ?? codi
  const demarcacio = geofreak.nivellActual?.demarcacio
  // "On és... el Maresme?" / "On és... l'Anoia?" — amb l'article que toca.
  return demarcacio ? nomAmbArticle(nom, articleDemarcacio(demarcacio, codi)) : nom
})

// Anunci de cada ronda al centre del mapa (es fon lentament): a «On és...?»
// el nou objectiu en gran; en multijugador, a sobre, "Torn de {nom}" amb el
// color del jugador (a «Com es diu...?» només el torn — el nom del lloc és
// justament la resposta).
const anunciTorn = ref('')
const anunciColor = ref('')
const anunciLloc = ref('')
const anunciClau = ref(0)
watch(
  () =>
    geofreak.fase === 'partida' ? `${geofreak.tornActual}·${geofreak.partida?.objectiu ?? ''}` : '',
  (clau) => {
    if (!clau || !geofreak.partida?.objectiu) return
    const multi = geofreak.esMultijugador
    anunciTorn.value = multi
      ? t('geofreak.torn', { nom: geofreak.jugadors[geofreak.tornActual]?.nom ?? '' })
      : ''
    anunciColor.value = multi ? (geofreak.jugadors[geofreak.tornActual]?.color ?? '') : ''
    anunciLloc.value = geofreak.configuracio.modalitat === 'onEs' ? objectiuNom.value : ''
    if (anunciTorn.value || anunciLloc.value) anunciClau.value++
  }
)

function netejaAnunci() {
  anunciTorn.value = ''
  anunciLloc.value = ''
}

// Línia de context de la barra de navegació: "Jugant a municipis del
// Maresme (Comarca)" / "Jugant a comarques de tota Catalunya".
const textContext = computed(() => {
  const nivell = geofreak.nivellActual
  if (!nivell) return ''
  const plural = t(`geofreak.plural.${nivell.demarcacio}`)
  const codi = geofreak.configuracio.codiContenidor
  const nom = opcionsContenidor.value.find((o) => o.codi === codi)?.nom
  if (nivell.contenidor && codi && nom) {
    const article = articleDemarcacio(nivell.contenidor, codi)
    return t('geofreak.jugantA', {
      plural,
      // {nomDe} per a ca/es ("del Maresme"); {nom} per a en ("el Maresme").
      nomDe: nomAmbDe(nom, article),
      nom: nomAmbArticle(nom, article),
      tipus: t(`nivells.${nivell.contenidor}`),
    })
  }
  return t('geofreak.jugantTot', { plural })
})

const cronoText = computed(() => {
  // Multijugador: el rellotge personal del jugador del torn (pausat la resta).
  if (geofreak.esMultijugador && geofreak.fase === 'partida') {
    return formataTemps(
      Math.floor(geofreak.tempsJugadorMs(geofreak.tornActual, araMs.value) / 1000)
    )
  }
  const fi = geofreak.fase === 'partida' ? araMs.value : geofreak.tempsFiMs
  return formataTemps(Math.max(0, Math.floor((fi - geofreak.tempsIniciMs) / 1000)))
})

// Errors a la vista: els del jugador del torn (multi) o els globals (solo).
const errorsMostrats = computed(() =>
  geofreak.esMultijugador ? (geofreak.jugadorActual?.errors ?? 0) : (geofreak.partida?.errors ?? 0)
)

// ── Resposta escrita («Com es diu...?») ────────────────────────────────────

const textResposta = ref('')
const respostaInput = ref<HTMLInputElement | null>(null)
const sacsejant = ref(false)

// Candidates vives: jugables encara no encertades, amb el seu nom.
const candidats = computed(() => {
  const encertades = new Set(geofreak.partida?.encertades ?? [])
  return codisJoc.value
    .filter((codi) => !encertades.has(codi))
    .map((codi) => ({ codi, nom: nomsJoc.value.get(codi) ?? codi }))
})

const suggeriments = computed(() => {
  const q = normalitza(textResposta.value.trim())
  if (!q) return []
  return candidats.value.filter((c) => normalitza(c.nom).includes(q)).slice(0, 7)
})

// ── Navegació amb teclat pels suggeriments (fletxes + Enter + Esc) ─────────

const indexSuggeriment = ref(-1)
watch(suggeriments, () => (indexSuggeriment.value = -1))

function mouSuggeriment(delta: number) {
  const n = suggeriments.value.length
  if (n === 0) return
  indexSuggeriment.value = (indexSuggeriment.value + delta + n) % n
  void nextTick(() => {
    document
      .querySelector('.gf-suggeriments .gf-suggeriment--actiu')
      ?.scrollIntoView({ block: 'nearest' })
  })
}

function escNeteja() {
  textResposta.value = ''
  indexSuggeriment.value = -1
}

// Missatge per a lectors de pantalla (aria-live): el feedback d'acert/error
// es comunica també per text, no només per color i animació.
const anunciResultat = ref('')
function anunciaResultat(resultat: ResultatClic) {
  if (resultat === 'encert') anunciaA11y(t('geofreak.a11y.encert'))
  else if (resultat === 'salt') anunciaA11y(t('geofreak.a11y.salt'))
  else if (resultat === 'error') anunciaA11y(t('geofreak.a11y.error'))
}
function anunciaA11y(text: string) {
  // Es reassigna a buit primer perquè el lector reanunciï un missatge repetit.
  anunciResultat.value = ''
  void nextTick(() => (anunciResultat.value = text))
}

// Respon una ronda (clic al mapa o resposta escrita) amb feedback visual:
// flaix al mapa i, a la resposta escrita errònia, sacseig de l'input.
function gestionaClicJoc(codi: string) {
  const resultat = geofreak.clicDemarcacio(codi)
  if (resultat === 'encert') mapaRef.value?.flaixJoc(codi, 'encert')
  else if (resultat === 'error' || resultat === 'salt') mapaRef.value?.flaixJoc(codi, 'error')
  anunciaResultat(resultat)
}

function respon(codi: string) {
  const resultat = geofreak.clicDemarcacio(codi)
  if (resultat === 'encert') mapaRef.value?.flaixJoc(codi, 'encert')
  else if (resultat === 'error' || resultat === 'salt') {
    sacsejant.value = false
    requestAnimationFrame(() => (sacsejant.value = true))
  }
  anunciaResultat(resultat)
  textResposta.value = ''
  respostaInput.value?.focus()
}

// Enter: respon el suggeriment ressaltat amb les fletxes; si no n'hi ha, el
// text exacte o el suggeriment únic; si és ambigu o no coincideix amb cap
// candidata, sacseja sense penalitzar (l'error només compta quan es tria
// una demarcació vàlida equivocada).
function enviaResposta() {
  const ressaltada = suggeriments.value[indexSuggeriment.value]
  if (ressaltada) {
    respon(ressaltada.codi)
    return
  }
  const q = normalitza(textResposta.value.trim())
  if (!q) return
  const exacte = candidats.value.find((c) => normalitza(c.nom) === q)
  const unica = exacte ?? (suggeriments.value.length === 1 ? suggeriments.value[0] : undefined)
  if (unica) {
    respon(unica.codi)
    return
  }
  sacsejant.value = false
  requestAnimationFrame(() => (sacsejant.value = true))
}

// Cada torn nou (fase 'preparacio', també entre jugadors) llança el compte
// enrere; i en arrencar una partida de «Com es diu...?», focus a l'input.
watch(
  () => geofreak.fase,
  async (fase) => {
    if (fase === 'preparacio') {
      executaCompte()
      return
    }
    if (fase === 'partida') {
      // Si el mòbil s'ha girat durant el compte enrere (quan pausa() encara
      // era un no-op perquè la fase no era 'partida'), pausa des del primer
      // instant — si no, el rellotge corria sota l'overlay "Gira el dispositiu".
      aplicaPausaLandscape()
      if (geofreak.configuracio.modalitat === 'comEsDiu') {
        textResposta.value = ''
        await nextTick()
        respostaInput.value?.focus()
      }
    }
  }
)

// Classificació del multijugador (ordenada per punts) i format de temps.
// Classificació: primer per conquestes, després per punts.
const classificacio = computed(() =>
  [...geofreak.resultats].sort((a, b) => b.conquestes - a.conquestes || b.punts - a.punts)
)

function formataTemps(segons: number): string {
  return `${Math.floor(segons / 60)}:${String(segons % 60).padStart(2, '0')}`
}

// ── Pista ──────────────────────────────────────────────────────────────────

// Construeix les 4 opcions (objectiu + 3 distractors) i les activa al store.
// Els distractors es trien per proximitat: mateixa comarca → mateixa
// província → qualsevol jugable viva (mai de l'altra punta si hi ha veïns).
function demanaPista() {
  const objectiu = geofreak.partida?.objectiu
  if (!objectiu || geofreak.pista) return
  const vius = candidats.value.map((c) => c.codi)
  const grups: string[][] = []

  if (geofreak.nivellActual?.demarcacio === 'municipi') {
    const mu = territoris.municipiPerCodi.get(objectiu)
    if (mu) {
      grups.push(
        vius.filter((c) => territoris.municipiPerCodi.get(c)?.comarca_codi === mu.comarca_codi)
      )
      grups.push(
        vius.filter((c) => territoris.municipiPerCodi.get(c)?.provincia_codi === mu.provincia_codi)
      )
    }
  } else if (geofreak.nivellActual?.demarcacio === 'comarca') {
    // Comarques de les mateixes províncies que contenen l'objectiu.
    const provincies = territoris.arbre?.filter((p) => p.comarques.some((c) => c.codi === objectiu))
    const veines = new Set(provincies?.flatMap((p) => p.comarques.map((c) => c.codi)) ?? [])
    grups.push(vius.filter((c) => veines.has(c)))
  }
  grups.push(vius)

  geofreak.activaPista(barreja([objectiu, ...triaDistractors(objectiu, grups)]))
}

// Opcions de la pista amb nom (botons a «Com es diu...?»).
const opcionsPista = computed(() =>
  (geofreak.pista ?? []).map((codi) => ({ codi, nom: nomsJoc.value.get(codi) ?? codi }))
)

// La pista es pot demanar si la ronda no en té ja i queda més d'una candidata.
const pistaDisponible = computed(() => !geofreak.pista && candidats.value.length > 1)

// Es pot passar quan hi ha algun altre objectiu a la cua.
const passaDisponible = computed(() => (geofreak.partida?.pendents.length ?? 0) > 0)

function passa() {
  geofreak.passaRonda()
  textResposta.value = ''
  if (geofreak.configuracio.modalitat === 'comEsDiu') respostaInput.value?.focus()
}

// Intents restants de la ronda, com a puntets al HUD (●●● → ●●○ → …).
const intentsRestants = computed(() =>
  Math.max(0, MAX_INTENTS_RONDA - (geofreak.partida?.intentsRonda ?? 0))
)

// ── Compte enrere "3, 2, 1, Som-hi!" ───────────────────────────────────────

// El mapa ja s'enquadra durant el compte (fase 'preparacio'); el cronòmetre
// arrenca quan acaba. Amb prefers-reduced-motion s'arrenca directament.
const compteEnrere = ref<string | null>(null)
let compteTimer: ReturnType<typeof setInterval> | null = null

// Confirma el wizard: fixa els jugadors (nom + color de conquesta) i prepara
// el primer torn (el compte enrere el dispara el watch de la fase 'preparacio').
function confirmaISomhi() {
  const jugadorsNous =
    numJugadors.value === 1
      ? [{ nom: '', color: '' }]
      : Array.from({ length: numJugadors.value }, (_, i) => ({
          nom: (nomsJugadors.value[i] ?? '').trim() || t('geofreak.jugadorN', { n: i + 1 }),
          color: colorsJugadors.value[i] ?? COLORS_JUGADOR[i] ?? '#2b6cb0',
        }))
  geofreak.defineixJugadors(jugadorsNous)
  geofreak.preparaPartida(codisJoc.value)
}

// Re-juga amb la mateixa configuració i jugadors (des dels resultats).
function rejuga() {
  geofreak.preparaPartida(codisJoc.value)
}

// Compte enrere del torn: "Torn de {nom}" (si hi ha més d'un jugador) + 3, 2, 1.
function executaCompte() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    geofreak.arrencaPartida()
    return
  }
  const seqüencia = [
    ...(geofreak.jugadors.length > 1
      ? [t('geofreak.torn', { nom: geofreak.jugadors[geofreak.tornActual]?.nom ?? '' })]
      : []),
    '3',
    '2',
    '1',
    t('geofreak.somhi'),
  ]
  let pas = 0
  compteEnrere.value = seqüencia[pas] ?? null
  compteTimer = setInterval(() => {
    pas++
    if (pas < seqüencia.length) {
      compteEnrere.value = seqüencia[pas] ?? null
      return
    }
    if (compteTimer) clearInterval(compteTimer)
    compteTimer = null
    compteEnrere.value = null
    geofreak.arrencaPartida()
  }, 650)
}

onUnmounted(() => {
  if (compteTimer) clearInterval(compteTimer)
})

// Recompte animat dels punts al modal de resultats (0 → total amb ease-out).
const puntsMostrats = ref(0)
watch(
  () => geofreak.fase,
  (fase) => {
    if (fase !== 'resultats') return
    const final = geofreak.punts
    if (final === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      puntsMostrats.value = final
      return
    }
    puntsMostrats.value = 0
    const durada = 900
    const inici = performance.now()
    const pas = (ara: number) => {
      const progres = Math.min(1, (ara - inici) / durada)
      puntsMostrats.value = Math.round(final * (1 - Math.pow(1 - progres, 3)))
      if (progres < 1 && geofreak.fase === 'resultats') requestAnimationFrame(pas)
    }
    requestAnimationFrame(pas)
  }
)

// Resum de la configuració triada (subtítol del modal de resultats).
const resumPartida = computed(() => {
  const c = geofreak.configuracio
  if (c.modalitat === null || c.nivell === null) return ''
  const parts = [`«${t(`geofreak.modalitats.${c.modalitat}`)}»`, t(`geofreak.nivells.n${c.nivell}`)]
  const nom = opcionsContenidor.value.find((o) => o.codi === c.codiContenidor)?.nom
  if (nom) parts.push(nom)
  return parts.join(' · ')
})

// ── Accessibilitat dels modals (focus-trap + Esc) ──────────────────────────
const modalConfigRef = ref<HTMLElement | null>(null)
const modalResultatsRef = ref<HTMLElement | null>(null)

// Al wizard, Esc retrocedeix un pas (no hi ha "tancar": és la porta d'entrada).
useFocusTrap(
  modalConfigRef,
  computed(() => geofreak.fase === 'configuracio'),
  () => {
    if (pasWizard.value > 1) pasWizard.value--
  }
)
// Al modal de resultats, Esc torna al wizard de configuració.
useFocusTrap(
  modalResultatsRef,
  computed(() => geofreak.fase === 'resultats'),
  () => obreConfiguracio()
)
</script>

<template>
  <div class="gf-layout">
    <PanellFiltres>
      <!-- La barra de menú queda buida durant el joc: s'hi posa el context
           de la partida i la pregunta del torn (més espai de joc al mapa). -->
      <div v-if="geofreak.fase !== 'configuracio'" class="gf-barra">
        <span class="gf-barra__context">{{ textContext }}</span>
        <!-- Re-muntat (key per torn+objectiu) amb micro-animació CSS d'entrada:
             més robust que una <Transition> que es pot interrompre. -->
        <span
          v-if="geofreak.fase === 'partida'"
          :key="`${geofreak.tornActual}·${geofreak.partida?.objectiu ?? ''}`"
          class="gf-barra__pregunta"
          role="status"
          aria-live="polite"
        >
          <template v-if="geofreak.esMultijugador">
            <span
              class="gf-barra__colorjug"
              :style="{ background: geofreak.jugadorActual?.color }"
            ></span
            >{{ geofreak.jugadorActual?.nom }}&nbsp;·&nbsp;
          </template>
          <template v-if="geofreak.configuracio.modalitat === 'onEs'">
            {{ $t('geofreak.preguntaOnEs') }}&nbsp;<strong>{{ objectiuNom }}</strong
            >?
          </template>
          <template v-else>{{ $t('geofreak.modalitats.comEsDiu') }}</template>
        </span>
      </div>
    </PanellFiltres>
    <div class="gf-cos">
      <MapaLeaflet ref="mapaRef" :mode-joc="modeJocMapa" @clic-joc="gestionaClicJoc" />

      <!-- Feedback per a lectors de pantalla (no només color/animació) -->
      <p class="gf-sr-only" role="status" aria-live="assertive">{{ anunciResultat }}</p>

      <!-- ── Modal de configuració de la partida ─────────────────────────── -->
      <div v-if="geofreak.fase === 'configuracio'" class="gf-modal-fons">
        <div
          ref="modalConfigRef"
          class="gf-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gf-titol"
        >
          <h2 id="gf-titol" class="gf-modal__titol">GeoFreak</h2>
          <p class="gf-modal__sub">{{ $t('geofreak.titolModal') }}</p>

          <!-- Sense dades territorials no es pot configurar la partida -->
          <div v-if="dadesError" class="gf-estat" role="alert">
            <p>{{ $t('mapa.error') }}</p>
            <button type="button" class="gf-somhi" @click="territoris.carregaArbre()">
              {{ $t('comu.reintenta') }}
            </button>
          </div>
          <div v-else-if="dadesCarregant" class="gf-estat" role="status" aria-live="polite">
            <span class="gf-estat__spinner" aria-hidden="true"></span>
            <p>{{ $t('mapa.carregant') }}</p>
          </div>

          <template v-else>
            <div class="gf-passos" aria-hidden="true">
              <span
                v-for="p in 3"
                :key="p"
                class="gf-passos__pas"
                :class="{ 'gf-passos__pas--actiu': p === pasWizard }"
              ></span>
            </div>

            <!-- Pas 1: jugadors (amb un de sol no calen noms) -->
            <template v-if="pasWizard === 1">
              <div class="gf-camp">
                <label>{{ $t('geofreak.wizard.jugadors') }}</label>
                <div class="gf-jugadors">
                  <button
                    v-for="n in 4"
                    :key="n"
                    type="button"
                    class="gf-jugadors__opcio"
                    :class="{ 'gf-jugadors__opcio--actiu': numJugadors === n }"
                    @click="numJugadors = n"
                  >
                    {{ n }}
                  </button>
                </div>
              </div>
              <div v-if="numJugadors > 1" class="gf-camp">
                <div v-for="n in numJugadors" :key="n" class="gf-jugador-fila">
                  <input
                    v-model="nomsJugadors[n - 1]"
                    type="text"
                    class="gf-jugadors__nom"
                    autocomplete="off"
                    :placeholder="$t('geofreak.jugadorN', { n })"
                  />
                  <div class="gf-colors">
                    <button
                      v-for="c in COLORS_JUGADOR"
                      :key="c"
                      type="button"
                      class="gf-colors__opcio"
                      :class="{ 'gf-colors__opcio--actiu': colorsJugadors[n - 1] === c }"
                      :style="{ background: c }"
                      :aria-label="c"
                      @click="triaColor(n - 1, c)"
                    ></button>
                  </div>
                </div>
              </div>
            </template>

            <!-- Pas 2: modalitat -->
            <div v-else-if="pasWizard === 2" class="gf-camp">
              <label for="gf-modalitat">{{ $t('geofreak.modalitat') }}</label>
              <select id="gf-modalitat" v-model="modalitatSeleccionada">
                <option value="" disabled>{{ $t('geofreak.triaOpcio') }}</option>
                <option v-for="m in MODALITATS" :key="m" :value="m">
                  {{ $t(`geofreak.modalitats.${m}`) }}
                </option>
              </select>
              <p v-if="geofreak.configuracio.modalitat" class="gf-desc">
                {{ $t(`geofreak.modalitats.${geofreak.configuracio.modalitat}Desc`) }}
              </p>
            </div>

            <!-- Pas 3: nivell i territori (amb tria a l'atzar) -->
            <template v-else>
              <div class="gf-camp">
                <label for="gf-nivell">{{ $t('geofreak.nivell') }}</label>
                <select id="gf-nivell" v-model="nivellSeleccionat">
                  <option value="" disabled>{{ $t('geofreak.triaOpcio') }}</option>
                  <option v-for="n in NIVELLS" :key="n.id" :value="n.id">
                    {{ n.id }} · {{ $t(`geofreak.nivells.n${n.id}`)
                    }}{{ quantitatNivell(n.id) ? ` (${quantitatNivell(n.id)})` : '' }}
                  </option>
                </select>
              </div>

              <div v-if="tipusContenidor" class="gf-camp">
                <label for="gf-contenidor">{{
                  $t(`geofreak.triaContenidor.${tipusContenidor}`)
                }}</label>
                <div class="gf-contenidor-fila">
                  <select id="gf-contenidor" v-model="contenidorSeleccionat">
                    <option value="" disabled>{{ $t('geofreak.triaOpcio') }}</option>
                    <option v-for="o in opcionsContenidor" :key="o.codi" :value="o.codi">
                      {{ o.nom }}
                    </option>
                  </select>
                  <button
                    type="button"
                    class="gf-atzar"
                    :disabled="!opcionsContenidor.length"
                    @click="triaContenidorAleatori"
                  >
                    🎲 {{ $t('geofreak.wizard.aleatori') }}
                  </button>
                </div>
              </div>
            </template>

            <div class="gf-wizard-nav">
              <button
                v-if="pasWizard > 1"
                type="button"
                class="gf-wizard-nav__enrere"
                @click="pasWizard--"
              >
                {{ $t('geofreak.wizard.enrere') }}
              </button>
              <button
                v-if="pasWizard < 3"
                type="button"
                class="gf-somhi gf-wizard-nav__seguent"
                :disabled="!pasValid"
                @click="pasWizard++"
              >
                {{ $t('geofreak.wizard.seguent') }}
              </button>
              <button
                v-else
                type="button"
                class="gf-somhi gf-wizard-nav__seguent"
                :disabled="!geofreak.configCompleta"
                @click="confirmaISomhi"
              >
                {{ $t('geofreak.somhi') }}
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- ── Compte enrere (fase de preparació) ──────────────────────────── -->
      <div v-else-if="geofreak.fase === 'preparacio'" class="gf-compte" aria-live="assertive">
        <span
          v-if="compteEnrere"
          :key="compteEnrere"
          class="gf-compte__valor"
          :class="{ 'gf-compte__valor--text': compteEnrere.length > 7 }"
          >{{ compteEnrere }}</span
        >
      </div>

      <!-- ── HUD de partida ───────────────────────────────────────────────── -->
      <template v-else-if="geofreak.fase === 'partida'">
        <div
          v-if="anunciTorn || anunciLloc"
          :key="anunciClau"
          class="gf-anunci"
          aria-hidden="true"
          @animationend="netejaAnunci"
        >
          <span
            v-if="anunciTorn"
            class="gf-anunci__torn"
            :style="{ color: anunciColor || '#1a2635' }"
            >{{ anunciTorn }}</span
          >
          <span v-if="anunciLloc" class="gf-anunci__lloc">{{ anunciLloc }}</span>
        </div>
        <div class="gf-progres" aria-hidden="true">
          <div
            class="gf-progres__fet"
            :style="{
              width: `${((geofreak.partida?.encertades.length ?? 0) / Math.max(1, geofreak.totalDemarcacions)) * 100}%`,
            }"
          ></div>
        </div>
        <div
          v-if="geofreak.configuracio.modalitat === 'comEsDiu'"
          class="gf-pregunta gf-pregunta--resposta"
        >
          <input
            id="gf-resposta"
            ref="respostaInput"
            v-model="textResposta"
            type="text"
            autocomplete="off"
            spellcheck="false"
            :placeholder="$t('geofreak.escriuNom')"
            :aria-label="$t('geofreak.modalitats.comEsDiu')"
            :class="{ 'gf-resposta--sacseig': sacsejant }"
            @keydown.enter.prevent="enviaResposta"
            @keydown.down.prevent="mouSuggeriment(1)"
            @keydown.up.prevent="mouSuggeriment(-1)"
            @keydown.esc.prevent="escNeteja"
          />
          <!-- Pista activa: les 4 opcions substitueixen els suggeriments -->
          <div v-if="geofreak.pista" class="gf-opcions">
            <button
              v-for="o in opcionsPista"
              :key="o.codi"
              type="button"
              @mousedown.prevent="respon(o.codi)"
            >
              {{ o.nom }}
            </button>
          </div>
          <ul v-else-if="suggeriments.length" class="gf-suggeriments">
            <li v-for="(s, i) in suggeriments" :key="s.codi">
              <button
                type="button"
                :class="{ 'gf-suggeriment--actiu': i === indexSuggeriment }"
                @mousedown.prevent="respon(s.codi)"
              >
                {{ s.nom }}
              </button>
            </li>
          </ul>
        </div>
        <div class="gf-xip gf-xip--esquerra">
          <span
            v-if="geofreak.esMultijugador"
            class="gf-xip__colorjug"
            :style="{ background: geofreak.jugadorActual?.color }"
          ></span>
          <span aria-hidden="true">⏱</span>
          <span>{{ cronoText }}</span>
          <span class="gf-xip__separador" aria-hidden="true"></span>
          <span
            >{{ geofreak.partida?.encertades.length ?? 0 }}/{{ geofreak.totalDemarcacions }}</span
          >
        </div>
        <div class="gf-xip gf-xip--dreta">
          <!-- Marcador de conquestes per jugador (multijugador) -->
          <template v-if="geofreak.esMultijugador">
            <span
              v-for="(j, i) in geofreak.estatJugadors"
              :key="i"
              class="gf-xip__jugador"
              :class="{ 'gf-xip__jugador--actiu': i === geofreak.tornActual }"
            >
              <span class="gf-xip__colorjug" :style="{ background: j.color }"></span
              >{{ j.nom }}&nbsp;{{ j.conquestes.length }}
            </span>
          </template>
          <template v-else>
            <span
              v-if="geofreak.ratxa >= 2"
              :key="geofreak.ratxa"
              class="gf-xip__ratxa"
              :title="$t('geofreak.ratxaAria')"
              >🔥 {{ geofreak.ratxa }}</span
            >
            <span class="gf-xip__encerts">✓ {{ geofreak.partida?.encertades.length ?? 0 }}</span>
          </template>
          <span :key="errorsMostrats" class="gf-xip__errors">✗ {{ errorsMostrats }}</span>
          <span
            class="gf-xip__intents"
            :title="$t('geofreak.intentsRonda')"
            :aria-label="$t('geofreak.intentsRonda')"
          >
            <span
              v-for="i in MAX_INTENTS_RONDA"
              :key="i"
              class="gf-xip__intent"
              :class="{ 'gf-xip__intent--gastat': i > intentsRestants }"
            ></span>
          </span>
          <span class="gf-xip__separador" aria-hidden="true"></span>
          <button
            type="button"
            class="gf-xip__pista"
            :disabled="!pistaDisponible"
            @click="demanaPista"
          >
            💡 {{ $t('geofreak.pista') }}
          </button>
          <button type="button" class="gf-xip__surt" :disabled="!passaDisponible" @click="passa">
            ↷ {{ $t('geofreak.passa') }}
          </button>
          <button type="button" class="gf-xip__surt" @click="obreConfiguracio">
            {{ $t('geofreak.surt') }}
          </button>
        </div>
      </template>

      <!-- ── Modal de resultats ───────────────────────────────────────────── -->
      <div v-else class="gf-modal-fons">
        <div class="gf-confeti" aria-hidden="true">
          <span v-for="n in 14" :key="n" :style="{ '--gf-i': String(n) }"></span>
        </div>
        <div ref="modalResultatsRef" class="gf-modal gf-resultats" role="dialog" aria-modal="true">
          <h2 class="gf-modal__titol">{{ $t('geofreak.resultats.titol') }}</h2>
          <p class="gf-modal__sub">{{ resumPartida }}</p>

          <!-- Un sol jugador: puntuació gran amb recompte animat -->
          <template v-if="geofreak.jugadors.length === 1">
            <p class="gf-resultats__punts">{{ puntsMostrats }}</p>
            <p class="gf-resultats__punts-etiqueta">{{ $t('geofreak.resultats.punts') }}</p>

            <dl class="gf-resultats__stats">
              <div>
                <dt>{{ $t('geofreak.resultats.temps') }}</dt>
                <dd>{{ cronoText }}</dd>
              </div>
              <div>
                <dt>{{ $t('geofreak.resultats.encerts') }}</dt>
                <dd>{{ geofreak.partida?.encertades.length ?? 0 }}</dd>
              </div>
              <div>
                <dt>{{ $t('geofreak.resultats.errors') }}</dt>
                <dd>{{ geofreak.partida?.errors ?? 0 }}</dd>
              </div>
              <div v-if="(geofreak.resultats[0]?.encertsAmbPista ?? 0) > 0">
                <dt>{{ $t('geofreak.resultats.pistes') }}</dt>
                <dd>{{ geofreak.resultats[0]?.encertsAmbPista }}</dd>
              </div>
            </dl>
          </template>

          <!-- Multijugador: classificació de conquestes amb el guanyador destacat -->
          <table v-else class="gf-classificacio">
            <thead>
              <tr>
                <th></th>
                <th>✓</th>
                <th>{{ $t('geofreak.resultats.punts') }}</th>
                <th>{{ $t('geofreak.resultats.temps') }}</th>
                <th>✗</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(r, i) in classificacio"
                :key="`${r.nom}-${i}`"
                :class="{ 'gf-classificacio__guanyador': i === 0 }"
              >
                <td class="gf-classificacio__nom">
                  <span class="gf-xip__colorjug" :style="{ background: r.color }"></span
                  >{{ i === 0 ? '🏆 ' : '' }}{{ r.nom }}
                </td>
                <td>{{ r.conquestes }}</td>
                <td>{{ r.punts }}</td>
                <td>{{ formataTemps(r.segons) }}</td>
                <td>{{ r.errors }}</td>
              </tr>
            </tbody>
          </table>

          <button type="button" class="gf-somhi" @click="rejuga">
            {{ $t('geofreak.resultats.tornaJugar') }}
          </button>
          <button type="button" class="gf-resultats__config" @click="obreConfiguracio">
            {{ $t('geofreak.tornaConfig') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gf-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Només per a lectors de pantalla (fora de la vista però accessible) */
.gf-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Estat de càrrega / error de les dades al modal de configuració */
.gf-estat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
  text-align: center;
  color: var(--color-text-secundari, #737373);
}

.gf-estat__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e2e6ea;
  border-top-color: #2d6a2d;
  border-radius: 50%;
  animation: gf-spin 0.7s linear infinite;
}

@keyframes gf-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gf-estat__spinner {
    animation-duration: 1.8s;
  }
}

.gf-cos {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}

/* ── Modal de configuració i de resultats ───────────────────────────────── */

.gf-modal-fons {
  position: absolute;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(26, 38, 53, 0.35);
}

.gf-modal {
  width: min(460px, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: 22px 26px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.gf-modal__titol {
  font-size: 1.35rem;
  font-weight: 800;
  color: #1a2635;
  text-align: center;
}

.gf-modal__sub {
  margin-top: 2px;
  margin-bottom: 14px;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
}

.gf-camp {
  margin: 0 0 14px;
  padding: 0;
  border: none;
}

.gf-camp label {
  display: block;
  margin-bottom: 6px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #777;
}

.gf-camp select {
  width: 100%;
  padding: 9px 10px;
  border: 1px solid #ccd2d8;
  border-radius: 8px;
  font-size: var(--text-sm);
  background: #fff;
  color: #222;
}

/* Explicació de la modalitat triada, sota el seu desplegable */
.gf-desc {
  margin-top: 5px;
  font-size: var(--text-xs);
  color: var(--color-text-secundari, #737373);
  line-height: 1.3;
}

/* ── Wizard: indicador de passos, jugadors i navegació ──────────────────── */

.gf-passos {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 14px;
}

.gf-passos__pas {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d9dee3;
  transition: background 0.15s;
}

.gf-passos__pas--actiu {
  background: #2d6a2d;
}

.gf-jugadors {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.gf-jugadors__opcio {
  padding: 12px 0;
  background: #f7f8f9;
  border: 2px solid #e2e6ea;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 800;
  color: #1a2635;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.gf-jugadors__opcio:hover {
  border-color: #2d6a2d;
}

.gf-jugadors__opcio--actiu {
  background: #eef4ee;
  border-color: #2d6a2d;
}

/* Fila d'un jugador al wizard: nom + paleta de color de conquesta */
.gf-jugador-fila {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.gf-jugadors__nom {
  display: block;
  flex: 1;
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid #ccd2d8;
  border-radius: 8px;
  font-size: var(--text-sm);
  color: #222;
}

.gf-colors {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.gf-colors__opcio {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition:
    transform 0.12s,
    border-color 0.12s;
}

.gf-colors__opcio--actiu {
  border-color: #1a2635;
  transform: scale(1.2);
}

.gf-wizard-nav {
  display: flex;
  gap: 10px;
}

.gf-wizard-nav__enrere {
  padding: 0 18px;
  background: none;
  border: 1px solid #ccd2d8;
  border-radius: 10px;
  font-size: var(--text-sm);
  font-weight: 700;
  color: #555;
  cursor: pointer;
  transition: background 0.12s;
}

.gf-wizard-nav__enrere:hover {
  background: #f0f0ee;
}

.gf-wizard-nav__seguent {
  width: auto;
  flex: 1;
}

/* Fila del territori contenidor amb la tria a l'atzar */
.gf-contenidor-fila {
  display: flex;
  gap: 8px;
}

.gf-contenidor-fila select {
  flex: 1;
  min-width: 0;
}

.gf-atzar {
  flex-shrink: 0;
  padding: 0 12px;
  background: #fdf3d0;
  border: 1px solid #d9b23c;
  border-radius: 8px;
  font-size: var(--text-sm);
  font-weight: 700;
  color: #8a6d1a;
  cursor: pointer;
  transition: background 0.12s;
}

.gf-atzar:hover:not(:disabled) {
  background: #f7c948;
}

.gf-atzar:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Botó principal (Som-hi! / Torna a jugar) */

.gf-somhi {
  display: block;
  width: 100%;
  padding: 12px;
  background: #2d6a2d;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 800;
  cursor: pointer;
  transition:
    background 0.15s,
    opacity 0.15s;
}

.gf-somhi:hover:not(:disabled) {
  background: #235423;
}

.gf-somhi:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Context i pregunta a la barra de navegació (slot del PanellFiltres) ── */

.gf-barra {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-left: 12px;
  min-width: 0;
  flex: 1;
}

/* En pantalles estretes, context i pregunta passen a dues línies centrades */
@media (max-width: 920px) {
  .gf-barra {
    flex-direction: column;
    gap: 0;
  }
}

.gf-barra__context {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #777;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.gf-barra__pregunta {
  font-size: 1.2rem;
  color: #1a2635;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

/* En dues línies (pantalla estreta) tornen a la mida compacta */
@media (max-width: 920px) {
  .gf-barra__context {
    font-size: var(--text-xs);
  }

  .gf-barra__pregunta {
    font-size: 0.95rem;
  }
}

.gf-barra__pregunta strong {
  display: inline-block;
  font-weight: 800;
}

/* ── Compte enrere ──────────────────────────────────────────────────────── */

.gf-compte {
  position: absolute;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.gf-compte__valor {
  font-size: 5rem;
  font-weight: 800;
  color: #1a2635;
  text-shadow:
    0 0 18px rgba(255, 255, 255, 0.9),
    0 2px 6px rgba(255, 255, 255, 0.8);
  animation: gf-compte-pop 0.6s ease-out;
}

@keyframes gf-compte-pop {
  from {
    opacity: 0;
    transform: scale(1.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Textos llargs al compte enrere ("Torn de Maria", "Som-hi!") */
.gf-compte__valor--text {
  font-size: 2.6rem;
  text-align: center;
  padding: 0 20px;
}

/* ── Anunci del nou objectiu (apareix gran i es fon lentament) ──────────── */

.gf-anunci {
  position: absolute;
  inset: 0;
  z-index: 1450;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  text-align: center;
  pointer-events: none;
  font-weight: 800;
  color: #1a2635;
  text-shadow:
    0 0 18px rgba(255, 255, 255, 0.95),
    0 2px 6px rgba(255, 255, 255, 0.85);
  animation: gf-anunci 2.4s ease-out forwards;
}

/* Línia de torn (multijugador, amb el color del jugador) i nom del lloc */
.gf-anunci__torn {
  font-size: 2rem;
}

.gf-anunci__lloc {
  font-size: 3.2rem;
}

@keyframes gf-anunci {
  0% {
    opacity: 0;
    transform: scale(1.15);
  }
  12% {
    opacity: 1;
    transform: scale(1);
  }
  55% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .gf-anunci__torn {
    font-size: 1.4rem;
  }

  .gf-anunci__lloc {
    font-size: 2rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gf-anunci {
    animation-name: gf-anunci-fos;
  }
}

/* Variant sense moviment (només fosa) per a reduced-motion */
@keyframes gf-anunci-fos {
  0%,
  55% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* ── Barra de progrés de la partida ─────────────────────────────────────── */

.gf-progres {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  z-index: 1400;
  background: rgba(26, 38, 53, 0.12);
}

.gf-progres__fet {
  height: 100%;
  background: #2d6a2d;
  transition: width 0.25s ease;
}

/* ── HUD de partida ─────────────────────────────────────────────────────── */

.gf-pregunta {
  position: absolute;
  top: 58px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1500;
  max-width: calc(100% - 24px);
  padding: 10px 22px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  font-size: 1.05rem;
  color: #1a2635;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gf-pregunta strong {
  display: inline-block;
  font-weight: 800;
}

/* Micro-animació d'entrada de la pregunta (es re-dispara amb cada
   re-muntat per canvi de torn o d'objectiu) */
.gf-barra__pregunta {
  animation: gf-pregunta-entra 0.18s ease;
}

@keyframes gf-pregunta-entra {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gf-barra__pregunta {
    animation: none;
  }
}

/* Variant amb input de resposta («Com es diu...?») */
.gf-pregunta--resposta {
  white-space: normal;
  overflow: visible;
  width: min(340px, calc(100% - 24px));
  padding: 10px 14px 12px;
}

.gf-pregunta--resposta input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ccd2d8;
  border-radius: 8px;
  font-size: var(--text-sm);
  color: #222;
}

.gf-resposta--sacseig {
  animation: gf-sacseig 0.3s;
  border-color: #b03030 !important;
}

.gf-suggeriments {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  max-height: 210px;
  overflow-y: auto;
}

.gf-suggeriments button {
  display: block;
  width: 100%;
  padding: 7px 10px;
  background: none;
  border: none;
  border-radius: 6px;
  text-align: left;
  font-size: var(--text-sm);
  font-weight: 600;
  color: #1a2635;
  cursor: pointer;
  transition: background 0.12s;
}

.gf-suggeriments button:hover,
.gf-suggeriments .gf-suggeriment--actiu {
  background: #eef4ee;
  color: #2d6a2d;
}

.gf-xip {
  position: absolute;
  z-index: 1500;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
  font-size: var(--text-sm);
  font-weight: 700;
  color: #1a2635;
}

/* Marcadors (✓/✗, pista, passa, surt): centrats a dalt del mapa */
.gf-xip--dreta {
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
}

/* Cronòmetre + progrés: centrats a baix del mapa */
.gf-xip--esquerra {
  bottom: 34px;
  left: 50%;
  transform: translateX(-50%);
}

.gf-xip__separador {
  width: 1px;
  height: 16px;
  background: #ddd;
}

.gf-xip__encerts {
  color: #2d6a2d;
}

.gf-xip__ratxa {
  color: #b8600b;
  animation: gf-compte-pop 0.25s ease-out;
}

/* Marcador per jugador (mode conquesta) i el seu punt de color */
.gf-xip__jugador {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  color: #777;
}

.gf-xip__jugador--actiu {
  background: #eef4ee;
  color: #1a2635;
  font-weight: 800;
}

.gf-xip__colorjug,
.gf-barra__colorjug {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.gf-barra__colorjug {
  margin-right: 5px;
}

.gf-xip__errors {
  color: #b03030;
  animation: gf-sacseig 0.3s;
}

@keyframes gf-sacseig {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-3px);
  }
  75% {
    transform: translateX(3px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gf-xip__errors {
    animation: none;
  }
}

.gf-xip__surt,
.gf-xip__pista {
  padding: 2px 10px;
  background: none;
  border: 1px solid #ccd2d8;
  border-radius: 12px;
  font-size: var(--text-xs);
  font-weight: 700;
  color: #555;
  cursor: pointer;
  transition: background 0.12s;
}

.gf-xip__surt:hover:not(:disabled) {
  background: #f0f0ee;
}

.gf-xip__surt:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Intents restants de la ronda (3 puntets que es van apagant) */
.gf-xip__intents {
  display: inline-flex;
  gap: 3px;
  align-items: center;
}

.gf-xip__intent {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2d6a2d;
  transition: background 0.2s;
}

.gf-xip__intent--gastat {
  background: #ddd;
}

.gf-xip__pista {
  border-color: #d9b23c;
  color: #8a6d1a;
}

.gf-xip__pista:hover:not(:disabled) {
  background: #fdf3d0;
}

.gf-xip__pista:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Les 4 opcions de la pista («Com es diu...?») */
.gf-opcions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 8px;
}

.gf-opcions button {
  padding: 8px 10px;
  background: #fdf3d0;
  border: 1px solid #d9b23c;
  border-radius: 8px;
  font-size: var(--text-sm);
  font-weight: 700;
  color: #1a2635;
  cursor: pointer;
  transition: background 0.12s;
}

.gf-opcions button:hover {
  background: #f7c948;
}

/* En mòbil: els marcadors es queden en UNA sola fila (scroll horitzontal si
   no caben) per tenir alçada fixa i no solapar-se amb la caixa de resposta,
   que es col·loca just a sota. Targets tàctils a 44px. */
@media (max-width: 768px) {
  .gf-xip--dreta {
    flex-wrap: nowrap;
    justify-content: flex-start;
    max-width: calc(100% - 16px);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .gf-xip--dreta::-webkit-scrollbar {
    display: none;
  }

  .gf-pregunta {
    top: 70px;
    font-size: 0.95rem;
    padding: 8px 14px;
    width: min(340px, calc(100% - 16px));
  }

  /* Mínim tàctil de 44px (botons del HUD i de l'autocomplete/pista) */
  .gf-xip__pista,
  .gf-xip__surt {
    min-height: 44px;
    padding: 6px 14px;
  }

  .gf-suggeriments button,
  .gf-opcions button {
    min-height: 44px;
  }

  .gf-colors__opcio {
    width: 30px;
    height: 30px;
  }
}

/* ── Modal de resultats ─────────────────────────────────────────────────── */

.gf-resultats {
  text-align: center;
  animation: gf-apareix 0.35s cubic-bezier(0.34, 1.4, 0.64, 1);
}

@keyframes gf-apareix {
  from {
    opacity: 0;
    transform: scale(0.85) translateY(12px);
  }
}

/* Confeti de celebració (cau una sola vegada sobre el mapa de fons) */
.gf-confeti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.gf-confeti span {
  position: absolute;
  top: -20px;
  left: calc((var(--gf-i) - 1) * 7.5%);
  width: 8px;
  height: 14px;
  border-radius: 2px;
  opacity: 0;
  animation: gf-confeti-cau 1.9s ease-in forwards;
  animation-delay: calc(var(--gf-i) * 0.07s);
}

.gf-confeti span:nth-child(4n + 1) {
  background: #c4382e;
}
.gf-confeti span:nth-child(4n + 2) {
  background: #2d6a2d;
}
.gf-confeti span:nth-child(4n + 3) {
  background: #b8860b;
}
.gf-confeti span:nth-child(4n) {
  background: #2b6cb0;
}

@keyframes gf-confeti-cau {
  0% {
    opacity: 1;
    transform: translateY(0) rotateZ(0deg);
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(85vh) rotateZ(560deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gf-resultats {
    animation: none;
  }

  .gf-confeti {
    display: none;
  }
}

.gf-resultats__punts {
  margin-top: 10px;
  font-size: 3rem;
  font-weight: 800;
  line-height: 1;
  color: #2d6a2d;
}

.gf-resultats__punts-etiqueta {
  margin-bottom: 14px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #777;
}

.gf-resultats__stats {
  display: flex;
  justify-content: center;
  gap: 26px;
  margin-bottom: 18px;
}

.gf-resultats__stats dt {
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #777;
}

.gf-resultats__stats dd {
  margin: 2px 0 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: #1a2635;
}

/* Classificació del multijugador */
.gf-classificacio {
  width: 100%;
  margin: 12px 0 18px;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.gf-classificacio th {
  padding: 6px 8px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #777;
  text-align: center;
}

.gf-classificacio th:first-child {
  text-align: left;
}

.gf-classificacio td {
  padding: 8px;
  text-align: center;
  border-top: 1px solid #eee;
  font-weight: 600;
  color: #1a2635;
}

.gf-classificacio__nom {
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.gf-classificacio__guanyador td {
  background: #eef4ee;
  font-weight: 800;
}

.gf-resultats__config {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 9px;
  background: none;
  border: 1px solid #2d6a2d;
  border-radius: 10px;
  color: #2d6a2d;
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s;
}

.gf-resultats__config:hover {
  background: #eef4ee;
}

@media (max-width: 768px) {
  .gf-modal {
    padding: 18px 16px;
  }
}
</style>
