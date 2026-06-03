<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TabOn from './TabOn.vue'
import TabQue from './TabQue.vue'
import TabQuan from './TabQuan.vue'
import CercaRapida from './CercaRapida.vue'

type Tab = 'on' | 'que' | 'quan'

const router = useRouter()
const route = useRoute()

const tabActiva = ref<Tab | null>(null)
const menuObert = ref(false)

const SECCIONS = [
  { id: 'cerca', clau: 'nav.seccions.cerca', ruta: '/cerca' },
  { id: 'agenda', clau: 'nav.seccions.agenda', ruta: '/agenda' },
  { id: 'jocs', clau: 'nav.seccions.jocs', ruta: '/jocs' },
  { id: 'merchandising', clau: 'nav.seccions.merchandising', ruta: '/merchandising' },
  { id: 'sobre', clau: 'nav.seccions.sobre', ruta: '/sobre' },
]

const seccioActiva = computed(() => SECCIONS.find((s) => route.path.startsWith(s.ruta)))
const esCerca = computed(() => seccioActiva.value?.id === 'cerca')

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
      <div class="barra__fila-1">
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

        <template v-if="esCerca">
          <div class="separador-v" />
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
              type="button"
              :class="{ activa: tabActiva === 'quan' }"
              :aria-expanded="tabActiva === 'quan'"
              @click="toggleTab('quan')"
            >
              {{ $t('nav.tabs.quan') }}
            </button>
          </div>
          <div class="separador-v separador-v--cerca" />
          <div class="barra__cerca-wrap">
            <CercaRapida />
          </div>
        </template>
      </div>
    </nav>

    <!-- ── Menú principal desplegable ───────────────────────────────── -->
    <Transition name="desplega">
      <div v-if="menuObert" class="menu-principal" role="menu">
        <button
          v-for="seccio in SECCIONS"
          :key="seccio.id"
          type="button"
          role="menuitem"
          class="menu-principal__item"
          :class="{ 'menu-principal__item--activa': seccioActiva?.id === seccio.id }"
          @click="navegaA(seccio.ruta)"
        >
          {{ $t(seccio.clau) }}
        </button>
      </div>
    </Transition>

    <!-- ── Contingut del tab actiu ───────────────────────────────────── -->
    <Transition name="desplega">
      <div v-if="tabActiva && esCerca" class="desplegable">
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
}

.barra__cerca-wrap {
  display: flex;
  align-items: center;
}

@media (max-width: 768px) {
  .barra__fila-1 {
    height: auto;
    min-height: 48px;
    flex-wrap: wrap;
    padding: 6px 12px;
  }

  .separador-v--cerca {
    display: none;
  }

  .barra__cerca-wrap {
    flex-basis: 100%;
    /* Alinea el cercador amb l'inici del tab "On?": botó menú (44px) + separador (21px) */
    padding: 0 4px 8px 65px;
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

/* ── Separador vertical ─────────────────────────────────────────────────── */

.separador-v {
  width: 1px;
  height: 24px;
  background: #e0e0dc;
  flex-shrink: 0;
  margin: 0 10px;
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
