<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import MapaLeaflet from '@/components/mapa/MapaLeaflet.vue'
import PanellFiltres from '@/components/filtres/PanellFiltres.vue'
import { useTerritorisStore } from '@/stores/territoris'
import { useGeofreakStore } from '@/stores/geofreak'
import {
  CAPA_PER_DEMARCACIO,
  MODALITATS,
  NIVELLS,
  type ModalitatJoc,
  type TipusDemarcacio,
} from '@/data/geofreak'
import type { ModeJocMapa } from '@/stores/mapa'

// GeoFreak — joc d'identificació territorial (spec: viscalaterra_plan.md § GeoFreak).
// Fase 1: modal de configuració (modalitat + nivell + territori contenidor).
// El mode joc real sobre el mapa arriba a les fases següents.

const { t } = useI18n()
const territoris = useTerritorisStore()
const geofreak = useGeofreakStore()

onMounted(() => territoris.carregaArbre())
// En sortir del joc (navegar a una altra secció) la configuració es reinicia.
onUnmounted(() => geofreak.reinicia())

// ── Opcions del desplegable de territori contenidor ───────────────────────

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
  set: (m: ModalitatJoc | '') => {
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

// ── Mode joc per al mapa (fase de partida) ─────────────────────────────────

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

const modeJocMapa = computed<ModeJocMapa | null>(() => {
  const nivell = geofreak.nivellActual
  if (geofreak.fase !== 'partida' || !nivell) return null
  const codi = geofreak.configuracio.codiContenidor
  return {
    nivell: CAPA_PER_DEMARCACIO[nivell.demarcacio],
    contenidor:
      nivell.contenidor && codi ? { nivell: CAPA_PER_DEMARCACIO[nivell.contenidor], codi } : null,
    codisPermesos: codisPermesos.value,
  }
})

// Resum de la configuració triada (banner provisional de la fase de partida).
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
      <MapaLeaflet :mode-joc="modeJocMapa" />

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
            @click="geofreak.comencaPartida()"
          >
            {{ $t('geofreak.somhi') }}
          </button>
        </div>
      </div>

      <!-- ── Partida (provisional fins a la fase 2: mode joc al mapa) ────── -->
      <div v-else class="gf-banner">
        <p class="gf-banner__resum">{{ resumPartida }}</p>
        <p class="gf-banner__nota">{{ $t('geofreak.enPreparacio') }}</p>
        <button type="button" class="gf-banner__boto" @click="geofreak.tornaAConfiguracio()">
          {{ $t('geofreak.tornaConfig') }}
        </button>
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

/* ── Modal de configuració ──────────────────────────────────────────────── */

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

/* Botó Som-hi! */

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

/* ── Banner provisional de partida (fase 2 substituirà això pel HUD) ────── */

.gf-banner {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1500;
  padding: 12px 22px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  text-align: center;
  max-width: calc(100% - 24px);
}

.gf-banner__resum {
  font-size: var(--text-sm);
  font-weight: 700;
  color: #1a2635;
}

.gf-banner__nota {
  margin-top: 2px;
  font-size: var(--text-xs);
  color: var(--color-text-secundari, #737373);
}

.gf-banner__boto {
  margin-top: 8px;
  padding: 6px 14px;
  background: none;
  border: 1px solid #2d6a2d;
  border-radius: 16px;
  color: #2d6a2d;
  font-size: var(--text-xs);
  font-weight: 700;
  cursor: pointer;
  transition: background 0.12s;
}

.gf-banner__boto:hover {
  background: #eef4ee;
}

@media (max-width: 768px) {
  .gf-modal {
    padding: 18px 16px;
  }
}
</style>
