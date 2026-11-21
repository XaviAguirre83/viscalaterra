<script setup lang="ts" generic="T extends string">
import './jocs.css'

// Pas «Modalitat» del wizard: una targeta per modalitat, amb la seva icona i
// l'explicació de com es juga.
defineProps<{
  opcions: { id: T; icona: string; nom: string; desc: string }[]
  etiqueta: string
}>()

const triada = defineModel<T | null>({ required: true })
</script>

<template>
  <div class="joc-camp joc-modalitats" role="radiogroup" :aria-label="etiqueta">
    <button
      v-for="o in opcions"
      :key="o.id"
      type="button"
      role="radio"
      class="joc-targeta joc-opcio"
      :class="{ 'joc-targeta--actiu': triada === o.id }"
      :aria-checked="triada === o.id"
      @click="triada = o.id"
    >
      <span class="joc-opcio__icona" aria-hidden="true">{{ o.icona }}</span>
      <span class="joc-opcio__text">
        <span class="joc-opcio__nom">{{ o.nom }}</span>
        <span class="joc-opcio__desc">{{ o.desc }}</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.joc-modalitats {
  display: grid;
  gap: 10px;
}

.joc-opcio {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  text-align: left;
}

.joc-opcio__icona {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: var(--radi-md);
  background: var(--pedra-100);
  font-size: 1.5rem;
  transition: background var(--mou-rapid);
}

.joc-targeta--actiu .joc-opcio__icona {
  background: var(--color-marca-mig);
}

.joc-opcio__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.joc-opcio__nom {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.25;
}

.joc-opcio__desc {
  font-size: var(--text-sm);
  line-height: 1.35;
  color: var(--color-text-secundari);
}
</style>
