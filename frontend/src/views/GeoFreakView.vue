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
  type TipusDemarcacio,
} from '@/data/geofreak'
import { normalitza } from '@/data/text'
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
const araMs = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  territoris.carregaArbre()
  ticker = setInterval(() => (araMs.value = Date.now()), 500)
})
// En sortir del joc (navegar a una altra secció) la configuració es reinicia.
onUnmounted(() => {
  if (ticker) clearInterval(ticker)
  geofreak.reinicia()
})

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

// Anunci del nou objectiu: el canvi de lloc només es veia a la barra i
// passava desapercebut. A «On és...?», cada nou objectiu (per encert, per
// salt o per Passa) apareix GRAN al centre del mapa i es fon lentament.
// (A «Com es diu...?» no: el nom és justament la resposta.)
const anunci = ref('')
const anunciClau = ref(0)
watch(
  () => (geofreak.fase === 'partida' ? (geofreak.partida?.objectiu ?? null) : null),
  (objectiu) => {
    if (!objectiu || geofreak.configuracio.modalitat !== 'onEs') return
    anunci.value = objectiuNom.value
    anunciClau.value++
  }
)

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
  const fi = geofreak.fase === 'partida' ? araMs.value : geofreak.tempsFiMs
  const segons = Math.max(0, Math.floor((fi - geofreak.tempsIniciMs) / 1000))
  return `${Math.floor(segons / 60)}:${String(segons % 60).padStart(2, '0')}`
})

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

// Respon una ronda (clic al mapa o resposta escrita) amb feedback visual:
// flaix al mapa i, a la resposta escrita errònia, sacseig de l'input.
function gestionaClicJoc(codi: string) {
  const resultat = geofreak.clicDemarcacio(codi)
  if (resultat === 'encert') mapaRef.value?.flaixJoc(codi, 'encert')
  else if (resultat === 'error' || resultat === 'salt') mapaRef.value?.flaixJoc(codi, 'error')
}

function respon(codi: string) {
  const resultat = geofreak.clicDemarcacio(codi)
  if (resultat === 'encert') mapaRef.value?.flaixJoc(codi, 'encert')
  else if (resultat === 'error' || resultat === 'salt') {
    sacsejant.value = false
    requestAnimationFrame(() => (sacsejant.value = true))
  }
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

// En arrencar una partida de «Com es diu...?», el focus va directe a l'input.
watch(
  () => geofreak.fase,
  async (fase) => {
    if (fase === 'partida' && geofreak.configuracio.modalitat === 'comEsDiu') {
      textResposta.value = ''
      await nextTick()
      respostaInput.value?.focus()
    }
  }
)

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

function arrencaAmbCompte() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    geofreak.comencaPartida(codisJoc.value)
    return
  }
  geofreak.preparaPartida(codisJoc.value)
  if (geofreak.fase !== 'preparacio') return
  const seqüencia = ['3', '2', '1', t('geofreak.somhi')]
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
</script>

<template>
  <div class="gf-layout">
    <PanellFiltres>
      <!-- La barra de menú queda buida durant el joc: s'hi posa el context
           de la partida i la pregunta del torn (més espai de joc al mapa). -->
      <div v-if="geofreak.fase !== 'configuracio'" class="gf-barra">
        <span class="gf-barra__context">{{ textContext }}</span>
        <span
          v-if="geofreak.fase === 'partida'"
          class="gf-barra__pregunta"
          role="status"
          aria-live="polite"
        >
          <template v-if="geofreak.configuracio.modalitat === 'onEs'">
            {{ $t('geofreak.preguntaOnEs') }}&nbsp;<Transition name="gf-canvi" mode="out-in"
              ><strong :key="objectiuNom">{{ objectiuNom }}</strong></Transition
            >?
          </template>
          <template v-else>{{ $t('geofreak.modalitats.comEsDiu') }}</template>
        </span>
      </div>
    </PanellFiltres>
    <div class="gf-cos">
      <MapaLeaflet ref="mapaRef" :mode-joc="modeJocMapa" @clic-joc="gestionaClicJoc" />

      <!-- ── Modal de configuració de la partida ─────────────────────────── -->
      <div v-if="geofreak.fase === 'configuracio'" class="gf-modal-fons">
        <div class="gf-modal" role="dialog" aria-modal="true" aria-labelledby="gf-titol">
          <h2 id="gf-titol" class="gf-modal__titol">GeoFreak</h2>
          <p class="gf-modal__sub">{{ $t('geofreak.titolModal') }}</p>

          <div class="gf-camp">
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
            <select id="gf-contenidor" v-model="contenidorSeleccionat">
              <option value="" disabled>{{ $t('geofreak.triaOpcio') }}</option>
              <option v-for="o in opcionsContenidor" :key="o.codi" :value="o.codi">
                {{ o.nom }}
              </option>
            </select>
          </div>

          <button
            type="button"
            class="gf-somhi"
            :disabled="!geofreak.configCompleta"
            @click="arrencaAmbCompte"
          >
            {{ $t('geofreak.somhi') }}
          </button>
        </div>
      </div>

      <!-- ── Compte enrere (fase de preparació) ──────────────────────────── -->
      <div v-else-if="geofreak.fase === 'preparacio'" class="gf-compte" aria-live="assertive">
        <span v-if="compteEnrere" :key="compteEnrere" class="gf-compte__valor">{{
          compteEnrere
        }}</span>
      </div>

      <!-- ── HUD de partida ───────────────────────────────────────────────── -->
      <template v-else-if="geofreak.fase === 'partida'">
        <div
          v-if="anunci"
          :key="anunciClau"
          class="gf-anunci"
          aria-hidden="true"
          @animationend="anunci = ''"
        >
          {{ anunci }}
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
          <span aria-hidden="true">⏱</span>
          <span>{{ cronoText }}</span>
          <span class="gf-xip__separador" aria-hidden="true"></span>
          <span
            >{{ geofreak.partida?.encertades.length ?? 0 }}/{{ geofreak.totalDemarcacions }}</span
          >
        </div>
        <div class="gf-xip gf-xip--dreta">
          <span
            v-if="geofreak.ratxa >= 2"
            :key="geofreak.ratxa"
            class="gf-xip__ratxa"
            :title="$t('geofreak.ratxaAria')"
            >🔥 {{ geofreak.ratxa }}</span
          >
          <span class="gf-xip__encerts">✓ {{ geofreak.partida?.encertades.length ?? 0 }}</span>
          <span :key="geofreak.partida?.errors" class="gf-xip__errors"
            >✗ {{ geofreak.partida?.errors ?? 0 }}</span
          >
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
          <button type="button" class="gf-xip__surt" @click="geofreak.tornaAConfiguracio()">
            {{ $t('geofreak.surt') }}
          </button>
        </div>
      </template>

      <!-- ── Modal de resultats ───────────────────────────────────────────── -->
      <div v-else class="gf-modal-fons">
        <div class="gf-confeti" aria-hidden="true">
          <span v-for="n in 14" :key="n" :style="{ '--gf-i': String(n) }"></span>
        </div>
        <div class="gf-modal gf-resultats" role="dialog" aria-modal="true">
          <h2 class="gf-modal__titol">{{ $t('geofreak.resultats.titol') }}</h2>
          <p class="gf-modal__sub">{{ resumPartida }}</p>

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
            <div v-if="geofreak.encertsAmbPista > 0">
              <dt>{{ $t('geofreak.resultats.pistes') }}</dt>
              <dd>{{ geofreak.encertsAmbPista }}</dd>
            </div>
          </dl>

          <button type="button" class="gf-somhi" @click="arrencaAmbCompte">
            {{ $t('geofreak.resultats.tornaJugar') }}
          </button>
          <button type="button" class="gf-resultats__config" @click="geofreak.tornaAConfiguracio()">
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

/* ── Anunci del nou objectiu (apareix gran i es fon lentament) ──────────── */

.gf-anunci {
  position: absolute;
  inset: 0;
  z-index: 1450;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  text-align: center;
  pointer-events: none;
  font-size: 3.2rem;
  font-weight: 800;
  color: #1a2635;
  text-shadow:
    0 0 18px rgba(255, 255, 255, 0.95),
    0 2px 6px rgba(255, 255, 255, 0.85);
  animation: gf-anunci 2.4s ease-out forwards;
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
  .gf-anunci {
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

/* Micro-transició del nom objectiu en canviar de ronda */
.gf-canvi-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.gf-canvi-leave-active {
  transition: opacity 0.1s ease;
}

.gf-canvi-enter-from {
  opacity: 0;
  transform: translateY(-5px);
}

.gf-canvi-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .gf-canvi-enter-active,
  .gf-canvi-leave-active {
    transition: none;
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

/* En mòbil la caixa de resposta es compacta una mica */
@media (max-width: 768px) {
  .gf-pregunta {
    font-size: 0.95rem;
    padding: 8px 14px;
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
