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
//   configuracio → wizard obert (jugadors → modalitat → nivell/territori).
//   preparacio   → compte enrere "3, 2, 1" amb el mapa ja enquadrat; el
//                  cronòmetre encara no corre.
//   partida      → rondes en curs sobre el mapa (lògica a @/data/geofreak).
//   resultats    → totes les demarcacions conquerides; modal de resultats.
//
// Multijugador local (1-4 al mateix dispositiu, mode CONQUESTA): els jugadors
// s'alternen RONDA a ronda sobre la mateixa bossa de demarcacions. El torn es
// tanca amb encert, amb salt (3r error, o error amb pista) o amb Passa; els
// errors 1-2 mantenen el torn (i el teu rellotge corrent). Cada conquesta es
// pinta al mapa amb el color del jugador, i cada jugador té el seu cronòmetre,
// pausat mentre juguen els altres.

export type FaseJoc = 'configuracio' | 'preparacio' | 'partida' | 'resultats'

// Jugador tal com surt del wizard (el color pinta les seves conquestes).
export interface JugadorConfig {
  nom: string
  color: string
}

// Estat viu d'un jugador durant la partida.
export interface EstatJugador extends JugadorConfig {
  conquestes: string[]
  errors: number
  encertsAmbPista: number
  // Temps acumulat dels SEUS torns tancats (el segment en curs es calcula a part).
  tempsMs: number
}

// Fila de la classificació final.
export interface ResultatJugador {
  nom: string
  color: string
  conquestes: number
  errors: number
  encertsAmbPista: number
  segons: number
  punts: number
}

export const useGeofreakStore = defineStore('geofreak', () => {
  const fase = ref<FaseJoc>('configuracio')
  const configuracio = ref<ConfiguracioGeoFreak>(configuracioBuida())
  const partida = ref<EstatPartida | null>(null)

  // Pista de la ronda actual: les 4 opcions (objectiu + 3 distractors), o
  // null si no s'ha demanat. Es construeix a la vista (necessita el store
  // territoris per triar distractors propers) i s'activa aquí.
  const pista = ref<string[] | null>(null)

  // Encerts consecutius sense error ni salt (per al 🔥 del HUD; només té
  // sentit amb un sol jugador — en multijugador es reinicia a cada torn).
  const ratxa = ref(0)

  const jugadors = ref<JugadorConfig[]>([{ nom: '', color: '' }])
  const estatJugadors = ref<EstatJugador[]>([])
  const tornActual = ref(0)
  // Inici del segment de torn en curs (per al rellotge per jugador).
  const marcaTornMs = ref(0)

  // Cronòmetre global (un sol jugador) i tancament de la partida.
  const tempsIniciMs = ref(0)
  const tempsFiMs = ref(0)

  // Pausa (p. ex. mentre l'app està bloquejada en landscape al mòbil): el
  // rellotge no ha de córrer. En reprendre, els instants de referència es
  // desplacen cap endavant per la durada pausada, de manera que els deltes
  // de temps transcorregut no es veuen afectats.
  const pausada = ref(false)
  const pausaIniciMs = ref(0)

  const esMultijugador = computed(() => jugadors.value.length > 1)
  const jugadorActual = computed(() => estatJugadors.value[tornActual.value] ?? null)

  // codi conquerit → color del jugador (per pintar el mapa en multijugador;
  // amb un sol jugador es pinta amb el color de tema de cada territori).
  const colorsConquestes = computed<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    if (!esMultijugador.value) return m
    estatJugadors.value.forEach((j) => {
      j.conquestes.forEach((codi) => {
        m[codi] = j.color
      })
    })
    return m
  })

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

  // Temps total (ms) del jugador i, incloent el segment de torn en curs.
  function tempsJugadorMs(i: number, araMs: number): number {
    const j = estatJugadors.value[i]
    if (!j) return 0
    const enCurs =
      fase.value === 'partida' && tornActual.value === i ? araMs - marcaTornMs.value : 0
    return j.tempsMs + enCurs
  }

  // Classificació final (en l'ordre dels jugadors; la vista l'ordena).
  const resultats = computed<ResultatJugador[]>(() => {
    if (fase.value !== 'resultats' || configuracio.value.nivell === null) return []
    const nivell = configuracio.value.nivell
    return estatJugadors.value.map((j) => {
      const segons = j.tempsMs / 1000
      return {
        nom: j.nom,
        color: j.color,
        conquestes: j.conquestes.length,
        errors: j.errors,
        encertsAmbPista: j.encertsAmbPista,
        segons: Math.round(segons),
        punts: calculaPunts({
          nivell,
          encerts: j.conquestes.length,
          errors: j.errors,
          segons,
          encertsAmbPista: j.encertsAmbPista,
        }),
      }
    })
  })

  // Puntuació del jugador únic (recompte animat del modal de resultats).
  const punts = computed(() => resultats.value[0]?.punts ?? 0)

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

  // 1-4 jugadors; amb un de sol el nom i el color poden ser buits.
  function defineixJugadors(nous: JugadorConfig[]) {
    if (nous.length < 1 || nous.length > 4) return
    jugadors.value = nous
  }

  // Prepara la partida (mapa ja en mode joc) sense arrencar el cronòmetre:
  // la vista hi mostra el compte enrere i crida arrencaPartida en acabar.
  function preparaPartida(codis: string[]) {
    if (!configCompleta.value || codis.length === 0) return
    tornActual.value = 0
    estatJugadors.value = jugadors.value.map((j) => ({
      ...j,
      conquestes: [],
      errors: 0,
      encertsAmbPista: 0,
      tempsMs: 0,
    }))
    partida.value = creaPartida(codis)
    pista.value = null
    ratxa.value = 0
    fase.value = 'preparacio'
  }

  function arrencaPartida() {
    if (fase.value !== 'preparacio') return
    tempsIniciMs.value = Date.now()
    tempsFiMs.value = 0
    marcaTornMs.value = Date.now()
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

  // Mutació immutable de l'estat del jugador del torn.
  function actualitzaJugadorActual(canvia: (j: EstatJugador) => EstatJugador) {
    estatJugadors.value = estatJugadors.value.map((j, i) =>
      i === tornActual.value ? canvia(j) : j
    )
  }

  // Tanca el torn: pausa el rellotge del jugador i, en multijugador, passa
  // al següent (cíclic). Si ja no queden demarcacions, la partida s'acaba.
  function tancaTorn() {
    const ara = Date.now()
    actualitzaJugadorActual((j) => ({ ...j, tempsMs: j.tempsMs + (ara - marcaTornMs.value) }))
    if (partida.value && partidaCompletada(partida.value)) {
      tempsFiMs.value = ara
      fase.value = 'resultats'
      return
    }
    if (esMultijugador.value) {
      tornActual.value = (tornActual.value + 1) % jugadors.value.length
      ratxa.value = 0
    }
    marcaTornMs.value = ara
  }

  // Processa la resposta d'una ronda; retorna el resultat perquè la vista
  // pugui donar feedback (flaix al mapa, sacseig del comptador, etc.).
  function clicDemarcacio(codi: string): ResultatClic {
    if (fase.value !== 'partida' || !partida.value) return 'ignorat'
    const teniaPista = pista.value !== null
    const { estat, resultat } = responClic(partida.value, codi)
    partida.value = estat

    if (resultat === 'encert') {
      actualitzaJugadorActual((j) => ({
        ...j,
        conquestes: [...j.conquestes, codi],
        encertsAmbPista: j.encertsAmbPista + (teniaPista ? 1 : 0),
      }))
      pista.value = null
      ratxa.value++
      tancaTorn()
      return 'encert'
    }

    if (resultat === 'error') {
      actualitzaJugadorActual((j) => ({ ...j, errors: j.errors + 1 }))
      ratxa.value = 0
      // Errar amb la pista activa salta la ronda (i tanca el torn): si no,
      // es podrien provar les 4 opcions una a una gairebé gratis.
      if (teniaPista) {
        partida.value = passaRondaPartida(estat)
        pista.value = null
        tancaTorn()
        return 'salt'
      }
      // Els intents 1-2 mantenen el torn (i el rellotge corrent).
      return 'error'
    }

    if (resultat === 'salt') {
      // 3r error de la ronda: compta l'error i el torn es tanca.
      actualitzaJugadorActual((j) => ({ ...j, errors: j.errors + 1 }))
      pista.value = null
      ratxa.value = 0
      tancaTorn()
      return 'salt'
    }

    return resultat
  }

  // Passa la ronda voluntàriament (l'objectiu tornarà a sortir; tanca el torn).
  function passaRonda() {
    if (fase.value !== 'partida' || !partida.value) return
    partida.value = passaRondaPartida(partida.value)
    pista.value = null
    ratxa.value = 0
    tancaTorn()
  }

  // Pausa el cronòmetre (només en partida). Idempotent.
  function pausa() {
    if (fase.value !== 'partida' || pausada.value) return
    pausada.value = true
    pausaIniciMs.value = Date.now()
  }

  // Reprèn després d'una pausa, desplaçant els instants de referència perquè
  // el temps pausat no compti. Idempotent.
  function repren() {
    if (!pausada.value) return
    const delta = Date.now() - pausaIniciMs.value
    tempsIniciMs.value += delta
    marcaTornMs.value += delta
    pausada.value = false
  }

  // Torna al wizard conservant la configuració (per retocar-la i repetir).
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
    pausada.value = false
    jugadors.value = [{ nom: '', color: '' }]
    estatJugadors.value = []
    tornActual.value = 0
  }

  return {
    fase,
    configuracio,
    partida,
    pista,
    ratxa,
    pausada,
    jugadors,
    estatJugadors,
    tornActual,
    marcaTornMs,
    esMultijugador,
    jugadorActual,
    colorsConquestes,
    tempsIniciMs,
    tempsFiMs,
    configCompleta,
    nivellActual,
    totalDemarcacions,
    tempsJugadorMs,
    resultats,
    punts,
    defineixModalitat,
    defineixNivell,
    defineixContenidor,
    defineixJugadors,
    preparaPartida,
    arrencaPartida,
    comencaPartida,
    activaPista,
    clicDemarcacio,
    passaRonda,
    pausa,
    repren,
    tornaAConfiguracio,
    reinicia,
  }
})
