<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import MapaLeaflet from '@/components/mapa/MapaLeaflet.vue'
import PanellFiltres from '@/components/filtres/PanellFiltres.vue'
import { useTerritorisStore } from '@/stores/territoris'
import { useGeofreakStore } from '@/stores/geofreak'
import { MODALITATS, NIVELLS, type TipusDemarcacio } from '@/data/geofreak'

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

// Comarques úniques per codi: les transfrontereres apareixen sota dues
// províncies a l'arbre, però al joc són una sola comarca.
const comarquesUniques = computed(() => {
  const m = new Map<string, string>()
  territoris.arbre?.forEach((p) =>
    p.comarques.forEach((c) => {
      if (!m.has(c.codi)) m.set(c.codi, c.nom)
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
      return territoris.arbre?.map((p) => ({ codi: p.codi, nom: p.nom })) ?? []
    case 'vegueria':
      return [...territoris.vegueries].sort((a, b) => a.nom.localeCompare(b.nom, 'ca'))
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

// El <select> delega l'escriptura al store (patró get/set).
const contenidorSeleccionat = computed({
  get: () => geofreak.configuracio.codiContenidor ?? '',
  set: (codi: string) => geofreak.defineixContenidor(codi || null),
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
      <MapaLeaflet />

      <!-- ── Modal de configuració de la partida ─────────────────────────── -->
      <div v-if="geofreak.fase === 'configuracio'" class="gf-modal-fons">
        <div class="gf-modal" role="dialog" aria-modal="true" aria-labelledby="gf-titol">
          <h2 id="gf-titol" class="gf-modal__titol">GeoFreak</h2>
          <p class="gf-modal__sub">{{ $t('geofreak.titolModal') }}</p>

          <fieldset class="gf-camp">
            <legend>{{ $t('geofreak.modalitat') }}</legend>
            <div class="gf-modalitats">
              <button
                v-for="m in MODALITATS"
                :key="m"
                type="button"
                class="gf-modalitat"
                :class="{ 'gf-modalitat--activa': geofreak.configuracio.modalitat === m }"
                :aria-pressed="geofreak.configuracio.modalitat === m"
                @click="geofreak.defineixModalitat(m)"
              >
                <span class="gf-modalitat__nom">{{ $t(`geofreak.modalitats.${m}`) }}</span>
                <span class="gf-modalitat__desc">{{ $t(`geofreak.modalitats.${m}Desc`) }}</span>
              </button>
            </div>
          </fieldset>

          <fieldset class="gf-camp">
            <legend>{{ $t('geofreak.nivell') }}</legend>
            <div class="gf-nivells" role="radiogroup">
              <button
                v-for="n in NIVELLS"
                :key="n.id"
                type="button"
                class="gf-nivell"
                :class="{ 'gf-nivell--actiu': geofreak.configuracio.nivell === n.id }"
                role="radio"
                :aria-checked="geofreak.configuracio.nivell === n.id"
                @click="geofreak.defineixNivell(n.id)"
              >
                <span class="gf-nivell__num">{{ n.id }}</span>
                <span class="gf-nivell__nom">{{ $t(`geofreak.nivells.n${n.id}`) }}</span>
                <span v-if="quantitatNivell(n.id)" class="gf-nivell__quantitat">
                  {{ quantitatNivell(n.id) }}
                </span>
              </button>
            </div>
          </fieldset>

          <div v-if="tipusContenidor" class="gf-camp gf-camp--contenidor">
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

.gf-camp legend,
.gf-camp label {
  display: block;
  margin-bottom: 6px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #777;
}

/* Modalitats: dos botons grans costat a costat */

.gf-modalitats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.gf-modalitat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 10px;
  background: #f7f8f9;
  border: 2px solid #e2e6ea;
  border-radius: 10px;
  cursor: pointer;
  text-align: center;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.gf-modalitat:hover {
  border-color: #2d6a2d;
}

.gf-modalitat--activa {
  background: #eef4ee;
  border-color: #2d6a2d;
}

.gf-modalitat__nom {
  font-size: 1rem;
  font-weight: 800;
  color: #1a2635;
}

.gf-modalitat__desc {
  font-size: var(--text-xs);
  color: var(--color-text-secundari, #737373);
  line-height: 1.3;
}

/* Nivells: llista vertical compacta */

.gf-nivells {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gf-nivell {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  background: none;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}

.gf-nivell:hover {
  background: #f4f7f4;
}

.gf-nivell--actiu {
  background: #eef4ee;
  border-color: #2d6a2d;
}

.gf-nivell__num {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e2e6ea;
  font-size: var(--text-xs);
  font-weight: 800;
  color: #444;
}

.gf-nivell--actiu .gf-nivell__num {
  background: #2d6a2d;
  color: #fff;
}

.gf-nivell__nom {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: 600;
  color: #333;
}

.gf-nivell__quantitat {
  font-size: var(--text-xs);
  font-weight: 700;
  color: #999;
}

/* Desplegable de territori contenidor */

.gf-camp--contenidor select {
  width: 100%;
  padding: 9px 10px;
  border: 1px solid #ccd2d8;
  border-radius: 8px;
  font-size: var(--text-sm);
  background: #fff;
  color: #222;
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
