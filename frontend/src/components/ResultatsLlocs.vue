<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useLlocsStore, type Lloc } from '@/stores/llocs'
import { emojiSubtema } from '@/data/subtemes'

const llocs = useLlocsStore()
const collapsat = ref(false)

// Els resultats ja arriben ordenats per municipi i després per nom; els agrupem
// mantenint aquest ordre (un Map conserva l'ordre d'inserció).
const grups = computed(() => {
  const m = new Map<string, Lloc[]>()
  for (const l of llocs.resultats) {
    const arr = m.get(l.municipiNom) ?? []
    arr.push(l)
    m.set(l.municipiNom, arr)
  }
  return [...m.entries()].map(([municipi, items]) => ({ municipi, items }))
})

// Enllaç per obrir la ubicació a Google Maps (les coordenades sempre hi són).
function urlGoogleMaps(l: Lloc): string {
  return `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`
}

// "17820 - Banyoles (Girona)" — el CP pot faltar.
function liniaMunicipi(l: Lloc): string {
  const cp = l.cp ? `${l.cp} - ` : ''
  const prov = l.provinciaNom ? ` (${l.provinciaNom})` : ''
  return `${cp}${l.municipiNom}${prov}`
}

// Coordenades amb coma decimal, com és costum en català/castellà.
function coordFmt(n: number): string {
  return n.toFixed(6).replace('.', ',')
}
function liniaCoords(l: Lloc): string {
  return `Lat ${coordFmt(l.lat)}  Lon ${coordFmt(l.lng)}`
}

// Quan es destaca un lloc (des d'aquí o des del mapa), la fila s'il·lumina i es
// fa visible dins la llista.
watch(
  () => llocs.llocDestacat,
  (id) => {
    if (id == null) return
    void nextTick(() => {
      document
        .querySelector(`.resultats__fila[data-id="${id}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    })
  }
)
</script>

<template>
  <section
    class="resultats"
    :class="{ 'resultats--collapsat': collapsat }"
    :aria-label="$t('cercaLlocs.titol')"
  >
    <header class="resultats__cap">
      <button
        type="button"
        class="resultats__toggle"
        :aria-expanded="!collapsat"
        @click="collapsat = !collapsat"
      >
        <span class="resultats__fletxa" :class="{ 'resultats__fletxa--obert': !collapsat }">▾</span>
        <span class="resultats__recompte">{{
          llocs.carregant
            ? $t('cercaLlocs.cercant')
            : $t('cercaLlocs.resultats', { n: llocs.total }, llocs.total)
        }}</span>
      </button>
      <button
        type="button"
        class="resultats__neteja"
        :aria-label="$t('on.neteja')"
        @click="llocs.neteja()"
      >
        ✕
      </button>
    </header>

    <div v-show="!collapsat" class="resultats__cos">
      <p v-if="llocs.carregant" class="resultats__estat">{{ $t('cercaLlocs.cercant') }}</p>
      <p v-else-if="llocs.error" class="resultats__estat resultats__estat--error">
        {{ $t('cercaLlocs.error') }}
      </p>
      <p v-else-if="llocs.total === 0" class="resultats__estat">
        {{ $t('cercaLlocs.capResultat') }}
      </p>
      <ul v-else class="resultats__llista">
        <template v-for="grup in grups" :key="grup.municipi">
          <li class="resultats__municipi">{{ grup.municipi }}</li>
          <li
            v-for="l in grup.items"
            :key="l.id"
            class="resultats__fila"
            :class="{ 'resultats__fila--destacada': l.id === llocs.llocDestacat }"
            :data-id="l.id"
          >
            <div class="resultats__capdamunt">
              <button
                type="button"
                class="resultats__localitza"
                :aria-label="$t('cercaLlocs.mostraAlMapa')"
                :title="$t('cercaLlocs.mostraAlMapa')"
                @click="llocs.destaca(l.id)"
              >
                <span class="resultats__icona" aria-hidden="true">{{
                  emojiSubtema(l.subtema)
                }}</span>
              </button>
              <a
                v-if="l.web"
                class="resultats__nom resultats__nom--enllac"
                :href="l.web"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ l.nom }} <span class="resultats__ext" aria-hidden="true">↗</span>
              </a>
              <span v-else class="resultats__nom">{{ l.nom }}</span>
            </div>

            <a
              class="resultats__ubicacio"
              :href="urlGoogleMaps(l)"
              target="_blank"
              rel="noopener noreferrer"
              :title="$t('cercaLlocs.obreMaps')"
            >
              <span v-if="l.adreca" class="resultats__linia">{{ l.adreca }}</span>
              <span class="resultats__linia">{{ liniaMunicipi(l) }}</span>
              <span class="resultats__linia resultats__coords">{{ liniaCoords(l) }}</span>
            </a>

            <a
              v-if="l.fontUrl"
              class="resultats__font"
              :href="l.fontUrl"
              target="_blank"
              rel="noopener noreferrer"
              :title="l.fontNom || l.fontUrl"
            >
              {{ $t('cercaLlocs.font') }}: {{ l.fontNom || l.fontUrl }} ↗
            </a>
          </li>
        </template>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.resultats {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* No més alt que ~40% de la columna; la llista interior fa scroll. */
  max-height: 42%;
  background: var(--color-superficie, #ffffff);
  border-top: 1px solid var(--color-vora, #e3e5de);
}

/* Replegat: només es veu la capçalera (el cos s'amaga amb v-show). */
.resultats--collapsat {
  max-height: none;
}

.resultats__cap {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 8px 0 4px;
  height: 40px;
  border-bottom: 1px solid var(--color-vora, #eceeea);
}

.resultats__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 8px;
  border: none;
  background: none;
  font: inherit;
  color: var(--color-text, #1a2635);
  cursor: pointer;
}

.resultats__fletxa {
  font-size: 0.7rem;
  color: var(--color-text-secundari, #737373);
  transition: transform var(--mou-rapid, 0.15s) ease;
}

.resultats__fletxa--obert {
  transform: rotate(180deg);
}

.resultats__recompte {
  font-size: var(--text-sm);
  font-weight: 700;
}

.resultats__neteja {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radi-sm, 8px);
  background: none;
  color: var(--color-text-secundari, #999);
  font-size: 0.95rem;
  cursor: pointer;
  transition:
    background var(--mou-rapid, 0.13s),
    color var(--mou-rapid, 0.13s);
}

.resultats__neteja:hover {
  background: var(--color-marca-clar, #f0f4f0);
  color: var(--color-marca, #2d6a2d);
}

.resultats__cos {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.resultats__estat {
  padding: 16px;
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
}

.resultats__estat--error {
  color: #b32d2d;
}

.resultats__llista {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Capçalera de grup (municipi): enganxada a dalt mentre s'scrolleja el grup. */
.resultats__municipi {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 5px 14px 3px;
  background: var(--color-superficie, #fff);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-text-secundari, #737373);
  border-bottom: 1px solid #f0f0ec;
}

.resultats__fila {
  border-bottom: 1px solid #f4f4f0;
  padding: 7px 14px 10px;
}

.resultats__fila--destacada {
  background: var(--color-marca-clar, #eaf3ea);
  box-shadow: inset 3px 0 0 var(--color-marca, #2d6a2d);
}

/* Fila superior: botó de localització (icona) + nom (enllaç a la web si n'hi ha). */
.resultats__capdamunt {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.resultats__localitza {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  transition: background var(--mou-rapid, 0.12s);
}

.resultats__localitza:hover {
  background: var(--color-marca-clar, #eaf3ea);
}

.resultats__icona {
  font-size: 1.05rem;
  line-height: 1;
}

.resultats__nom {
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text, #222);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resultats__nom--enllac {
  color: var(--color-marca, #2d6a2d);
  text-decoration: none;
}

.resultats__nom--enllac:hover {
  text-decoration: underline;
}

.resultats__ext {
  font-size: 0.8em;
  opacity: 0.75;
}

/* Direcció + codi postal/població + coordenades: tot el bloc enllaça a Google
   Maps. La direcció pot faltar; les coordenades sempre hi són. */
.resultats__ubicacio {
  display: block;
  padding-left: 36px;
  color: var(--color-text-secundari, #6a6f68);
  text-decoration: none;
}

.resultats__ubicacio:hover .resultats__linia {
  text-decoration: underline;
}

.resultats__linia {
  display: block;
  font-size: var(--text-xs);
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resultats__coords {
  color: var(--color-text-secundari, #8a8f88);
  font-variant-numeric: tabular-nums;
}

/* Enllaç a la font oficial de la dada, sota el nom/adreça (fora del botó de la
   fila perquè no s'imbriqui un <a> dins un <button>). */
.resultats__font {
  display: block;
  margin-top: 4px;
  padding-left: 36px;
  font-size: var(--text-xs);
  color: var(--color-marca, #2d6a2d);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resultats__font:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .resultats {
    max-height: 44%;
  }

  .resultats__localitza {
    width: 34px;
    height: 34px;
  }
}
</style>
