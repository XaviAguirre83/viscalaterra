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
  background: #eef1f4;
}

.legal {
  max-width: 760px;
  margin: 0 auto;
  padding: 28px 20px 48px;
}

.legal__titol {
  font-size: 1.6rem;
  font-weight: 800;
  color: #1a2635;
}

.legal__intro {
  margin-top: 8px;
  color: #444;
  line-height: 1.5;
}

.legal__avis {
  margin-top: 16px;
  padding: 10px 14px;
  background: #fff7e6;
  border: 1px solid #f0d28a;
  border-radius: 8px;
  font-size: var(--text-sm);
  color: #8a6d1a;
}

.legal__seccio {
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid #dfe4ea;
}

.legal__seccio-titol {
  font-size: 1.15rem;
  font-weight: 700;
  color: #1a2635;
}

.legal__seccio-text {
  margin-top: 6px;
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
}
</style>
