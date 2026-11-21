<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { normalitza } from '@/data/text'
import type { Candidat } from '@/data/partida'
import './jocs.css'

// Caixa de resposta escrita: input amb autocomplete sobre els candidats vius,
// navegable amb el teclat (fletxes + Enter + Esc). Amb la pista activa, les 4
// opcions substitueixen els suggeriments. Només emet codis de candidats
// vàlids: decidir si és encert o error és cosa del joc, que pot demanar el
// sacseig (sacseja) per donar feedback d'error.

const props = defineProps<{
  // Respostes possibles. Un codi pot tenir més d'un nom (p. ex. les dues
  // capitals del Vallès Occidental).
  candidats: Candidat[]
  // Les 4 opcions de la pista, o null si no s'ha demanat.
  opcionsPista: Candidat[] | null
  placeholder: string
  etiqueta: string
}>()

const emit = defineEmits<{ respon: [codi: string] }>()

const text = ref('')
const input = ref<HTMLInputElement | null>(null)
const llista = ref<HTMLElement | null>(null)
const sacsejant = ref(false)

const suggeriments = computed(() => {
  const q = normalitza(text.value.trim())
  if (!q) return []
  return props.candidats.filter((c) => normalitza(c.nom).includes(q)).slice(0, 7)
})

// ── Navegació amb teclat pels suggeriments ─────────────────────────────────

const index = ref(-1)
watch(suggeriments, () => (index.value = -1))

function mou(delta: number) {
  const n = suggeriments.value.length
  if (n === 0) return
  index.value = (index.value + delta + n) % n
  void nextTick(() => {
    llista.value?.querySelector('.joc-suggeriment--actiu')?.scrollIntoView({ block: 'nearest' })
  })
}

function escNeteja() {
  text.value = ''
  index.value = -1
}

// El sacseig (i la vora vermella) s'apaga en acabar l'animació; amb
// prefers-reduced-motion no n'hi ha i animationend no arriba mai, així que un
// temporitzador l'apaga igualment (si no, la vora vermella es quedava fixa).
let apagaSacseig: ReturnType<typeof setTimeout> | null = null
function sacseja() {
  sacsejant.value = false
  if (apagaSacseig) clearTimeout(apagaSacseig)
  requestAnimationFrame(() => {
    sacsejant.value = true
    apagaSacseig = setTimeout(() => (sacsejant.value = false), 600)
  })
}

// Respon un candidat: el joc decideix (i pot sacsejar) i la caixa queda
// buida i enfocada per a la ronda següent.
function respon(codi: string) {
  emit('respon', codi)
  text.value = ''
  input.value?.focus()
}

// Enter: respon el suggeriment ressaltat amb les fletxes; si no n'hi ha, el
// text exacte o el suggeriment únic; si és ambigu o no coincideix amb cap
// candidat, sacseja sense penalitzar (l'error només compta quan es tria una
// resposta vàlida equivocada).
function envia() {
  const ressaltat = suggeriments.value[index.value]
  if (ressaltat) {
    respon(ressaltat.codi)
    return
  }
  const q = normalitza(text.value.trim())
  if (!q) return
  const exacte = props.candidats.find((c) => normalitza(c.nom) === q)
  const unic = exacte ?? (suggeriments.value.length === 1 ? suggeriments.value[0] : undefined)
  if (unic) {
    respon(unic.codi)
    return
  }
  sacseja()
}

onUnmounted(() => {
  if (apagaSacseig) clearTimeout(apagaSacseig)
})

defineExpose({
  focus: () => input.value?.focus(),
  neteja: escNeteja,
  sacseja,
})
</script>

<template>
  <div class="joc-pregunta">
    <input
      ref="input"
      v-model="text"
      type="text"
      autocomplete="off"
      spellcheck="false"
      :placeholder="placeholder"
      :aria-label="etiqueta"
      :class="{ 'joc-resposta--sacseig': sacsejant }"
      @animationend="sacsejant = false"
      @keydown.enter.prevent="envia"
      @keydown.down.prevent="mou(1)"
      @keydown.up.prevent="mou(-1)"
      @keydown.esc.prevent="escNeteja"
    />
    <!-- Pista activa: les 4 opcions substitueixen els suggeriments -->
    <div v-if="opcionsPista" class="joc-opcions">
      <button
        v-for="o in opcionsPista"
        :key="`${o.codi}·${o.nom}`"
        type="button"
        @mousedown.prevent="respon(o.codi)"
      >
        {{ o.nom }}
      </button>
    </div>
    <ul v-else-if="suggeriments.length" ref="llista" class="joc-suggeriments">
      <li v-for="(s, i) in suggeriments" :key="`${s.codi}·${s.nom}`">
        <button
          type="button"
          :class="{ 'joc-suggeriment--actiu': i === index }"
          @mousedown.prevent="respon(s.codi)"
        >
          {{ s.nom }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.joc-pregunta {
  width: min(360px, 100%);
  padding: 10px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid var(--color-vora);
  border-radius: var(--radi-lg);
  box-shadow: var(--ombra-3);
  color: var(--color-text-fort);
  pointer-events: auto;
}

/* 1rem (16px) com a mínim: per sota, l'iPhone fa zoom en enfocar l'input */
.joc-pregunta input {
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border: 1.5px solid var(--color-vora-forta);
  border-radius: var(--radi-sm);
  font: inherit;
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-text);
  transition:
    border-color var(--mou-rapid),
    box-shadow var(--mou-rapid);
}

.joc-pregunta input:focus {
  outline: none;
  border-color: var(--color-marca);
  box-shadow: 0 0 0 3px var(--color-marca-mig);
}

.joc-pregunta input.joc-resposta--sacseig {
  animation: joc-sacseig 0.3s;
  border-color: var(--joc-error);
  box-shadow: 0 0 0 3px rgba(176, 48, 48, 0.15);
}

.joc-suggeriments {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
  max-height: 210px;
  overflow-y: auto;
}

.joc-suggeriments button {
  display: block;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: var(--radi-xs);
  text-align: left;
  font: inherit;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-fort);
  cursor: pointer;
  transition: background var(--mou-rapid);
}

.joc-suggeriments button:hover,
.joc-suggeriments .joc-suggeriment--actiu {
  background: var(--color-marca-clar);
  color: var(--color-marca);
}

/* Les 4 opcions de la pista */
.joc-opcions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 8px;
}

.joc-opcions button {
  padding: 9px 10px;
  background: var(--joc-pista-fons);
  border: 1.5px solid var(--joc-pista-vora);
  border-radius: var(--radi-sm);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  line-height: 1.25;
  color: var(--color-text-fort);
  cursor: pointer;
  transition: background var(--mou-rapid);
}

.joc-opcions button:hover {
  background: var(--joc-pista-viu);
}

/* En pantalles amples la caixa va a l'esquerra, al costat del control de
   zoom: ni ella ni els suggeriments tapen mai el territori (el mapa
   s'enquadra a la dreta; vegeu els marges del mapa a cada vista). */
@media (min-width: 1100px) {
  .joc-pregunta {
    position: absolute;
    top: 0;
    left: 60px;
    width: 320px;
  }
}

@media (max-width: 768px) {
  .joc-suggeriments button,
  .joc-opcions button {
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .joc-pregunta input.joc-resposta--sacseig {
    animation: none;
  }
}
</style>
