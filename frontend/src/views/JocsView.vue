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
          <span v-if="joc.disponible" class="joc-targeta__cta"
            >{{ $t('jocs.juga') }}
            <span class="joc-targeta__fletxa" aria-hidden="true">→</span></span
          >
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
  padding: 40px 24px 56px;
  /* Halo verd molt suau que cau des de dalt, sobre el fons pedra global */
  background:
    radial-gradient(ellipse 90% 65% at 50% -12%, rgba(45, 106, 45, 0.1), transparent 70%),
    var(--color-fons, #eef1f4);
}

.jocs-capcalera {
  max-width: 860px;
  margin: 0 auto 28px;
  text-align: center;
}

.jocs-capcalera h1 {
  font-family: var(--font-display);
  font-size: var(--text-titol, 1.8rem);
  font-weight: 700;
  letter-spacing: 0.01em;
  color: var(--color-text-fort, #1a2635);
}

.jocs-capcalera p {
  margin-top: 6px;
  font-size: var(--text-base);
  color: var(--color-text-secundari, #737373);
}

.jocs-graella {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
  max-width: 860px;
  margin: 0 auto;
}

.joc-targeta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 20px 26px;
  background: var(--color-superficie, #fff);
  border: 1px solid var(--color-vora, #e2e6ea);
  border-radius: var(--radi-lg, 16px);
  box-shadow: var(--ombra-1);
  cursor: pointer;
  text-align: center;
  transition:
    transform var(--mou-mig, 0.2s),
    box-shadow var(--mou-mig, 0.2s),
    border-color var(--mou-mig, 0.2s);
  animation: targeta-entra 0.45s cubic-bezier(0.2, 0, 0, 1) backwards;
}

/* Entrada escalonada de les targetes */
.joc-targeta:nth-child(2) {
  animation-delay: 0.07s;
}
.joc-targeta:nth-child(3) {
  animation-delay: 0.14s;
}
.joc-targeta:nth-child(4) {
  animation-delay: 0.21s;
}

@keyframes targeta-entra {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
}

.joc-targeta:not(:disabled):hover {
  transform: translateY(-4px);
  border-color: var(--verd-200, #bdd5bd);
  box-shadow: var(--ombra-3, 0 10px 24px rgba(26, 38, 53, 0.14));
}

.joc-targeta--inactiva {
  cursor: default;
  opacity: 0.72;
}

.joc-targeta__icona {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  font-size: 2.3rem;
  border-radius: 24px;
  background: linear-gradient(145deg, var(--verd-50, #f0f4f0), var(--verd-100, #dfe9df));
  box-shadow: inset 0 0 0 1px rgba(45, 106, 45, 0.1);
  transition: transform var(--mou-pop, 0.25s);
}

.joc-targeta:not(:disabled):hover .joc-targeta__icona {
  transform: scale(1.1) rotate(-4deg);
}

.joc-targeta--inactiva .joc-targeta__icona {
  background: var(--pedra-150, #edefe9);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
  filter: grayscale(0.6);
}

.joc-targeta__nom {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-fort, #1a2635);
}

.joc-targeta__desc {
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
  line-height: 1.4;
}

.joc-targeta__cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 22px;
  border-radius: var(--radi-pastilla, 18px);
  background: var(--color-marca, #2d6a2d);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  box-shadow: 0 2px 10px rgba(45, 106, 45, 0.35);
  transition: background var(--mou-rapid, 0.15s);
}

.joc-targeta__fletxa {
  transition: transform var(--mou-mig, 0.2s);
}

.joc-targeta:not(:disabled):hover .joc-targeta__cta {
  background: var(--color-marca-fosc, #1e4e1e);
}

.joc-targeta:not(:disabled):hover .joc-targeta__fletxa {
  transform: translateX(3px);
}

.joc-targeta__badge {
  margin-top: 8px;
  padding: 6px 16px;
  border-radius: var(--radi-pastilla, 18px);
  border: 1.5px dashed var(--color-vora-forta, #d2d5cc);
  background: transparent;
  color: var(--color-text-secundari, #777);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

@media (max-width: 768px) {
  .jocs-cos {
    padding: 24px 14px 40px;
  }

  .jocs-graella {
    gap: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .joc-targeta {
    animation: none;
  }

  .joc-targeta:not(:disabled):hover {
    transform: none;
  }

  .joc-targeta:not(:disabled):hover .joc-targeta__icona,
  .joc-targeta:not(:disabled):hover .joc-targeta__fletxa {
    transform: none;
  }
}
</style>
