<script setup lang="ts">
import { onMounted } from 'vue'
import MapaLeaflet from '@/components/mapa/MapaLeaflet.vue'
import PanellFiltres from '@/components/filtres/PanellFiltres.vue'
import { useTerritorisStore } from '@/stores/territoris'

// Vista reutilitzable per a seccions encara no desenvolupades.
// `ambMapa`: mostra el mapa de fons (seccions que el necessiten) o un fons net.
const props = defineProps<{ ambMapa?: boolean }>()

const territoris = useTerritorisStore()
onMounted(() => {
  if (props.ambMapa) territoris.carregaArbre()
})
</script>

<template>
  <div class="placeholder-layout">
    <PanellFiltres />
    <div class="placeholder-cos" :class="{ 'placeholder-cos--net': !ambMapa }">
      <MapaLeaflet v-if="ambMapa" />
      <div class="placeholder-overlay" role="status" aria-live="polite">
        <div class="placeholder-caixa">
          <span class="placeholder-icona" aria-hidden="true">🚧</span>
          <p class="placeholder-titol">{{ $t('comu.enConstruccio') }}</p>
          <p class="placeholder-text">{{ $t('comu.properament') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.placeholder-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.placeholder-cos {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}

.placeholder-cos--net {
  background: #eef1f4;
}

.placeholder-overlay {
  position: absolute;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(26, 38, 53, 0.22);
}

.placeholder-caixa {
  max-width: 340px;
  padding: 28px 36px;
  text-align: center;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
}

.placeholder-icona {
  font-size: 2.5rem;
}

.placeholder-titol {
  margin-top: 8px;
  font-size: var(--text-lg);
  font-weight: 700;
  color: #1a2635;
}

.placeholder-text {
  margin-top: 6px;
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
}
</style>
