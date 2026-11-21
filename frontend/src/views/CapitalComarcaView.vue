<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'
import MapaLeaflet from '@/components/mapa/MapaLeaflet.vue'
import PanellFiltres from '@/components/filtres/PanellFiltres.vue'
import BarraJoc from '@/components/jocs/BarraJoc.vue'
import WizardJoc from '@/components/jocs/WizardJoc.vue'
import PasJugadors from '@/components/jocs/PasJugadors.vue'
import PasModalitat from '@/components/jocs/PasModalitat.vue'
import CompteEnrere from '@/components/jocs/CompteEnrere.vue'
import AnunciRonda from '@/components/jocs/AnunciRonda.vue'
import HudPartida from '@/components/jocs/HudPartida.vue'
import CaixaResposta from '@/components/jocs/CaixaResposta.vue'
import ModalSortida from '@/components/jocs/ModalSortida.vue'
import ModalResultats from '@/components/jocs/ModalResultats.vue'
import { useTerritorisStore } from '@/stores/territoris'
import { useCapitalComarcaStore } from '@/stores/capitalComarca'
import {
  MODALITATS_CAPITALS,
  candidatsCapitals,
  capitalsPerComarca,
  grupsDistractors,
  triaCapital,
  type ModalitatCapitals,
} from '@/data/capitalComarca'
import { barreja, triaDistractors, type Candidat } from '@/data/partida'
import { articleComarca, nomAmbArticle, nomAmbDe } from '@/data/articles'
import { useVistaJoc } from '@/composables/useVistaJoc'
import type { ModeJocMapa } from '@/stores/mapa'
import '@/components/jocs/jocs.css'

// Capital<>Comarca (spec: viscalaterra_plan.md § Capital<>Comarca). Dues
// modalitats: «Quina és la capital de...?» (es mostra la comarca, s'escriu la
// capital) i «De quina comarca és capital...?» (al revés). Sempre les 43
// comarques i sempre responent per escrit: al mapa no es clica. El mapa queda
// de fons: les comarques encertades s'hi pinten (amb el color del jugador, en
// multijugador) i, a la primera modalitat, s'hi il·lumina la comarca
// preguntada — a la segona no, perquè seria la resposta.

const { t } = useI18n()
const territoris = useTerritorisStore()
const joc = useCapitalComarcaStore()

const mapaRef = ref<InstanceType<typeof MapaLeaflet> | null>(null)
const caixaRef = ref<InstanceType<typeof CaixaResposta> | null>(null)

// Peces de la vista comunes als jocs (cronòmetre, pausa, sortida, HUD…).
const {
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
} = useVistaJoc(joc, {
  ambResposta: () => true,
  focusResposta: () => caixaRef.value?.focus(),
  obreConfiguracio,
})

onMounted(() => territoris.carregaArbre())
// En sortir del joc (navegar a una altra secció) la configuració es reinicia.
onUnmounted(() => joc.reinicia())

// Sense les dades territorials (noms i capitals) no es pot jugar.
const dadesCarregant = computed(() => territoris.carregant || territoris.arbre === null)
const dadesError = computed(() => territoris.error !== null && territoris.arbre === null)

// ── Comarques i capitals ───────────────────────────────────────────────────

// Codi → nom de cada comarca, sense l'aclariment entre parèntesis d'algun nom
// oficial. Les transfrontereres surten sota dues províncies a l'arbre, però
// són una sola comarca.
const nomsComarca = computed(() => {
  const m = new Map<string, string>()
  territoris.arbre?.forEach((p) =>
    p.comarques.forEach((c) => {
      if (!m.has(c.codi)) m.set(c.codi, c.nom.replace(/\s*\(.+\)\s*$/, ''))
    })
  )
  return m
})

// Províncies de cada comarca (dues, les transfrontereres): els distractors
// de la pista es busquen primer entre les veïnes.
const provinciesPerComarca = computed(() => {
  const m = new Map<string, string[]>()
  territoris.arbre?.forEach((p) =>
    p.comarques.forEach((c) => m.set(c.codi, [...(m.get(c.codi) ?? []), p.codi]))
  )
  return m
})

// Codi → capitals (el Vallès Occidental en té dues).
const capitals = computed(() =>
  capitalsPerComarca(territoris.arbre?.flatMap((p) => p.comarques) ?? [])
)

// Totes les comarques amb capital entren en joc.
const codisJoc = computed(() => [...nomsComarca.value.keys()].filter((c) => capitals.value.has(c)))

// ── Wizard de configuració (2 passos: jugadors → modalitat) ────────────────

const nomsPassos = computed(() => [t('partida.wizard.jugadors'), t('partida.modalitat')])

// Amb dos passos, tots dos són sempre assolibles des de l'indicador.
const potAnarAPas = () => true

const ICONA_MODALITAT: Record<ModalitatCapitals, string> = {
  quinaCapital: '🏛️',
  quinaComarca: '🗺️',
}

const opcionsModalitat = computed(() =>
  MODALITATS_CAPITALS.map((m) => ({
    id: m,
    icona: ICONA_MODALITAT[m],
    nom: t(`capitalComarca.modalitats.${m}`),
    desc: t(`capitalComarca.modalitats.${m}Desc`),
  }))
)

// El pas de la modalitat delega l'escriptura al store (patró get/set).
const modalitatTriada = computed({
  get: () => joc.configuracio.modalitat,
  set: (m: ModalitatCapitals | null) => {
    if (m) joc.defineixModalitat(m)
  },
})

// Torna al wizard (des de Surt o des dels resultats), directe al pas de la
// modalitat; el dels jugadors queda amb Enrere.
function obreConfiguracio() {
  joc.tornaAConfiguracio()
  pasWizard.value = 2
}

const esQuinaCapital = computed(() => joc.configuracio.modalitat === 'quinaCapital')

// ── Pregunta de la ronda ───────────────────────────────────────────────────

const objectiu = computed(() => joc.partida?.objectiu ?? null)
const comarcaObjectiu = computed(() =>
  objectiu.value ? (nomsComarca.value.get(objectiu.value) ?? '') : ''
)
const articleObjectiu = computed(() => (objectiu.value ? articleComarca(objectiu.value) : ''))

// Capital que es pregunta a «De quina comarca és capital...?». Es fixa a cada
// canvi d'objectiu: si la comarca en té dues, una a l'atzar.
const capitalPreguntada = ref('')
watch(
  objectiu,
  (codi) => {
    capitalPreguntada.value = codi ? triaCapital(capitals.value.get(codi) ?? []) : ''
  },
  { immediate: true }
)

// Anunci de cada ronda al centre del mapa: el que es pregunta, en gran
// ("el Maresme" o "Mataró"; mai la resposta).
const anunciLloc = computed(() => {
  if (!objectiu.value) return ''
  return esQuinaCapital.value
    ? nomAmbArticle(comarcaObjectiu.value, articleObjectiu.value)
    : capitalPreguntada.value
})

// ── Respostes ──────────────────────────────────────────────────────────────

// Comarques encara no encertades.
const vives = computed(() => {
  const encertades = new Set(joc.partida?.encertades ?? [])
  return codisJoc.value.filter((c) => !encertades.has(c))
})

// Respostes possibles: les capitals de les comarques vives o els seus noms.
const candidats = computed<Candidat[]>(() =>
  esQuinaCapital.value
    ? candidatsCapitals(capitals.value, vives.value)
    : vives.value
        .map((codi) => ({ codi, nom: nomsComarca.value.get(codi) ?? codi }))
        .sort((a, b) => a.nom.localeCompare(b.nom, 'ca'))
)

// Nom amb què es mostra una resposta a les opcions de la pista: la capital
// (la primera, si n'hi ha dues) o la comarca.
function nomResposta(codi: string): string {
  return esQuinaCapital.value
    ? (capitals.value.get(codi)?.[0] ?? codi)
    : (nomsComarca.value.get(codi) ?? codi)
}

const opcionsPista = computed(() =>
  joc.pista ? joc.pista.map((codi) => ({ codi, nom: nomResposta(codi) })) : null
)

// La pista es pot demanar si la ronda no en té ja i queda més d'una comarca.
const pistaDisponible = computed(() => !joc.pista && vives.value.length > 1)

// Encert: la comarca s'il·lumina al mapa (també a la segona modalitat: així
// s'aprèn on és). Error: sacseig de la caixa.
function respon(codi: string) {
  const resultat = joc.respon(codi)
  if (resultat === 'encert') mapaRef.value?.flaixJoc(codi, 'encert')
  else if (resultat === 'error' || resultat === 'salt') caixaRef.value?.sacseja()
  anunciaResultat(resultat)
}

// 4 opcions: la resposta bona i 3 distractors, primer de la mateixa província
// (només capitals de comarca, o només comarques, segons la modalitat).
function demanaPista() {
  const codi = objectiu.value
  if (!codi || joc.pista) return
  const grups = grupsDistractors(codi, vives.value, (c) => provinciesPerComarca.value.get(c) ?? [])
  joc.activaPista(barreja([codi, ...triaDistractors(codi, grups)]))
}

function passa() {
  joc.passaRonda()
  caixaRef.value?.neteja()
  caixaRef.value?.focus()
}

// ── Inici i final de partida ───────────────────────────────────────────────

// Re-juga amb la mateixa modalitat i jugadors (des dels resultats).
function rejuga() {
  joc.preparaPartida(codisJoc.value)
}

const resumPartida = computed(() => {
  const m = joc.configuracio.modalitat
  if (!m) return ''
  return `«${t(`capitalComarca.modalitats.${m}`)}» · ${t('capitalComarca.nComarques', {
    n: codisJoc.value.length,
  })}`
})

// ── Mapa en mode joc (de fons, sense clics) ────────────────────────────────

// Franges del mapa que tapa el HUD (px): a dalt els marcadors (dues files en
// mòbil) i la caixa de resposta, que en pantalles amples va a l'esquerra; a
// baix, el cronòmetre. Lligades a les mides del CSS de HudPartida i
// CaixaResposta (mateixos valors que GeoFreak a «Com es diu...?»).
const margesMapa = computed(() => {
  if (joc.fase === 'configuracio') return null
  const marcadors = esMobil.value ? 116 : 68
  // Amb la pista demanada, la caixa creix amb les 4 opcions.
  const opcions = joc.pista ? (esMobil.value ? 106 : 90) : 0
  return {
    dalt: marcadors + (esAmple.value ? 0 : 74 + opcions),
    baix: 84,
    esquerra: esAmple.value ? 396 : 0,
  }
})

const modeJocMapa = computed<ModeJocMapa>(() => ({
  nivell: 'comarques',
  contenidor: null,
  codisPermesos: null,
  codisEncertats: joc.partida?.encertades ?? [],
  // Mode conquesta: cada encertada amb el color del seu jugador.
  colorsEncertats: joc.esMultijugador ? joc.colorsConquestes : null,
  // La comarca preguntada s'il·lumina només a «Quina és la capital de...?».
  codiObjectiu: joc.fase !== 'configuracio' && esQuinaCapital.value ? objectiu.value : null,
  codisPista: null,
  interactiu: false,
  marges: margesMapa.value,
}))
</script>

<template>
  <div class="joc-layout">
    <PanellFiltres>
      <BarraJoc
        v-if="joc.fase !== 'configuracio'"
        :context="$t('capitalComarca.context')"
        :clau-pregunta="clauRonda"
        :mostra-pregunta="joc.fase === 'partida'"
        :jugador="jugadorBarra"
      >
        <!-- "Quina és la capital del Maresme?" / "De quina comarca és capital
             Mataró?": cada idioma tria la forma del nom ({nomDe}, {nomSol}). -->
        <I18nT v-if="esQuinaCapital" keypath="capitalComarca.preguntaCapital" scope="global">
          <template #nomDe>
            <strong>{{ nomAmbDe(comarcaObjectiu, articleObjectiu) }}</strong>
          </template>
          <template #nomSol>
            <strong>{{ comarcaObjectiu }}</strong>
          </template>
        </I18nT>
        <I18nT v-else keypath="capitalComarca.preguntaComarca" scope="global">
          <template #capital>
            <strong>{{ capitalPreguntada }}</strong>
          </template>
        </I18nT>
      </BarraJoc>
    </PanellFiltres>
    <div class="joc-cos">
      <MapaLeaflet ref="mapaRef" :mode-joc="modeJocMapa" />

      <!-- Feedback per a lectors de pantalla (no només color/animació) -->
      <p class="joc-sr-only" role="status" aria-live="assertive">{{ anunciResultat }}</p>

      <!-- ── Wizard de configuració ─────────────────────────────────────── -->
      <WizardJoc
        v-if="joc.fase === 'configuracio'"
        v-model:pas="pasWizard"
        :titol="$t('jocs.capitalComarca.nom')"
        :subtitol="$t('partida.titolModal')"
        :passos="nomsPassos"
        :pot-anar-a-pas="potAnarAPas"
        :pas-valid="true"
        :pot-comencar="joc.configCompleta"
        :carregant="dadesCarregant"
        :error="dadesError"
        @somhi="confirmaISomhi(codisJoc)"
        @reintenta="territoris.carregaArbre()"
      >
        <!-- Pas 1: jugadors (amb un de sol no calen noms) -->
        <PasJugadors
          v-if="pasWizard === 1"
          v-model:num="numJugadors"
          v-model:noms="nomsJugadors"
          v-model:colors="colorsJugadors"
        />
        <!-- Pas 2: modalitat -->
        <PasModalitat
          v-else
          v-model="modalitatTriada"
          :opcions="opcionsModalitat"
          :etiqueta="$t('partida.modalitat')"
        />
      </WizardJoc>

      <!-- ── Compte enrere (fase de preparació) ─────────────────────────── -->
      <CompteEnrere
        v-else-if="joc.fase === 'preparacio'"
        :torn="textTorn"
        @fi="joc.arrencaPartida()"
      />

      <!-- ── HUD de partida ─────────────────────────────────────────────── -->
      <template v-else-if="joc.fase === 'partida'">
        <AnunciRonda
          :clau="clauRonda"
          :torn="textTorn ?? ''"
          :color="joc.esMultijugador ? (joc.jugadorActual?.color ?? '') : ''"
          :lloc="anunciLloc"
        />
        <HudPartida
          :encertats="joc.partida?.encertades.length ?? 0"
          :total="joc.totalObjectius"
          :crono="cronoText"
          :jugadors="joc.esMultijugador ? joc.estatJugadors : null"
          :torn-actual="joc.tornActual"
          :ratxa="joc.ratxa"
          :errors="errorsMostrats"
          :pistes="pistesMostrades"
          :intents-restants="intentsRestants"
          :pista-disponible="pistaDisponible"
          :passa-disponible="passaDisponible"
          @pista="demanaPista"
          @passa="passa"
          @surt="demanaSortida"
        >
          <CaixaResposta
            ref="caixaRef"
            :candidats="candidats"
            :opcions-pista="opcionsPista"
            :placeholder="
              $t(esQuinaCapital ? 'capitalComarca.escriuCapital' : 'capitalComarca.escriuComarca')
            "
            :etiqueta="$t(`capitalComarca.modalitats.${joc.configuracio.modalitat}`)"
            @respon="respon"
          />
        </HudPartida>

        <!-- Confirmació de sortida (la partida queda en pausa mentrestant) -->
        <ModalSortida
          v-if="confirmantSortida"
          @continua="continuaPartida"
          @surt="confirmaSortida"
        />
      </template>

      <!-- ── Resultats ──────────────────────────────────────────────────── -->
      <ModalResultats
        v-else
        :resum="resumPartida"
        :resultats="joc.resultats"
        :temps="cronoText"
        :encerts="joc.partida?.encertades.length ?? 0"
        :errors="joc.partida?.errors ?? 0"
        :pistes="joc.resultats[0]?.pistes ?? 0"
        columna-pistes
        @rejuga="rejuga"
        @configura="obreConfiguracio"
      />
    </div>
  </div>
</template>
