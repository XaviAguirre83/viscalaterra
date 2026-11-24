<script setup lang="ts">
import { computed } from 'vue'
import { MAX_INTENTS_RONDA } from '@/data/partida'
import type { EstatJugador } from '@/composables/useMotorJoc'
import './jocs.css'

// HUD de la partida sobre el mapa: barra de progrés a dalt, cronòmetre i
// progrés (p. ex. 12/43) a baix, i a dalt els marcadors (✓/✗, ratxa, intents
// de la ronda) amb els botons Pista, Passa i Surt. En multijugador, el
// marcador de conquestes de cada jugador amb el del torn ressaltat. Sota els
// marcadors, el slot (la caixa de resposta escrita, si el joc en té).
const props = defineProps<{
  encertats: number
  total: number
  crono: string
  // Estat dels jugadors en multijugador; null amb un sol jugador.
  jugadors: EstatJugador[] | null
  tornActual: number
  ratxa: number
  // Errors i pistes del jugador del torn (o de la partida, amb un de sol).
  errors: number
  // null = el joc no mostra el comptador de pistes.
  pistes: number | null
  // null = no es mostren (multijugador: una sola oportunitat per torn).
  intentsRestants: number | null
  pistaDisponible: boolean
  passaDisponible: boolean
}>()

const emit = defineEmits<{ pista: []; passa: []; surt: [] }>()

const colorTorn = computed(() => props.jugadors?.[props.tornActual]?.color ?? '')
</script>

<template>
  <div class="joc-progres" aria-hidden="true">
    <div
      class="joc-progres__fet"
      :style="{ width: `${(encertats / Math.max(1, total)) * 100}%` }"
    ></div>
  </div>
  <div class="joc-xip joc-xip--baix">
    <span v-if="jugadors" class="joc-colorjug" :style="{ background: colorTorn }"></span>
    <span aria-hidden="true">⏱</span>
    <span>{{ crono }}</span>
    <span class="joc-xip__separador" aria-hidden="true"></span>
    <span>{{ encertats }}/{{ total }}</span>
  </div>
  <!-- Marcadors i, a sota, la caixa de resposta: en un sol contenidor en
       columna, així mai se solapen. -->
  <div class="joc-hud-dalt">
    <div class="joc-xip joc-xip--marcadors">
      <!-- Marcador de conquestes per jugador (multijugador) -->
      <template v-if="jugadors">
        <span
          v-for="(j, i) in jugadors"
          :key="i"
          class="joc-xip__jugador"
          :class="{ 'joc-xip__jugador--actiu': i === tornActual }"
        >
          <span class="joc-colorjug" :style="{ background: j.color }"></span>
          <span class="joc-xip__nomjug">{{ j.nom }}</span>
          {{ j.conquestes.length }}
        </span>
      </template>
      <template v-else>
        <span v-if="ratxa >= 2" :key="ratxa" class="joc-xip__ratxa" :title="$t('partida.ratxaAria')"
          >🔥 {{ ratxa }}</span
        >
        <span class="joc-xip__encerts">✓ {{ encertats }}</span>
      </template>
      <span :key="errors" class="joc-xip__errors">✗ {{ errors }}</span>
      <span
        v-if="pistes !== null"
        class="joc-xip__pistes"
        :title="$t('partida.pistesAria')"
        :aria-label="`${$t('partida.pistesAria')}: ${pistes}`"
        >💡 {{ pistes }}</span
      >
      <span
        v-if="intentsRestants !== null"
        class="joc-xip__intents"
        :title="$t('partida.intentsRonda')"
        :aria-label="$t('partida.intentsRonda')"
      >
        <span
          v-for="i in MAX_INTENTS_RONDA"
          :key="i"
          class="joc-xip__intent"
          :class="{ 'joc-xip__intent--gastat': i > intentsRestants }"
        ></span>
      </span>
      <span class="joc-xip__separador" aria-hidden="true"></span>
      <span class="joc-xip__accions"
        ><button
          type="button"
          class="joc-xip__pista"
          :disabled="!pistaDisponible"
          @click="emit('pista')"
        >
          💡 {{ $t('partida.pista') }}
        </button>
        <button
          type="button"
          class="joc-xip__boto"
          :disabled="!passaDisponible"
          @click="emit('passa')"
        >
          ↷ {{ $t('partida.passa') }}
        </button>
        <button type="button" class="joc-xip__boto" @click="emit('surt')">
          {{ $t('partida.surt') }}
        </button></span
      >
    </div>
    <slot />
  </div>
</template>

<style scoped>
/* ── Barra de progrés de la partida ─────────────────────────────────────── */

.joc-progres {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  z-index: 1400;
  background: rgba(26, 38, 53, 0.12);
}

.joc-progres__fet {
  height: 100%;
  background: linear-gradient(90deg, var(--verd-600), var(--verd-500));
  border-radius: 0 var(--radi-pastilla) var(--radi-pastilla) 0;
  transition: width 0.35s cubic-bezier(0.2, 0, 0, 1);
}

/* ── Marcadors ──────────────────────────────────────────────────────────── */

/* Part de dalt del HUD: els marcadors i, a sota, la caixa de resposta. El
   contenidor no captura el ratolí (el mapa de sota ha de rebre els clics). */
.joc-hud-dalt {
  position: absolute;
  top: 14px;
  left: 0;
  right: 0;
  z-index: 1500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  pointer-events: none;
}

.joc-hud-dalt > *,
.joc-hud-dalt > :slotted(*) {
  pointer-events: auto;
}

/* Pastilles flotants del HUD */
.joc-xip {
  position: absolute;
  z-index: 1500;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px 7px 14px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid var(--color-vora);
  border-radius: var(--radi-pastilla);
  box-shadow: var(--ombra-2);
  font-size: var(--text-base);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-fort);
  white-space: nowrap;
}

/* Marcadors (✓/✗, pista, passa, surt), dins .joc-hud-dalt */
.joc-xip--marcadors {
  position: static;
  max-width: 100%;
}

/* Cronòmetre + progrés: centrats a baix del mapa */
.joc-xip--baix {
  bottom: 34px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  font-size: var(--text-md);
}

.joc-xip__separador {
  width: 1px;
  height: 18px;
  background: var(--color-vora-forta);
}

.joc-xip__encerts {
  color: var(--color-marca);
}

.joc-xip__ratxa {
  color: var(--joc-ratxa);
  animation: joc-pop 0.25s ease-out;
}

/* Marcador per jugador (mode conquesta) */
.joc-xip__jugador {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: var(--radi-pastilla);
  color: var(--color-text-secundari);
  transition:
    background var(--mou-mig),
    color var(--mou-mig);
}

.joc-xip__jugador--actiu {
  background: var(--color-marca-mig);
  color: var(--color-text-fort);
}

.joc-xip__errors {
  color: var(--joc-error);
  animation: joc-sacseig 0.3s;
}

.joc-xip__pistes {
  color: var(--joc-pista-text);
}

/* Intents restants de la ronda (3 puntets que es van apagant) */
.joc-xip__intents {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.joc-xip__intent {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-marca);
  transition:
    background var(--mou-mig),
    transform var(--mou-mig);
}

.joc-xip__intent--gastat {
  background: var(--pedra-300);
  transform: scale(0.75);
}

/* Botons del HUD: pista (daurat), passa i surt. Van agrupats perquè, si el
   HUD es parteix en dues files, baixin tots tres junts. */
.joc-xip__accions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.joc-xip__boto,
.joc-xip__pista {
  min-height: 30px;
  padding: 4px 13px;
  background: var(--pedra-100);
  border: 1px solid var(--color-vora);
  border-radius: var(--radi-pastilla);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--pedra-700);
  cursor: pointer;
  transition:
    background var(--mou-rapid),
    border-color var(--mou-rapid);
}

.joc-xip__boto:hover:not(:disabled) {
  background: var(--pedra-200);
  border-color: var(--color-vora-forta);
}

.joc-xip__pista {
  background: var(--joc-pista-fons);
  border-color: var(--joc-pista-vora);
  color: var(--joc-pista-text);
}

.joc-xip__pista:hover:not(:disabled) {
  background: var(--joc-pista-viu);
}

.joc-xip__boto:disabled,
.joc-xip__pista:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Mòbil ──────────────────────────────────────────────────────────────── */

@media (max-width: 768px) {
  .joc-hud-dalt {
    top: 10px;
    padding: 0 8px;
  }

  /* Els marcadors poden ocupar dues files (els botons baixen a la segona);
     en multijugador només el jugador del torn mostra el nom. Targets
     tàctils a 44px. */
  .joc-xip--marcadors {
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 8px;
    padding: 6px 10px;
    border-radius: var(--radi-lg);
  }

  .joc-xip__jugador:not(.joc-xip__jugador--actiu) .joc-xip__nomjug {
    display: none;
  }

  .joc-xip--marcadors .joc-xip__separador {
    display: none;
  }

  .joc-xip__pista,
  .joc-xip__boto {
    flex-shrink: 0;
    min-height: 44px;
    padding: 6px 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .joc-xip__ratxa,
  .joc-xip__errors {
    animation: none;
  }

  .joc-progres__fet {
    transition: none;
  }
}
</style>
