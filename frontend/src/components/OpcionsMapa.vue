<script setup lang="ts">
import { useMapaOpcionsStore } from '@/stores/mapaOpcions'

// Panell d'opcions del mapa de Cerca (s'obre/tanca amb el ⚙️ de la barra).
// Pensat per créixer: avui escut/bandera, demà més capes de visualització.
const opcions = useMapaOpcionsStore()
</script>

<template>
  <Transition name="opcions">
    <div
      v-if="opcions.panelObert"
      class="opcions"
      role="dialog"
      :aria-label="$t('opcionsMapa.titol')"
    >
      <div class="opcions__cap">
        <h2 class="opcions__titol">{{ $t('opcionsMapa.titol') }}</h2>
        <button
          type="button"
          class="opcions__tancar"
          :aria-label="$t('comu.tanca')"
          @click="opcions.alterna()"
        >
          ✕
        </button>
      </div>

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
.opcions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1200;
  width: 240px;
  padding: 14px 16px 16px;
  background: var(--color-superficie, #fff);
  border: 1px solid var(--color-vora, #e3e5de);
  border-radius: var(--radi-lg, 14px);
  box-shadow: var(--ombra-3, 0 6px 24px rgba(0, 0, 0, 0.22));
}

.opcions__cap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.opcions__titol {
  font-size: var(--text-sm);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #777;
}

.opcions__tancar {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: none;
  font-size: 0.95rem;
  color: #999;
  cursor: pointer;
}

.opcions__tancar:hover {
  background: #f0f0ec;
  color: #333;
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
