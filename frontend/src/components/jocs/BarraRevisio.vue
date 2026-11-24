<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import type { ResultatJugador } from '@/composables/useMotorJoc'
import './jocs.css'

// Barra de la revisió del mapa en acabar la partida: el modal de resultats
// s'amaga i el mapa complet queda a la vista. Interruptor dels noms fixos
// sobre el mapa i botó per tornar als resultats (també amb Esc). En
// multijugador, a sobre, la llegenda de colors: qui ha conquerit què.
defineProps<{
  // Jugadors en multijugador (llegenda); null amb un sol jugador.
  jugadors: ResultatJugador[] | null
}>()

// Noms de tots els territoris fixos sobre el mapa.
const noms = defineModel<boolean>('noms', { required: true })

const emit = defineEmits<{ torna: [] }>()

// En entrar-hi, el focus va al botó de tornar (el modal que el tenia ja no hi és).
const tornaRef = ref<HTMLButtonElement | null>(null)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('torna')
}

onMounted(() => {
  void nextTick(() => tornaRef.value?.focus())
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="joc-revisio" role="region" :aria-label="$t('partida.revisio.titol')">
    <ul v-if="jugadors" class="joc-revisio__llegenda">
      <li v-for="(j, i) in jugadors" :key="`${j.nom}-${i}`">
        <span class="joc-colorjug" :style="{ background: j.color }"></span>{{ j.nom }}
        <strong>{{ j.conquestes }}</strong>
      </li>
    </ul>
    <div class="joc-revisio__barra">
      <button
        type="button"
        role="switch"
        class="joc-revisio__noms"
        :class="{ 'joc-revisio__noms--actiu': noms }"
        :aria-checked="noms"
        @click="noms = !noms"
      >
        <span class="joc-revisio__interruptor" aria-hidden="true"></span>
        {{ $t('partida.revisio.noms') }}
      </button>
      <button ref="tornaRef" type="button" class="joc-revisio__torna" @click="emit('torna')">
        {{ $t('partida.revisio.tornaResultats') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* A baix al centre, per sobre del mapa (com els marcadors del HUD). Les
   mides es reflecteixen als marges del mapa (margesRevisio, a useVistaJoc). */
.joc-revisio {
  position: absolute;
  bottom: 18px;
  left: 50%;
  z-index: 1500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: max-content;
  max-width: calc(100% - 32px);
  transform: translateX(-50%);
  animation: revisio-apareix 0.25s ease-out;
}

/* Pròpia (no joc-apareix): ha de conservar el translateX del centrat. */
@keyframes revisio-apareix {
  from {
    opacity: 0;
    transform: translate(-50%, 10px);
  }
}

.joc-revisio__llegenda,
.joc-revisio__barra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid var(--color-vora);
  border-radius: var(--radi-pastilla);
  box-shadow: var(--ombra-2);
}

.joc-revisio__llegenda {
  gap: 4px 14px;
  margin: 0;
  padding: 5px 14px;
  list-style: none;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-fort);
}

.joc-revisio__llegenda li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.joc-revisio__llegenda strong {
  font-variant-numeric: tabular-nums;
}

.joc-revisio__barra {
  gap: 8px;
  padding: 6px;
}

.joc-revisio__noms,
.joc-revisio__torna {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 6px 16px;
  border-radius: var(--radi-pastilla);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--mou-rapid),
    border-color var(--mou-rapid);
}

.joc-revisio__noms {
  padding-left: 10px;
  background: var(--pedra-100);
  border: 1px solid var(--color-vora);
  color: var(--pedra-700);
}

.joc-revisio__noms:hover {
  background: var(--pedra-200);
  border-color: var(--color-vora-forta);
}

/* Interruptor petit dins el botó: gris apagat, verd encès. */
.joc-revisio__interruptor {
  position: relative;
  width: 28px;
  height: 16px;
  border-radius: 8px;
  background: var(--pedra-300);
  transition: background var(--mou-rapid);
}

.joc-revisio__interruptor::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  transition: transform var(--mou-rapid);
}

.joc-revisio__noms--actiu .joc-revisio__interruptor {
  background: var(--color-marca);
}

.joc-revisio__noms--actiu .joc-revisio__interruptor::after {
  transform: translateX(12px);
}

.joc-revisio__torna {
  background: var(--color-marca);
  border: 1px solid var(--color-marca);
  color: #fff;
}

.joc-revisio__torna:hover {
  background: var(--color-marca-fosc);
  border-color: var(--color-marca-fosc);
}

@media (max-width: 768px) {
  .joc-revisio {
    bottom: 14px;
  }

  /* Targets tàctils a 44px. */
  .joc-revisio__noms,
  .joc-revisio__torna {
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .joc-revisio {
    animation: none;
  }

  .joc-revisio__interruptor,
  .joc-revisio__interruptor::after {
    transition: none;
  }
}
</style>
