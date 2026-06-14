<script setup lang="ts">
import { onMounted } from 'vue'
import MapaLeaflet from '@/components/mapa/MapaLeaflet.vue'
import PanellFiltres from '@/components/filtres/PanellFiltres.vue'
import FitxaTerritori from '@/components/FitxaTerritori.vue'
import OpcionsMapa from '@/components/OpcionsMapa.vue'
import { useTerritorisStore } from '@/stores/territoris'
import { useFitxaStore } from '@/stores/fitxa'

const territoris = useTerritorisStore()
const fitxa = useFitxaStore()
onMounted(() => territoris.carregaArbre())
</script>

<template>
  <div class="cerca-layout">
    <PanellFiltres />
    <div class="cerca-cos">
      <MapaLeaflet @obre-fitxa="fitxa.obre($event)" />
      <OpcionsMapa />
      <FitxaTerritori />
    </div>
  </div>
</template>

<style scoped>
.cerca-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Contenidor relatiu perquè la fitxa (absolute) se superposi al mapa */
.cerca-cos {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}
</style>
