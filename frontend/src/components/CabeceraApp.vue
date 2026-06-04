<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
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
import { useAuthStore } from '@/stores/auth'
import ModalAuth from '@/components/ModalAuth.vue'

const router = useRouter()
const { locale } = useI18n()
const auth = useAuthStore()

const idiomaObert = ref(false)
const etiquetaActual = computed(() => ETIQUETA_IDIOMA[locale.value as Idioma] ?? locale.value)
const banderaActual = computed(() => BANDERA_IDIOMA[locale.value as Idioma] ?? 'es-ct')

function triaIdioma(idioma: Idioma) {
  canviaIdioma(idioma)
  idiomaObert.value = false
}

// ── Espai d'usuari ──────────────────────────────────────────────────────
const modalAuthObert = ref(false)
const menuUsuariObert = ref(false)

function vaAlMeuEspai() {
  menuUsuariObert.value = false
  router.push('/espai')
}

function tancaSessio() {
  menuUsuariObert.value = false
  auth.surt()
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

      <div class="usuari">
        <!-- Sense sessió: el botó obre el modal d'autenticació -->
        <button
          v-if="!auth.autenticat"
          type="button"
          class="usuari-btn"
          @click="modalAuthObert = true"
        >
          <svg
            class="usuari-btn__icona"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {{ $t('capcalera.connecta') }}
        </button>

        <!-- Amb sessió: desplegable amb opcions d'usuari -->
        <template v-else>
          <button
            type="button"
            class="usuari-btn"
            aria-haspopup="menu"
            :aria-expanded="menuUsuariObert"
            @click="menuUsuariObert = !menuUsuariObert"
          >
            <svg
              class="usuari-btn__icona"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span class="usuari-btn__nom">{{ auth.usuari?.nom }}</span>
            <span
              class="usuari-btn__fletxa"
              :class="{ 'usuari-btn__fletxa--obert': menuUsuariObert }"
              aria-hidden="true"
              >▾</span
            >
          </button>
          <ul v-if="menuUsuariObert" class="usuari-menu" role="menu">
            <li role="none">
              <button
                type="button"
                role="menuitem"
                class="usuari-menu__opcio"
                @click="vaAlMeuEspai"
              >
                {{ $t('capcalera.elMeuEspai') }}
              </button>
            </li>
            <li role="none">
              <button type="button" role="menuitem" class="usuari-menu__opcio" @click="tancaSessio">
                {{ $t('capcalera.sortir') }}
              </button>
            </li>
          </ul>
          <div v-if="menuUsuariObert" class="usuari-overlay" @click="menuUsuariObert = false" />
        </template>
      </div>
    </div>
  </header>

  <Teleport to="body">
    <ModalAuth v-if="modalAuthObert" @tanca="modalAuthObert = false" />
  </Teleport>
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

/* ── Espai d'usuari ──────────────────────────────────────────────────────── */

.usuari {
  position: relative;
}

.usuari-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 17px;
  background: #ffffff;
  color: #1a2635;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.usuari-btn:hover {
  background: #e8f0e8;
}

.usuari-btn__icona {
  flex-shrink: 0;
}

.usuari-btn__nom {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.usuari-btn__fletxa {
  font-size: 0.6rem;
  transition: transform 0.15s;
}

.usuari-btn__fletxa--obert {
  transform: rotate(180deg);
}

.usuari-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 3000;
  min-width: 170px;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: #fff;
  border: 1px solid #e0e0dc;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.usuari-menu__opcio {
  width: 100%;
  min-height: 40px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: none;
  text-align: left;
  font-size: var(--text-sm);
  color: #222;
  cursor: pointer;
  transition: background 0.12s;
}

.usuari-menu__opcio:hover {
  background: var(--color-marca-clar, #f0f4f0);
}

.usuari-overlay {
  position: fixed;
  inset: 0;
  z-index: 2900;
}

@media (max-width: 768px) {
  .usuari-btn {
    height: 40px;
  }

  .usuari-menu__opcio {
    min-height: 44px;
  }
}
</style>
