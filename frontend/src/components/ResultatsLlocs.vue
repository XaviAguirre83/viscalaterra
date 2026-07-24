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
            <button type="button" class="resultats__item" @click="llocs.destaca(l.id)">
              <span class="resultats__icona" aria-hidden="true">{{ emojiSubtema(l.subtema) }}</span>
              <span class="resultats__text">
                <span class="resultats__nom">{{ l.nom }}</span>
                <span v-if="l.adreca" class="resultats__adreca">{{ l.adreca }}</span>
              </span>
            </button>
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
}

.resultats__fila--destacada {
  background: var(--color-marca-clar, #eaf3ea);
  box-shadow: inset 3px 0 0 var(--color-marca, #2d6a2d);
}

.resultats__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 14px;
  border: none;
  background: none;
  font: inherit;
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.resultats__fila:not(.resultats__fila--destacada) .resultats__item:hover {
  background: #f6f8f6;
}

.resultats__icona {
  flex: 0 0 auto;
  font-size: 1.05rem;
  line-height: 1;
}

.resultats__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.resultats__nom {
  font-size: var(--text-sm);
  color: var(--color-text, #222);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resultats__adreca {
  font-size: var(--text-xs);
  color: var(--color-text-secundari, #888);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .resultats {
    max-height: 44%;
  }

  .resultats__item {
    padding: 11px 14px;
  }
}
</style>
