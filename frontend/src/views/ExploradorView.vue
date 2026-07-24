<script setup lang="ts">
import { onMounted } from 'vue'
import MapaLeaflet from '@/components/mapa/MapaLeaflet.vue'
import PanellFiltres from '@/components/filtres/PanellFiltres.vue'
import FitxaTerritori from '@/components/FitxaTerritori.vue'
import OpcionsMapa from '@/components/OpcionsMapa.vue'
import ResultatsLlocs from '@/components/ResultatsLlocs.vue'
import { useTerritorisStore } from '@/stores/territoris'
import { useFitxaStore } from '@/stores/fitxa'
import { useLlocsStore } from '@/stores/llocs'

const territoris = useTerritorisStore()
const fitxa = useFitxaStore()
const llocs = useLlocsStore()
onMounted(() => territoris.carregaArbre())
</script>

<template>
  <div class="cerca-layout">
    <PanellFiltres />
    <div class="cerca-cos">
      <div class="cerca-cos__columna">
        <div class="cerca-cos__mapa">
          <MapaLeaflet @obre-fitxa="fitxa.obre($event)" />
        </div>
        <ResultatsLlocs v-if="llocs.cercaFeta || llocs.carregant" />
      </div>
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

/* Contenidor relatiu perquè la fitxa (absolute) se superposi al mapa. Centra la
   columna del mapa i deixa marges laterals (per a contingut futur: anuncis…). */
.cerca-cos {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
  /* Marges laterals en verd-gris apagat, en harmonia amb la paleta pedra */
  background: linear-gradient(180deg, #c6cfc8 0%, #bac4bd 100%);
}

/* Columna central (mapa + llista de resultats sota): amplada màxima en pantalles
   amples (marges visibles als costats); en mòbil ocupa tot l'ample. */
.cerca-cos__columna {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1280px;
  height: 100%;
  min-height: 0;
  /* Marc subtil perquè la columna es distingeixi dels marges laterals
     (que de moment queden buits, reservats per a contingut futur). */
  box-shadow:
    0 0 0 1px rgba(26, 38, 53, 0.12),
    0 0 32px rgba(26, 38, 53, 0.25);
}

/* El mapa ocupa l'espai lliure de la columna; la llista (si hi és) va a sota. */
.cerca-cos__mapa {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}
</style>
