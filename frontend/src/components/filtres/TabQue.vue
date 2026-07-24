<script setup lang="ts">
import { ref } from 'vue'
import { useFiltresStore } from '@/stores/filtres'
import { TEMES, type Tema } from '@/data/categories'

const filtres = useFiltresStore()

// Temes expandits (per defecte tots col·lapsats). Només s'usa en mòbil: en
// desktop els subtemes són sempre visibles (mirall de les comarques al TabOn).
const expandits = ref(new Set<string>())

// Color base per tema. Cada secció té el seu (barra recta i estats de selecció),
// igual que cada província al panell On?. Els tons parcial/hover/vora es deriven
// del base per CSS (color-mix), com les variables --prov-* del TabOn.
const COLOR_TEMA: Record<string, string> = {
  esports: '#2b6cb0', // blau
  nens: '#d9701f', // taronja
  culinari: '#b7472a', // terracota
  'aire-lliure': '#2c9a9a', // turquesa
  patrimoni: '#8a6a3a', // bronze
  natura: '#2f855a', // verd
  'equipaments-publics': '#586372', // pissarra
  salut: '#bf3d7f', // rosa
  emergencies: '#cf3430', // vermell
  administracio: '#5a5fd0', // indi
  justicia: '#7a4fb5', // violeta
}
const COLOR_FALLBACK = '#2d6a2d'

// Icona per tema (trazats Lucide, estil de línia). Es dibuixen amb
// stroke="currentColor", així prenen el color de la secció (com el menú principal).
const ICONA_TEMA: Record<string, string[]> = {
  esports: [
    'M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z',
    'm2.5 21.5 1.4-1.4',
    'm20.1 3.9 1.4-1.4',
    'M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z',
    'm9.6 14.4 4.8-4.8',
  ],
  nens: [
    'M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5',
    'M15 12h.01',
    'M19.38 6.813A9 9 0 0 1 20.8 10.2a2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1',
    'M9 12h.01',
  ],
  culinari: [
    'm16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8',
    'M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7',
    'm2.1 21.8 6.4-6.3',
    'm19 5-7 7',
  ],
  'aire-lliure': [
    'M2 4a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
    'm14 5 3-3 3 3',
    'm14 10 3-3 3 3',
    'M17 14V2',
    'M17 14H7l-5 8h20Z',
    'M8 14v8',
    'm9 14 5 8',
  ],
  patrimoni: [
    'M10 5V3',
    'M14 5V3',
    'M15 21v-3a3 3 0 0 0-6 0v3',
    'M18 3v8',
    'M18 5H6',
    'M22 11H2',
    'M22 9v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9',
    'M6 3v8',
  ],
  natura: ['m8 3 4 8 5-5 5 15H2L8 3z'],
  'equipaments-publics': [
    'M7 12h13a1 1 0 0 1 1 1 5 5 0 0 1-5 5h-.598a.5.5 0 0 0-.424.765l1.544 2.47a.5.5 0 0 1-.424.765H5.402a.5.5 0 0 1-.424-.765L7 18',
    'M8 18a5 5 0 0 1-5-5V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8',
  ],
  salut: [
    'M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5',
    'M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27',
  ],
  emergencies: [
    'M7 18v-6a5 5 0 1 1 10 0v6',
    'M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z',
    'M21 12h1',
    'M18.5 4.5 18 5',
    'M2 12h1',
    'M12 2v1',
    'm4.929 4.929.707.707',
    'M12 12v6',
  ],
  administracio: [
    'M10 18v-7',
    'M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z',
    'M14 18v-7',
    'M18 18v-7',
    'M3 22h18',
    'M6 18v-7',
  ],
  justicia: [
    'M12 3v18',
    'm19 8 3 8a5 5 0 0 1-6 0zV7',
    'M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1',
    'm5 8 3 8a5 5 0 0 1-6 0zV7',
    'M7 21h10',
  ],
}

function estilColumna(codi: string): Record<string, string> {
  return { '--tema-base': COLOR_TEMA[codi] ?? COLOR_FALLBACK }
}

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
    <div v-if="filtres.categoriesActives.size > 0" class="tab-que__accions">
      <span class="tab-que__resum">{{
        $t('que.seleccionades', filtres.categoriesActives.size)
      }}</span>
      <button type="button" class="tab-que__netejar" @click="filtres.netejaCategories()">
        {{ $t('on.neteja') }}
      </button>
    </div>

    <div class="grid-temes">
      <div
        v-for="tema in TEMES"
        :key="tema.codi"
        class="columna-tema"
        :style="estilColumna(tema.codi)"
      >
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
            <span class="tema__etiqueta">
              <svg
                class="tema__icona"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path v-for="(d, i) in ICONA_TEMA[tema.codi] ?? []" :key="i" :d="d" />
              </svg>
              <span>{{ $t(tema.clau) }}</span>
            </span>
            <span v-if="comptador(tema).sel > 0" class="comptador"
              >{{ comptador(tema).sel }}/{{ comptador(tema).total }}</span
            >
          </button>
        </div>

        <div v-show="estaExpandit(tema.codi)" class="subtemes subtemes--plegable">
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
  </div>
</template>

<style scoped>
/* Mateixa amplada que el panell On? */
.tab-que {
  width: min(1400px, calc(100vw - 64px));
  max-height: 72vh;
  overflow-y: auto;
}

/* Graella 6×2 (11 temes). A mòbil és una sola columna amb alçada natural
   (align-items:start); a desktop les dues files tenen la mateixa alçada fixa i
   cada cel·la scrolleja el seu propi contingut (vegeu la media query de 769px). */
.grid-temes {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 18px;
  align-items: start;
}

.columna-tema {
  min-width: 0;
  /* Derivació de tons a partir del color base (mateix rol que les --prov-* del On?). */
  --tema-contrast: #fff;
  --tema-vora: color-mix(in srgb, var(--tema-base) 72%, #111);
  --tema-parcial: color-mix(in srgb, var(--tema-base) 22%, #fff);
  --tema-hover: color-mix(in srgb, var(--tema-base) 10%, #fff);
}

/* ── Fila del tema: barra recta de color sota el nom (mirall del TabOn) ──── */
.tema__fila {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  border-bottom: 2px solid var(--tema-base);
  border-radius: 6px 6px 0 0;
  transition: background 0.12s;
}

.tema__fila:hover {
  background: var(--tema-hover);
}

.tema__fila.estat--parcial {
  background: var(--tema-parcial);
}

.tema__fila.estat--total {
  background: var(--tema-base);
  color: var(--tema-contrast);
  border-bottom-color: var(--tema-vora);
}

.tema__expand {
  display: none; /* desktop: sense triangle; els subtemes es veuen sempre */
  flex: 0 0 auto;
  width: 28px;
  padding: 8px 0;
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
  padding: 8px 12px;
  background: none;
  border: none;
  font: inherit;
  text-align: left;
  color: var(--tema-vora);
  font-weight: 700;
  font-size: var(--text-base);
  cursor: pointer;
  border-radius: 6px 6px 0 0;
}

.tema__fila.estat--total .tema__btn {
  color: var(--tema-contrast);
}

.tema__etiqueta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tema__icona {
  flex-shrink: 0;
  width: 17px;
  height: 17px;
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
  padding: 2px 8px;
  border-radius: var(--radi-pastilla, 9px);
  background: rgba(0, 0, 0, 0.07);
  font-size: 0.7rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tema__fila.estat--total .comptador {
  background: rgba(255, 255, 255, 0.22);
}

/* ── Subtemes (checkboxes) ─────────────────────────────────────────────── */
.subtemes {
  display: flex;
  flex-direction: column;
  padding: 2px 0 8px 4px;
}

.subtema {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: var(--text-sm);
  color: #333;
  transition: background 0.1s;
}

.subtema:hover {
  background: var(--tema-hover);
}

.subtema input[type='checkbox'] {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  accent-color: var(--tema-base);
  cursor: pointer;
}

.tema__expand:focus-visible,
.tema__btn:focus-visible {
  outline: 2px solid var(--tema-base);
  outline-offset: 1px;
}

/* Desktop: subtemes sempre visibles (com les comarques al panell On?), així el
   desplegable no canvia d'amplada segons què s'expandeix. */
@media (min-width: 769px) {
  .subtemes--plegable {
    display: flex !important;
  }

  /* Les dues files de temes tenen la mateixa alçada fixa. Cada cel·la scrolleja
     el seu propi contingut (p. ex. Justícia, amb 14 subtemes), NO el panell
     sencer. El valor 30vh mostra ~8-11 subtemes segons l'alçada de pantalla. */
  .grid-temes {
    grid-auto-rows: 30vh;
    align-items: stretch;
  }
  .columna-tema {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }
  .subtemes {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
}

/* ── Barra d'accions (neteja de categories) — mirall del TabOn ──────────── */
.tab-que__accions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 0 0 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #ececec;
}

.tab-que__resum {
  font-size: var(--text-sm);
  font-weight: 600;
  color: #444;
}

.tab-que__netejar {
  width: auto;
  min-height: 36px;
  padding: 7px 16px;
  border: 1px solid var(--color-marca, #2d6a2d);
  border-radius: 18px;
  background: none;
  color: var(--color-marca, #2d6a2d);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.tab-que__netejar:hover {
  background: var(--color-marca, #2d6a2d);
  color: #fff;
}

/* ── Mòbil: una columna, temes col·lapsables amb triangle ──────────────── */
@media (max-width: 768px) {
  .tab-que {
    width: 100%;
    max-height: none;
    overflow-y: visible;
  }

  .grid-temes {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .tema__expand {
    display: flex;
  }

  .subtema {
    padding: 10px;
  }

  .tab-que__netejar {
    min-height: 44px;
  }
}
</style>
