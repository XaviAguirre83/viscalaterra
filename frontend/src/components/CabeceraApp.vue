<script setup lang="ts">
import logoUrl from '@/assets/logo.png'

const IDIOMES = ['CA', 'ES', 'EN']
const idiomeActiu = 'CA'
</script>

<template>
  <header class="cabecera">
    <video class="cabecera__video" autoplay muted loop playsinline>
      <!-- <source src="/video/highlights.mp4" type="video/mp4" /> -->
    </video>

    <!-- Identitat (esquerra) -->
    <div class="cabecera__identitat">
      <img :src="logoUrl" alt="viscalaterra" class="cabecera__logo" />
      <span class="cabecera__nom">viscalaterra.cat</span>
    </div>

    <!-- Controls globals (dreta) -->
    <div class="cabecera__controls">
      <div class="selector-idioma">
        <button
          v-for="idioma in IDIOMES"
          :key="idioma"
          class="selector-idioma__btn"
          :class="{ 'selector-idioma__btn--actiu': idioma === idiomeActiu }"
        >
          {{ idioma }}
        </button>
      </div>

      <div class="auth">
        <button class="auth__btn auth__btn--secundari">Registra't</button>
        <button class="auth__btn auth__btn--principal">Entra</button>
      </div>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
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

/* ── Identitat ──────────────────────────────────────────────────────────── */

.cabecera__identitat {
  position: relative;
  z-index: 2;
  display: inline-block;
  padding: 8px 16px;
  height: 100%;
}

.cabecera__logo {
  height: calc(110px - 16px);
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

/* ── Controls globals (dreta) ───────────────────────────────────────────── */

.cabecera__controls {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 24px;
}

/* ── Selector d'idioma ──────────────────────────────────────────────────── */

.selector-idioma {
  display: flex;
  align-items: center;
  gap: 2px;
}

.selector-idioma__btn {
  background: none;
  border: none;
  padding: 4px 7px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  border-radius: 4px;
  transition:
    color 0.15s,
    background 0.15s;
}

.selector-idioma__btn:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.1);
}

.selector-idioma__btn--actiu {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.15);
}

/* ── Auth ───────────────────────────────────────────────────────────────── */

.auth {
  display: flex;
  align-items: center;
  gap: 8px;
}

.auth__btn {
  height: 32px;
  padding: 0 16px;
  border-radius: 16px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  white-space: nowrap;
}

.auth__btn--secundari {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.45);
  color: rgba(255, 255, 255, 0.85);
}

.auth__btn--secundari:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.75);
  color: #ffffff;
}

.auth__btn--principal {
  background: #ffffff;
  border: 1px solid transparent;
  color: #1a2635;
}

.auth__btn--principal:hover {
  background: #e8f0e8;
}
</style>
