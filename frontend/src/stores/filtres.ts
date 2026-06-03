import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export type Temporalitat = 'permanent' | 'recurrent' | 'puntual'

export const useFiltresStore = defineStore('filtres', () => {
  // Conté els codis de subtema (la unitat mínima de selecció del Què?).
  const categoriesActives = ref(new Set<string>())
  const temporalitat = ref<Temporalitat | null>(null)

  const teFiltresActius = computed(
    () => categoriesActives.value.size > 0 || temporalitat.value !== null
  )

  function toggleSubtema(codi: string, seleccionat: boolean) {
    if (seleccionat) categoriesActives.value.add(codi)
    else categoriesActives.value.delete(codi)
  }

  // Selecció bulk d'un tema sencer: assigna un nou Set en una sola operació
  // (com el store territoris) per disparar la reactivitat de Vue un sol cop.
  function seleccionaTema(codisSubtemes: string[], seleccionat: boolean) {
    const s = new Set(categoriesActives.value)
    codisSubtemes.forEach((c) => (seleccionat ? s.add(c) : s.delete(c)))
    categoriesActives.value = s
  }

  function estatTema(codisSubtemes: string[]): 'cap' | 'parcial' | 'total' {
    if (codisSubtemes.length === 0) return 'cap'
    const sel = codisSubtemes.filter((c) => categoriesActives.value.has(c)).length
    if (sel === 0) return 'cap'
    if (sel === codisSubtemes.length) return 'total'
    return 'parcial'
  }

  function setTemporalitat(t: Temporalitat | null) {
    temporalitat.value = t
  }

  function netejaCategories() {
    categoriesActives.value = new Set()
  }

  function netejaTotsFiltres() {
    categoriesActives.value = new Set()
    temporalitat.value = null
  }

  return {
    categoriesActives,
    temporalitat,
    teFiltresActius,
    toggleSubtema,
    seleccionaTema,
    estatTema,
    setTemporalitat,
    netejaCategories,
    netejaTotsFiltres,
  }
})
