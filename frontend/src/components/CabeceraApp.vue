<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import logoUrl from '@/assets/logo.png'
import {
  IDIOMES,
  ETIQUETA_IDIOMA,
  NOM_IDIOMA,
  BANDERA_IDIOMA,
  canviaIdioma,
  type Idioma,
} from '@/i18n'

const { locale } = useI18n()

const idiomaObert = ref(false)
const etiquetaActual = computed(() => ETIQUETA_IDIOMA[locale.value as Idioma] ?? locale.value)
const banderaActual = computed(() => BANDERA_IDIOMA[locale.value as Idioma] ?? 'es-ct')

function triaIdioma(idioma: Idioma) {
  canviaIdioma(idioma)
  idiomaObert.value = false
}
</script>

<template>
  <header class="cabecera">
    <video class="cabecera__video" autoplay muted loop playsinline aria-hidden="true">
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
          type="button"
          class="selector-idioma__trigger"
          :aria-label="$t('capcalera.idioma')"
          aria-haspopup="listbox"
          :aria-expanded="idiomaObert"
          @click="idiomaObert = !idiomaObert"
        >
          <span
            class="fi selector-idioma__bandera"
            :class="`fi-${banderaActual}`"
            aria-hidden="true"
          />
          <span class="selector-idioma__actual">{{ etiquetaActual }}</span>
          <span
            class="selector-idioma__fletxa"
            :class="{ 'selector-idioma__fletxa--obert': idiomaObert }"
            aria-hidden="true"
            >▾</span
          >
        </button>
        <ul v-if="idiomaObert" class="selector-idioma__llista" role="listbox">
          <li
            v-for="idioma in IDIOMES"
            :key="idioma"
            role="option"
            :aria-selected="idioma === locale"
          >
            <button
              type="button"
              class="selector-idioma__opcio"
              :class="{ 'selector-idioma__opcio--actiu': idioma === locale }"
              :lang="idioma"
              @click="triaIdioma(idioma)"
            >
              <span
                class="fi selector-idioma__bandera"
                :class="`fi-${BANDERA_IDIOMA[idioma]}`"
                aria-hidden="true"
              />
              <span class="selector-idioma__nom">{{ NOM_IDIOMA[idioma] }}</span>
            </button>
          </li>
        </ul>
        <div v-if="idiomaObert" class="selector-idioma__overlay" @click="idiomaObert = false" />
      </div>

      <div class="auth">
        <button type="button" class="auth__btn auth__btn--secundari">
          {{ $t('capcalera.registra') }}
        </button>
        <button type="button" class="auth__btn auth__btn--principal">
          {{ $t('capcalera.entra') }}
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.cabecera {
  position: relative;
  z-index: 2100; /* per sobre de la barra de navegació (2000): el desplegable d'idioma hi flota a sobre */
  width: 100%;
  height: 110px;
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
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  padding: 0 24px;
}

/* ── Selector d'idioma (desplegable, escalable a molts idiomes) ─────────── */

.selector-idioma {
  position: relative;
}

/* Discret i sense "caixa": el selector és utility, no ha de competir amb els
   botons de compte. Bandera + codi en gris tènue. */
.selector-idioma__trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 4px 6px;
  background: none;
  border: none;
  border-radius: 6px;
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s;
}

.selector-idioma__trigger:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.selector-idioma__bandera {
  width: 20px;
  height: 15px;
  border-radius: 2px;
  flex-shrink: 0;
  /* vora subtil perquè les banderes amb blanc (gb) no es fonguin amb el fons */
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
}

.selector-idioma__fletxa {
  font-size: 0.6rem;
  transition: transform 0.15s;
}

.selector-idioma__fletxa--obert {
  transform: rotate(180deg);
}

.selector-idioma__llista {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 3000;
  min-width: 160px;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: #ffffff;
  border: 1px solid #e0e0dc;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.selector-idioma__opcio {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  color: #222;
  transition: background 0.12s;
}

.selector-idioma__opcio:hover {
  background: var(--color-marca-clar, #f0f4f0);
}

.selector-idioma__opcio--actiu {
  color: var(--color-marca, #2d6a2d);
  font-weight: 700;
}

.selector-idioma__nom {
  font-size: var(--text-sm);
}

/* Capa transparent per tancar el desplegable en clicar fora */
.selector-idioma__overlay {
  position: fixed;
  inset: 0;
  z-index: 2900;
}

@media (max-width: 768px) {
  .selector-idioma__trigger {
    min-height: 44px;
  }

  .selector-idioma__opcio {
    min-height: 44px;
  }
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
  border: 1px solid rgba(255, 255, 255, 0.55);
  color: rgba(255, 255, 255, 0.92);
}

@media (max-width: 768px) {
  .auth__btn {
    height: 40px;
  }
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
