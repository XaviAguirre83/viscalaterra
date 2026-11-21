<script setup lang="ts">
import { COLORS_JUGADOR, MAX_JUGADORS, triaColor } from '@/data/jugadors'
import './jocs.css'

// Pas «Jugadors» del wizard: quants en sou (1-4) i, amb més d'un, el nom i
// el color de conquesta de cadascun. L'estat viu a la vista (v-model) perquè
// es conservi en anar endavant i enrere entre passos.
const num = defineModel<number>('num', { required: true })
const noms = defineModel<string[]>('noms', { required: true })
const colors = defineModel<string[]>('colors', { required: true })

// Si el color ja el tenia un altre jugador, s'intercanvien.
function tria(i: number, color: string) {
  colors.value = triaColor(colors.value, i, color)
}

// Els models es reassignen sencers (mai es muten in situ, que seria tocar
// l'estat de la vista per sota mà).
function canviaNom(i: number, e: Event) {
  const nom = (e.target as HTMLInputElement).value
  noms.value = noms.value.map((n, j) => (j === i ? nom : n))
}
</script>

<template>
  <div class="joc-camp joc-jugadors" role="radiogroup" :aria-label="$t('partida.wizard.jugadors')">
    <button
      v-for="n in MAX_JUGADORS"
      :key="n"
      type="button"
      role="radio"
      class="joc-targeta joc-jugadors__opcio"
      :class="{ 'joc-targeta--actiu': num === n }"
      :aria-checked="num === n"
      @click="num = n"
    >
      <span class="joc-jugadors__figures" aria-hidden="true">
        <span v-for="f in n" :key="f"></span>
      </span>
      {{ n }}
    </button>
  </div>
  <!-- Amb un sol jugador no calen noms ni colors -->
  <div v-if="num > 1" class="joc-camp">
    <div v-for="n in num" :key="n" class="joc-jugador-fila">
      <span
        class="joc-jugador-fila__color"
        :style="{ background: colors[n - 1] }"
        aria-hidden="true"
      ></span>
      <input
        :value="noms[n - 1]"
        type="text"
        class="joc-entrada joc-jugadors__nom"
        autocomplete="off"
        maxlength="20"
        :placeholder="$t('partida.jugadorN', { n })"
        @input="canviaNom(n - 1, $event)"
      />
      <div class="joc-colors">
        <button
          v-for="c in COLORS_JUGADOR"
          :key="c"
          type="button"
          class="joc-colors__opcio"
          :class="{ 'joc-colors__opcio--actiu': colors[n - 1] === c }"
          :style="{ background: c }"
          :aria-label="c"
          @click="tria(n - 1, c)"
        ></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Nombre de jugadors (amb tantes figuretes com jugadors) */
.joc-jugadors {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.joc-jugadors__opcio {
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

.joc-jugadors__figures {
  display: flex;
  gap: 3px;
  height: 8px;
}

.joc-jugadors__figures span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pedra-300);
  transition: background var(--mou-rapid);
}

.joc-targeta--actiu .joc-jugadors__figures span {
  background: var(--color-marca);
}

/* Fila d'un jugador: el seu color, el nom i la paleta de conquesta */
.joc-jugador-fila {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.joc-jugador-fila__color {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transition: background var(--mou-mig);
}

.joc-jugadors__nom {
  flex: 1;
  min-width: 0;
}

.joc-colors {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.joc-colors__opcio {
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

.joc-colors__opcio:hover {
  opacity: 1;
}

.joc-colors__opcio--actiu {
  opacity: 1;
  box-shadow: 0 0 0 2px var(--color-text-fort);
  transform: scale(1.08);
}

@media (max-width: 768px) {
  /* El nom del jugador a dalt i la paleta, a sota, a tot l'ample */
  .joc-jugador-fila {
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .joc-colors {
    width: 100%;
    justify-content: space-between;
  }

  .joc-colors__opcio {
    width: 34px;
    height: 34px;
  }
}
</style>
