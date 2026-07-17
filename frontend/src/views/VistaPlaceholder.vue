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
  /* Mateix llenguatge que la capçalera: fons pedra amb un halo verd suau */
  background:
    radial-gradient(ellipse 80% 60% at 50% -10%, rgba(45, 106, 45, 0.08), transparent 70%),
    var(--color-fons, #eef1f4);
}

.placeholder-overlay {
  position: absolute;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(26, 38, 53, 0.18);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.placeholder-cos--net .placeholder-overlay {
  background: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.placeholder-caixa {
  max-width: 360px;
  padding: 32px 40px 30px;
  text-align: center;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: var(--radi-lg, 16px);
  box-shadow: var(--ombra-3, 0 8px 30px rgba(0, 0, 0, 0.25));
  animation: caixa-pop var(--mou-pop, 0.26s) backwards;
}

@keyframes caixa-pop {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
}

.placeholder-icona {
  display: inline-block;
  font-size: 2.5rem;
  animation: icona-flota 3.2s ease-in-out infinite;
}

@keyframes icona-flota {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.placeholder-titol {
  margin-top: 10px;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text-fort, #1a2635);
}

.placeholder-text {
  margin-top: 6px;
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
}

@media (prefers-reduced-motion: reduce) {
  .placeholder-caixa {
    animation: none;
  }

  .placeholder-icona {
    animation: none;
  }
}
</style>
