<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFiltresStore } from '@/stores/filtres'
import {
  DIES_SETMANA,
  MODES_TEMPORALS,
  ORDINALS,
  rangDatesValid,
  type DiaSetmana,
  type ModeTemporal,
  type Ordinal,
} from '@/data/temporal'

const filtres = useFiltresStore()
const { t } = useI18n()

const MODE_DESC: Record<ModeTemporal, string> = {
  permanent: 'quan.modes.permanentDesc',
  dates: 'quan.modes.datesDesc',
  setmanal: 'quan.modes.setmanalDesc',
  mensual: 'quan.modes.mensualDesc',
}

const mode = computed(() => filtres.temporal.mode)

// L'interval de dates és incoherent si el final precedeix l'inici.
const rangInvalid = computed(
  () => !rangDatesValid(filtres.temporal.dataInici, filtres.temporal.dataFi)
)

function actualitzaInici(e: Event) {
  const v = (e.target as HTMLInputElement).value || null
  filtres.defineixRangDates(v, filtres.temporal.dataFi)
}

function actualitzaFi(e: Event) {
  const v = (e.target as HTMLInputElement).value || null
  filtres.defineixRangDates(filtres.temporal.dataInici, v)
}

function diaActiu(dia: DiaSetmana): boolean {
  return filtres.temporal.diesSetmana.includes(dia)
}

function ordinalActiu(ordinal: Ordinal): boolean {
  return filtres.temporal.ordinals.includes(ordinal)
}

// Resum llegible de la selecció mensual: "Primer, Últim · Dilluns, Dijous".
const resumMensual = computed(() => {
  const ords = filtres.temporal.ordinals.map((o) => t(`quan.ordinals.${o}`)).join(', ')
  const dies = filtres.temporal.diesSetmana.map((d) => t(`quan.dies.${d}`)).join(', ')
  if (!ords || !dies) return ''
  return t('quan.resumMensual', { ordinals: ords, dies })
})
</script>

<template>
  <div class="tab-quan">
    <!-- ── Tria de modalitat ───────────────────────────────────────────── -->
    <ul class="opcions-temporalitat">
      <li v-for="m in MODES_TEMPORALS" :key="m">
        <label>
          <input
            type="radio"
            name="mode-temporal"
            :value="m"
            :checked="mode === m"
            @change="filtres.defineixModeTemporal(m)"
          />
          <span class="opcio__text">
            <span class="opcio__etiqueta">{{ $t(`quan.modes.${m}`) }}</span>
            <span class="opcio__descripcio">{{ $t(MODE_DESC[m]) }}</span>
          </span>
        </label>
      </li>
    </ul>

    <!-- ── Paràmetres del mode actiu ───────────────────────────────────── -->

    <!-- Dates concretes: dos calendaris inici → fi -->
    <fieldset v-if="mode === 'dates'" class="parametres">
      <legend>{{ $t('quan.modes.dates') }}</legend>
      <div class="camps-data">
        <label class="camp-data">
          <span>{{ $t('quan.dataInici') }}</span>
          <input type="date" :value="filtres.temporal.dataInici ?? ''" @input="actualitzaInici" />
        </label>
        <label class="camp-data">
          <span>{{ $t('quan.dataFi') }}</span>
          <input
            type="date"
            :value="filtres.temporal.dataFi ?? ''"
            :min="filtres.temporal.dataInici ?? undefined"
            @input="actualitzaFi"
          />
        </label>
      </div>
      <p v-if="rangInvalid" class="error-rang" role="alert">{{ $t('quan.errorRang') }}</p>
    </fieldset>

    <!-- Dies de la setmana -->
    <fieldset v-else-if="mode === 'setmanal'" class="parametres">
      <legend>{{ $t('quan.triaDies') }}</legend>
      <div class="dies-setmana">
        <label
          v-for="dia in DIES_SETMANA"
          :key="dia"
          class="dia-chip"
          :class="{ actiu: diaActiu(dia) }"
        >
          <input
            type="checkbox"
            :checked="diaActiu(dia)"
            @change="filtres.toggleDiaSetmana(dia, ($event.target as HTMLInputElement).checked)"
          />
          <span class="dia-chip__curt">{{ $t(`quan.diesCurt.${dia}`) }}</span>
          <span class="dia-chip__llarg">{{ $t(`quan.dies.${dia}`) }}</span>
        </label>
      </div>
    </fieldset>

    <!-- Cada mes: posició ordinal × dia de la setmana -->
    <fieldset v-else-if="mode === 'mensual'" class="parametres">
      <legend>{{ $t('quan.triaOrdinals') }}</legend>
      <div class="ordinals">
        <label
          v-for="ord in ORDINALS"
          :key="ord"
          class="dia-chip"
          :class="{ actiu: ordinalActiu(ord) }"
        >
          <input
            type="checkbox"
            :checked="ordinalActiu(ord)"
            @change="filtres.toggleOrdinal(ord, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ $t(`quan.ordinals.${ord}`) }}</span>
        </label>
      </div>
      <p class="subtitol">{{ $t('quan.triaDies') }}</p>
      <div class="dies-setmana">
        <label
          v-for="dia in DIES_SETMANA"
          :key="dia"
          class="dia-chip"
          :class="{ actiu: diaActiu(dia) }"
        >
          <input
            type="checkbox"
            :checked="diaActiu(dia)"
            @change="filtres.toggleDiaSetmana(dia, ($event.target as HTMLInputElement).checked)"
          />
          <span class="dia-chip__curt">{{ $t(`quan.diesCurt.${dia}`) }}</span>
          <span class="dia-chip__llarg">{{ $t(`quan.dies.${dia}`) }}</span>
        </label>
      </div>
      <p v-if="resumMensual" class="resum">{{ resumMensual }}</p>
    </fieldset>
  </div>
</template>

<style scoped>
.tab-quan {
  min-width: 280px;
  max-height: 65vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 768px) {
  .tab-quan {
    min-width: 0;
    width: 100%;
    max-height: none;
    overflow-y: visible;
  }
}

/* ── Llista de modalitats (radios) ───────────────────────────────────────── */
.opcions-temporalitat {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.opcions-temporalitat li label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s;
}

.opcions-temporalitat li label:hover {
  background: #f0f4f0;
}

.opcions-temporalitat input[type='radio'] {
  accent-color: #2d6a2d;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  cursor: pointer;
  flex-shrink: 0;
}

.opcio__text {
  display: flex;
  flex-direction: column;
}

.opcio__etiqueta {
  font-size: var(--text-base);
  font-weight: 600;
  color: #333;
}

.opcio__descripcio {
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
}

/* ── Paràmetres del mode actiu ───────────────────────────────────────────── */
.parametres {
  border: 1px solid var(--verd-100, #e2e8e0);
  border-radius: var(--radi-md, 10px);
  background: linear-gradient(180deg, rgba(45, 106, 45, 0.035), transparent 45%);
  padding: 12px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.parametres legend {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-marca, #2d6a2d);
  padding: 0 4px;
}

.subtitol {
  margin: 4px 0 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: #555;
}

/* Dates */
.camps-data {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.camp-data {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--text-sm);
  color: #444;
}

.camp-data input[type='date'] {
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font: inherit;
  color: #222;
}

.error-rang {
  margin: 0;
  font-size: var(--text-sm);
  color: #c4382e;
}

/* Dies de la setmana i ordinals com a "chips" */
.dies-setmana,
.ordinals {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dia-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-radius: 20px;
  font-size: var(--text-sm);
  color: #333;
  cursor: pointer;
  transition:
    background 0.1s,
    border-color 0.1s,
    color 0.1s;
}

.dia-chip:hover {
  border-color: var(--color-marca, #2d6a2d);
  background: var(--color-marca-clar, #f0f4f0);
}

.dia-chip.actiu {
  background: var(--color-marca, #2d6a2d);
  border-color: var(--color-marca, #2d6a2d);
  color: #fff;
  box-shadow: 0 1px 6px rgba(45, 106, 45, 0.3);
}

/* La casella real queda oculta: el "chip" sencer fa de control. */
.dia-chip input[type='checkbox'] {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.dia-chip__llarg {
  display: none;
}

.resum {
  margin: 4px 0 0;
  font-size: var(--text-sm);
  font-style: italic;
  color: #555;
}

.dia-chip input:focus-visible + .dia-chip__curt {
  outline: 2px solid var(--color-marca, #2d6a2d);
  outline-offset: 3px;
}

/* En pantalles amples mostrem el nom complet dels dies. */
@media (min-width: 769px) {
  .dia-chip__curt {
    display: none;
  }

  .dia-chip__llarg {
    display: inline;
  }
}
</style>
