<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { formataTemps } from '@/data/partida'
import type { ResultatJugador } from '@/composables/useMotorJoc'
import './jocs.css'

// Modal de final de partida, amb confeti. Un sol jugador: punts (amb
// recompte animat), temps, encerts, errors i pistes. Multijugador:
// classificació per conquestes (desempat per punts) amb el guanyador
// destacat. Esc torna al wizard.
const props = defineProps<{
  // Resum de la configuració jugada (subtítol).
  resum: string
  resultats: ResultatJugador[]
  // Dades de la partida d'un sol jugador.
  temps: string
  encerts: number
  errors: number
  // Rajola de pistes (null = no surt; cada joc decideix què hi compta).
  pistes: number | null
  // Multijugador: afegeix la columna de pistes demanades a la classificació.
  columnaPistes?: boolean
}>()

const emit = defineEmits<{ rejuga: []; configura: [] }>()

const solitari = computed(() => props.resultats.length <= 1)

// Classificació: primer per conquestes, després per punts.
const classificacio = computed(() =>
  [...props.resultats].sort((a, b) => b.conquestes - a.conquestes || b.punts - a.punts)
)

// Recompte animat dels punts (0 → total amb ease-out).
const puntsMostrats = ref(0)
let actiu = true

onMounted(() => {
  const final = props.resultats[0]?.punts ?? 0
  if (final === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    puntsMostrats.value = final
    return
  }
  const durada = 900
  const inici = performance.now()
  const pas = (ara: number) => {
    const progres = Math.min(1, (ara - inici) / durada)
    puntsMostrats.value = Math.round(final * (1 - Math.pow(1 - progres, 3)))
    if (progres < 1 && actiu) requestAnimationFrame(pas)
  }
  requestAnimationFrame(pas)
})

onUnmounted(() => {
  actiu = false
})

const modalRef = ref<HTMLElement | null>(null)
useFocusTrap(modalRef, ref(true), () => emit('configura'))
</script>

<template>
  <div class="joc-modal-fons">
    <div class="joc-confeti" aria-hidden="true">
      <span v-for="n in 14" :key="n" :style="{ '--joc-i': String(n) }"></span>
    </div>
    <div ref="modalRef" class="joc-modal joc-resultats" role="dialog" aria-modal="true">
      <span class="joc-resultats__copa" aria-hidden="true">🏆</span>
      <h2 class="joc-modal__titol">{{ $t('partida.resultats.titol') }}</h2>
      <p class="joc-modal__sub">{{ resum }}</p>

      <!-- Un sol jugador: puntuació gran amb recompte animat -->
      <template v-if="solitari">
        <p class="joc-resultats__punts">{{ puntsMostrats }}</p>
        <p class="joc-resultats__punts-etiqueta">{{ $t('partida.resultats.punts') }}</p>

        <dl class="joc-resultats__stats">
          <div>
            <dt>{{ $t('partida.resultats.temps') }}</dt>
            <dd>{{ temps }}</dd>
          </div>
          <div>
            <dt>{{ $t('partida.resultats.encerts') }}</dt>
            <dd>{{ encerts }}</dd>
          </div>
          <div>
            <dt>{{ $t('partida.resultats.errors') }}</dt>
            <dd>{{ errors }}</dd>
          </div>
          <div v-if="pistes !== null">
            <dt>{{ $t('partida.resultats.pistes') }}</dt>
            <dd>{{ pistes }}</dd>
          </div>
        </dl>
      </template>

      <!-- Multijugador: classificació de conquestes amb el guanyador destacat -->
      <table v-else class="joc-classificacio">
        <thead>
          <tr>
            <th></th>
            <th>✓</th>
            <th>{{ $t('partida.resultats.punts') }}</th>
            <th>{{ $t('partida.resultats.temps') }}</th>
            <th>✗</th>
            <th v-if="columnaPistes" :title="$t('partida.pistesAria')">💡</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, i) in classificacio"
            :key="`${r.nom}-${i}`"
            :class="{ 'joc-classificacio__guanyador': i === 0 }"
          >
            <td class="joc-classificacio__nom">
              <span class="joc-colorjug" :style="{ background: r.color }"></span
              >{{ i === 0 ? '🏆 ' : '' }}{{ r.nom }}
            </td>
            <td>{{ r.conquestes }}</td>
            <td>{{ r.punts }}</td>
            <td>{{ formataTemps(r.segons) }}</td>
            <td>{{ r.errors }}</td>
            <td v-if="columnaPistes">{{ r.pistes }}</td>
          </tr>
        </tbody>
      </table>

      <button type="button" class="joc-boto" @click="emit('rejuga')">
        {{ $t('partida.resultats.tornaJugar') }}
      </button>
      <button type="button" class="joc-boto-secundari" @click="emit('configura')">
        {{ $t('partida.tornaConfig') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.joc-resultats {
  text-align: center;
}

.joc-resultats__copa {
  align-self: center;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin-bottom: 8px;
  border-radius: 50%;
  background: var(--joc-pista-fons);
  box-shadow: inset 0 0 0 1px rgba(217, 178, 60, 0.45);
  font-size: 2rem;
  line-height: 1;
  animation: copa 0.6s 0.15s cubic-bezier(0.3, 1.25, 0.45, 1) backwards;
}

@keyframes copa {
  from {
    opacity: 0;
    transform: scale(0.4) rotate(-20deg);
  }
}

/* Confeti de celebració (cau una sola vegada sobre el mapa de fons) */
.joc-confeti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.joc-confeti span {
  position: absolute;
  top: -20px;
  left: calc((var(--joc-i) - 1) * 7.5%);
  width: 8px;
  height: 14px;
  border-radius: 2px;
  opacity: 0;
  animation: confeti-cau 1.9s ease-in forwards;
  animation-delay: calc(var(--joc-i) * 0.07s);
}

.joc-confeti span:nth-child(4n + 1) {
  background: #c4382e;
}
.joc-confeti span:nth-child(4n + 2) {
  background: #2d6a2d;
}
.joc-confeti span:nth-child(4n + 3) {
  background: #b8860b;
}
.joc-confeti span:nth-child(4n) {
  background: #2b6cb0;
}

@keyframes confeti-cau {
  0% {
    opacity: 1;
    transform: translateY(0) rotateZ(0deg);
  }
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(85vh) rotateZ(560deg);
  }
}

.joc-resultats__punts {
  margin-top: 4px;
  font-family: var(--font-display);
  font-size: 3.6rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--color-marca);
}

.joc-resultats__punts-etiqueta {
  margin-bottom: 16px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-text-secundari);
}

/* Estadístiques de la partida, una rajola per dada */
.joc-resultats__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
  gap: 8px;
  margin-bottom: 18px;
}

.joc-resultats__stats > div {
  padding: 10px 6px;
  background: var(--pedra-100);
  border-radius: var(--radi-md);
}

.joc-resultats__stats dt {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-text-secundari);
}

.joc-resultats__stats dd {
  margin: 2px 0 0;
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  color: var(--color-text-fort);
}

/* Classificació del multijugador */
.joc-classificacio {
  width: 100%;
  margin: 4px 0 18px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: var(--text-base);
  font-variant-numeric: tabular-nums;
}

.joc-classificacio th {
  padding: 6px 8px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secundari);
  text-align: center;
}

.joc-classificacio th:first-child {
  text-align: left;
}

.joc-classificacio td {
  padding: 10px 8px;
  text-align: center;
  border-top: 1px solid var(--color-vora);
  font-weight: 600;
  color: var(--color-text-fort);
}

.joc-classificacio td.joc-classificacio__nom {
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.joc-classificacio__nom .joc-colorjug {
  margin-right: 6px;
}

.joc-classificacio__guanyador td {
  background: var(--color-marca-clar);
  border-top-color: transparent;
  font-weight: 800;
}

.joc-classificacio__guanyador td:first-child {
  border-radius: var(--radi-sm) 0 0 var(--radi-sm);
}

.joc-classificacio__guanyador td:last-child {
  border-radius: 0 var(--radi-sm) var(--radi-sm) 0;
}

@media (prefers-reduced-motion: reduce) {
  .joc-resultats__copa {
    animation: none;
  }

  .joc-confeti {
    display: none;
  }
}
</style>
