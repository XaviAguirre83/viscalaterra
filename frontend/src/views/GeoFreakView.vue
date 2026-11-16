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

// També es pausa mentre es demana confirmació per sortir de la partida.
const confirmantSortida = ref(false)

function aplicaPausaLandscape() {
  if (mqLandscape?.matches || confirmantSortida.value) geofreak.pausa()
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

// El <select> del contenidor delega l'escriptura al store (patró get/set). El
// valor '' és el placeholder ("Tria'n una…"), deshabilitat: el set mai el rep.
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

// Indicador de passos: també serveix per saltar a un pas ja assolible (al 3
// només s'hi arriba amb la modalitat triada, igual que amb «Següent»).
const nomsPassos = computed(() => [
  t('geofreak.wizard.jugadors'),
  t('geofreak.modalitat'),
  t('geofreak.nivell'),
])

function potAnarAPas(pas: number): boolean {
  return pas < 3 || geofreak.configuracio.modalitat !== null
}

const ICONA_MODALITAT: Record<(typeof MODALITATS)[number], string> = {
  onEs: '📍',
  comEsDiu: '⌨️',
}

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

// «Surt» en plena partida: si ja hi ha progrés, primer es demana confirmació
// (un clic per error llençava la partida); sense res jugat, surt directament.
function demanaSortida() {
  const p = geofreak.partida
  if (!p || p.encertades.length + p.errors === 0) {
    obreConfiguracio()
    return
  }
  confirmantSortida.value = true
  geofreak.pausa()
}

function continuaPartida() {
  confirmantSortida.value = false
  aplicaPausaLandscape()
  if (geofreak.configuracio.modalitat === 'comEsDiu') {
    void nextTick(() => respostaInput.value?.focus())
  }
}

function confirmaSortida() {
  confirmantSortida.value = false
  geofreak.repren()
  obreConfiguracio()
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

// Franges del mapa que tapa el HUD durant la partida (px): a dalt, els
// marcadors (dues files en mòbil); a baix, el cronòmetre; i la caixa de
// resposta de «Com es diu...?», que en pantalles amples va a l'esquerra i en
// la resta sota els marcadors. El mapa enquadra el territori a l'espai lliure
// — si no, el nord (Val d'Aran, Pallars) quedava sota el HUD: no es podia
// clicar ni es veia il·luminat. Valors lligats a les mides del CSS del HUD
// (.gf-hud-dalt, .gf-pregunta, .gf-xip--esquerra). Sota el wizard, cap marge.
const mqMobil = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)') : null
const mqAmple = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1100px)') : null
const esMobil = ref(mqMobil?.matches ?? false)
const esAmple = ref(mqAmple?.matches ?? false)
function actualitzaAmplada() {
  esMobil.value = mqMobil?.matches ?? false
  esAmple.value = mqAmple?.matches ?? false
}
onMounted(() => {
  mqMobil?.addEventListener('change', actualitzaAmplada)
  mqAmple?.addEventListener('change', actualitzaAmplada)
})
onUnmounted(() => {
  mqMobil?.removeEventListener('change', actualitzaAmplada)
  mqAmple?.removeEventListener('change', actualitzaAmplada)
})

const margesMapa = computed(() => {
  if (geofreak.fase === 'configuracio') return null
  const marcadors = esMobil.value ? 116 : 68
  const resposta = geofreak.configuracio.modalitat === 'comEsDiu'
  // Amb la pista demanada, la caixa creix amb les 4 opcions i el mapa es
  // re-enquadra: cal veure el territori sencer per triar entre elles.
  const opcions = geofreak.pista ? (esMobil.value ? 106 : 90) : 0
  return {
    dalt: marcadors + (resposta && !esAmple.value ? 74 + opcions : 0),
    baix: 84,
    esquerra: resposta && esAmple.value ? 396 : 0,
  }
})

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
    marges: margesMapa.value,
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
const modalSortidaRef = ref<HTMLElement | null>(null)

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
// A la confirmació de sortida, Esc continua la partida.
useFocusTrap(modalSortidaRef, confirmantSortida, continuaPartida)
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
            <ol class="gf-passos">
              <li v-for="(nom, i) in nomsPassos" :key="i">
                <button
                  type="button"
                  class="gf-passos__pas"
                  :class="{
                    'gf-passos__pas--actiu': i + 1 === pasWizard,
                    'gf-passos__pas--fet': i + 1 < pasWizard,
                  }"
                  :disabled="!potAnarAPas(i + 1)"
                  :aria-current="i + 1 === pasWizard ? 'step' : undefined"
                  @click="pasWizard = i + 1"
                >
                  <span class="gf-passos__num" aria-hidden="true">{{
                    i + 1 < pasWizard ? '✓' : i + 1
                  }}</span>
                  <span class="gf-passos__nom">{{ nom }}</span>
                </button>
              </li>
            </ol>

            <!-- El cos del pas es desplaça si no hi cap; la navegació de sota
                 queda sempre a la vista. Re-muntat per pas (micro-entrada). -->
            <div :key="pasWizard" class="gf-modal__cos">
              <!-- Pas 1: jugadors (amb un de sol no calen noms) -->
              <template v-if="pasWizard === 1">
                <div
                  class="gf-camp gf-jugadors"
                  role="radiogroup"
                  :aria-label="$t('geofreak.wizard.jugadors')"
                >
                  <button
                    v-for="n in 4"
                    :key="n"
                    type="button"
                    role="radio"
                    class="gf-jugadors__opcio"
                    :class="{ 'gf-jugadors__opcio--actiu': numJugadors === n }"
                    :aria-checked="numJugadors === n"
                    @click="numJugadors = n"
                  >
                    <span class="gf-jugadors__figures" aria-hidden="true">
                      <span v-for="f in n" :key="f"></span>
                    </span>
                    {{ n }}
                  </button>
                </div>
                <div v-if="numJugadors > 1" class="gf-camp">
                  <div v-for="n in numJugadors" :key="n" class="gf-jugador-fila">
                    <span
                      class="gf-jugador-fila__color"
                      :style="{ background: colorsJugadors[n - 1] }"
                      aria-hidden="true"
                    ></span>
                    <input
                      v-model="nomsJugadors[n - 1]"
                      type="text"
                      class="gf-jugadors__nom"
                      autocomplete="off"
                      maxlength="20"
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

              <!-- Pas 2: modalitat (dues targetes, amb la seva explicació) -->
              <div
                v-else-if="pasWizard === 2"
                class="gf-camp gf-modalitats"
                role="radiogroup"
                :aria-label="$t('geofreak.modalitat')"
              >
                <button
                  v-for="m in MODALITATS"
                  :key="m"
                  type="button"
                  role="radio"
                  class="gf-opcio"
                  :class="{ 'gf-opcio--actiu': geofreak.configuracio.modalitat === m }"
                  :aria-checked="geofreak.configuracio.modalitat === m"
                  @click="geofreak.defineixModalitat(m)"
                >
                  <span class="gf-opcio__icona" aria-hidden="true">{{ ICONA_MODALITAT[m] }}</span>
                  <span class="gf-opcio__text">
                    <span class="gf-opcio__nom">{{ $t(`geofreak.modalitats.${m}`) }}</span>
                    <span class="gf-opcio__desc">{{ $t(`geofreak.modalitats.${m}Desc`) }}</span>
                  </span>
                </button>
              </div>

              <!-- Pas 3: nivell i territori (amb tria a l'atzar) -->
              <template v-else>
                <div
                  class="gf-camp gf-nivells"
                  role="radiogroup"
                  :aria-label="$t('geofreak.nivell')"
                >
                  <button
                    v-for="n in NIVELLS"
                    :key="n.id"
                    type="button"
                    role="radio"
                    class="gf-nivell"
                    :class="{ 'gf-nivell--actiu': geofreak.configuracio.nivell === n.id }"
                    :aria-checked="geofreak.configuracio.nivell === n.id"
                    @click="geofreak.defineixNivell(n.id)"
                  >
                    <span class="gf-nivell__num" aria-hidden="true">{{ n.id }}</span>
                    <span class="gf-nivell__nom">{{ $t(`geofreak.nivells.n${n.id}`) }}</span>
                    <span v-if="quantitatNivell(n.id)" class="gf-nivell__quantitat">{{
                      quantitatNivell(n.id)
                    }}</span>
                  </button>
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
            </div>

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
        <!-- Marcadors i, a sota, la caixa de resposta («Com es diu...?»): en
             un sol contenidor en columna, així mai se solapen. -->
        <div class="gf-hud-dalt">
          <div class="gf-xip gf-xip--dreta">
            <!-- Marcador de conquestes per jugador (multijugador) -->
            <template v-if="geofreak.esMultijugador">
              <span
                v-for="(j, i) in geofreak.estatJugadors"
                :key="i"
                class="gf-xip__jugador"
                :class="{ 'gf-xip__jugador--actiu': i === geofreak.tornActual }"
              >
                <span class="gf-xip__colorjug" :style="{ background: j.color }"></span>
                <span class="gf-xip__nomjug">{{ j.nom }}</span>
                {{ j.conquestes.length }}
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
            <span class="gf-xip__accions"
              ><button
                type="button"
                class="gf-xip__pista"
                :disabled="!pistaDisponible"
                @click="demanaPista"
              >
                💡 {{ $t('geofreak.pista') }}
              </button>
              <button
                type="button"
                class="gf-xip__surt"
                :disabled="!passaDisponible"
                @click="passa"
              >
                ↷ {{ $t('geofreak.passa') }}
              </button>
              <button type="button" class="gf-xip__surt" @click="demanaSortida">
                {{ $t('geofreak.surt') }}
              </button></span
            >
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
              @animationend="sacsejant = false"
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
        </div>

        <!-- Confirmació de sortida (la partida queda en pausa mentrestant) -->
        <div v-if="confirmantSortida" class="gf-modal-fons gf-modal-fons--sobre">
          <div
            ref="modalSortidaRef"
            class="gf-modal gf-sortida"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="gf-sortida-titol"
            aria-describedby="gf-sortida-text"
          >
            <h2 id="gf-sortida-titol" class="gf-modal__titol">
              {{ $t('geofreak.sortida.titol') }}
            </h2>
            <p id="gf-sortida-text" class="gf-modal__sub">{{ $t('geofreak.sortida.text') }}</p>
            <button type="button" class="gf-somhi" @click="continuaPartida">
              {{ $t('geofreak.sortida.continua') }}
            </button>
            <button type="button" class="gf-resultats__config" @click="confirmaSortida">
              {{ $t('geofreak.sortida.surt') }}
            </button>
          </div>
        </div>
      </template>

      <!-- ── Modal de resultats ───────────────────────────────────────────── -->
      <div v-else class="gf-modal-fons">
        <div class="gf-confeti" aria-hidden="true">
          <span v-for="n in 14" :key="n" :style="{ '--gf-i': String(n) }"></span>
        </div>
        <div ref="modalResultatsRef" class="gf-modal gf-resultats" role="dialog" aria-modal="true">
          <span class="gf-resultats__copa" aria-hidden="true">🏆</span>
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

  /* Colors propis del joc que no són al sistema de disseny global:
     el daurat de la pista i el vermell de l'error. */
  --gf-pista-fons: #fdf3d0;
  --gf-pista-viu: #f7c948;
  --gf-pista-vora: #d9b23c;
  --gf-pista-text: #7a5f12;
  --gf-error: #b03030;
  --gf-ratxa: #b8600b;
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

.gf-cos {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}

/* Focus de teclat coherent a tots els controls del joc */
.gf-modal button:focus-visible,
.gf-xip button:focus-visible,
.gf-opcions button:focus-visible {
  outline: 2px solid var(--color-marca);
  outline-offset: 2px;
}

/* Estat de càrrega / error de les dades al modal de configuració */
.gf-estat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
  text-align: center;
  color: var(--color-text-secundari);
}

.gf-estat__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--color-vora);
  border-top-color: var(--color-marca);
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

/* ── Modal de configuració i de resultats ───────────────────────────────── */

.gf-modal-fons {
  position: absolute;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(19, 29, 41, 0.4);
}

/* Columna flexible: si el contingut no hi cap, al wizard només es desplaça
   el cos del pas (.gf-modal__cos) i la navegació queda a la vista; al modal
   de resultats es desplaça tot. */
.gf-modal {
  display: flex;
  flex-direction: column;
  width: min(500px, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: 24px 26px 22px;
  background: var(--color-superficie);
  border-radius: var(--radi-lg);
  box-shadow: var(--ombra-4);
  animation: gf-apareix 0.3s cubic-bezier(0.3, 1.25, 0.45, 1);
}

.gf-modal > * {
  flex-shrink: 0;
}

/* Confirmació de sortida: per sobre del HUD de la partida */
.gf-modal-fons--sobre {
  z-index: 1600;
}

.gf-sortida {
  width: min(380px, 100%);
  text-align: center;
}

@keyframes gf-apareix {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(10px);
  }
}

.gf-modal__titol {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.01em;
  color: var(--color-text-fort);
  text-align: center;
}

.gf-modal__sub {
  margin-top: 2px;
  margin-bottom: 16px;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-secundari);
}

/* El marge negatiu compensa el farciment que evita retallar els contorns de
   focus dins la zona de desplaçament. */
.gf-modal > .gf-modal__cos {
  flex: 0 1 auto;
  min-height: 0;
  margin: 0 -4px;
  padding: 4px;
  overflow-y: auto;
  animation: gf-pas-entra 0.2s ease-out;
}

@keyframes gf-pas-entra {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
}

.gf-camp {
  margin: 0 0 14px;
}

.gf-camp label {
  display: block;
  margin-bottom: 6px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-text-secundari);
}

.gf-camp select,
.gf-jugadors__nom {
  width: 100%;
  min-height: 42px;
  padding: 9px 12px;
  border: 1.5px solid var(--color-vora-forta);
  border-radius: var(--radi-sm);
  font: inherit;
  font-size: var(--text-md);
  background: var(--color-superficie);
  color: var(--color-text);
  transition:
    border-color var(--mou-rapid),
    box-shadow var(--mou-rapid);
}

.gf-camp select:focus,
.gf-jugadors__nom:focus {
  outline: none;
  border-color: var(--color-marca);
  box-shadow: 0 0 0 3px var(--color-marca-mig);
}

/* ── Wizard: indicador de passos ────────────────────────────────────────── */

.gf-passos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin: 0 0 18px;
  padding: 0;
  list-style: none;
}

/* Cada pas: una barra de progrés a sobre i, a sota, el número i el nom */
.gf-passos__pas {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  padding: 8px 2px 2px;
  background: none;
  border: none;
  border-top: 3px solid var(--color-vora);
  font: inherit;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--pedra-500);
  cursor: pointer;
  transition:
    border-color var(--mou-mig),
    color var(--mou-mig);
}

.gf-passos__pas:disabled {
  cursor: default;
}

.gf-passos__pas--fet {
  border-top-color: var(--verd-200);
  color: var(--color-marca);
}

.gf-passos__pas--actiu {
  border-top-color: var(--color-marca);
  color: var(--color-text-fort);
}

.gf-passos__num {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--pedra-150);
  font-size: 0.7rem;
  line-height: 1;
  transition:
    background var(--mou-mig),
    color var(--mou-mig);
}

.gf-passos__pas--fet .gf-passos__num {
  background: var(--color-marca-mig);
}

.gf-passos__pas--actiu .gf-passos__num {
  background: var(--color-marca);
  color: #fff;
}

.gf-passos__nom {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Wizard: targetes d'opció (jugadors, modalitat i nivell) ────────────── */

.gf-jugadors__opcio,
.gf-opcio,
.gf-nivell {
  background: var(--color-superficie);
  border: 1.5px solid var(--color-vora);
  border-radius: var(--radi-md);
  font: inherit;
  color: var(--color-text-fort);
  cursor: pointer;
  transition:
    border-color var(--mou-rapid),
    background var(--mou-rapid),
    box-shadow var(--mou-rapid),
    transform var(--mou-rapid);
}

.gf-jugadors__opcio:hover,
.gf-opcio:hover,
.gf-nivell:hover {
  border-color: var(--verd-200);
  background: var(--pedra-50);
}

.gf-jugadors__opcio:active,
.gf-opcio:active,
.gf-nivell:active {
  transform: scale(0.98);
}

.gf-jugadors__opcio--actiu,
.gf-jugadors__opcio--actiu:hover,
.gf-opcio--actiu,
.gf-opcio--actiu:hover,
.gf-nivell--actiu,
.gf-nivell--actiu:hover {
  border-color: var(--color-marca);
  background: var(--color-marca-clar);
  box-shadow: 0 0 0 1px var(--color-marca);
}

/* Pas 1: nombre de jugadors (amb tantes figuretes com jugadors) */
.gf-jugadors {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.gf-jugadors__opcio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 0 10px;
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1;
}

.gf-jugadors__figures {
  display: flex;
  gap: 3px;
  height: 8px;
}

.gf-jugadors__figures span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pedra-300);
  transition: background var(--mou-rapid);
}

.gf-jugadors__opcio--actiu .gf-jugadors__figures span {
  background: var(--color-marca);
}

/* Fila d'un jugador: el seu color, el nom i la paleta de conquesta */
.gf-jugador-fila {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.gf-jugador-fila__color {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transition: background var(--mou-mig);
}

.gf-jugadors__nom {
  flex: 1;
  min-width: 0;
}

.gf-colors {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.gf-colors__opcio {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 2px solid var(--color-superficie);
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.55;
  transition:
    transform var(--mou-rapid),
    opacity var(--mou-rapid),
    box-shadow var(--mou-rapid);
}

.gf-colors__opcio:hover {
  opacity: 1;
}

.gf-colors__opcio--actiu {
  opacity: 1;
  box-shadow: 0 0 0 2px var(--color-text-fort);
  transform: scale(1.08);
}

/* Pas 2: modalitat */
.gf-modalitats {
  display: grid;
  gap: 10px;
}

.gf-opcio {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  text-align: left;
}

.gf-opcio__icona {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: var(--radi-md);
  background: var(--pedra-100);
  font-size: 1.5rem;
  transition: background var(--mou-rapid);
}

.gf-opcio--actiu .gf-opcio__icona {
  background: var(--color-marca-mig);
}

.gf-opcio__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.gf-opcio__nom {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.25;
}

.gf-opcio__desc {
  font-size: var(--text-sm);
  line-height: 1.35;
  color: var(--color-text-secundari);
}

/* Pas 3: nivells (dues columnes; l'últim, tot Catalunya, ocupa la fila) */
.gf-nivells {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.gf-nivell {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 7px 10px;
  text-align: left;
  font-size: var(--text-sm);
  font-weight: 600;
  line-height: 1.25;
}

.gf-nivell:last-child {
  grid-column: 1 / -1;
}

.gf-nivell__num {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--pedra-150);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-secundari);
  transition:
    background var(--mou-rapid),
    color var(--mou-rapid);
}

.gf-nivell--actiu .gf-nivell__num {
  background: var(--color-marca);
  color: #fff;
}

.gf-nivell__nom {
  flex: 1;
  min-width: 0;
}

.gf-nivell__quantitat {
  flex-shrink: 0;
  font-size: var(--text-xs);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secundari);
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
  padding: 0 14px;
  background: var(--gf-pista-fons);
  border: 1.5px solid var(--gf-pista-vora);
  border-radius: var(--radi-sm);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--gf-pista-text);
  cursor: pointer;
  transition: background var(--mou-rapid);
}

.gf-atzar:hover:not(:disabled) {
  background: var(--gf-pista-viu);
}

.gf-atzar:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Navegació del wizard i botó principal ──────────────────────────────── */

.gf-wizard-nav {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.gf-wizard-nav__enrere {
  padding: 0 20px;
  background: none;
  border: 1.5px solid var(--color-vora-forta);
  border-radius: var(--radi-md);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--pedra-700);
  cursor: pointer;
  transition: background var(--mou-rapid);
}

.gf-wizard-nav__enrere:hover {
  background: var(--pedra-100);
}

.gf-wizard-nav__seguent {
  width: auto;
  flex: 1;
}

/* Botó principal (Següent / Som-hi! / Torna a jugar) */
.gf-somhi {
  display: block;
  width: 100%;
  min-height: 46px;
  padding: 10px 12px;
  background: var(--color-marca);
  color: #fff;
  border: none;
  border-radius: var(--radi-md);
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(45, 106, 45, 0.3);
  transition:
    background var(--mou-rapid),
    box-shadow var(--mou-rapid),
    transform var(--mou-rapid),
    opacity var(--mou-rapid);
}

.gf-somhi:hover:not(:disabled) {
  background: var(--color-marca-fosc);
  box-shadow: 0 4px 14px rgba(45, 106, 45, 0.38);
}

.gf-somhi:active:not(:disabled) {
  transform: scale(0.98);
}

.gf-somhi:disabled {
  background: var(--pedra-300);
  box-shadow: none;
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

.gf-barra__context {
  font-size: var(--text-sm);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secundari);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

/* Micro-animació d'entrada de la pregunta (es re-dispara amb cada
   re-muntat per canvi de torn o d'objectiu) */
.gf-barra__pregunta {
  font-family: var(--font-display);
  font-size: 1.25rem;
  color: var(--color-text-fort);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  animation: gf-pregunta-entra 0.18s ease;
}

.gf-barra__pregunta strong {
  display: inline-block;
  font-weight: 700;
  color: var(--color-marca);
}

@keyframes gf-pregunta-entra {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
}

/* En pantalles estretes, context i pregunta passen a dues línies centrades
   i tornen a la mida compacta */
@media (max-width: 920px) {
  .gf-barra {
    flex-direction: column;
    gap: 0;
  }

  .gf-barra__context {
    font-size: var(--text-xs);
  }

  .gf-barra__pregunta {
    font-size: 1rem;
  }
}

/* ── Compte enrere ──────────────────────────────────────────────────────── */

.gf-compte {
  position: absolute;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  pointer-events: none;
}

/* El valor va dins un disc blanc (una pastilla si és text): es llegeix bé
   sobre qualsevol tros de mapa. */
.gf-compte__valor {
  display: grid;
  place-items: center;
  min-width: 150px;
  height: 150px;
  padding: 0 36px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--radi-pastilla);
  box-shadow: var(--ombra-3);
  font-family: var(--font-display);
  font-size: clamp(3rem, 14vw, 5rem);
  font-weight: 700;
  line-height: 1;
  color: var(--color-text-fort);
  animation: gf-compte-pop 0.5s cubic-bezier(0.3, 1.25, 0.45, 1);
}

@keyframes gf-compte-pop {
  from {
    opacity: 0;
    transform: scale(1.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Textos llargs al compte enrere ("Torn de Maria") */
.gf-compte__valor--text {
  height: auto;
  padding: 20px 34px;
  font-size: clamp(1.6rem, 7vw, 2.4rem);
  line-height: 1.2;
  text-align: center;
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
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.15;
  color: var(--color-text-fort);
  text-shadow:
    0 0 18px rgba(255, 255, 255, 0.95),
    0 0 6px rgba(255, 255, 255, 0.9),
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

@media (max-width: 768px) {
  .gf-anunci__torn {
    font-size: 1.4rem;
  }

  .gf-anunci__lloc {
    font-size: 2rem;
  }
}

/* ── Barra de progrés de la partida ─────────────────────────────────────── */

.gf-progres {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  z-index: 1400;
  background: rgba(26, 38, 53, 0.12);
}

.gf-progres__fet {
  height: 100%;
  background: linear-gradient(90deg, var(--verd-600), var(--verd-500));
  border-radius: 0 var(--radi-pastilla) var(--radi-pastilla) 0;
  transition: width 0.35s cubic-bezier(0.2, 0, 0, 1);
}

/* ── HUD de partida ─────────────────────────────────────────────────────── */

/* Part de dalt del HUD: els marcadors i, a sota, la caixa de resposta. El
   contenidor no captura el ratolí (el mapa de sota ha de rebre els clics). */
.gf-hud-dalt {
  position: absolute;
  top: 14px;
  left: 0;
  right: 0;
  z-index: 1500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  pointer-events: none;
}

.gf-hud-dalt > * {
  pointer-events: auto;
}

/* Caixa de resposta escrita («Com es diu...?») */
.gf-pregunta {
  width: min(360px, 100%);
  padding: 10px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid var(--color-vora);
  border-radius: var(--radi-lg);
  box-shadow: var(--ombra-3);
  color: var(--color-text-fort);
}

/* 1rem (16px) com a mínim: per sota, l'iPhone fa zoom en enfocar l'input */
.gf-pregunta input {
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border: 1.5px solid var(--color-vora-forta);
  border-radius: var(--radi-sm);
  font: inherit;
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-text);
  transition:
    border-color var(--mou-rapid),
    box-shadow var(--mou-rapid);
}

.gf-pregunta input:focus {
  outline: none;
  border-color: var(--color-marca);
  box-shadow: 0 0 0 3px var(--color-marca-mig);
}

.gf-pregunta input.gf-resposta--sacseig {
  animation: gf-sacseig 0.3s;
  border-color: var(--gf-error);
  box-shadow: 0 0 0 3px rgba(176, 48, 48, 0.15);
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
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: var(--radi-xs);
  text-align: left;
  font: inherit;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-fort);
  cursor: pointer;
  transition: background var(--mou-rapid);
}

.gf-suggeriments button:hover,
.gf-suggeriments .gf-suggeriment--actiu {
  background: var(--color-marca-clar);
  color: var(--color-marca);
}

/* Les 4 opcions de la pista («Com es diu...?») */
.gf-opcions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 8px;
}

.gf-opcions button {
  padding: 9px 10px;
  background: var(--gf-pista-fons);
  border: 1.5px solid var(--gf-pista-vora);
  border-radius: var(--radi-sm);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  line-height: 1.25;
  color: var(--color-text-fort);
  cursor: pointer;
  transition: background var(--mou-rapid);
}

.gf-opcions button:hover {
  background: var(--gf-pista-viu);
}

/* Pastilles flotants del HUD */
.gf-xip {
  position: absolute;
  z-index: 1500;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px 7px 14px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid var(--color-vora);
  border-radius: var(--radi-pastilla);
  box-shadow: var(--ombra-2);
  font-size: var(--text-base);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-fort);
  white-space: nowrap;
}

/* Marcadors (✓/✗, pista, passa, surt), dins .gf-hud-dalt */
.gf-xip--dreta {
  position: static;
  max-width: 100%;
}

/* Cronòmetre + progrés: centrats a baix del mapa */
.gf-xip--esquerra {
  bottom: 34px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  font-size: var(--text-md);
}

.gf-xip__separador {
  width: 1px;
  height: 18px;
  background: var(--color-vora-forta);
}

.gf-xip__encerts {
  color: var(--color-marca);
}

.gf-xip__ratxa {
  color: var(--gf-ratxa);
  animation: gf-compte-pop 0.25s ease-out;
}

/* Marcador per jugador (mode conquesta) i el seu punt de color */
.gf-xip__jugador {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: var(--radi-pastilla);
  color: var(--color-text-secundari);
  transition:
    background var(--mou-mig),
    color var(--mou-mig);
}

.gf-xip__jugador--actiu {
  background: var(--color-marca-mig);
  color: var(--color-text-fort);
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
  color: var(--gf-error);
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

/* Intents restants de la ronda (3 puntets que es van apagant) */
.gf-xip__intents {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.gf-xip__intent {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-marca);
  transition:
    background var(--mou-mig),
    transform var(--mou-mig);
}

.gf-xip__intent--gastat {
  background: var(--pedra-300);
  transform: scale(0.75);
}

/* Botons del HUD: pista (daurat), passa i surt. Van agrupats perquè, si el
   HUD es parteix en dues files, baixin tots tres junts. */
.gf-xip__accions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.gf-xip__surt,
.gf-xip__pista {
  min-height: 30px;
  padding: 4px 13px;
  background: var(--pedra-100);
  border: 1px solid var(--color-vora);
  border-radius: var(--radi-pastilla);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--pedra-700);
  cursor: pointer;
  transition:
    background var(--mou-rapid),
    border-color var(--mou-rapid);
}

.gf-xip__surt:hover:not(:disabled) {
  background: var(--pedra-200);
  border-color: var(--color-vora-forta);
}

.gf-xip__pista {
  background: var(--gf-pista-fons);
  border-color: var(--gf-pista-vora);
  color: var(--gf-pista-text);
}

.gf-xip__pista:hover:not(:disabled) {
  background: var(--gf-pista-viu);
}

.gf-xip__surt:disabled,
.gf-xip__pista:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Modal de resultats ─────────────────────────────────────────────────── */

.gf-resultats {
  text-align: center;
}

.gf-resultats__copa {
  align-self: center;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin-bottom: 8px;
  border-radius: 50%;
  background: var(--gf-pista-fons);
  box-shadow: inset 0 0 0 1px rgba(217, 178, 60, 0.45);
  font-size: 2rem;
  line-height: 1;
  animation: gf-copa 0.6s 0.15s cubic-bezier(0.3, 1.25, 0.45, 1) backwards;
}

@keyframes gf-copa {
  from {
    opacity: 0;
    transform: scale(0.4) rotate(-20deg);
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

.gf-resultats__punts {
  margin-top: 4px;
  font-family: var(--font-display);
  font-size: 3.6rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--color-marca);
}

.gf-resultats__punts-etiqueta {
  margin-bottom: 16px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-text-secundari);
}

/* Estadístiques de la partida, una rajola per dada */
.gf-resultats__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
  gap: 8px;
  margin-bottom: 18px;
}

.gf-resultats__stats > div {
  padding: 10px 6px;
  background: var(--pedra-100);
  border-radius: var(--radi-md);
}

.gf-resultats__stats dt {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-text-secundari);
}

.gf-resultats__stats dd {
  margin: 2px 0 0;
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  color: var(--color-text-fort);
}

/* Classificació del multijugador */
.gf-classificacio {
  width: 100%;
  margin: 4px 0 18px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: var(--text-base);
  font-variant-numeric: tabular-nums;
}

.gf-classificacio th {
  padding: 6px 8px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secundari);
  text-align: center;
}

.gf-classificacio th:first-child {
  text-align: left;
}

.gf-classificacio td {
  padding: 10px 8px;
  text-align: center;
  border-top: 1px solid var(--color-vora);
  font-weight: 600;
  color: var(--color-text-fort);
}

.gf-classificacio td.gf-classificacio__nom {
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.gf-classificacio__nom .gf-xip__colorjug {
  margin-right: 6px;
}

.gf-classificacio__guanyador td {
  background: var(--color-marca-clar);
  border-top-color: transparent;
  font-weight: 800;
}

.gf-classificacio__guanyador td:first-child {
  border-radius: var(--radi-sm) 0 0 var(--radi-sm);
}

.gf-classificacio__guanyador td:last-child {
  border-radius: 0 var(--radi-sm) var(--radi-sm) 0;
}

.gf-resultats__config {
  display: block;
  width: 100%;
  min-height: 42px;
  margin-top: 8px;
  padding: 9px;
  background: none;
  border: 1.5px solid var(--color-vora-forta);
  border-radius: var(--radi-md);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-marca);
  cursor: pointer;
  transition:
    background var(--mou-rapid),
    border-color var(--mou-rapid);
}

.gf-resultats__config:hover {
  background: var(--color-marca-clar);
  border-color: var(--verd-200);
}

/* En pantalles amples la caixa de resposta va a l'esquerra, al costat del
   control de zoom: ni ella ni els suggeriments tapen mai el territori (el
   mapa s'enquadra a la dreta; vegeu margesMapa). */
@media (min-width: 1100px) {
  .gf-hud-dalt .gf-pregunta {
    position: absolute;
    top: 0;
    left: 60px;
    width: 320px;
  }
}

/* ── Mòbil ──────────────────────────────────────────────────────────────── */

@media (max-width: 768px) {
  .gf-modal {
    padding: 20px 16px 16px;
  }

  /* Els nivells, en una sola columna (els noms llargs no hi caben en dues) */
  .gf-nivells {
    grid-template-columns: 1fr;
  }

  /* El nom del jugador a dalt i la paleta, a sota, a tot l'ample */
  .gf-jugador-fila {
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .gf-colors {
    width: 100%;
    justify-content: space-between;
  }

  .gf-colors__opcio {
    width: 34px;
    height: 34px;
  }

  .gf-hud-dalt {
    top: 10px;
    padding: 0 8px;
  }

  /* Els marcadors poden ocupar dues files (els botons baixen a la segona);
     en multijugador només el jugador del torn mostra el nom. Targets
     tàctils a 44px. */
  .gf-xip--dreta {
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 8px;
    padding: 6px 10px;
    border-radius: var(--radi-lg);
  }

  .gf-xip__jugador:not(.gf-xip__jugador--actiu) .gf-xip__nomjug {
    display: none;
  }

  .gf-xip--dreta .gf-xip__separador {
    display: none;
  }

  .gf-xip__pista,
  .gf-xip__surt {
    flex-shrink: 0;
    min-height: 44px;
    padding: 6px 14px;
  }

  .gf-suggeriments button,
  .gf-opcions button {
    min-height: 44px;
  }
}

/* ── Sense moviment ─────────────────────────────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  .gf-modal,
  .gf-modal > .gf-modal__cos,
  .gf-barra__pregunta,
  .gf-compte__valor,
  .gf-xip__ratxa,
  .gf-xip__errors,
  .gf-resultats__copa,
  .gf-pregunta input.gf-resposta--sacseig {
    animation: none;
  }

  .gf-anunci {
    animation-name: gf-anunci-fos;
  }

  .gf-confeti {
    display: none;
  }

  .gf-jugadors__opcio:active,
  .gf-opcio:active,
  .gf-nivell:active,
  .gf-somhi:active:not(:disabled) {
    transform: none;
  }

  .gf-progres__fet {
    transition: none;
  }
}
</style>
