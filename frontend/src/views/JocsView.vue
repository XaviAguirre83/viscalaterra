<script setup lang="ts">
import { useRouter } from 'vue-router'
import PanellFiltres from '@/components/filtres/PanellFiltres.vue'

// Menú de la secció Jocs: una targeta per joc. Només GeoFreak és jugable;
// la resta (EscutMaster, BanderaMaster, Capitals) es mostren com a "properament"
// perquè es vegi cap on creix la secció.
const router = useRouter()

const JOCS = [
  { id: 'geofreak', icona: '🗺️', ruta: '/jocs/geofreak', disponible: true },
  { id: 'escutmaster', icona: '🛡️', ruta: null, disponible: false },
  { id: 'banderamaster', icona: '🚩', ruta: null, disponible: false },
  { id: 'capitals', icona: '🏛️', ruta: null, disponible: false },
] as const

function obreJoc(joc: (typeof JOCS)[number]) {
  if (joc.disponible && joc.ruta) router.push(joc.ruta)
}
</script>

<template>
  <div class="jocs-layout">
    <PanellFiltres />
    <div class="jocs-cos">
      <header class="jocs-capcalera">
        <h1>{{ $t('jocs.titol') }}</h1>
        <p>{{ $t('jocs.subtitol') }}</p>
      </header>

      <div class="jocs-graella">
        <button
          v-for="joc in JOCS"
          :key="joc.id"
          type="button"
          class="joc-targeta"
          :class="{ 'joc-targeta--inactiva': !joc.disponible }"
          :disabled="!joc.disponible"
          @click="obreJoc(joc)"
        >
          <span class="joc-targeta__icona" aria-hidden="true">{{ joc.icona }}</span>
          <span class="joc-targeta__nom">{{ $t(`jocs.${joc.id}.nom`) }}</span>
          <span class="joc-targeta__desc">{{ $t(`jocs.${joc.id}.desc`) }}</span>
          <span v-if="joc.disponible" class="joc-targeta__cta">{{ $t('jocs.juga') }}</span>
          <span v-else class="joc-targeta__badge">{{ $t('jocs.properament') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.jocs-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.jocs-cos {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 32px 24px;
  background: #eef1f4;
}

.jocs-capcalera {
  max-width: 860px;
  margin: 0 auto 24px;
  text-align: center;
}

.jocs-capcalera h1 {
  font-size: 1.6rem;
  font-weight: 800;
  color: #1a2635;
}

.jocs-capcalera p {
  margin-top: 4px;
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
}

.jocs-graella {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  max-width: 860px;
  margin: 0 auto;
}

.joc-targeta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 18px;
  background: #fff;
  border: 1px solid #e2e6ea;
  border-radius: 14px;
  cursor: pointer;
  text-align: center;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}

.joc-targeta:not(:disabled):hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(26, 38, 53, 0.14);
}

.joc-targeta--inactiva {
  cursor: default;
  opacity: 0.6;
}

.joc-targeta__icona {
  font-size: 2.4rem;
}

.joc-targeta__nom {
  font-size: 1.05rem;
  font-weight: 800;
  color: #1a2635;
}

.joc-targeta__desc {
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
  line-height: 1.35;
}

.joc-targeta__cta {
  margin-top: 6px;
  padding: 6px 18px;
  border-radius: 18px;
  background: #2d6a2d;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
}

.joc-targeta__badge {
  margin-top: 6px;
  padding: 5px 14px;
  border-radius: 18px;
  background: #eef1f4;
  color: #777;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

@media (max-width: 768px) {
  .jocs-cos {
    padding: 20px 14px;
  }
}
</style>
