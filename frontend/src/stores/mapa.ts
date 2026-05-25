import { ref } from 'vue'
import { defineStore } from 'pinia'

// Zoom i centre inicials: Catalunya sencera visible
const ZOOM_INICIAL = 8
const CENTRE_INICIAL: [number, number] = [41.708, 1.738]

export const useMapaStore = defineStore('mapa', () => {
  const zoom = ref(ZOOM_INICIAL)
  const centre = ref<[number, number]>(CENTRE_INICIAL)

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

  return { zoom, centre, actualitzaZoom, actualitzaCentre, volaA }
})
