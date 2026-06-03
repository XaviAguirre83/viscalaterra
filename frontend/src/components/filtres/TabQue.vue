<script setup lang="ts">
import { ref } from 'vue'
import { useFiltresStore } from '@/stores/filtres'
import { TEMES, type Tema } from '@/data/categories'

const filtres = useFiltresStore()

// Temes expandits (per defecte tots col·lapsats, com el desplegable On?).
const expandits = ref(new Set<string>())

function estaExpandit(codi: string): boolean {
  return expandits.value.has(codi)
}

function toggleExpansio(codi: string) {
  if (expandits.value.has(codi)) expandits.value.delete(codi)
  else expandits.value.add(codi)
}

function codisSubtemes(tema: Tema): string[] {
  return tema.subtemes.map((s) => s.codi)
}

function toggleTema(tema: Tema) {
  const total = filtres.estatTema(codisSubtemes(tema)) === 'total'
  filtres.seleccionaTema(codisSubtemes(tema), !total)
}

function comptador(tema: Tema): { sel: number; total: number } {
  const codis = codisSubtemes(tema)
  const sel = codis.filter((c) => filtres.categoriesActives.has(c)).length
  return { sel, total: codis.length }
}
</script>

<template>
  <div class="tab-que">
    <div v-for="tema in TEMES" :key="tema.codi" class="tema">
      <div class="tema__fila" :class="`estat--${filtres.estatTema(codisSubtemes(tema))}`">
        <button
          type="button"
          class="tema__expand"
          :aria-label="estaExpandit(tema.codi) ? $t('on.replegar') : $t('on.expandir')"
          @click="toggleExpansio(tema.codi)"
        >
          <span class="triangle" :class="{ 'triangle--obert': estaExpandit(tema.codi) }">▶</span>
        </button>
        <button type="button" class="tema__btn" @click="toggleTema(tema)">
          <span>{{ $t(tema.clau) }}</span>
          <span v-if="comptador(tema).sel > 0" class="comptador"
            >[{{ comptador(tema).sel }}/{{ comptador(tema).total }}]</span
          >
        </button>
      </div>

      <div v-show="estaExpandit(tema.codi)" class="subtemes">
        <label v-for="sub in tema.subtemes" :key="sub.codi" class="subtema">
          <input
            type="checkbox"
            :checked="filtres.categoriesActives.has(sub.codi)"
            @change="filtres.toggleSubtema(sub.codi, ($event.target as HTMLInputElement).checked)"
          />
          {{ $t(sub.clau) }}
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-que {
  min-width: 280px;
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 4px;
}

@media (max-width: 768px) {
  .tab-que {
    min-width: 0;
    width: 100%;
    max-height: none;
    overflow-y: visible;
    padding-right: 0;
  }
}

.tema + .tema {
  margin-top: 2px;
}

/* ── Fila del tema (capçalera col·lapsable) ────────────────────────────── */
.tema__fila {
  display: flex;
  align-items: center;
  border-radius: 6px;
  border-bottom: 2px solid var(--color-marca, #2d6a2d);
  transition: background 0.12s;
}

.tema__fila:hover {
  background: var(--color-marca-clar, #f0f4f0);
}

.tema__fila.estat--parcial {
  background: #dfe9d0;
}

.tema__fila.estat--total {
  background: var(--color-marca, #2d6a2d);
  color: #fff;
}

.tema__expand {
  flex: 0 0 auto;
  width: 28px;
  padding: 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px 0 0 0;
  color: inherit;
  cursor: pointer;
}

.tema__btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 8px 12px 8px 4px;
  background: none;
  border: none;
  font: inherit;
  text-align: left;
  color: inherit;
  font-weight: 700;
  font-size: var(--text-base);
  cursor: pointer;
  border-radius: 0 6px 6px 0;
}

.triangle {
  display: inline-block;
  font-size: 0.6rem;
  opacity: 0.6;
  transition: transform 0.15s ease;
}

.triangle--obert {
  transform: rotate(90deg);
}

.comptador {
  flex-shrink: 0;
  font-size: var(--text-xs);
  font-weight: 600;
  opacity: 0.8;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Subtemes (checkboxes) ─────────────────────────────────────────────── */
.subtemes {
  display: flex;
  flex-direction: column;
  padding: 4px 0 8px 28px;
}

.subtema {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: var(--text-sm);
  color: #333;
  transition: background 0.1s;
}

.subtema:hover {
  background: var(--color-marca-clar, #f0f4f0);
}

.subtema input[type='checkbox'] {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  accent-color: var(--color-marca, #2d6a2d);
  cursor: pointer;
}

.tema__expand:focus-visible,
.tema__btn:focus-visible {
  outline: 2px solid var(--color-marca, #2d6a2d);
  outline-offset: 1px;
}

@media (max-width: 768px) {
  .subtema {
    padding: 10px;
  }
}
</style>
