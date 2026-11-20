<script setup lang="ts">
import InlinesLegal from './InlinesLegal.vue'
import type { BlocLegal } from '@/data/legal'

// Pinta un text legal ja analitzat (data/legal.ts): títols, paràgrafs i llistes.
defineProps<{ blocs: BlocLegal[] }>()
</script>

<template>
  <div class="text-legal">
    <template v-for="(b, i) in blocs" :key="i">
      <component :is="`h${b.nivell}`" v-if="b.tipus === 'titol'" :class="`titol-${b.nivell}`">
        <InlinesLegal :nodes="b.contingut" />
      </component>
      <p v-else-if="b.tipus === 'paragraf'"><InlinesLegal :nodes="b.contingut" /></p>
      <ul v-else>
        <li v-for="(e, j) in b.elements" :key="j"><InlinesLegal :nodes="e" /></li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.text-legal {
  color: var(--color-text);
  line-height: 1.6;
}

.titol-1 {
  font-family: var(--font-display);
  font-size: var(--text-titol, 1.7rem);
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-fort, #1a2635);
}

.titol-2 {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid var(--color-vora, #dfe4ea);
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-text-fort, #1a2635);
}

.titol-3 {
  margin-top: 20px;
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--color-text-fort, #1a2635);
}

p {
  margin-top: 10px;
}

ul {
  margin-top: 10px;
  padding-left: 1.3em;
}

li + li {
  margin-top: 6px;
}
</style>
