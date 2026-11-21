import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  calculaPunts,
  configuracioBuida,
  configuracioCompleta,
  type ConfiguracioCapitals,
  type ModalitatCapitals,
} from '@/data/capitalComarca'
import { useMotorJoc } from '@/composables/useMotorJoc'

// Estat del joc Capital<>Comarca: la modalitat triada + el motor de partida
// comú (fases, jugadors i torns, rellotges, pausa, pista:
// composables/useMotorJoc.ts). Els objectius són codis de comarca en totes
// dues modalitats; la vista hi posa els noms (capital o comarca).

export const useCapitalComarcaStore = defineStore('capitalComarca', () => {
  const configuracio = ref<ConfiguracioCapitals>(configuracioBuida())
  const configCompleta = computed(() => configuracioCompleta(configuracio.value))

  const motor = useMotorJoc({
    configCompleta: () => configCompleta.value,
    puntua: calculaPunts,
  })

  function defineixModalitat(modalitat: ModalitatCapitals) {
    configuracio.value = { ...configuracio.value, modalitat }
  }

  // Reset complet (en sortir del joc): el proper cop s'arrenca de zero.
  function reinicia() {
    configuracio.value = configuracioBuida()
    motor.reiniciaMotor()
  }

  return {
    ...motor,
    configuracio,
    configCompleta,
    defineixModalitat,
    reinicia,
  }
})
