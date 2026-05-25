<script setup lang="ts">
import { ref } from 'vue'
import TabOn from './TabOn.vue'
import TabQue from './TabQue.vue'
import TabQuan from './TabQuan.vue'

type Tab = 'on' | 'que' | 'quan'
const tabActiva = ref<Tab | null>(null)

function toggleTab(tab: Tab) {
  tabActiva.value = tabActiva.value === tab ? null : tab
}
</script>

<template>
  <div class="panell-filtres">
    <nav class="barra-tabs">
      <span class="logo">viscalaterra</span>
      <div class="tabs">
        <button :class="{ activa: tabActiva === 'on' }" @click="toggleTab('on')">On?</button>
        <button :class="{ activa: tabActiva === 'que' }" @click="toggleTab('que')">Què?</button>
        <button :class="{ activa: tabActiva === 'quan' }" @click="toggleTab('quan')">Quan?</button>
      </div>
    </nav>

    <div v-if="tabActiva" class="desplegable">
      <TabOn v-if="tabActiva === 'on'" />
      <TabQue v-else-if="tabActiva === 'que'" />
      <TabQuan v-else-if="tabActiva === 'quan'" />
    </div>
  </div>
</template>

<style scoped>
.panell-filtres {
  position: relative;
  z-index: 2000;
  flex-shrink: 0;
}

.barra-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  height: 52px;
  background: #ffffff;
  border-bottom: 1px solid #e8e8e4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.logo {
  font-size: 1.1rem;
  font-weight: 700;
  color: #2d6a2d;
  letter-spacing: -0.5px;
  margin-right: 16px;
}

.tabs {
  display: flex;
  gap: 4px;
}

.tabs button {
  padding: 8px 20px;
  border: none;
  border-radius: 20px;
  background: none;
  font-size: 0.95rem;
  font-weight: 600;
  color: #555;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.tabs button:hover {
  background: #f0f4f0;
  color: #2d6a2d;
}

.tabs button.activa {
  background: #2d6a2d;
  color: #ffffff;
}

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
}
</style>
