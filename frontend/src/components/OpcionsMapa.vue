<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMapaOpcionsStore } from '@/stores/mapaOpcions'
import { useFocusTrap } from '@/composables/useFocusTrap'

// Panell d'opcions del mapa de Cerca (s'obre/tanca amb el ⚙️ de la barra).
// Pensat per créixer: avui escut/bandera, demà més capes de visualització.
// Es tanca clicant fora (un vel transparent que s'empassa el clic, perquè no
// seleccioni cap territori del mapa), amb Escape o tornant a prémer el ⚙️.
const opcions = useMapaOpcionsStore()

const panellRef = ref<HTMLElement | null>(null)
useFocusTrap(
  panellRef,
  computed(() => opcions.panelObert),
  () => opcions.tanca()
)
</script>

<template>
  <div v-if="opcions.panelObert" class="opcions-vel" aria-hidden="true" @click="opcions.tanca()" />
  <Transition name="opcions">
    <div
      v-if="opcions.panelObert"
      ref="panellRef"
      class="opcions"
      role="dialog"
      :aria-label="$t('opcionsMapa.titol')"
    >
      <h2 class="opcions__titol">{{ $t('opcionsMapa.titol') }}</h2>

      <label class="opcions__opcio">
        <input v-model="opcions.mostraEscut" type="checkbox" />
        <span>🛡️ {{ $t('opcionsMapa.escut') }}</span>
      </label>
      <label class="opcions__opcio">
        <input v-model="opcions.mostraBandera" type="checkbox" />
        <span>🚩 {{ $t('opcionsMapa.bandera') }}</span>
      </label>

      <p class="opcions__nota">{{ $t('opcionsMapa.nota') }}</p>
    </div>
  </Transition>
</template>

<style scoped>
/* Vel transparent a tota la pantalla: un clic fora del panell el tanca. Per
   sobre de la capçalera (2100) i la barra de navegació (2000), perquè també
   hi tanqui; el panell queda just a sobre. */
.opcions-vel {
  position: fixed;
  inset: 0;
  z-index: 2200;
}

.opcions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2201;
  width: 240px;
  padding: 14px 16px 16px;
  background: var(--color-superficie, #fff);
  border: 1px solid var(--color-vora, #e3e5de);
  border-radius: var(--radi-lg, 14px);
  box-shadow: var(--ombra-3, 0 6px 24px rgba(0, 0, 0, 0.22));
}

.opcions__titol {
  margin-bottom: 10px;
  font-size: var(--text-sm);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #777;
}

.opcions__opcio {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 4px;
  font-size: var(--text-base);
  color: #1a2635;
  cursor: pointer;
}

.opcions__opcio input {
  width: 18px;
  height: 18px;
  accent-color: #2d6a2d;
  cursor: pointer;
}

.opcions__nota {
  margin-top: 8px;
  font-size: var(--text-xs);
  color: var(--color-text-secundari, #737373);
  line-height: 1.35;
}

@media (max-width: 768px) {
  .opcions {
    width: min(232px, calc(100vw - 16px));
  }

  .opcions__opcio {
    min-height: 44px;
  }
}

.opcions-enter-active,
.opcions-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.opcions-enter-from,
.opcions-leave-to {
  opacity: 0;
  transform: translate(-50%, -46%);
}

@media (prefers-reduced-motion: reduce) {
  .opcions-enter-active,
  .opcions-leave-active {
    transition: none;
  }
}
</style>
