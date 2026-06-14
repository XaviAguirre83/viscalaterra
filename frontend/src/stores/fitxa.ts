import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useEnriquimentStore, type Enriquiment } from '@/stores/enriquiment'
import type { NivellTerritorial } from '@/stores/mapa'

// Estat de la fitxa de territori oberta (enllaços + escut). Les dades vénen
// del store compartit `enriquiment`; aquí només es gestiona quina fitxa està
// oberta, perquè qualsevol component (mapa, cercador) pugui obrir-la i
// FitxaTerritori la renderitzi.

export interface ObjectiuFitxa {
  nivell: NivellTerritorial
  // CODIMUNI (municipis) o CODIPROV (provincies); per a comarques s'ignora.
  codi: string
  nom: string
}

export const useFitxaStore = defineStore('fitxa', () => {
  const enriquimentStore = useEnriquimentStore()

  const objectiu = ref<ObjectiuFitxa | null>(null)
  const obert = computed(() => objectiu.value !== null)
  const carregant = computed(() => enriquimentStore.carregant)

  const enriquiment = computed<Enriquiment | null>(() => {
    const o = objectiu.value
    if (!o) return null
    return enriquimentStore.busca(o.nivell, o.codi, o.nom)
  })

  function obre(t: ObjectiuFitxa) {
    objectiu.value = t
    void enriquimentStore.carrega()
  }

  function tanca() {
    objectiu.value = null
  }

  return { objectiu, obert, carregant, enriquiment, obre, tanca }
})
