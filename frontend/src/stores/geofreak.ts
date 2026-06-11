import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  calculaPunts,
  configuracioBuida,
  configuracioCompleta,
  creaPartida,
  nivellPerId,
  partidaCompletada,
  responClic,
  type ConfiguracioGeoFreak,
  type EstatPartida,
  type ModalitatJoc,
  type ResultatClic,
} from '@/data/geofreak'

// Estat del joc GeoFreak. Independent dels stores de cerca (filtres/territoris):
// jugar no toca mai la selecció territorial de l'usuari.
//
// Fases del joc:
//   configuracio → modal obert, l'usuari tria modalitat/nivell/contenidor.
//   partida      → rondes en curs sobre el mapa (lògica a @/data/geofreak).
//   resultats    → partida completada, modal de resultats amb la puntuació.

export type FaseJoc = 'configuracio' | 'partida' | 'resultats'

export const useGeofreakStore = defineStore('geofreak', () => {
  const fase = ref<FaseJoc>('configuracio')
  const configuracio = ref<ConfiguracioGeoFreak>(configuracioBuida())
  const partida = ref<EstatPartida | null>(null)

  // Cronòmetre: el store guarda els instants; la vista fa el tic-tac visual.
  const tempsIniciMs = ref(0)
  const tempsFiMs = ref(0)

  const configCompleta = computed(() => configuracioCompleta(configuracio.value))

  // Metadades del nivell triat (demarcació que s'endevina, contenidor que cal).
  const nivellActual = computed(() =>
    configuracio.value.nivell !== null ? (nivellPerId(configuracio.value.nivell) ?? null) : null
  )

  const totalDemarcacions = computed(() => {
    const p = partida.value
    if (!p) return 0
    return p.pendents.length + p.encertades.length + (p.objectiu ? 1 : 0)
  })

  const punts = computed(() => {
    const p = partida.value
    if (!p || fase.value !== 'resultats' || configuracio.value.nivell === null) return 0
    return calculaPunts({
      nivell: configuracio.value.nivell,
      encerts: p.encertades.length,
      errors: p.errors,
      segons: (tempsFiMs.value - tempsIniciMs.value) / 1000,
    })
  })

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

  // Arrenca les rondes. `codis` = demarcacions jugables (la vista les resol
  // a partir del store territoris segons nivell + contenidor).
  function comencaPartida(codis: string[]) {
    if (!configCompleta.value || codis.length === 0) return
    partida.value = creaPartida(codis)
    tempsIniciMs.value = Date.now()
    tempsFiMs.value = 0
    fase.value = 'partida'
  }

  // Processa el clic sobre una demarcació jugable; retorna el resultat perquè
  // la vista pugui donar feedback (sacseig del comptador d'errors, etc.).
  function clicDemarcacio(codi: string): ResultatClic {
    if (fase.value !== 'partida' || !partida.value) return 'ignorat'
    const { estat, resultat } = responClic(partida.value, codi)
    partida.value = estat
    if (partidaCompletada(estat)) {
      tempsFiMs.value = Date.now()
      fase.value = 'resultats'
    }
    return resultat
  }

  // Rejuga amb la mateixa configuració (des del modal de resultats).
  function tornaAJugar(codis: string[]) {
    fase.value = 'configuracio'
    comencaPartida(codis)
  }

  // Torna al modal conservant la configuració (per retocar-la i repetir).
  function tornaAConfiguracio() {
    fase.value = 'configuracio'
    partida.value = null
  }

  // Reset complet (en sortir del joc): el proper cop s'arrenca de zero.
  function reinicia() {
    fase.value = 'configuracio'
    configuracio.value = configuracioBuida()
    partida.value = null
  }

  return {
    fase,
    configuracio,
    partida,
    tempsIniciMs,
    tempsFiMs,
    configCompleta,
    nivellActual,
    totalDemarcacions,
    punts,
    defineixModalitat,
    defineixNivell,
    defineixContenidor,
    comencaPartida,
    clicDemarcacio,
    tornaAJugar,
    tornaAConfiguracio,
    reinicia,
  }
})
