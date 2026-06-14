import { ref } from 'vue'
import { defineStore } from 'pinia'

// Opcions de visualització del mapa de Cerca (panell ⚙️). Pensat per créixer:
// avui escut/bandera, demà més capes. L'estat persisteix mentre dura la sessió.

export const useMapaOpcionsStore = defineStore('mapaOpcions', () => {
  const panelObert = ref(false)
  const mostraEscut = ref(false)
  const mostraBandera = ref(false)

  function alterna() {
    panelObert.value = !panelObert.value
  }

  return { panelObert, mostraEscut, mostraBandera, alterna }
})
