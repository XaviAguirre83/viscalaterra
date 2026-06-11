import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  configuracioBuida,
  configuracioCompleta,
  nivellPerId,
  type ConfiguracioGeoFreak,
  type ModalitatJoc,
} from '@/data/geofreak'

// Estat del joc GeoFreak. Independent dels stores de cerca (filtres/territoris):
// jugar no toca mai la selecció territorial de l'usuari.
//
// Fases del joc:
//   configuracio → modal obert, l'usuari tria modalitat/nivell/contenidor.
//   partida      → partida en curs sobre el mapa (lògica de rondes: fase 3).

export type FaseJoc = 'configuracio' | 'partida'

export const useGeofreakStore = defineStore('geofreak', () => {
  const fase = ref<FaseJoc>('configuracio')
  const configuracio = ref<ConfiguracioGeoFreak>(configuracioBuida())

  const configCompleta = computed(() => configuracioCompleta(configuracio.value))

  // Metadades del nivell triat (demarcació que s'endevina, contenidor que cal).
  const nivellActual = computed(() =>
    configuracio.value.nivell !== null ? (nivellPerId(configuracio.value.nivell) ?? null) : null
  )

  // Les accions reassignen l'objecte sencer (patró dels stores filtres/territoris):
  // una sola operació reactiva per canvi.

  function defineixModalitat(modalitat: ModalitatJoc) {
    configuracio.value = { ...configuracio.value, modalitat }
  }

  // Canviar de nivell invalida el contenidor triat: el nou nivell pot demanar
  // un contenidor d'un altre tipus (o cap), i un codi residual seria incoherent.
  function defineixNivell(nivell: number) {
    configuracio.value = { ...configuracio.value, nivell, codiContenidor: null }
  }

  function defineixContenidor(codiContenidor: string | null) {
    configuracio.value = { ...configuracio.value, codiContenidor }
  }

  function comencaPartida() {
    if (!configCompleta.value) return
    fase.value = 'partida'
  }

  // Torna al modal conservant la configuració (per retocar-la i repetir).
  function tornaAConfiguracio() {
    fase.value = 'configuracio'
  }

  // Reset complet (en sortir del joc): el proper cop s'arrenca de zero.
  function reinicia() {
    fase.value = 'configuracio'
    configuracio.value = configuracioBuida()
  }

  return {
    fase,
    configuracio,
    configCompleta,
    nivellActual,
    defineixModalitat,
    defineixNivell,
    defineixContenidor,
    comencaPartida,
    tornaAConfiguracio,
    reinicia,
  }
})
