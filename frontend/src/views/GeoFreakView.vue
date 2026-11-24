<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
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
import BarraRevisio from '@/components/jocs/BarraRevisio.vue'
import { useTerritorisStore } from '@/stores/territoris'
import { useGeofreakStore } from '@/stores/geofreak'
import {
  CAPA_PER_DEMARCACIO,
  MODALITATS,
  NIVELLS,
  type ModalitatJoc,
  type TipusDemarcacio,
} from '@/data/geofreak'
import { barreja, triaDistractors } from '@/data/partida'
import { useVistaJoc } from '@/composables/useVistaJoc'
import {
  articleComarca,
  articleVegueria,
  nomAmbArticle,
  nomAmbDe,
  type Article,
} from '@/data/articles'
import type { ModeJocMapa } from '@/stores/mapa'
import '@/components/jocs/jocs.css'

// GeoFreak — joc d'identificació territorial (spec: viscalaterra_plan.md § GeoFreak).
// Dues modalitats jugables: «On és...?» (clic al mapa) i «Com es diu...?»
// (el mapa il·lumina l'objectiu i s'escriu el nom, amb autocomplete).
// Les peces comunes dels jocs (wizard, HUD, modals) són a components/jocs/.

const { t } = useI18n()
const territoris = useTerritorisStore()
const geofreak = useGeofreakStore()

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
} = useVistaJoc(geofreak, {
  ambResposta: () => geofreak.configuracio.modalitat === 'comEsDiu',
  focusResposta: () => caixaRef.value?.focus(),
  obreConfiguracio,
})

onMounted(() => territoris.carregaArbre())
// En sortir del joc (navegar a una altra secció) la configuració es reinicia.
onUnmounted(() => geofreak.reinicia())

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

// El pas 1 sempre és vàlid (amb un sol jugador no calen noms); el 2 demana
// modalitat; el 3 valida amb configCompleta directament al botó Som-hi.
const pasValid = computed(() => {
  if (pasWizard.value === 2) return geofreak.configuracio.modalitat !== null
  return true
})

// Indicador de passos: també serveix per saltar a un pas ja assolible (al 3
// només s'hi arriba amb la modalitat triada, igual que amb «Següent»).
const nomsPassos = computed(() => [
  t('partida.wizard.jugadors'),
  t('partida.modalitat'),
  t('geofreak.nivell'),
])

function potAnarAPas(pas: number): boolean {
  return pas < 3 || geofreak.configuracio.modalitat !== null
}

const ICONA_MODALITAT: Record<ModalitatJoc, string> = {
  onEs: '📍',
  comEsDiu: '⌨️',
}

const opcionsModalitat = computed(() =>
  MODALITATS.map((m) => ({
    id: m,
    icona: ICONA_MODALITAT[m],
    nom: t(`geofreak.modalitats.${m}`),
    desc: t(`geofreak.modalitats.${m}Desc`),
  }))
)

// El pas de la modalitat delega l'escriptura al store (patró get/set).
const modalitatTriada = computed({
  get: () => geofreak.configuracio.modalitat,
  set: (m: ModalitatJoc | null) => {
    if (m) geofreak.defineixModalitat(m)
  },
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

// Franges del mapa que tapa el HUD durant la partida (px): a dalt, els
// marcadors (dues files en mòbil); a baix, el cronòmetre; i la caixa de
// resposta de «Com es diu...?», que en pantalles amples va a l'esquerra i en
// la resta sota els marcadors. El mapa enquadra el territori a l'espai lliure
// — si no, el nord (Val d'Aran, Pallars) quedava sota el HUD: no es podia
// clicar ni es veia il·luminat. Valors lligats a les mides del CSS del HUD
// (HudPartida i CaixaResposta). Sota el wizard, cap marge.
const margesMapa = computed(() => {
  if (geofreak.fase === 'configuracio') return null
  // Revisant el mapa en acabar, només hi ha la barra de la revisió a baix.
  if (revisant.value) return margesRevisio.value
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
    // Revisió del mapa en acabar: els noms de totes les encertades.
    nomsFixos: revisant.value && nomsRevisio.value,
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

// Anunci de cada ronda al centre del mapa: a «On és...?» el nou objectiu en
// gran (a «Com es diu...?» no: el nom del lloc és justament la resposta).
const anunciLloc = computed(() =>
  geofreak.configuracio.modalitat === 'onEs' ? objectiuNom.value : ''
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

// ── Respostes ──────────────────────────────────────────────────────────────

// Candidates vives: jugables encara no encertades, amb el seu nom.
const candidats = computed(() => {
  const encertades = new Set(geofreak.partida?.encertades ?? [])
  return codisJoc.value
    .filter((codi) => !encertades.has(codi))
    .map((codi) => ({ codi, nom: nomsJoc.value.get(codi) ?? codi }))
})

// Clic al mapa («On és...?»): flaix verd o vermell sobre la demarcació.
function gestionaClicJoc(codi: string) {
  const resultat = geofreak.respon(codi)
  if (resultat === 'encert') mapaRef.value?.flaixJoc(codi, 'encert')
  else if (resultat === 'error' || resultat === 'salt') mapaRef.value?.flaixJoc(codi, 'error')
  anunciaResultat(resultat)
}

// Resposta escrita («Com es diu...?»): flaix a l'encert i, a l'error,
// sacseig de la caixa.
function respon(codi: string) {
  const resultat = geofreak.respon(codi)
  if (resultat === 'encert') mapaRef.value?.flaixJoc(codi, 'encert')
  else if (resultat === 'error' || resultat === 'salt') caixaRef.value?.sacseja()
  anunciaResultat(resultat)
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
  geofreak.pista
    ? geofreak.pista.map((codi) => ({ codi, nom: nomsJoc.value.get(codi) ?? codi }))
    : null
)

// La pista es pot demanar si la ronda no en té ja i queda més d'una candidata.
const pistaDisponible = computed(() => !geofreak.pista && candidats.value.length > 1)

function passa() {
  geofreak.passaRonda()
  caixaRef.value?.neteja()
  if (geofreak.configuracio.modalitat === 'comEsDiu') caixaRef.value?.focus()
}

// ── Inici i final de partida ───────────────────────────────────────────────

// Re-juga amb la mateixa configuració i jugadors (des dels resultats).
function rejuga() {
  geofreak.preparaPartida(codisJoc.value)
}

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
  <div class="joc-layout">
    <PanellFiltres>
      <BarraJoc
        v-if="geofreak.fase !== 'configuracio'"
        :context="textContext"
        :clau-pregunta="clauRonda"
        :mostra-pregunta="geofreak.fase === 'partida'"
        :jugador="jugadorBarra"
      >
        <template v-if="geofreak.configuracio.modalitat === 'onEs'">
          {{ $t('geofreak.preguntaOnEs') }}&nbsp;<strong>{{ objectiuNom }}</strong
          >?
        </template>
        <template v-else>{{ $t('geofreak.modalitats.comEsDiu') }}</template>
      </BarraJoc>
    </PanellFiltres>
    <div class="joc-cos">
      <MapaLeaflet ref="mapaRef" :mode-joc="modeJocMapa" @clic-joc="gestionaClicJoc" />

      <!-- Feedback per a lectors de pantalla (no només color/animació) -->
      <p class="joc-sr-only" role="status" aria-live="assertive">
        {{ anunciResultat }}
      </p>

      <!-- ── Wizard de configuració ─────────────────────────────────────── -->
      <WizardJoc
        v-if="geofreak.fase === 'configuracio'"
        v-model:pas="pasWizard"
        titol="GeoFreak"
        :subtitol="$t('partida.titolModal')"
        :passos="nomsPassos"
        :pot-anar-a-pas="potAnarAPas"
        :pas-valid="pasValid"
        :pot-comencar="geofreak.configCompleta"
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

        <!-- Pas 2: modalitat (dues targetes, amb la seva explicació) -->
        <PasModalitat
          v-else-if="pasWizard === 2"
          v-model="modalitatTriada"
          :opcions="opcionsModalitat"
          :etiqueta="$t('partida.modalitat')"
        />

        <!-- Pas 3: nivell i territori (amb tria a l'atzar) -->
        <template v-else>
          <div class="joc-camp gf-nivells" role="radiogroup" :aria-label="$t('geofreak.nivell')">
            <button
              v-for="n in NIVELLS"
              :key="n.id"
              type="button"
              role="radio"
              class="joc-targeta gf-nivell"
              :class="{ 'joc-targeta--actiu': geofreak.configuracio.nivell === n.id }"
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

          <div v-if="tipusContenidor" class="joc-camp">
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
      </WizardJoc>

      <!-- ── Compte enrere (fase de preparació) ─────────────────────────── -->
      <CompteEnrere
        v-else-if="geofreak.fase === 'preparacio'"
        :torn="textTorn"
        @fi="geofreak.arrencaPartida()"
      />

      <!-- ── HUD de partida ─────────────────────────────────────────────── -->
      <template v-else-if="geofreak.fase === 'partida'">
        <AnunciRonda
          :clau="clauRonda"
          :torn="textTorn ?? ''"
          :color="geofreak.esMultijugador ? (geofreak.jugadorActual?.color ?? '') : ''"
          :lloc="anunciLloc"
        />
        <HudPartida
          :encertats="geofreak.partida?.encertades.length ?? 0"
          :total="geofreak.totalObjectius"
          :crono="cronoText"
          :jugadors="geofreak.esMultijugador ? geofreak.estatJugadors : null"
          :torn-actual="geofreak.tornActual"
          :ratxa="geofreak.ratxa"
          :errors="errorsMostrats"
          :pistes="null"
          :intents-restants="intentsRestants"
          :pista-disponible="pistaDisponible"
          :passa-disponible="passaDisponible"
          @pista="demanaPista"
          @passa="passa"
          @surt="demanaSortida"
        >
          <CaixaResposta
            v-if="geofreak.configuracio.modalitat === 'comEsDiu'"
            ref="caixaRef"
            :candidats="candidats"
            :opcions-pista="opcionsPista"
            :placeholder="$t('partida.escriuNom')"
            :etiqueta="$t('geofreak.modalitats.comEsDiu')"
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

      <!-- ── Revisió del mapa (des dels resultats) ───────────────────────── -->
      <BarraRevisio
        v-else-if="revisant"
        v-model:noms="nomsRevisio"
        :jugadors="geofreak.esMultijugador ? geofreak.resultats : null"
        @torna="tornaAResultats"
      />

      <!-- ── Resultats ──────────────────────────────────────────────────── -->
      <ModalResultats
        v-else
        :resum="resumPartida"
        :resultats="geofreak.resultats"
        :temps="cronoText"
        :encerts="geofreak.partida?.encertades.length ?? 0"
        :errors="geofreak.partida?.errors ?? 0"
        :pistes="(geofreak.resultats[0]?.encertsAmbPista ?? 0) || null"
        :celebra="!haRevisat"
        @rejuga="rejuga"
        @revisa="revisaMapa"
        @configura="obreConfiguracio"
      />
    </div>
  </div>
</template>

<style scoped>
/* Pas 3 del wizard: nivells (dues columnes; l'últim, tot Catalunya, ocupa la
   fila). La resta de peces del joc són a components/jocs/. */
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

.joc-targeta--actiu .gf-nivell__num {
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
  background: var(--joc-pista-fons);
  border: 1.5px solid var(--joc-pista-vora);
  border-radius: var(--radi-sm);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--joc-pista-text);
  cursor: pointer;
  transition: background var(--mou-rapid);
}

.gf-atzar:hover:not(:disabled) {
  background: var(--joc-pista-viu);
}

.gf-atzar:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Els nivells, en una sola columna en mòbil (els noms llargs no hi caben en dues) */
@media (max-width: 768px) {
  .gf-nivells {
    grid-template-columns: 1fr;
  }
}
</style>
