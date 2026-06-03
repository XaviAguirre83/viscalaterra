<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTerritorisStore } from '@/stores/territoris'
import type { Provincia, Comarca, Municipi } from '@/types/territori'
import { temaPerProvincia } from '@/theme/provincies'

const territoris = useTerritorisStore()

// Ordre alfabètic: Barcelona, Girona, Lleida, Tarragona
const provinciesOrdenades = computed(() =>
  [...(territoris.arbre ?? [])].sort((a, b) => a.nom.localeCompare(b.nom, 'ca'))
)

const comarquesExpandides = ref(new Set<string>())
const provinciesExpandides = ref(new Set<string>())

function estaExpandidaProvincia(codi: string): boolean {
  return provinciesExpandides.value.has(codi)
}

function toggleExpansioProvincia(codi: string) {
  if (provinciesExpandides.value.has(codi)) {
    provinciesExpandides.value.delete(codi)
  } else {
    provinciesExpandides.value.add(codi)
  }
}

function clauComarca(codiProvincia: string, codiComarca: string): string {
  return `${codiProvincia}-${codiComarca}`
}

function estaExpandida(codiProvincia: string, codiComarca: string): boolean {
  return comarquesExpandides.value.has(clauComarca(codiProvincia, codiComarca))
}

function toggleExpansio(codiProvincia: string, codiComarca: string) {
  const clau = clauComarca(codiProvincia, codiComarca)
  if (comarquesExpandides.value.has(clau)) {
    comarquesExpandides.value.delete(clau)
  } else {
    comarquesExpandides.value.add(clau)
  }
}

function estilTemaColumna(codiProvincia: string): Record<string, string> {
  const t = temaPerProvincia(codiProvincia)
  return {
    '--prov-base': t.base,
    '--prov-parcial': t.parcial,
    '--prov-hover': t.hover,
    '--prov-contrast': t.contrast,
    '--prov-vora': t.vora,
  }
}

function toggleProvincia(p: Provincia) {
  const total = territoris.estatSeleccioProvincia(p.codi) === 'total'
  territoris.seleccionaProvincia(p.codi, !total)
}

function toggleComarcaEnProvincia(c: Comarca, p: Provincia) {
  const total = territoris.estatSeleccioComarcaEnProvincia(c.codi, p.codi) === 'total'
  territoris.seleccionaComarcaEnProvincia(c.codi, p.codi, !total)
}

function toggleMunicipi(m: Municipi) {
  const ja = territoris.municipisSeleccionats.has(m.codi)
  territoris.seleccionaMunicipi(m.codi, !ja)
}

function comptadorComarca(comarca: Comarca): { sel: number; total: number } {
  const total = comarca.municipis.length
  const sel = comarca.municipis.filter((m) => territoris.municipisSeleccionats.has(m.codi)).length
  return { sel, total }
}

function comptadorProvincia(provincia: Provincia): { sel: number; total: number } {
  const total = provincia.comarques.reduce((acc, c) => acc + c.municipis.length, 0)
  const sel = provincia.comarques.reduce(
    (acc, c) =>
      acc + c.municipis.filter((m) => territoris.municipisSeleccionats.has(m.codi)).length,
    0
  )
  return { sel, total }
}
</script>

<template>
  <div class="tab-on">
    <div
      v-if="territoris.arbre && territoris.municipisSeleccionats.size > 0"
      class="tab-on__accions"
    >
      <span class="tab-on__resum">{{
        $t('on.seleccionats', territoris.municipisSeleccionats.size)
      }}</span>
      <button type="button" class="tab-on__netejar" @click="territoris.netejaSeleccio()">
        {{ $t('on.neteja') }}
      </button>
    </div>
    <div v-if="territoris.carregant" class="estat-carregant">{{ $t('on.carregant') }}</div>
    <div v-else-if="territoris.error" class="estat-error">{{ territoris.error }}</div>
    <div v-else-if="territoris.arbre" class="grid-provincies">
      <div
        v-for="provincia in provinciesOrdenades"
        :key="provincia.codi"
        class="columna-provincia"
        :style="estilTemaColumna(provincia.codi)"
      >
        <div
          class="provincia__fila"
          :class="`estat--${territoris.estatSeleccioProvincia(provincia.codi)}`"
        >
          <button
            type="button"
            class="provincia__toggle"
            :aria-label="
              estaExpandidaProvincia(provincia.codi) ? $t('on.replegar') : $t('on.expandir')
            "
            @click="toggleExpansioProvincia(provincia.codi)"
          >
            <span
              class="triangle"
              :class="{ 'triangle--obert': estaExpandidaProvincia(provincia.codi) }"
              >▶</span
            >
          </button>
          <button type="button" class="provincia__btn" @click="toggleProvincia(provincia)">
            <span>{{ provincia.nom }}</span>
            <span v-if="comptadorProvincia(provincia).sel > 0" class="comptador"
              >[{{ comptadorProvincia(provincia).sel }}/{{
                comptadorProvincia(provincia).total
              }}]</span
            >
          </button>
        </div>

        <div v-show="estaExpandidaProvincia(provincia.codi)" class="comarques comarques--plegable">
          <div v-for="comarca in provincia.comarques" :key="comarca.codi" class="comarca">
            <div
              class="comarca__fila"
              :class="`estat--${territoris.estatSeleccioComarcaEnProvincia(comarca.codi, provincia.codi)}`"
            >
              <button
                type="button"
                class="comarca__expand"
                :aria-label="
                  estaExpandida(provincia.codi, comarca.codi)
                    ? $t('on.replegar')
                    : $t('on.expandir')
                "
                @click="toggleExpansio(provincia.codi, comarca.codi)"
              >
                <span
                  class="triangle"
                  :class="{ 'triangle--obert': estaExpandida(provincia.codi, comarca.codi) }"
                  >▶</span
                >
              </button>
              <button
                type="button"
                class="comarca__btn"
                @click="toggleComarcaEnProvincia(comarca, provincia)"
              >
                {{ comarca.nom }}
              </button>
              <span v-if="comptadorComarca(comarca).sel > 0" class="comptador"
                >[{{ comptadorComarca(comarca).sel }}/{{ comptadorComarca(comarca).total }}]</span
              >
            </div>

            <div v-show="estaExpandida(provincia.codi, comarca.codi)" class="municipis">
              <button
                v-for="(municipi, idx) in comarca.municipis"
                :key="municipi.codi"
                type="button"
                class="municipi__btn"
                :class="{
                  'estat--total': territoris.municipisSeleccionats.has(municipi.codi),
                  primer: idx === 0,
                  darrer: idx === comarca.municipis.length - 1,
                  'cap-comarca': municipi.es_cap_comarca,
                }"
                @click="toggleMunicipi(municipi)"
              >
                {{ municipi.nom }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-on {
  width: min(1400px, calc(100vw - 64px));
}

.grid-provincies {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.columna-provincia {
  min-width: 0;
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 6px;
  border-right: 1px solid #ececec;
}

.columna-provincia:last-child {
  border-right: none;
}

@media (max-width: 768px) {
  .tab-on {
    width: 100%;
  }

  .grid-provincies {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .columna-provincia {
    max-height: none;
    overflow-y: visible;
    padding-right: 0;
    border-right: none;
  }

  /* En mòbil, seleccionar municipis és la interacció principal: zona tàctil ≥44px */
  .municipi__btn {
    padding: 11px 12px 11px 28px;
  }
}

button {
  display: block;
  width: 100%;
  background: none;
  border: none;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
  border-radius: 6px;
  transition:
    background 0.12s,
    color 0.12s;
}

button:focus-visible {
  outline: 2px solid var(--prov-base);
  outline-offset: 1px;
}

/* ── Provincia ─────────────────────────────────────────── */
.provincia__fila {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  border-bottom: 2px solid var(--prov-base);
  border-radius: 6px 6px 0 0;
  transition: background 0.12s;
}

.provincia__fila:hover {
  background: var(--prov-hover);
}

.provincia__fila.estat--parcial {
  background: var(--prov-parcial);
}

.provincia__fila.estat--total {
  background: var(--prov-base);
  color: var(--prov-contrast);
  border-bottom-color: var(--prov-vora);
}

.provincia__toggle {
  display: none;
  flex: 0 0 auto;
  width: 28px;
  padding: 8px 0;
  align-items: center;
  justify-content: center;
  border-radius: 6px 0 0 0;
  color: inherit;
}

.provincia__btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--prov-vora);
  padding: 8px 12px;
  border-radius: 6px 6px 0 0;
}

.provincia__fila.estat--total .provincia__btn {
  color: var(--prov-contrast);
}

@media (max-width: 768px) {
  .provincia__toggle {
    display: flex;
  }
}

@media (min-width: 769px) {
  /* En desktop, les comarques sempre visibles independentment del v-show */
  .comarques--plegable {
    display: flex !important;
  }
}

/* ── Comarca ───────────────────────────────────────────── */
.comarques {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.comarca__fila {
  display: flex;
  align-items: center;
  border-radius: 6px;
  margin-bottom: 2px;
  padding-right: 12px;
  transition:
    background 0.12s,
    color 0.12s;
}

.comarca__fila:hover {
  background: var(--prov-hover);
}

.comarca__fila.estat--parcial {
  background: var(--prov-parcial);
  color: var(--prov-vora);
}

.comarca__fila.estat--total {
  background: var(--prov-base);
  color: var(--prov-contrast);
}

.comarca__expand {
  flex: 0 0 auto;
  width: 28px;
  padding: 6px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px 0 0 6px;
  color: inherit;
}

.triangle {
  font-size: 0.6rem;
  display: inline-block;
  transition: transform 0.15s ease;
  opacity: 0.6;
}

.triangle--obert {
  transform: rotate(90deg);
}

.comarca__btn {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: inherit;
  padding: 6px 12px 6px 4px;
  border-radius: 0 6px 6px 0;
}

/* ── Municipi ──────────────────────────────────────────── */
.municipis {
  display: flex;
  flex-direction: column;
  margin-bottom: 4px;
}

.municipi__btn {
  font-size: 0.82rem;
  color: #444;
  padding: 4px 12px 4px 28px;
  border-radius: 0;
}

.municipi__btn.cap-comarca {
  font-weight: 600;
}

.municipi__btn.primer {
  border-radius: 4px 4px 0 0;
}

.municipi__btn.darrer {
  border-radius: 0 0 4px 4px;
}

.municipi__btn.primer.darrer {
  border-radius: 4px;
}

.municipi__btn:hover {
  background: var(--prov-hover);
  color: var(--prov-vora);
}

.municipi__btn.estat--total {
  background: var(--prov-base);
  color: var(--prov-contrast);
}

.municipi__btn.estat--total:hover {
  background: var(--prov-vora);
  color: var(--prov-contrast);
}

/* ── Comptador [sel/total] ─────────────────────────────── */
.comptador {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.estat-carregant,
.estat-error {
  padding: 16px;
  color: #555;
  font-size: var(--text-base);
}

.estat-error {
  color: #b32d2d;
}

/* ── Barra d'accions (neteja de la selecció) ───────────────────────────── */
.tab-on__accions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 0 0 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #ececec;
}

.tab-on__resum {
  font-size: var(--text-sm);
  font-weight: 600;
  color: #444;
}

.tab-on__netejar {
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

.tab-on__netejar:hover {
  background: var(--color-marca, #2d6a2d);
  color: #fff;
}

@media (max-width: 768px) {
  .tab-on__netejar {
    min-height: 44px;
  }
}
</style>
