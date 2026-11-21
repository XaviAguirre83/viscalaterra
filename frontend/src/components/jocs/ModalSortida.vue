<script setup lang="ts">
import { ref } from 'vue'
import { useFocusTrap } from '@/composables/useFocusTrap'
import './jocs.css'

// Confirmació de «Surt» en plena partida (un clic per error llençava la
// partida). La vista hi pausa el cronòmetre mentre és oberta. Esc continua.
const emit = defineEmits<{ continua: []; surt: [] }>()

const modalRef = ref<HTMLElement | null>(null)
useFocusTrap(modalRef, ref(true), () => emit('continua'))
</script>

<template>
  <div class="joc-modal-fons joc-modal-fons--sobre">
    <div
      ref="modalRef"
      class="joc-modal joc-sortida"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="joc-sortida-titol"
      aria-describedby="joc-sortida-text"
    >
      <h2 id="joc-sortida-titol" class="joc-modal__titol">
        {{ $t('partida.sortida.titol') }}
      </h2>
      <p id="joc-sortida-text" class="joc-modal__sub">{{ $t('partida.sortida.text') }}</p>
      <button type="button" class="joc-boto" @click="emit('continua')">
        {{ $t('partida.sortida.continua') }}
      </button>
      <button type="button" class="joc-boto-secundari" @click="emit('surt')">
        {{ $t('partida.sortida.surt') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.joc-sortida {
  width: min(380px, 100%);
  text-align: center;
}
</style>
