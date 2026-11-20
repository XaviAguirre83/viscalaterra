<script setup lang="ts">
import type { NodeInline } from '@/data/legal'

// Text d'una línia d'un text legal (vegeu data/legal.ts). Recursiu: la negreta i
// els enllaços porten els seus propis nodes a dins.
defineProps<{ nodes: NodeInline[] }>()
</script>

<template>
  <template v-for="(n, i) in nodes" :key="i">
    <template v-if="n.tipus === 'text'">{{ n.text }}</template>
    <code v-else-if="n.tipus === 'codi'" class="codi">{{ n.text }}</code>
    <strong v-else-if="n.tipus === 'negreta'"><InlinesLegal :nodes="n.fills" /></strong>
    <RouterLink v-else-if="n.tipus === 'enllac' && n.desti === 'intern'" :to="n.href" class="enllac"
      ><InlinesLegal :nodes="n.fills"
    /></RouterLink>
    <a
      v-else-if="n.tipus === 'enllac'"
      :href="n.href"
      class="enllac"
      :target="n.desti === 'web' ? '_blank' : undefined"
      :rel="n.desti === 'web' ? 'noopener noreferrer' : undefined"
      ><InlinesLegal :nodes="n.fills"
    /></a>
    <mark v-else class="pendent">PENDENT: {{ n.text }}</mark>
  </template>
</template>

<style scoped>
.codi {
  padding: 1px 5px;
  background: var(--pedra-100, #f1f0ec);
  border-radius: var(--radi-xs, 4px);
  font-size: 0.9em;
  overflow-wrap: anywhere;
}

.enllac {
  color: var(--verd-700);
  text-underline-offset: 2px;
  overflow-wrap: anywhere;
}

.enllac:hover {
  color: var(--verd-800);
}

.pendent {
  padding: 1px 6px;
  background: #fff3bf;
  border: 1px dashed #d9a400;
  border-radius: var(--radi-xs, 4px);
  color: #6b5200;
  font-size: 0.92em;
}
</style>
