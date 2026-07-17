<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import logoUrl from '@/assets/logo.png'
import { muntaTerraAnimacio, type TerraAnimacio } from '@/terra/terra-animation'
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

// ── Animació tipogràfica "La terra" ─────────────────────────────────────
const terraEl = ref<HTMLElement | null>(null)
let terraAnim: TerraAnimacio | null = null

onMounted(() => {
  // controlsDev: true torna a mostrar els controls de revisió (play/scrub).
  if (terraEl.value) terraAnim = muntaTerraAnimacio(terraEl.value, { controlsDev: false })
})

onBeforeUnmount(() => {
  terraAnim?.destrueix()
  terraAnim = null
})
</script>

<template>
  <header class="cabecera">
    <video class="cabecera__video" autoplay muted loop playsinline aria-hidden="true">
      <!-- <source src="/video/highlights.mp4" type="video/mp4" /> -->
    </video>

    <!-- Animació tipogràfica "La terra" (fase 1: frases; després SVG + àudio) -->
    <div ref="terraEl" class="cabecera__terra" aria-hidden="true" />

    <!-- Identitat (esquerra) -->
    <RouterLink to="/llocs" class="cabecera__identitat">
      <img :src="logoUrl" alt="viscalaterra" class="cabecera__logo" />
      <span class="cabecera__nom">viscalaterra<span class="cabecera__nom-tld">.cat</span></span>
    </RouterLink>

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
  /* Tres capes (de dalt a baix): corbes de nivell topogràfiques (guiny al
     territori), halo verd bosc a la dreta i gradient de nit com a base. */
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='130'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.05' stroke-width='1.3'%3E%3Cpath d='M0 14 q32.5 -11 65 0 t65 0 t65 0 t65 0'/%3E%3Cpath d='M0 40 q32.5 13 65 0 t65 0 t65 0 t65 0'/%3E%3Cpath d='M0 66 q32.5 -9 65 0 t65 0 t65 0 t65 0'/%3E%3Cpath d='M0 92 q32.5 11 65 0 t65 0 t65 0 t65 0'/%3E%3Cpath d='M0 118 q32.5 -13 65 0 t65 0 t65 0 t65 0'/%3E%3C/g%3E%3C/svg%3E")
      repeat,
    radial-gradient(ellipse 60% 130% at 88% 15%, rgba(45, 106, 45, 0.4), transparent 65%),
    linear-gradient(110deg, #131d29 0%, #1a2635 58%, #1d3226 100%);
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
    rgba(0, 0, 0, 0.45) 0%,
    rgba(0, 0, 0, 0.1) 45%,
    transparent 75%
  );
  z-index: 1;
  pointer-events: none;
}

/* Franja identitària: els colors de les quatre províncies (BCN/GIR/LLE/TAR),
   la mateixa paleta del mapa i del panell On?. */
.cabecera::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: linear-gradient(
    to right,
    #c4382e 0 25%,
    #2d6a2d 25% 50%,
    #b8860b 50% 75%,
    #2b6cb0 75% 100%
  );
  z-index: 3;
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

/* Capa de l'animació "La terra": per sobre del gradient (1) perquè el text
   no s'enfosqueixi, per sota de la franja de províncies (3) i dels controls. */
.cabecera__terra {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

/* ── Identitat ──────────────────────────────────────────────────────────── */

.cabecera__identitat {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 20px;
  height: 100%;
  text-decoration: none;
}

.cabecera__logo {
  position: relative;
  /* Per sobre dels noms: el logo tapa la part alta del bloc de text. */
  z-index: 1;
  height: 76px;
  width: auto;
  display: block;
  object-fit: contain;
  object-position: left center;
  filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.35));
  transition: transform var(--mou-mig);
}

.cabecera__identitat:hover .cabecera__logo {
  transform: scale(1.05) rotate(-2deg);
}

/* Ancorat a baix a l'esquerra, mig cobert pel logo (que hi queda per sobre):
   així el nom no ocupa amplada pròpia i deixa espai a l'animació "La terra". */
.cabecera__nom {
  position: absolute;
  left: 48px;
  /* La caixa del logo acaba a 17px ((110 − 76) / 2); ajustat a ull un pèl
     més avall perquè casi amb la punta visible del dibuix. */
  bottom: 13px;
  z-index: 0;
  font-family: var(--font-display);
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.05;
  color: #ffffff;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
}

.cabecera__nom-tld {
  color: #8fc78f;
  font-weight: 500;
}

@media (max-width: 768px) {
  .cabecera__identitat {
    gap: 10px;
    padding: 8px 12px;
    min-width: 0;
  }

  .cabecera__logo {
    height: 68px;
  }

  .cabecera__nom {
    left: 34px;
    /* Mateix criteri que en desktop, amb el logo de 68px (caixa a 21px). */
    bottom: 17px;
    font-size: 1.15rem;
    white-space: nowrap;
  }
}

/* ── Controls globals (dreta) ───────────────────────────────────────────── */

.cabecera__controls {
  position: relative;
  /* Per sobre de la franja de províncies (::after, z-index 3): els desplegables
     d'idioma i d'usuari la creuen en obrir-se i han de quedar-hi per damunt. */
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
}

@media (max-width: 768px) {
  .cabecera__controls {
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    padding: 0 12px;
  }
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
  padding: 5px;
  list-style: none;
  background: var(--color-superficie, #ffffff);
  border: 1px solid var(--color-vora, #e0e0dc);
  border-radius: var(--radi-md, 12px);
  box-shadow: var(--ombra-3, 0 8px 24px rgba(0, 0, 0, 0.18));
  animation: menu-apareix var(--mou-mig, 0.2s ease);
  transform-origin: top right;
}

@keyframes menu-apareix {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
}

@media (prefers-reduced-motion: reduce) {
  .selector-idioma__llista {
    animation: none;
  }
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
  height: 36px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: var(--radi-pastilla, 18px);
  background: #ffffff;
  color: #1a2635;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
  transition:
    background var(--mou-rapid, 0.15s),
    transform var(--mou-mig, 0.2s),
    box-shadow var(--mou-mig, 0.2s);
}

.usuari-btn:hover {
  background: #eaf3ea;
  transform: translateY(-1px);
  box-shadow: 0 5px 16px rgba(0, 0, 0, 0.3);
}

.usuari-btn:active {
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .usuari-btn,
  .usuari-btn:hover {
    transform: none;
  }
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
  padding: 5px;
  list-style: none;
  background: var(--color-superficie, #fff);
  border: 1px solid var(--color-vora, #e0e0dc);
  border-radius: var(--radi-md, 12px);
  box-shadow: var(--ombra-3, 0 8px 24px rgba(0, 0, 0, 0.18));
  animation: menu-apareix var(--mou-mig, 0.2s ease);
  transform-origin: top right;
}

@media (prefers-reduced-motion: reduce) {
  .usuari-menu {
    animation: none;
  }
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
