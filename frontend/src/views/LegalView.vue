<script setup lang="ts">
import PanellFiltres from '@/components/filtres/PanellFiltres.vue'

// Apartats legals. De moment són l'esquelet; els textos (avís legal, política de
// privacitat, cookies, condicions d'ús) es redactaran i validaran després.
const SECCIONS = ['avisLegal', 'privacitat', 'cookies', 'condicions'] as const
</script>

<template>
  <div class="legal-layout">
    <PanellFiltres />
    <div class="legal-cos">
      <article class="legal">
        <h1 class="legal__titol">{{ $t('legal.titol') }}</h1>
        <p class="legal__intro">{{ $t('legal.intro') }}</p>
        <p class="legal__avis" role="note">🚧 {{ $t('legal.enPreparacio') }}</p>

        <section v-for="s in SECCIONS" :key="s" class="legal__seccio">
          <h2 class="legal__seccio-titol">{{ $t(`legal.${s}`) }}</h2>
          <p class="legal__seccio-text">{{ $t('legal.properament') }}</p>
        </section>
      </article>
    </div>
  </div>
</template>

<style scoped>
.legal-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.legal-cos {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--color-fons, #eef1f4);
}

/* Full "document": targeta blanca centrada sobre el fons pedra */
.legal {
  max-width: 760px;
  margin: 32px auto 48px;
  padding: 36px 40px 44px;
  background: var(--color-superficie, #fff);
  border: 1px solid var(--color-vora, #e3e5de);
  border-radius: var(--radi-lg, 16px);
  box-shadow: var(--ombra-1);
}

.legal__titol {
  font-family: var(--font-display);
  font-size: var(--text-titol, 1.7rem);
  font-weight: 700;
  color: var(--color-text-fort, #1a2635);
}

.legal__intro {
  margin-top: 10px;
  color: #444;
  line-height: 1.55;
}

.legal__avis {
  margin-top: 18px;
  padding: 11px 15px;
  background: #fff7e6;
  border: 1px solid #f0d28a;
  border-radius: var(--radi-sm, 8px);
  font-size: var(--text-sm);
  color: #8a6d1a;
}

.legal__seccio {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid var(--color-vora, #dfe4ea);
}

.legal__seccio-titol {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--color-text-fort, #1a2635);
}

.legal__seccio-text {
  margin-top: 6px;
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
}

@media (max-width: 768px) {
  .legal {
    margin: 14px 12px 32px;
    padding: 24px 20px 30px;
  }
}
</style>
