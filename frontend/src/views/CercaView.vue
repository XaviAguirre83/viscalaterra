<script setup lang="ts">
import { onMounted } from 'vue'
import MapaLeaflet from '@/components/mapa/MapaLeaflet.vue'
import PanellFiltres from '@/components/filtres/PanellFiltres.vue'
import { useTerritorisStore } from '@/stores/territoris'

const territoris = useTerritorisStore()
onMounted(() => territoris.carregaArbre())
</script>

<template>
  <div class="cerca-layout">
    <PanellFiltres />
    <MapaLeaflet />
  </div>
</template>

<style scoped>
.cerca-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
</style>
