<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFitxaStore } from '@/stores/fitxa'
import type { NivellTerritorial } from '@/stores/mapa'
import { useFocusTrap } from '@/composables/useFocusTrap'

const fitxa = useFitxaStore()

// Etiqueta del tipus de demarcació (reusa les claus nivells.* singulars).
const CLAU_NIVELL: Record<NivellTerritorial, string> = {
  provincies: 'nivells.provincia',
  vegueries: 'nivells.vegueria',
  comarques: 'nivells.comarca',
  municipis: 'nivells.municipi',
}
const clauNivell = computed(() =>
  fitxa.objectiu ? CLAU_NIVELL[fitxa.objectiu.nivell] : 'nivells.municipi'
)

// Les imatges de Commons venen com a http://; cal https:// (mixed content) i
// es dimensionen amb ?width per no baixar l'SVG/PNG a mida completa.
function imatge(url: string, width = 160): string {
  return `${url.replace(/^http:/, 'https:')}?width=${width}`
}

const escutSrc = computed(() => (fitxa.enriquiment?.escut ? imatge(fitxa.enriquiment.escut) : null))
const teEnllacos = computed(() => !!(fitxa.enriquiment?.web || fitxa.enriquiment?.wiki))

const caixaRef = ref<HTMLElement | null>(null)
useFocusTrap(
  caixaRef,
  computed(() => fitxa.obert),
  () => fitxa.tanca()
)
</script>

<template>
  <Transition name="fitxa">
    <div v-if="fitxa.obert" class="fitxa-fons" @click.self="fitxa.tanca()">
      <div
        ref="caixaRef"
        class="fitxa"
        role="dialog"
        aria-modal="true"
        :aria-label="`${$t(clauNivell)}: ${fitxa.objectiu?.nom}`"
      >
        <button
          type="button"
          class="fitxa__tancar"
          :aria-label="$t('comu.tanca')"
          @click="fitxa.tanca()"
        >
          ✕
        </button>

        <div class="fitxa__cap">
          <img v-if="escutSrc" :src="escutSrc" class="fitxa__escut" alt="" />
          <div class="fitxa__titol-grup">
            <h2 class="fitxa__titol">{{ fitxa.objectiu?.nom }}</h2>
            <p class="fitxa__tipus">{{ $t(clauNivell) }}</p>
          </div>
        </div>

        <div v-if="fitxa.carregant && !fitxa.enriquiment" class="fitxa__estat">
          <span class="fitxa__spinner" aria-hidden="true"></span>
        </div>

        <div v-else-if="teEnllacos" class="fitxa__enllacos">
          <a
            v-if="fitxa.enriquiment?.web"
            :href="fitxa.enriquiment.web"
            target="_blank"
            rel="noopener noreferrer"
            class="fitxa__enllac"
          >
            🌐 {{ $t('fitxa.webOficial') }} <span aria-hidden="true">↗</span>
          </a>
          <a
            v-if="fitxa.enriquiment?.wiki"
            :href="fitxa.enriquiment.wiki"
            target="_blank"
            rel="noopener noreferrer"
            class="fitxa__enllac"
          >
            📖 {{ $t('fitxa.viquipedia') }} <span aria-hidden="true">↗</span>
          </a>
        </div>

        <p v-else class="fitxa__buit">{{ $t('fitxa.senseInfo') }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fitxa-fons {
  position: absolute;
  inset: 0;
  z-index: 1600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(26, 38, 53, 0.3);
}

.fitxa {
  position: relative;
  width: min(340px, 100%);
  padding: 20px 22px 22px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 10px 36px rgba(0, 0, 0, 0.3);
}

.fitxa__tancar {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: none;
  font-size: 1.05rem;
  color: #888;
  cursor: pointer;
}

.fitxa__tancar:hover {
  background: #f0f0ec;
  color: #333;
}

.fitxa__cap {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  padding-right: 28px;
}

.fitxa__escut {
  width: 54px;
  height: 54px;
  object-fit: contain;
  flex-shrink: 0;
}

.fitxa__titol {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1a2635;
  line-height: 1.2;
}

.fitxa__tipus {
  margin-top: 2px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-text-secundari, #737373);
}

.fitxa__enllacos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fitxa__enllac {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid #d8d8d4;
  border-radius: 10px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: #1a2635;
  text-decoration: none;
  transition:
    background 0.12s,
    border-color 0.12s;
}

.fitxa__enllac:hover {
  background: #eef4ee;
  border-color: #2d6a2d;
  color: #2d6a2d;
}

.fitxa__buit {
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
  text-align: center;
  padding: 8px 0;
}

.fitxa__estat {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}

.fitxa__spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e2e6ea;
  border-top-color: #2d6a2d;
  border-radius: 50%;
  animation: fitxa-spin 0.7s linear infinite;
}

@keyframes fitxa-spin {
  to {
    transform: rotate(360deg);
  }
}

.fitxa-enter-active,
.fitxa-leave-active {
  transition: opacity 0.15s ease;
}

.fitxa-enter-from,
.fitxa-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .fitxa-enter-active,
  .fitxa-leave-active {
    transition: none;
  }

  .fitxa__spinner {
    animation-duration: 1.8s;
  }
}
</style>
