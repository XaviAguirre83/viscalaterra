<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TabOn from './TabOn.vue'
import TabQue from './TabQue.vue'
import TabQuan from './TabQuan.vue'
import CercaRapida from './CercaRapida.vue'
import { useMapaOpcionsStore } from '@/stores/mapaOpcions'

const mapaOpcions = useMapaOpcionsStore()

type Tab = 'on' | 'que' | 'quan'

const router = useRouter()
const route = useRoute()

const tabActiva = ref<Tab | null>(null)
const menuObert = ref(false)

// grup 1: seccions amb mapa · grup 2: Merchandising · grup 3: meta (sense mapa)
const SECCIONS = [
  { id: 'llocs', clau: 'nav.seccions.llocs', ruta: '/llocs', grup: 1 },
  { id: 'agenda', clau: 'nav.seccions.agenda', ruta: '/agenda', grup: 1 },
  { id: 'anuncis', clau: 'nav.seccions.anuncis', ruta: '/anuncis', grup: 1 },
  { id: 'fet-a-la-terra', clau: 'nav.seccions.fetALaTerra', ruta: '/fet-a-la-terra', grup: 1 },
  { id: 'jocs', clau: 'nav.seccions.jocs', ruta: '/jocs', grup: 1 },
  { id: 'merchandising', clau: 'nav.seccions.merchandising', ruta: '/merchandising', grup: 2 },
  { id: 'sobre', clau: 'nav.seccions.sobre', ruta: '/sobre', grup: 3 },
  { id: 'contacte', clau: 'nav.seccions.contacte', ruta: '/contacte', grup: 3 },
  { id: 'suggeriments', clau: 'nav.seccions.suggeriments', ruta: '/suggeriments', grup: 3 },
  { id: 'legal', clau: 'nav.seccions.legal', ruta: '/legal', grup: 3 },
]

const seccioActiva = computed(() => SECCIONS.find((s) => route.path.startsWith(s.ruta)))
// Llocs i Agenda mostren el mapa amb filtres; només Agenda té el tab Quan?
// (els llocs són atemporals).
const mostraFiltres = computed(
  () => seccioActiva.value?.id === 'llocs' || seccioActiva.value?.id === 'agenda'
)
const mostraQuan = computed(() => seccioActiva.value?.id === 'agenda')

function navegaA(ruta: string) {
  router.push(ruta)
  menuObert.value = false
}

function toggleTab(tab: Tab) {
  tabActiva.value = tabActiva.value === tab ? null : tab
}

watch(
  () => route.path,
  () => {
    tabActiva.value = null
  }
)
</script>

<template>
  <div class="panell-filtres">
    <!-- ── Barra horitzontal ──────────────────────────────────────────── -->
    <nav class="barra">
      <div class="barra__fila-1" :class="{ 'barra__fila-1--cerca': mostraFiltres }">
        <div class="barra__zona barra__zona--esq">
          <button
            class="btn-menu"
            :class="{ 'btn-menu--obert': menuObert }"
            type="button"
            :aria-label="$t('nav.menuPrincipal')"
            :aria-expanded="menuObert"
            @click="menuObert = !menuObert"
          >
            <span /><span /><span />
          </button>
        </div>

        <template v-if="mostraFiltres">
          <!-- Bloc tabs + cercador: ample = recuadre info-territori (W) -->
          <div class="barra__centre">
            <div class="tabs">
              <button
                type="button"
                :class="{ activa: tabActiva === 'on' }"
                :aria-expanded="tabActiva === 'on'"
                @click="toggleTab('on')"
              >
                {{ $t('nav.tabs.on') }}
              </button>
              <button
                type="button"
                :class="{ activa: tabActiva === 'que' }"
                :aria-expanded="tabActiva === 'que'"
                @click="toggleTab('que')"
              >
                {{ $t('nav.tabs.que') }}
              </button>
              <button
                v-if="mostraQuan"
                type="button"
                :class="{ activa: tabActiva === 'quan' }"
                :aria-expanded="tabActiva === 'quan'"
                @click="toggleTab('quan')"
              >
                {{ $t('nav.tabs.quan') }}
              </button>
            </div>
            <div class="barra__cerca-fila">
              <CercaRapida />
              <button
                type="button"
                class="btn-opcions"
                :class="{ 'btn-opcions--actiu': mapaOpcions.panelObert }"
                :title="$t('opcionsMapa.titol')"
                :aria-label="$t('opcionsMapa.titol')"
                :aria-expanded="mapaOpcions.panelObert"
                @click="mapaOpcions.alterna()"
              >
                <svg
                  class="btn-opcions__icona"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </template>

        <!-- Contingut contextual injectat per la vista activa (p. ex. el joc) -->
        <slot />
      </div>
    </nav>

    <!-- ── Menú principal desplegable ───────────────────────────────── -->
    <Transition name="desplega">
      <div v-if="menuObert" class="menu-principal" role="menu">
        <template v-for="(seccio, i) in SECCIONS" :key="seccio.id">
          <hr
            v-if="i > 0 && seccio.grup !== SECCIONS[i - 1]?.grup"
            class="menu-principal__separador"
          />
          <button
            type="button"
            role="menuitem"
            class="menu-principal__item"
            :class="{
              'menu-principal__item--activa': seccioActiva?.id === seccio.id,
              'menu-principal__item--secundari': seccio.grup === 3,
            }"
            @click="navegaA(seccio.ruta)"
          >
            {{ $t(seccio.clau) }}
          </button>
        </template>
      </div>
    </Transition>

    <!-- ── Contingut del tab actiu ───────────────────────────────────── -->
    <Transition name="desplega">
      <div v-if="tabActiva && mostraFiltres" class="desplegable">
        <TabOn v-if="tabActiva === 'on'" />
        <TabQue v-else-if="tabActiva === 'que'" />
        <TabQuan v-else-if="tabActiva === 'quan'" />
      </div>
    </Transition>

    <!-- Capa transparent per tancar el menú en clicar fora -->
    <div v-if="menuObert" class="overlay-menu" aria-hidden="true" @click="menuObert = false" />
  </div>
</template>

<style scoped>
.panell-filtres {
  position: relative;
  z-index: 2000;
  flex-shrink: 0;
}

.barra {
  background: #ffffff;
  border-bottom: 1px solid #e8e8e4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.barra__fila-1 {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 12px;
  gap: 12px;
  position: relative; /* àncora del ⚙️ (absolut en desktop) */
}

.barra__zona {
  display: flex;
  align-items: center;
}

/* En Cerca: la zona esquerra té l'amplada justa perquè el bloc central (tabs +
   cercador) quedi alineat amb el cantó esquerre del recuadre info-territori
   (width W = min(760px, 100vw-24px), centrat). */
.barra__fila-1--cerca .barra__zona--esq {
  flex: 0 0 auto;
  width: calc((100vw - min(760px, 100vw - 24px)) / 2 - 24px);
}

/* Bloc central: mateix ample que el recuadre → "On?" al cantó esquerre i el
   botó "CERCA" al cantó dret del recuadre. El ⚙️ queda fora, a la cantonada. */
.barra__centre {
  flex: 0 0 auto;
  width: min(760px, 100vw - 24px);
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.barra__centre .tabs {
  flex: 0 0 auto;
}

.barra__centre .barra__cerca-fila {
  flex: 1 1 auto;
  min-width: 0;
}

/* Cercador + engranatge d'opcions. Ordre DOM: cercador → ⚙️. */
.barra__cerca-fila {
  display: flex;
  align-items: center;
  gap: 6px;
}

.barra__cerca-fila .cerca-rapida {
  flex: 1 1 auto;
  min-width: 0;
}

/* El ⚙️ s'àncora a la cantonada dreta de la barra (fora del recuadre). En
   mòbil torna al flux normal (vegeu el media query). */
.barra__fila-1--cerca .btn-opcions {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.btn-opcions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 1px solid #d8d8d4;
  border-radius: 8px;
  background: #fafaf8;
  color: #555;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}

.btn-opcions__icona {
  width: 19px;
  height: 19px;
}

.btn-opcions:hover {
  background: #f0f4f0;
  color: #2d6a2d;
}

.btn-opcions--actiu {
  background: #eef4ee;
  border-color: #2d6a2d;
  color: #2d6a2d;
}

@media (max-width: 768px) {
  .barra__fila-1 {
    height: auto;
    min-height: 48px;
    flex-wrap: wrap;
    padding: 6px 12px;
  }

  /* En mòbil es desfà el centrat: menú compacte, tabs ocupen la 1a fila i el
     cercador passa a una 2a fila a tota l'amplada. El bloc central es dissol
     perquè tabs i cercador es reparteixin en dues files. */
  .barra__centre {
    display: contents;
  }

  .barra__fila-1--cerca .barra__zona--esq {
    flex: 0 0 auto;
    width: auto;
  }

  .barra__fila-1--cerca .tabs {
    flex: 1 1 auto;
  }

  .barra__fila-1--cerca .barra__cerca-fila {
    flex: 1 1 100%;
    /* gap 12 = mateixa separació que ☰↔On?: així "Cerca per nom" arrenca
       alineat sota "On?" (i el ⚙️ sota el ☰). */
    gap: 12px;
    padding: 0 4px 8px 0;
  }

  /* Línia divisòria vertical que separa la columna esquerra (☰ / ⚙️) de la
     dreta (On?… / Cerca per nom), de dalt a baix de la barra de dues files. */
  .barra__fila-1--cerca {
    position: relative;
  }

  .barra__fila-1--cerca::after {
    content: '';
    position: absolute;
    top: 6px;
    bottom: 6px;
    left: 62px;
    width: 1px;
    background: #e0e0dc;
    pointer-events: none;
  }

  /* El cercador ocupa l'espai i el ⚙️ es mou a l'esquerra */
  .barra__cerca-fila .cerca-rapida {
    flex: 1;
    order: 1;
  }

  /* El ⚙️ torna al flux (2a fila), a l'esquerra, sota el ☰ */
  .barra__fila-1--cerca .btn-opcions {
    position: static;
    transform: none;
    order: 0;
    width: 44px;
    height: 44px;
  }
}

/* ── Botó hamburger ─────────────────────────────────────────────────────── */

.btn-menu {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  padding: 8px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

@media (max-width: 768px) {
  .btn-menu {
    width: 44px;
    height: 44px;
  }
}

.btn-menu:hover {
  background: #f0f0ee;
}

.btn-menu span {
  display: block;
  height: 2px;
  background: #444;
  border-radius: 2px;
  transition:
    transform 0.2s,
    opacity 0.2s;
}

.btn-menu--obert span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.btn-menu--obert span:nth-child(2) {
  opacity: 0;
}
.btn-menu--obert span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* ── Tabs On?/Què?/Quan? ────────────────────────────────────────────────── */

.tabs {
  display: flex;
  gap: 2px;
}

@media (max-width: 768px) {
  .tabs {
    flex: 1;
  }

  .tabs button {
    flex: 1;
    text-align: center;
    min-height: 44px;
  }
}

.tabs button {
  padding: 6px 16px;
  border: none;
  border-radius: 20px;
  background: none;
  font-size: 0.9rem;
  font-weight: 600;
  color: #555;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  white-space: nowrap;
}

.tabs button:hover {
  background: #f0f4f0;
  color: #2d6a2d;
}

.tabs button.activa {
  background: #2d6a2d;
  color: #ffffff;
}

/* ── Menú principal desplegable ─────────────────────────────────────────── */

.menu-principal {
  position: absolute;
  top: 100%;
  left: 0;
  background: #ffffff;
  border: 1px solid #e8e8e4;
  border-top: none;
  border-radius: 0 0 10px 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  min-width: 200px;
  z-index: 100;
  overflow: hidden;
}

@media (max-width: 768px) {
  .menu-principal {
    left: 0;
    right: 0;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
}

.menu-principal__item {
  display: block;
  width: 100%;
  padding: 12px 20px;
  text-align: left;
  background: none;
  border: none;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #444;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}

.menu-principal__item:hover {
  background: #f4f7f4;
  color: #2d6a2d;
}

.menu-principal__item--activa {
  color: #2d6a2d;
  background: #eef4ee;
}

.menu-principal__separador {
  border: none;
  border-top: 1px solid #e8e8e4;
  margin: 4px 0;
}

/* Grup secundari (Sobre / Contacte / Suggeriments): més discret, sense majúscules */
.menu-principal__item--secundari {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.3px;
  color: #777;
}

.menu-principal__item--secundari:hover {
  color: #2d6a2d;
}

/* ── Contingut tab actiu ────────────────────────────────────────────────── */

.desplegable {
  position: absolute;
  top: 100%;
  left: 0;
  background: #ffffff;
  border: 1px solid #e8e8e4;
  border-top: none;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 16px;
  color: #222;
  z-index: 99;
}

@media (max-width: 768px) {
  .desplegable {
    right: 0;
    border-radius: 0;
    border-left: none;
    border-right: none;
    max-height: calc(100dvh - 160px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}

/* ── Overlay per tancar el menú ─────────────────────────────────────────── */

.overlay-menu {
  position: fixed;
  inset: 0;
  z-index: 99;
}

/* ── Transició dels desplegables (menú principal i tabs) ────────────────── */
.desplega-enter-active,
.desplega-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.desplega-enter-from,
.desplega-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .desplega-enter-active,
  .desplega-leave-active {
    transition: none;
  }
}
</style>
