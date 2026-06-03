<script setup lang="ts">
import CabeceraApp from '@/components/CabeceraApp.vue'
</script>

<template>
  <div class="app-layout">
    <CabeceraApp />
    <RouterView class="app-layout__contingut" />
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
  height: 100vh;
  overflow: hidden;
}

.app-layout__contingut {
  flex: 1;
  min-height: 0;
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
