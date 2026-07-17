<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TabOn from './TabOn.vue'
import TabQue from './TabQue.vue'
import TabQuan from './TabQuan.vue'
import CercaRapida from './CercaRapida.vue'
import { useTerritorisStore } from '@/stores/territoris'
import { useFiltresStore } from '@/stores/filtres'

type Tab = 'on' | 'que' | 'quan'

const router = useRouter()
const route = useRoute()
const territoris = useTerritorisStore()
const filtres = useFiltresStore()

const tabActiva = ref<Tab | null>(null)
const menuObert = ref(false)

// Recomptes de filtres actius: es mostren com a "pastilla" a cada tab perquè
// l'usuari vegi d'un cop d'ull què té seleccionat sense obrir els desplegables.
const nMunicipis = computed(() => territoris.municipisSeleccionats.size)
const nCategories = computed(() => filtres.categoriesActives.size)
const teQuan = computed(() => filtres.teSeleccioTemporal)

function compacta(n: number): string {
  return n > 99 ? '99+' : String(n)
}

// grup 1: seccions amb mapa · grup 2: Merchandising · grup 3: meta (sense mapa)
// Les icones són paths de Lucide/Feather (24×24, stroke 2) inlinats al menú.
const SECCIONS = [
  {
    id: 'llocs',
    clau: 'nav.seccions.llocs',
    ruta: '/llocs',
    grup: 1,
    icona: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  },
  {
    id: 'agenda',
    clau: 'nav.seccions.agenda',
    ruta: '/agenda',
    grup: 1,
    icona:
      'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M16 2v4 M8 2v4 M3 10h18',
  },
  {
    id: 'anuncis',
    clau: 'nav.seccions.anuncis',
    ruta: '/anuncis',
    grup: 1,
    icona: 'm3 11 18-5v12L3 14v-3z M11.6 16.8a3 3 0 1 1-5.8-1.6',
  },
  {
    id: 'fet-a-la-terra',
    clau: 'nav.seccions.fetALaTerra',
    ruta: '/fet-a-la-terra',
    grup: 1,
    icona:
      'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
  },
  {
    id: 'jocs',
    clau: 'nav.seccions.jocs',
    ruta: '/jocs',
    grup: 1,
    icona:
      'M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22 M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22 M18 2H6v7a6 6 0 0 0 12 0V2Z',
  },
  {
    id: 'merchandising',
    clau: 'nav.seccions.merchandising',
    ruta: '/merchandising',
    grup: 2,
    icona: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0',
  },
  {
    id: 'sobre',
    clau: 'nav.seccions.sobre',
    ruta: '/sobre',
    grup: 3,
    icona: 'M12 22A10 10 0 1 0 12 2a10 10 0 0 0 0 20z M12 16v-4 M12 8h.01',
  },
  {
    id: 'contacte',
    clau: 'nav.seccions.contacte',
    ruta: '/contacte',
    grup: 3,
    icona:
      'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
  },
  {
    id: 'suggeriments',
    clau: 'nav.seccions.suggeriments',
    ruta: '/suggeriments',
    grup: 3,
    icona: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  },
  {
    id: 'legal',
    clau: 'nav.seccions.legal',
    ruta: '/legal',
    grup: 3,
    icona:
      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  },
]

const seccioActiva = computed(() => SECCIONS.find((s) => route.path.startsWith(s.ruta)))
// Llocs i Agenda mostren el mapa amb filtres; només Agenda té el tab Quan?
// (els llocs són atemporals).
const mostraFiltres = computed(
  () => seccioActiva.value?.id === 'llocs' || seccioActiva.value?.id === 'agenda'
)
const mostraQuan = computed(() => seccioActiva.value?.id === 'agenda')
// El nom de secció dona context quan la barra va buida; s'amaga dins d'un joc
// (p. ex. /jocs/geofreak) perquè el HUD injectat pel slot necessita l'espai.
const mostraSeccio = computed(
  () => !mostraFiltres.value && !!seccioActiva.value && !/^\/jocs\/./.test(route.path)
)

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

        <!-- Nom de la secció activa: dona context quan la barra no té filtres -->
        <span v-if="mostraSeccio && seccioActiva" class="barra__seccio">
          {{ $t(seccioActiva.clau) }}
        </span>

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
                {{ $t('nav.tabs.on')
                }}<span v-if="nMunicipis > 0" class="tab-badge">{{ compacta(nMunicipis) }}</span>
              </button>
              <button
                type="button"
                :class="{ activa: tabActiva === 'que' }"
                :aria-expanded="tabActiva === 'que'"
                @click="toggleTab('que')"
              >
                {{ $t('nav.tabs.que')
                }}<span v-if="nCategories > 0" class="tab-badge">{{ compacta(nCategories) }}</span>
              </button>
              <button
                v-if="mostraQuan"
                type="button"
                :class="{ activa: tabActiva === 'quan' }"
                :aria-expanded="tabActiva === 'quan'"
                @click="toggleTab('quan')"
              >
                {{ $t('nav.tabs.quan')
                }}<span v-if="teQuan" class="tab-badge tab-badge--punt" aria-hidden="true" />
              </button>
            </div>
            <div class="barra__cerca-fila">
              <CercaRapida />
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
            <svg
              class="menu-principal__icona"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path :d="seccio.icona" />
            </svg>
            <span>{{ $t(seccio.clau) }}</span>
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
  background: var(--color-superficie, #ffffff);
  border-bottom: 1px solid var(--color-vora, #e8e8e4);
  box-shadow: var(--ombra-1, 0 2px 8px rgba(0, 0, 0, 0.08));
}

/* Nom de la secció activa (visible quan no hi ha tabs de filtres) */
.barra__seccio {
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text-fort, #1a2635);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.barra__fila-1 {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 12px;
  gap: 12px;
  position: relative;
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
  /* Espaiador esquerre: alinea el bloc central amb el recuadre PVCM, però mai
     més estret que el botó ☰ (si no, "On?" se li muntaria a sobre en finestres
     estretes). */
  width: max(56px, calc((100vw - min(760px, 100vw - 24px)) / 2 - 24px));
}

/* Bloc central: mateix ample que el recuadre → "On?" al cantó esquerre i el
   botó "CERCA" al cantó dret del recuadre (mateixa amplada que info-territori). */
.barra__centre {
  flex: 0 0 auto;
  width: min(760px, 100vw - 24px);
  /* Mai més ample que l'espai lliure després del ☰: així el botó "Cerca" no
     queda tallat pel marge dret en finestres estretes. */
  max-width: calc(100vw - 96px);
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

/* Cercador ràpid: ocupa tota l'amplada del bloc central; el botó "CERCA" del
   propi component queda alineat amb el cantó dret del recuadre. */
.barra__cerca-fila {
  display: flex;
  align-items: center;
}

.barra__cerca-fila .cerca-rapida {
  flex: 1 1 auto;
  min-width: 0;
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

  /* 2a fila: el cercador a tota l'amplada (el ⚙️ ara viu dins el mapa). */
  .barra__fila-1--cerca .barra__cerca-fila {
    flex: 1 1 100%;
    padding: 0 4px 8px 0;
  }

  .barra__cerca-fila .cerca-rapida {
    flex: 1;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border: none;
  border-radius: var(--radi-pastilla, 20px);
  background: none;
  font-size: 0.9rem;
  font-weight: 600;
  color: #555;
  cursor: pointer;
  transition:
    background var(--mou-rapid, 0.15s),
    color var(--mou-rapid, 0.15s),
    box-shadow var(--mou-mig, 0.2s);
  white-space: nowrap;
}

.tabs button:hover {
  background: var(--color-marca-clar, #f0f4f0);
  color: var(--color-marca, #2d6a2d);
}

.tabs button.activa {
  background: var(--color-marca, #2d6a2d);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(45, 106, 45, 0.35);
}

/* Pastilla amb el recompte de filtres actius de cada tab */
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  margin-left: 7px;
  padding: 0 5px;
  border-radius: var(--radi-pastilla, 9px);
  background: var(--color-marca, #2d6a2d);
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.tabs button.activa .tab-badge {
  background: #ffffff;
  color: var(--color-marca, #2d6a2d);
}

.tab-badge--punt {
  min-width: 8px;
  width: 8px;
  height: 8px;
  padding: 0;
}

/* ── Menú principal desplegable ─────────────────────────────────────────── */

.menu-principal {
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--color-superficie, #ffffff);
  border: 1px solid var(--color-vora, #e8e8e4);
  border-top: none;
  border-radius: 0 0 var(--radi-lg, 14px) var(--radi-lg, 14px);
  box-shadow: var(--ombra-3, 0 8px 24px rgba(0, 0, 0, 0.12));
  min-width: 240px;
  padding: 6px;
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
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 11px 16px;
  text-align: left;
  background: none;
  border: none;
  border-radius: var(--radi-sm, 8px);
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #444;
  cursor: pointer;
  transition:
    background var(--mou-rapid, 0.12s),
    color var(--mou-rapid, 0.12s);
}

.menu-principal__icona {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  color: var(--color-text-secundari, #737373);
  transition: color var(--mou-rapid, 0.12s);
}

.menu-principal__item:hover {
  background: var(--color-marca-clar, #f4f7f4);
  color: var(--color-marca, #2d6a2d);
}

.menu-principal__item:hover .menu-principal__icona {
  color: var(--color-marca, #2d6a2d);
}

.menu-principal__item--activa {
  color: var(--color-marca, #2d6a2d);
  background: var(--color-marca-clar, #eef4ee);
  box-shadow: inset 3px 0 0 var(--color-marca, #2d6a2d);
}

.menu-principal__item--activa .menu-principal__icona {
  color: var(--color-marca, #2d6a2d);
}

.menu-principal__separador {
  border: none;
  border-top: 1px solid var(--color-vora, #e8e8e4);
  margin: 5px 8px;
}

/* Grup secundari (Sobre / Contacte / Suggeriments): més discret, sense majúscules */
.menu-principal__item--secundari {
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.3px;
  color: #777;
  padding-top: 9px;
  padding-bottom: 9px;
}

.menu-principal__item--secundari .menu-principal__icona {
  width: 15px;
  height: 15px;
}

.menu-principal__item--secundari:hover {
  color: var(--color-marca, #2d6a2d);
}

/* ── Contingut tab actiu ────────────────────────────────────────────────── */

/* Centrat sota la barra (la propietat `translate` no interfereix amb el
   `transform` de la transició d'entrada). Així el contingut estret (Què?,
   Quan?) apareix sota els seus tabs i no penjat del marge esquerre. */
.desplegable {
  position: absolute;
  top: 100%;
  left: 50%;
  translate: -50% 0;
  max-width: calc(100vw - 24px);
  background: var(--color-superficie, #ffffff);
  border: 1px solid var(--color-vora, #e8e8e4);
  border-top: none;
  border-radius: 0 0 var(--radi-lg, 14px) var(--radi-lg, 14px);
  box-shadow: var(--ombra-3, 0 8px 24px rgba(0, 0, 0, 0.12));
  padding: 16px;
  color: #222;
  z-index: 99;
}

@media (max-width: 768px) {
  .desplegable {
    left: 0;
    right: 0;
    translate: none;
    max-width: none;
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
