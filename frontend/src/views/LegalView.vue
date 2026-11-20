<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PanellFiltres from '@/components/filtres/PanellFiltres.vue'
import TextLegal from '@/components/legal/TextLegal.vue'
import {
  analitzaTextLegal,
  TEXTOS_LEGALS,
  type DadesTitular,
  type NomTextLegal,
} from '@/data/legal'

// /legal és l'índex; /legal/<nom> mostra el text de frontend/src/legal/<idioma>/<nom>.md
// (format i regles al README d'aquella carpeta). Els textos van dins el fragment de
// la vista: són pocs i curts, i així no cal esperar cap càrrega.
const FONTS = import.meta.glob<string>('../legal/*/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

// Les dades del titular vénen del .env, mai del repositori (que és públic).
const TITULAR: DadesTitular = {
  nom: (import.meta.env.VITE_TITULAR_NOM ?? '').trim(),
  email: (import.meta.env.VITE_TITULAR_EMAIL ?? '').trim(),
}

const CLAU: Record<NomTextLegal, string> = {
  'avis-legal': 'avisLegal',
  privacitat: 'privacitat',
  cookies: 'cookies',
  condicions: 'condicions',
}

const route = useRoute()
const { locale } = useI18n()

const nom = computed(() => (route.params.text || null) as NomTextLegal | null)

// Mentre un text no estigui traduït, es mostra el català (que és el que mana).
const font = computed(() => {
  if (!nom.value) return null
  const propi = FONTS[`../legal/${locale.value}/${nom.value}.md`]
  const text = propi ?? FONTS[`../legal/ca/${nom.value}.md`]
  return text ? { text, nomesCatala: !propi } : null
})

const text = computed(() => font.value && analitzaTextLegal(font.value.text, TITULAR))

// El que fa scroll és el cos, no la finestra: en canviar de text, torna a dalt.
const cos = ref<HTMLElement>()
watch(nom, () => cos.value?.scrollTo({ top: 0 }))
</script>

<template>
  <div class="legal-layout">
    <PanellFiltres />
    <div ref="cos" class="legal-cos">
      <template v-if="font && text">
        <nav class="legal-nav" :aria-label="$t('legal.navAria')">
          <RouterLink
            v-for="t in TEXTOS_LEGALS"
            :key="t"
            :to="`/legal/${t}`"
            class="legal-nav__enllac"
          >
            {{ $t(`legal.${CLAU[t]}`) }}
          </RouterLink>
        </nav>
        <article class="legal">
          <p v-if="font.nomesCatala" class="legal__avis" role="note">
            {{ $t('legal.nomesCatala') }}
          </p>
          <p v-if="text.tePendents" class="legal__avis" role="note">
            🚧 {{ $t('legal.esborrany') }}
          </p>
          <TextLegal :blocs="text.blocs" />
        </article>
      </template>

      <article v-else class="legal">
        <h1 class="legal__titol">{{ $t('legal.titol') }}</h1>
        <p class="legal__intro">{{ $t('legal.intro') }}</p>
        <p class="legal__avis" role="note">🚧 {{ $t('legal.enPreparacio') }}</p>

        <ul class="legal__index">
          <li v-for="t in TEXTOS_LEGALS" :key="t">
            <RouterLink :to="`/legal/${t}`" class="legal__targeta">
              <span class="legal__targeta-titol">{{ $t(`legal.${CLAU[t]}`) }}</span>
              <span class="legal__targeta-text">{{ $t(`legal.descripcions.${CLAU[t]}`) }}</span>
            </RouterLink>
          </li>
        </ul>
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

/* Pastilles per saltar d'un text a l'altre */
.legal-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 760px;
  margin: 24px auto 0;
}

.legal-nav__enllac {
  padding: 6px 14px;
  background: var(--color-superficie, #fff);
  border: 1px solid var(--color-vora, #e3e5de);
  border-radius: var(--radi-pastilla, 999px);
  font-size: var(--text-sm);
  color: var(--color-text-fort, #1a2635);
  text-decoration: none;
  transition:
    background var(--mou-rapid, 0.13s),
    border-color var(--mou-rapid, 0.13s);
}

.legal-nav__enllac:hover {
  border-color: var(--verd-200);
  background: var(--verd-50);
}

.legal-nav__enllac.router-link-exact-active {
  background: var(--verd-700);
  border-color: var(--verd-700);
  color: #fff;
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

.legal-nav + .legal {
  margin-top: 14px;
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
  margin-bottom: 18px;
  padding: 11px 15px;
  background: #fff7e6;
  border: 1px solid #f0d28a;
  border-radius: var(--radi-sm, 8px);
  font-size: var(--text-sm);
  color: #8a6d1a;
}

.legal__intro + .legal__avis {
  margin-top: 18px;
}

.legal__index {
  display: grid;
  gap: 12px;
  margin-top: 26px;
  list-style: none;
}

.legal__targeta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 18px;
  border: 1px solid var(--color-vora, #e3e5de);
  border-radius: var(--radi-md, 12px);
  color: inherit;
  text-decoration: none;
  transition:
    border-color var(--mou-rapid, 0.13s),
    background var(--mou-rapid, 0.13s);
}

.legal__targeta:hover {
  border-color: var(--verd-200);
  background: var(--verd-50);
}

.legal__targeta-titol {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text-fort, #1a2635);
}

.legal__targeta-text {
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
}

@media (prefers-reduced-motion: reduce) {
  .legal-nav__enllac,
  .legal__targeta {
    transition: none;
  }
}

@media (max-width: 768px) {
  .legal-nav {
    margin: 14px 12px 0;
  }

  .legal {
    margin: 14px 12px 32px;
    padding: 24px 20px 30px;
  }
}
</style>
