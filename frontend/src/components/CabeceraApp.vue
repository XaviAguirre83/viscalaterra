<script setup lang="ts">
import logoUrl from '@/assets/logo.png'
</script>

<template>
  <header class="cabecera">
    <video class="cabecera__video" autoplay muted loop playsinline>
      <!-- <source src="/video/highlights.mp4" type="video/mp4" /> -->
    </video>

    <div class="cabecera__identitat">
      <img :src="logoUrl" alt="viscalaterra" class="cabecera__logo" />
      <span class="cabecera__nom">viscalaterra.cat</span>
    </div>
  </header>
</template>

<style scoped>
.cabecera {
  position: relative;
  width: 100%;
  height: 110px;
  overflow: hidden;
  background: #1a2635;
  flex-shrink: 0;
}

.cabecera::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0.6) 0%,
    rgba(0, 0, 0, 0.15) 45%,
    transparent 75%
  );
  z-index: 1;
  pointer-events: none;
}

.cabecera__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.cabecera__identitat {
  position: relative;
  z-index: 2;
  display: inline-block;
  padding: 8px 16px;
  height: 100%;
}

.cabecera__logo {
  height: calc(110px - 16px); /* alçada capçalera - padding top+bottom */
  width: auto;
  display: block;
  object-fit: contain;
  object-position: left center;
}

.cabecera__nom {
  position: absolute;
  bottom: 2px;
  left: 42px;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: lowercase;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
}
</style>
