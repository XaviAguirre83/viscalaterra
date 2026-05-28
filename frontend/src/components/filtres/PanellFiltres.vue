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
  { id: 'cerca', nom: 'Cerca', ruta: '/cerca' },
  { id: 'agenda', nom: 'Agenda Cultural', ruta: '/agenda' },
  { id: 'jocs', nom: 'Jocs', ruta: '/jocs' },
  { id: 'merchandising', nom: 'Merchandising', ruta: '/merchandising' },
  { id: 'sobre', nom: 'Sobre nosaltres', ruta: '/sobre' },
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
      <button
        class="btn-menu"
        :class="{ 'btn-menu--obert': menuObert }"
        aria-label="Menú principal"
        @click="menuObert = !menuObert"
      >
        <span /><span /><span />
      </button>

      <span v-if="seccioActiva" class="seccio-nom">{{ seccioActiva.nom }}</span>

      <template v-if="esCerca">
        <div class="separador-v" />
        <div class="tabs">
          <button :class="{ activa: tabActiva === 'on' }" @click="toggleTab('on')">On?</button>
          <button :class="{ activa: tabActiva === 'que' }" @click="toggleTab('que')">Què?</button>
          <button :class="{ activa: tabActiva === 'quan' }" @click="toggleTab('quan')">
            Quan?
          </button>
        </div>
        <div class="separador-v" />
        <CercaRapida />
      </template>
    </nav>

    <!-- ── Menú principal desplegable ───────────────────────────────── -->
    <div v-if="menuObert" class="menu-principal">
      <button
        v-for="seccio in SECCIONS"
        :key="seccio.id"
        class="menu-principal__item"
        :class="{ 'menu-principal__item--activa': seccioActiva?.id === seccio.id }"
        @click="navegaA(seccio.ruta)"
      >
        {{ seccio.nom }}
      </button>
    </div>

    <!-- ── Contingut del tab actiu ───────────────────────────────────── -->
    <div v-if="tabActiva && esCerca" class="desplegable">
      <TabOn v-if="tabActiva === 'on'" />
      <TabQue v-else-if="tabActiva === 'que'" />
      <TabQuan v-else-if="tabActiva === 'quan'" />
    </div>

    <!-- Capa transparent per tancar el menú en clicar fora -->
    <div v-if="menuObert" class="overlay-menu" @click="menuObert = false" />
  </div>
</template>

<style scoped>
.panell-filtres {
  position: relative;
  z-index: 2000;
  flex-shrink: 0;
}

.barra {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 48px;
  background: #ffffff;
  border-bottom: 1px solid #e8e8e4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* ── Botó hamburger ─────────────────────────────────────────────────────── */

.btn-menu {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  padding: 6px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
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

/* ── Nom secció ─────────────────────────────────────────────────────────── */

.seccio-nom {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #222;
  margin: 0 14px;
  white-space: nowrap;
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

/* ── Overlay per tancar el menú ─────────────────────────────────────────── */

.overlay-menu {
  position: fixed;
  inset: 0;
  z-index: 99;
}
</style>
