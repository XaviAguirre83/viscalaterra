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
import type { ModeJocMapa } from '@/stores/mapa'

// GeoFreak — joc d'identificació territorial (spec: viscalaterra_plan.md § GeoFreak).
// Dues modalitats jugables: «On és...?» (clic al mapa) i «Com es diu...?»
// (el mapa il·lumina l'objectiu i s'escriu el nom, amb autocomplete).

const { t } = useI18n()
const territoris = useTerritorisStore()
const geofreak = useGeofreakStore()

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

const modeJocMapa = computed<ModeJocMapa | null>(() => {
  const nivell = geofreak.nivellActual
  const enJoc = geofreak.fase === 'partida' || geofreak.fase === 'resultats'
  if (!enJoc || !nivell) return null
  const codi = geofreak.configuracio.codiContenidor
  return {
    nivell: CAPA_PER_DEMARCACIO[nivell.demarcacio],
    contenidor:
      nivell.contenidor && codi ? { nivell: CAPA_PER_DEMARCACIO[nivell.contenidor], codi } : null,
    codisPermesos: codisPermesos.value,
    codisEncertats: geofreak.partida?.encertades ?? [],
    // L'objectiu només s'il·lumina a «Com es diu...?»; a «On és...?» és secret.
    codiObjectiu:
      geofreak.configuracio.modalitat === 'comEsDiu' ? (geofreak.partida?.objectiu ?? null) : null,
    // La pista al mapa només aplica a «On és...?» (a l'altra modalitat són botons).
    codisPista: geofreak.configuracio.modalitat === 'onEs' ? geofreak.pista : null,
    interactiu: geofreak.configuracio.modalitat === 'onEs',
  }
})

// ── HUD ────────────────────────────────────────────────────────────────────

const objectiuNom = computed(() => {
  const codi = geofreak.partida?.objectiu
  return codi ? (nomsJoc.value.get(codi) ?? codi) : ''
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

function respon(codi: string) {
  geofreak.clicDemarcacio(codi)
  textResposta.value = ''
  respostaInput.value?.focus()
}

// Enter: respon si el text és un nom exacte o si només queda un suggeriment;
// si és ambigu o no coincideix amb cap candidata, sacseja sense penalitzar
// (l'error només compta quan es tria una demarcació vàlida equivocada).
function enviaResposta() {
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
    <PanellFiltres />
    <div class="gf-cos">
      <MapaLeaflet :mode-joc="modeJocMapa" @clic-joc="geofreak.clicDemarcacio" />

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
            @click="geofreak.comencaPartida(codisJoc)"
          >
            {{ $t('geofreak.somhi') }}
          </button>
        </div>
      </div>

      <!-- ── HUD de partida ───────────────────────────────────────────────── -->
      <template v-else-if="geofreak.fase === 'partida'">
        <div
          v-if="geofreak.configuracio.modalitat === 'onEs'"
          class="gf-pregunta"
          role="status"
          aria-live="polite"
        >
          {{ $t('geofreak.preguntaOnEs') }}&nbsp;<strong>{{ objectiuNom }}</strong
          >?
        </div>
        <div v-else class="gf-pregunta gf-pregunta--resposta">
          <label class="gf-resposta__etiqueta" for="gf-resposta">
            {{ $t('geofreak.modalitats.comEsDiu') }}
          </label>
          <input
            id="gf-resposta"
            ref="respostaInput"
            v-model="textResposta"
            type="text"
            autocomplete="off"
            spellcheck="false"
            :placeholder="$t('geofreak.escriuNom')"
            :class="{ 'gf-resposta--sacseig': sacsejant }"
            @keydown.enter.prevent="enviaResposta"
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
            <li v-for="s in suggeriments" :key="s.codi">
              <button type="button" @mousedown.prevent="respon(s.codi)">{{ s.nom }}</button>
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
        <div class="gf-modal gf-resultats" role="dialog" aria-modal="true">
          <h2 class="gf-modal__titol">{{ $t('geofreak.resultats.titol') }}</h2>
          <p class="gf-modal__sub">{{ resumPartida }}</p>

          <p class="gf-resultats__punts">{{ geofreak.punts }}</p>
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

          <button type="button" class="gf-somhi" @click="geofreak.tornaAJugar(codisJoc)">
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

/* ── HUD de partida ─────────────────────────────────────────────────────── */

.gf-pregunta {
  position: absolute;
  top: 10px;
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
  font-weight: 800;
}

/* Variant amb input de resposta («Com es diu...?») */
.gf-pregunta--resposta {
  white-space: normal;
  overflow: visible;
  width: min(340px, calc(100% - 24px));
  padding: 10px 14px 12px;
}

.gf-resposta__etiqueta {
  display: block;
  margin-bottom: 6px;
  font-size: var(--text-xs);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #777;
  text-align: center;
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

.gf-suggeriments button:hover {
  background: #eef4ee;
  color: #2d6a2d;
}

.gf-xip {
  position: absolute;
  top: 12px;
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

.gf-xip--esquerra {
  left: 10px;
}

.gf-xip--dreta {
  right: 10px;
}

.gf-xip__separador {
  width: 1px;
  height: 16px;
  background: #ddd;
}

.gf-xip__encerts {
  color: #2d6a2d;
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

/* En mòbil els xips baixen sota la pregunta per no encavalcar-s'hi */
@media (max-width: 768px) {
  .gf-pregunta {
    font-size: 0.95rem;
    padding: 8px 14px;
  }

  .gf-xip {
    top: 58px;
  }
}

/* ── Modal de resultats ─────────────────────────────────────────────────── */

.gf-resultats {
  text-align: center;
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
