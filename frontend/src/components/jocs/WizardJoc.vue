<script setup lang="ts">
import { ref } from 'vue'
import { useFocusTrap } from '@/composables/useFocusTrap'
import './jocs.css'

// Wizard de configuració d'una partida: modal sobre el mapa amb l'indicador
// de passos, el cos del pas (slot; cada joc hi posa els seus) i la navegació
// Enrere / Següent / Som-hi!. Mentre les dades territorials es carreguen (o
// fallen) mostra l'estat en lloc dels passos: sense elles no es pot jugar.
const props = defineProps<{
  titol: string
  subtitol: string
  // Nom de cada pas, en ordre (l'indicador en mostra tants com n'hi hagi).
  passos: string[]
  // Es pot saltar a aquest pas des de l'indicador? (els passos ja assolibles)
  potAnarAPas: (pas: number) => boolean
  // El pas actual permet avançar amb «Següent».
  pasValid: boolean
  // La configuració és completa: «Som-hi!» actiu a l'últim pas.
  potComencar: boolean
  carregant: boolean
  error: boolean
}>()

const emit = defineEmits<{ somhi: []; reintenta: [] }>()

// Pas actual (1..passos.length), compartit amb la vista (v-model:pas).
const pas = defineModel<number>('pas', { required: true })

// Focus-trap mentre el wizard és muntat. Esc retrocedeix un pas (no hi ha
// "tancar": és la porta d'entrada al joc).
const modalRef = ref<HTMLElement | null>(null)
useFocusTrap(modalRef, ref(true), () => {
  if (pas.value > 1) pas.value--
})

function seguent() {
  if (pas.value < props.passos.length) pas.value++
}
</script>

<template>
  <div class="joc-modal-fons">
    <div
      ref="modalRef"
      class="joc-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="joc-wizard-titol"
    >
      <h2 id="joc-wizard-titol" class="joc-modal__titol">{{ titol }}</h2>
      <p class="joc-modal__sub">{{ subtitol }}</p>

      <!-- Sense dades territorials no es pot configurar la partida -->
      <div v-if="error" class="joc-estat" role="alert">
        <p>{{ $t('mapa.error') }}</p>
        <button type="button" class="joc-boto" @click="emit('reintenta')">
          {{ $t('comu.reintenta') }}
        </button>
      </div>
      <div v-else-if="carregant" class="joc-estat" role="status" aria-live="polite">
        <span class="joc-estat__spinner" aria-hidden="true"></span>
        <p>{{ $t('mapa.carregant') }}</p>
      </div>

      <template v-else>
        <ol class="joc-passos">
          <li v-for="(nom, i) in passos" :key="i">
            <button
              type="button"
              class="joc-passos__pas"
              :class="{
                'joc-passos__pas--actiu': i + 1 === pas,
                'joc-passos__pas--fet': i + 1 < pas,
              }"
              :disabled="!potAnarAPas(i + 1)"
              :aria-current="i + 1 === pas ? 'step' : undefined"
              @click="pas = i + 1"
            >
              <span class="joc-passos__num" aria-hidden="true">{{
                i + 1 < pas ? '✓' : i + 1
              }}</span>
              <span class="joc-passos__nom">{{ nom }}</span>
            </button>
          </li>
        </ol>

        <!-- El cos del pas es desplaça si no hi cap; la navegació de sota
             queda sempre a la vista. Re-muntat per pas (micro-entrada). -->
        <div :key="pas" class="joc-modal__cos">
          <slot />
        </div>

        <div class="joc-wizard-nav">
          <button v-if="pas > 1" type="button" class="joc-wizard-nav__enrere" @click="pas--">
            {{ $t('partida.wizard.enrere') }}
          </button>
          <button
            v-if="pas < passos.length"
            type="button"
            class="joc-boto joc-wizard-nav__seguent"
            :disabled="!pasValid"
            @click="seguent"
          >
            {{ $t('partida.wizard.seguent') }}
          </button>
          <button
            v-else
            type="button"
            class="joc-boto joc-wizard-nav__seguent"
            :disabled="!potComencar"
            @click="emit('somhi')"
          >
            {{ $t('partida.somhi') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Estat de càrrega / error de les dades */
.joc-estat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
  text-align: center;
  color: var(--color-text-secundari);
}

.joc-estat__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--color-vora);
  border-top-color: var(--color-marca);
  border-radius: 50%;
  animation: gira 0.7s linear infinite;
}

@keyframes gira {
  to {
    transform: rotate(360deg);
  }
}

/* El marge negatiu compensa el farciment que evita retallar els contorns de
   focus dins la zona de desplaçament. */
.joc-modal > .joc-modal__cos {
  flex: 0 1 auto;
  min-height: 0;
  margin: 0 -4px;
  padding: 4px;
  overflow-y: auto;
  animation: pas-entra 0.2s ease-out;
}

@keyframes pas-entra {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
}

/* ── Indicador de passos ────────────────────────────────────────────────── */

.joc-passos {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 6px;
  margin: 0 0 18px;
  padding: 0;
  list-style: none;
}

/* Cada pas: una barra de progrés a sobre i, a sota, el número i el nom */
.joc-passos__pas {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  padding: 8px 2px 2px;
  background: none;
  border: none;
  border-top: 3px solid var(--color-vora);
  font: inherit;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--pedra-500);
  cursor: pointer;
  transition:
    border-color var(--mou-mig),
    color var(--mou-mig);
}

.joc-passos__pas:disabled {
  cursor: default;
}

.joc-passos__pas--fet {
  border-top-color: var(--verd-200);
  color: var(--color-marca);
}

.joc-passos__pas--actiu {
  border-top-color: var(--color-marca);
  color: var(--color-text-fort);
}

.joc-passos__num {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--pedra-150);
  font-size: 0.7rem;
  line-height: 1;
  transition:
    background var(--mou-mig),
    color var(--mou-mig);
}

.joc-passos__pas--fet .joc-passos__num {
  background: var(--color-marca-mig);
}

.joc-passos__pas--actiu .joc-passos__num {
  background: var(--color-marca);
  color: #fff;
}

.joc-passos__nom {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Navegació ──────────────────────────────────────────────────────────── */

.joc-wizard-nav {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.joc-wizard-nav__enrere {
  padding: 0 20px;
  background: none;
  border: 1.5px solid var(--color-vora-forta);
  border-radius: var(--radi-md);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--pedra-700);
  cursor: pointer;
  transition: background var(--mou-rapid);
}

.joc-wizard-nav__enrere:hover {
  background: var(--pedra-100);
}

.joc-wizard-nav__seguent {
  width: auto;
  flex: 1;
}

@media (prefers-reduced-motion: reduce) {
  .joc-estat__spinner {
    animation-duration: 1.8s;
  }

  .joc-modal > .joc-modal__cos {
    animation: none;
  }
}
</style>
