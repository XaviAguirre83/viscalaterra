import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export type Temporalitat = 'permanent' | 'recurrent' | 'puntual'

export const useFiltresStore = defineStore('filtres', () => {
  const categoriesActives = ref(new Set<string>())
  const temporalitat = ref<Temporalitat | null>(null)

  const teFiltresActius = computed(
    () => categoriesActives.value.size > 0 || temporalitat.value !== null
  )

  function toggleCategoria(categoria: string) {
    categoriesActives.value.has(categoria)
      ? categoriesActives.value.delete(categoria)
      : categoriesActives.value.add(categoria)
  }

  function setTemporalitat(t: Temporalitat | null) {
    temporalitat.value = t
  }

  function netejaTotsFiltres() {
    categoriesActives.value.clear()
    temporalitat.value = null
  }

  return {
    categoriesActives,
    temporalitat,
    teFiltresActius,
    toggleCategoria,
    setTemporalitat,
    netejaTotsFiltres,
  }
})
