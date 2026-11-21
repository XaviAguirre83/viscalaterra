<script setup lang="ts">
import { ref, watch } from 'vue'

// Anunci de cada ronda al centre del mapa: apareix gran i es fon lentament.
// En multijugador, "Torn de {nom}" amb el color del jugador; a sota, el lloc
// que es pregunta (buit si el nom és justament la resposta).
const props = defineProps<{
  // Canvia a cada ronda (torn·objectiu): cada canvi llança un anunci nou.
  clau: string
  torn: string
  color: string
  lloc: string
}>()

// Els textos es fixen en el moment del canvi: l'anunci en curs no canvia.
const tornMostrat = ref('')
const colorMostrat = ref('')
const llocMostrat = ref('')
const versio = ref(0)

watch(
  () => props.clau,
  () => {
    tornMostrat.value = props.torn
    colorMostrat.value = props.color
    llocMostrat.value = props.lloc
    if (tornMostrat.value || llocMostrat.value) versio.value++
  },
  { immediate: true }
)

function neteja() {
  tornMostrat.value = ''
  llocMostrat.value = ''
}
</script>

<template>
  <div
    v-if="tornMostrat || llocMostrat"
    :key="versio"
    class="joc-anunci"
    aria-hidden="true"
    @animationend="neteja"
  >
    <span
      v-if="tornMostrat"
      class="joc-anunci__torn"
      :style="{ color: colorMostrat || '#1a2635' }"
      >{{ tornMostrat }}</span
    >
    <span v-if="llocMostrat" class="joc-anunci__lloc">{{ llocMostrat }}</span>
  </div>
</template>

<style scoped>
.joc-anunci {
  position: absolute;
  inset: 0;
  z-index: 1450;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
  text-align: center;
  pointer-events: none;
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.15;
  color: var(--color-text-fort);
  text-shadow:
    0 0 18px rgba(255, 255, 255, 0.95),
    0 0 6px rgba(255, 255, 255, 0.9),
    0 2px 6px rgba(255, 255, 255, 0.85);
  animation: anunci 2.4s ease-out forwards;
}

/* Línia de torn (multijugador, amb el color del jugador) i nom del lloc */
.joc-anunci__torn {
  font-size: 2rem;
}

.joc-anunci__lloc {
  font-size: 3.2rem;
}

@keyframes anunci {
  0% {
    opacity: 0;
    transform: scale(1.15);
  }
  12% {
    opacity: 1;
    transform: scale(1);
  }
  55% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* Variant sense moviment (només fosa) per a reduced-motion */
@keyframes anunci-fos {
  0%,
  55% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .joc-anunci__torn {
    font-size: 1.4rem;
  }

  .joc-anunci__lloc {
    font-size: 2rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .joc-anunci {
    animation-name: anunci-fos;
  }
}
</style>
