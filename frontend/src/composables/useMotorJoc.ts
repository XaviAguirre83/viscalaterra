import { computed, ref } from 'vue'
import {
  creaPartida,
  partidaCompletada,
  passaRonda as passaRondaPartida,
  responRonda,
  type DadesPuntuacio,
  type EstatPartida,
  type ResultatRonda,
} from '@/data/partida'
import type { JugadorConfig } from '@/data/jugadors'

export type { JugadorConfig }

// Motor de partida comú als jocs (GeoFreak, Capital<>Comarca…). Cada joc en
// fa el seu store de Pinia: la configuració pròpia (modalitat, nivell…) +
// aquest motor, que no sap de què va el joc — només de codis que s'han
// d'encertar (lògica de rondes a @/data/partida).
//
// Fases del joc:
//   configuracio → wizard obert (jugadors, modalitat…).
//   preparacio   → compte enrere "3, 2, 1"; el cronòmetre encara no corre.
//   partida      → rondes en curs.
//   resultats    → tots els objectius encertats; modal de resultats.
//
// Multijugador local (1-4 al mateix dispositiu, mode CONQUESTA): els jugadors
// s'alternen RONDA a ronda sobre la mateixa bossa d'objectius. El torn es
// tanca amb encert, amb salt (3r error, o error amb pista) o amb Passa; els
// errors 1-2 mantenen el torn (i el seu rellotge corrent). Cada conquesta es
// pinta al mapa amb el color del jugador, i cada jugador té el seu
// cronòmetre, pausat mentre juguen els altres.
//
// S'ha de cridar dins la funció setup d'un store (defineStore): cada crida
// crea un estat propi.

export type FaseJoc = 'configuracio' | 'preparacio' | 'partida' | 'resultats'

// Estat viu d'un jugador durant la partida.
export interface EstatJugador extends JugadorConfig {
  conquestes: string[]
  errors: number
  encertsAmbPista: number
  // Pistes demanades, se n'encerti la ronda o no.
  pistes: number
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
  pistes: number
  segons: number
  punts: number
}

export interface OpcionsMotorJoc {
  // La configuració pròpia del joc permet començar la partida?
  configCompleta: () => boolean
  // Punts d'un jugador en acabar: cada joc hi posa el seu multiplicador
  // (vegeu `puntuacio` a @/data/partida).
  puntua: (dades: Required<DadesPuntuacio>) => number
}

export function useMotorJoc(opcions: OpcionsMotorJoc) {
  const fase = ref<FaseJoc>('configuracio')
  const partida = ref<EstatPartida | null>(null)

  // Pista de la ronda actual: les 4 opcions (objectiu + 3 distractors), o
  // null si no s'ha demanat. Es construeix a la vista (cada joc tria els
  // distractors propers a la seva manera) i s'activa aquí.
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

  // Quants objectius entren en joc (encertats + pendents + el de la ronda).
  const totalObjectius = computed(() => {
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
    if (fase.value !== 'resultats') return []
    return estatJugadors.value.map((j) => {
      const segons = j.tempsMs / 1000
      return {
        nom: j.nom,
        color: j.color,
        conquestes: j.conquestes.length,
        errors: j.errors,
        encertsAmbPista: j.encertsAmbPista,
        pistes: j.pistes,
        segons: Math.round(segons),
        punts: opcions.puntua({
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

  // 1-4 jugadors; amb un de sol el nom i el color poden ser buits.
  function defineixJugadors(nous: JugadorConfig[]) {
    if (nous.length < 1 || nous.length > 4) return
    jugadors.value = nous
  }

  // Prepara la partida (mapa ja en mode joc) sense arrencar el cronòmetre:
  // la vista hi mostra el compte enrere i crida arrencaPartida en acabar.
  function preparaPartida(codis: string[]) {
    if (!opcions.configCompleta() || codis.length === 0) return
    tornActual.value = 0
    estatJugadors.value = jugadors.value.map((j) => ({
      ...j,
      conquestes: [],
      errors: 0,
      encertsAmbPista: 0,
      pistes: 0,
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

  // Mutació immutable de l'estat del jugador del torn.
  function actualitzaJugadorActual(canvia: (j: EstatJugador) => EstatJugador) {
    estatJugadors.value = estatJugadors.value.map((j, i) =>
      i === tornActual.value ? canvia(j) : j
    )
  }

  // Activa la pista de la ronda (una per ronda; l'encert valdrà 0,5) i la
  // compta al jugador del torn.
  function activaPista(opcionsPista: string[]) {
    if (fase.value !== 'partida' || pista.value || opcionsPista.length === 0) return
    pista.value = opcionsPista
    actualitzaJugadorActual((j) => ({ ...j, pistes: j.pistes + 1 }))
  }

  // Tanca el torn: pausa el rellotge del jugador i, en multijugador, passa
  // al següent (cíclic). Si ja no queden objectius, la partida s'acaba.
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

  // Processa la resposta d'una ronda (clic al mapa o nom escrit); retorna el
  // resultat perquè la vista pugui donar feedback (flaix al mapa, sacseig…).
  function respon(codi: string): ResultatRonda {
    if (fase.value !== 'partida' || !partida.value) return 'ignorat'
    const teniaPista = pista.value !== null
    const { estat, resultat } = responRonda(partida.value, codi)
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

  // Reset de la partida i dels jugadors (el store hi afegeix el de la seva
  // configuració): el proper cop s'arrenca de zero.
  function reiniciaMotor() {
    fase.value = 'configuracio'
    partida.value = null
    pista.value = null
    pausada.value = false
    jugadors.value = [{ nom: '', color: '' }]
    estatJugadors.value = []
    tornActual.value = 0
  }

  return {
    fase,
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
    totalObjectius,
    tempsJugadorMs,
    resultats,
    punts,
    defineixJugadors,
    preparaPartida,
    arrencaPartida,
    comencaPartida,
    activaPista,
    respon,
    passaRonda,
    pausa,
    repren,
    tornaAConfiguracio,
    reiniciaMotor,
  }
}
