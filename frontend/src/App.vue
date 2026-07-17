<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import CabeceraApp from '@/components/CabeceraApp.vue'
import PeuApp from '@/components/PeuApp.vue'
import { useAuthStore } from '@/stores/auth'

// En arrencar, restaura la sessió si hi ha un token vàlid desat.
const auth = useAuthStore()
onMounted(() => auth.carregaJo())

// El peu s'amaga al joc (experiència immersiva a pantalla completa).
const route = useRoute()
const mostraPeu = computed(() => !route.path.startsWith('/jocs/geofreak'))
</script>

<template>
  <div class="app-layout">
    <CabeceraApp />
    <RouterView v-slot="{ Component }">
      <Transition name="vista" mode="out-in">
        <component :is="Component" class="app-layout__contingut" />
      </Transition>
    </RouterView>
    <PeuApp v-if="mostraPeu" />
  </div>

  <div class="overlay-orientacio" role="alert" aria-live="assertive">
    <div class="overlay-orientacio__contingut">
      <span class="overlay-orientacio__icona">⟳</span>
      <p class="overlay-orientacio__text">{{ $t('orientacio.gira') }}</p>
      <p class="overlay-orientacio__subtitol">{{ $t('orientacio.subtitol') }}</p>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  /* dvh: alçada REAL visible al mòbil (100vh inclou la zona tapada per la
     barra del navegador i el que s'ancora a baix queda fora de pantalla). */
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.app-layout__contingut {
  flex: 1;
  min-height: 0;
}

/* Fosa suau en canviar de secció (les vistes que comparteixen component,
   com Llocs ↔ Agenda, no es remunten i per tant no fan la transició). */
.vista-enter-active,
.vista-leave-active {
  transition: opacity 0.14s ease;
}

.vista-enter-from,
.vista-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .vista-enter-active,
  .vista-leave-active {
    transition: none;
  }
}

/* ── Overlay orientació ─────────────────────────────────────────────────── */

.overlay-orientacio {
  display: none;
}

@media screen and (orientation: landscape) and (max-height: 600px) {
  .overlay-orientacio {
    display: flex;
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: #1a2635;
    align-items: center;
    justify-content: center;
  }
}

.overlay-orientacio__contingut {
  text-align: center;
  color: #ffffff;
  padding: 24px;
}

.overlay-orientacio__icona {
  display: block;
  font-size: 3.5rem;
  margin-bottom: 20px;
  animation: gira 2s linear infinite;
}

.overlay-orientacio__text {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.overlay-orientacio__subtitol {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

@keyframes gira {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
