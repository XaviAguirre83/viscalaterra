import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// Zoom i centre inicials: Catalunya sencera visible
const ZOOM_INICIAL = 8
const CENTRE_INICIAL: [number, number] = [41.708, 1.738]

export type NivellTerritorial = 'provincies' | 'vegueries' | 'comarques' | 'municipis'

// Configuració del mode joc del mapa (GeoFreak): la capa que es juga, el
// territori contenidor on s'enquadra el mapa (null = tota Catalunya) i els
// codis de les features jugables (null = totes les de la capa).
export interface ModeJocMapa {
  nivell: NivellTerritorial
  contenidor: { nivell: NivellTerritorial; codi: string } | null
  codisPermesos: string[] | null
  // Demarcacions ja encertades: pintades permanentment i excloses del joc
  // (ni hover ni clic).
  codisEncertats: string[]
  // Mode conquesta (multijugador): codi → color del jugador que l'ha
  // encertada. null o absent = pintar amb el color de tema del territori.
  colorsEncertats: Record<string, string> | null
  // Demarcació il·luminada com a pregunta («Com es diu...?»). A «On és...?»
  // és sempre null: l'objectiu és secret.
  codiObjectiu: string | null
  // Pista activa a «On és...?»: els 4 candidats (objectiu + 3 distractors).
  // Quan és informat, només aquests responen al hover/clic; la resta s'atenua.
  codisPista: string[] | null
  // false = el jugador no respon clicant el mapa («Com es diu...?» escriu):
  // les features no reaccionen ni al hover ni al clic.
  interactiu: boolean
}

export const useMapaStore = defineStore('mapa', () => {
  const zoom = ref(ZOOM_INICIAL)
  const centre = ref<[number, number]>(CENTRE_INICIAL)

  // Capes de delimitació visibles (combinació LLIURE): cada tipus s'activa o
  // desactiva independentment. El subratllat del panell marca les visibles.
  // Per defecte, només províncies.
  const capesVisibles = ref<Set<NivellTerritorial>>(new Set<NivellTerritorial>(['provincies']))

  // De més contenidor a més fi. La capa interactiva (hover/clic per seleccionar
  // territori) és la més FINA de les visibles.
  const ORDRE: NivellTerritorial[] = ['provincies', 'vegueries', 'comarques', 'municipis']

  const nivellInteractiu = computed<NivellTerritorial | null>(() => {
    for (let i = ORDRE.length - 1; i >= 0; i--) {
      if (capesVisibles.value.has(ORDRE[i]!)) return ORDRE[i]!
    }
    return null
  })

  function esVisible(nivell: NivellTerritorial): boolean {
    return capesVisibles.value.has(nivell)
  }

  function alternaCapa(nivell: NivellTerritorial) {
    // Es reassigna el Set (nova identitat) perquè els watchers reaccionin.
    const nou = new Set(capesVisibles.value)
    if (nou.has(nivell)) nou.delete(nivell)
    else nou.add(nivell)
    capesVisibles.value = nou
  }

  function actualitzaZoom(nouZoom: number) {
    zoom.value = nouZoom
  }

  function actualitzaCentre(lat: number, lng: number) {
    centre.value = [lat, lng]
  }

  function volaA(lat: number, lng: number, nouZoom?: number) {
    centre.value = [lat, lng]
    if (nouZoom !== undefined) zoom.value = nouZoom
  }

  return {
    zoom,
    centre,
    capesVisibles,
    nivellInteractiu,
    esVisible,
    alternaCapa,
    actualitzaZoom,
    actualitzaCentre,
    volaA,
  }
})
