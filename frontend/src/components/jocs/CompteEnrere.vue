<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import './jocs.css'

// Compte enrere abans d'arrencar la partida: "Torn de {nom}" (si hi ha més
// d'un jugador) + "3, 2, 1, Som-hi!". El mapa ja està enquadrat al darrere; el
// cronòmetre arrenca quan s'emet `fi`. Amb prefers-reduced-motion no hi ha
// compte: s'emet `fi` de seguida.
const props = defineProps<{
  // "Torn de {nom}" ja traduït, o null amb un sol jugador.
  torn: string | null
}>()

const emit = defineEmits<{ fi: [] }>()

const { t } = useI18n()
const valor = ref<string | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    emit('fi')
    return
  }
  const sequencia = [...(props.torn ? [props.torn] : []), '3', '2', '1', t('partida.somhi')]
  let pas = 0
  valor.value = sequencia[pas] ?? null
  timer = setInterval(() => {
    pas++
    if (pas < sequencia.length) {
      valor.value = sequencia[pas] ?? null
      return
    }
    if (timer) clearInterval(timer)
    timer = null
    valor.value = null
    emit('fi')
  }, 650)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="joc-compte" aria-live="assertive">
    <span
      v-if="valor"
      :key="valor"
      class="joc-compte__valor"
      :class="{ 'joc-compte__valor--text': valor.length > 7 }"
      >{{ valor }}</span
    >
  </div>
</template>

<style scoped>
.joc-compte {
  position: absolute;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  pointer-events: none;
}

/* El valor va dins un disc blanc (una pastilla si és text): es llegeix bé
   sobre qualsevol tros de mapa. */
.joc-compte__valor {
  display: grid;
  place-items: center;
  min-width: 150px;
  height: 150px;
  padding: 0 36px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--radi-pastilla);
  box-shadow: var(--ombra-3);
  font-family: var(--font-display);
  font-size: clamp(3rem, 14vw, 5rem);
  font-weight: 700;
  line-height: 1;
  color: var(--color-text-fort);
  animation: joc-pop 0.5s cubic-bezier(0.3, 1.25, 0.45, 1);
}

/* Textos llargs al compte enrere ("Torn de Maria") */
.joc-compte__valor--text {
  height: auto;
  padding: 20px 34px;
  font-size: clamp(1.6rem, 7vw, 2.4rem);
  line-height: 1.2;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .joc-compte__valor {
    animation: none;
  }
}
</style>
