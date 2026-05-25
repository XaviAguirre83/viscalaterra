<script setup lang="ts">
import { useFiltresStore } from '@/stores/filtres'

const filtres = useFiltresStore()

// Categories basades en dades obertes d'equipaments i espais públics
// La llista definitiva es definirà quan s'integrin les fonts de dades
const CATEGORIES = [
  { codi: 'esports', etiqueta: 'Esports' },
  { codi: 'aire-lliure', etiqueta: 'Aire lliure' },
  { codi: 'cultura', etiqueta: 'Cultura' },
  { codi: 'educacio', etiqueta: 'Educació' },
  { codi: 'salut', etiqueta: 'Salut' },
  { codi: 'serveis', etiqueta: 'Serveis' },
  { codi: 'comercos', etiqueta: 'Comerços' },
] as const
</script>

<template>
  <div class="tab-que">
    <ul class="categories">
      <li v-for="cat in CATEGORIES" :key="cat.codi">
        <label>
          <input
            type="checkbox"
            :checked="filtres.categoriesActives.has(cat.codi)"
            @change="filtres.toggleCategoria(cat.codi)"
          />
          {{ cat.etiqueta }}
        </label>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.tab-que {
  min-width: 220px;
}

.categories {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.categories li label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #333;
  transition: background 0.1s;
}

.categories li label:hover {
  background: #f0f4f0;
}

.categories input[type='checkbox'] {
  accent-color: #2d6a2d;
  width: 16px;
  height: 16px;
  cursor: pointer;
}
</style>
