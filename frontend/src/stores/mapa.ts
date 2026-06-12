import { ref } from 'vue'
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
  // Demarcacions ja encertades: pintades permanentment amb el seu color de
  // tema i excloses del joc (ni hover ni clic).
  codisEncertats: string[]
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
  const nivellActiu = ref<NivellTerritorial>('provincies')

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

  function defineixNivellActiu(nivell: NivellTerritorial) {
    nivellActiu.value = nivell
  }

  return {
    zoom,
    centre,
    nivellActiu,
    actualitzaZoom,
    actualitzaCentre,
    volaA,
    defineixNivellActiu,
  }
})
