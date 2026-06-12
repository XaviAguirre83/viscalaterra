import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  calculaPunts,
  configuracioBuida,
  configuracioCompleta,
  creaPartida,
  nivellPerId,
  partidaCompletada,
  passaRonda as passaRondaPartida,
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
//   preparacio   → compte enrere "3, 2, 1" amb el mapa ja enquadrat; el
//                  cronòmetre encara no corre.
//   partida      → rondes en curs sobre el mapa (lògica a @/data/geofreak).
//   resultats    → partida completada, modal de resultats amb la puntuació.

export type FaseJoc = 'configuracio' | 'preparacio' | 'partida' | 'resultats'

export const useGeofreakStore = defineStore('geofreak', () => {
  const fase = ref<FaseJoc>('configuracio')
  const configuracio = ref<ConfiguracioGeoFreak>(configuracioBuida())
  const partida = ref<EstatPartida | null>(null)

  // Pista de la ronda actual: les 4 opcions (objectiu + 3 distractors), o
  // null si no s'ha demanat. Es construeix a la vista (necessita el store
  // territoris per triar distractors propers) i s'activa aquí.
  const pista = ref<string[] | null>(null)
  const encertsAmbPista = ref(0)

  // Encerts consecutius sense error ni salt (per al 🔥 del HUD).
  const ratxa = ref(0)

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
      encertsAmbPista: encertsAmbPista.value,
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
  // Prepara la partida (mapa ja en mode joc) sense arrencar el cronòmetre:
  // la vista hi mostra el compte enrere i crida arrencaPartida en acabar.
  function preparaPartida(codis: string[]) {
    if (!configCompleta.value || codis.length === 0) return
    partida.value = creaPartida(codis)
    pista.value = null
    encertsAmbPista.value = 0
    ratxa.value = 0
    fase.value = 'preparacio'
  }

  function arrencaPartida() {
    if (fase.value !== 'preparacio') return
    tempsIniciMs.value = Date.now()
    tempsFiMs.value = 0
    fase.value = 'partida'
  }

  // Arrencada directa sense compte enrere (tests i usos programàtics).
  function comencaPartida(codis: string[]) {
    preparaPartida(codis)
    arrencaPartida()
  }

  // Activa la pista de la ronda (una per ronda; l'encert valdrà 0,5).
  function activaPista(opcions: string[]) {
    if (fase.value !== 'partida' || pista.value || opcions.length === 0) return
    pista.value = opcions
  }

  // Processa el clic sobre una demarcació jugable; retorna el resultat perquè
  // la vista pugui donar feedback (sacseig del comptador d'errors, etc.).
  function clicDemarcacio(codi: string): ResultatClic {
    if (fase.value !== 'partida' || !partida.value) return 'ignorat'
    const { estat, resultat } = responClic(partida.value, codi)
    partida.value = estat
    if (resultat === 'encert') {
      // L'encert tanca la ronda: si hi havia pista, compta mig encert.
      if (pista.value) encertsAmbPista.value++
      pista.value = null
      ratxa.value++
    }
    if (resultat === 'error') {
      ratxa.value = 0
      // Errar amb la pista activa salta la ronda: si no, es podrien provar
      // les 4 opcions una a una i l'encert sortiria gairebé garantit.
      if (pista.value) {
        partida.value = passaRondaPartida(estat)
        pista.value = null
        return 'salt'
      }
    }
    // El salt (3r error de la ronda) també canvia d'objectiu: pista fora.
    if (resultat === 'salt') {
      pista.value = null
      ratxa.value = 0
    }
    if (partidaCompletada(estat)) {
      tempsFiMs.value = Date.now()
      fase.value = 'resultats'
    }
    return resultat
  }

  // Passa la ronda voluntàriament (l'objectiu tornarà a sortir més endavant).
  function passaRonda() {
    if (fase.value !== 'partida' || !partida.value) return
    partida.value = passaRondaPartida(partida.value)
    pista.value = null
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
    pista.value = null
  }

  // Reset complet (en sortir del joc): el proper cop s'arrenca de zero.
  function reinicia() {
    fase.value = 'configuracio'
    configuracio.value = configuracioBuida()
    partida.value = null
    pista.value = null
  }

  return {
    fase,
    configuracio,
    partida,
    pista,
    encertsAmbPista,
    ratxa,
    tempsIniciMs,
    tempsFiMs,
    configCompleta,
    nivellActual,
    totalDemarcacions,
    punts,
    defineixModalitat,
    defineixNivell,
    defineixContenidor,
    preparaPartida,
    arrencaPartida,
    comencaPartida,
    activaPista,
    clicDemarcacio,
    passaRonda,
    tornaAJugar,
    tornaAConfiguracio,
    reinicia,
  }
})
