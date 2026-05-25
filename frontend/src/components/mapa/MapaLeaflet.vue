<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTerritorisStore } from '@/stores/territoris'
import { useMapaStore } from '@/stores/mapa'
import { temaPerProvincia, TEMA_NEUTRE } from '@/theme/provincies'

const territoris = useTerritorisStore()
const mapaStore = useMapaStore()

let mapa: L.Map | null = null
const capesGeoJSON: Record<string, L.GeoJSON> = {}
let mascaraCatalunya: L.Polygon | null = null

// Extensió geogràfica real de Catalunya (SW → NE)
const LIMITS_CATALUNYA: [[number, number], [number, number]] = [
  [40.51, 0.15],
  [42.86, 3.33],
]

// Calcula els maxBounds dinàmicament afegint mig viewport als límits reals de Catalunya,
// de manera que el centre del mapa sempre pugui arribar a qualsevol cantonada del territori
// independentment de la mida de la finestra o el nivell de zoom.
function actualitzaMaxBounds() {
  if (!mapa) return
  const b = mapa.getBounds()
  const halfLat = (b.getNorth() - b.getSouth()) / 2
  const halfLng = (b.getEast() - b.getWest()) / 2
  mapa.setMaxBounds([
    [LIMITS_CATALUNYA[0][0] - halfLat, LIMITS_CATALUNYA[0][1] - halfLng],
    [LIMITS_CATALUNYA[1][0] + halfLat, LIMITS_CATALUNYA[1][1] + halfLng],
  ])
}

// ── Estils ─────────────────────────────────────────────────────────────────

const ESTIL_BASE: L.PathOptions = {
  color: '#555',
  weight: 1,
  fillColor: '#c8d8a0',
  fillOpacity: 0.4,
}

type CodiFeature = {
  tipus: 'municipi' | 'comarca' | 'provincia'
  codi: string
  codiProvincia?: string
}

function codiDeFeature(feature: GeoJSON.Feature | undefined): CodiFeature | null {
  const props = feature?.properties
  if (!props) return null
  if (props.CODIMUNI) {
    return {
      tipus: 'municipi',
      codi: String(props.CODIMUNI),
      codiProvincia: props.CODIPROV ? String(props.CODIPROV) : undefined,
    }
  }
  if (props.CODICOMAR) return { tipus: 'comarca', codi: String(props.CODICOMAR) }
  if (props.CODIPROV) {
    return {
      tipus: 'provincia',
      codi: String(props.CODIPROV),
      codiProvincia: String(props.CODIPROV),
    }
  }
  return null
}

function estilSelecciotat(codiProvincia: string | undefined, total: boolean): L.PathOptions {
  const t = codiProvincia ? temaPerProvincia(codiProvincia) : TEMA_NEUTRE
  return {
    color: t.vora,
    weight: total ? 2 : 1.5,
    fillColor: total ? t.base : t.parcial,
    fillOpacity: total ? 0.7 : 0.55,
  }
}

function esSeleccionatFeature(info: CodiFeature): boolean {
  if (info.tipus === 'municipi') return territoris.municipisSeleccionats.has(info.codi)
  if (info.tipus === 'comarca') return territoris.estatSeleccioComarca(info.codi) !== 'cap'
  return territoris.estatSeleccioProvincia(info.codi) !== 'cap'
}

function estilPerFeature(feature: GeoJSON.Feature | undefined): L.PathOptions {
  const info = codiDeFeature(feature)
  if (!info) return ESTIL_BASE

  if (info.tipus === 'municipi') {
    if (!territoris.municipisSeleccionats.has(info.codi)) return ESTIL_BASE
    return estilSelecciotat(info.codiProvincia, true)
  }

  if (info.tipus === 'provincia') {
    const estat = territoris.estatSeleccioProvincia(info.codi)
    if (estat === 'cap') return ESTIL_BASE
    return estilSelecciotat(info.codiProvincia, estat === 'total')
  }

  // Comarca: a aquest nivell de zoom no sabem la provincia (les transfrontereres
  // tindrien dues). Usem el color neutre verd.
  const estat = territoris.estatSeleccioComarca(info.codi)
  if (estat === 'cap') return ESTIL_BASE
  return estilSelecciotat(undefined, estat === 'total')
}

function estilHoverPerFeature(feature: GeoJSON.Feature | undefined): L.PathOptions {
  const info = codiDeFeature(feature)
  if (!info) return { weight: 2, fillOpacity: 0.7 }

  const tema = info.codiProvincia ? temaPerProvincia(info.codiProvincia) : TEMA_NEUTRE

  // Si ja està seleccionat, mantenim el fillColor actual i només subratllem
  // la vora i augmentem l'opacitat per donar èmfasi.
  if (esSeleccionatFeature(info)) {
    return {
      color: tema.vora,
      weight: 2.5,
      fillOpacity: 0.85,
    }
  }

  // Si no està seleccionat, mostrem una previsualització amb el to suau de la provincia.
  return {
    color: tema.vora,
    weight: 2,
    fillColor: tema.parcial,
    fillOpacity: 0.6,
  }
}

// ── Màscara: destaca Catalunya, atenua la resta del món ───────────────────

async function carregaMascaraCatalunya() {
  if (!mapa || mascaraCatalunya) return

  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const res = await fetch(`${apiUrl}/api/geojson/comunitat?zoom=8`)
  if (!res.ok) return

  const dades = (await res.json()) as GeoJSON.FeatureCollection

  // Construïm un polígon: anell exterior = món sencer, anell interior = Catalunya.
  // L'anell interior es renderitza com a forat → tot el que queda fora de Catalunya
  // queda cobert per la màscara semitransparent.
  // Leaflet vol coordenades [lat, lng], mentre que GeoJSON les guarda com [lng, lat].
  const anellMon: L.LatLngExpression[] = [
    [-90, -180],
    [-90, 180],
    [90, 180],
    [90, -180],
  ]

  const forats: L.LatLngExpression[][] = []
  const aLatLng = (pos: GeoJSON.Position): L.LatLngTuple => [pos[1]!, pos[0]!]
  for (const feature of dades.features) {
    const geom = feature.geometry
    if (geom.type === 'Polygon') {
      forats.push(geom.coordinates[0]!.map(aLatLng))
    } else if (geom.type === 'MultiPolygon') {
      for (const poligon of geom.coordinates) {
        forats.push(poligon[0]!.map(aLatLng))
      }
    }
  }

  mascaraCatalunya = L.polygon([anellMon, ...forats], {
    color: 'transparent',
    fillColor: '#ffffff',
    fillOpacity: 0.55,
    interactive: false,
  }).addTo(mapa)
}

// ── Resolució per zoom (ha de coincidir amb el backend) ────────────────────

function resolucioPerZoom(zoom: number): number {
  if (zoom >= 15) return 5000
  if (zoom >= 13) return 100000
  if (zoom >= 11) return 250000
  if (zoom >= 9) return 500000
  return 1000000
}

function nivellPerZoom(zoom: number): string {
  if (zoom >= 11) return 'municipis'
  if (zoom >= 9) return 'comarques'
  return 'provincies'
}

// ── Càrrega de GeoJSON ─────────────────────────────────────────────────────

async function carregaCapa(zoom: number) {
  if (!mapa) return

  const nivell = nivellPerZoom(zoom)
  const resolucio = resolucioPerZoom(zoom)
  const clau = `${nivell}-${resolucio}`

  if (capesGeoJSON[clau]) {
    // Ja carregada: assegurem que és visible i la resta oculta
    Object.entries(capesGeoJSON).forEach(([k, capa]) => {
      if (k === clau) mapa!.addLayer(capa)
      else mapa!.removeLayer(capa)
    })
    return
  }

  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const res = await fetch(`${apiUrl}/api/geojson/${nivell}?zoom=${zoom}`)
  if (!res.ok) return

  const dades = await res.json()

  // Oculta les capes anteriors
  Object.values(capesGeoJSON).forEach((capa) => mapa!.removeLayer(capa))

  const capa = L.geoJSON(dades, {
    style: (feature) => estilPerFeature(feature),
    onEachFeature(feature, layer) {
      const pathLayer = layer as L.Path
      layer.on({
        mouseover() {
          pathLayer.setStyle(estilHoverPerFeature(feature))
        },
        mouseout() {
          pathLayer.setStyle(estilPerFeature(feature))
        },
        click() {
          gestionaClicFeature(feature)
        },
      })
    },
  }).addTo(mapa!)

  capesGeoJSON[clau] = capa
}

function gestionaClicFeature(feature: GeoJSON.Feature) {
  const info = codiDeFeature(feature)
  if (!info) return

  if (info.tipus === 'municipi') {
    const ja = territoris.municipisSeleccionats.has(info.codi)
    territoris.seleccionaMunicipi(info.codi, !ja)
  } else if (info.tipus === 'comarca') {
    const total = territoris.estatSeleccioComarca(info.codi) === 'total'
    territoris.seleccionaComarca(info.codi, !total)
  } else {
    const total = territoris.estatSeleccioProvincia(info.codi) === 'total'
    territoris.seleccionaProvincia(info.codi, !total)
  }
}

function actualitzaEstilsTotes() {
  Object.values(capesGeoJSON).forEach((capa) => {
    capa.eachLayer((layer) => {
      const geoLayer = layer as L.Path & { feature?: GeoJSON.Feature }
      if (geoLayer.feature) geoLayer.setStyle(estilPerFeature(geoLayer.feature))
    })
  })
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

onMounted(() => {
  const zoomInicial = mapaStore.zoom
  const centreInicial = mapaStore.centre

  mapa = L.map('mapa-contenidor', {
    center: centreInicial,
    zoom: zoomInicial,
    minZoom: zoomInicial,
    dragging: false,
    maxBoundsViscosity: 1.0,
    zoomControl: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(mapa)

  // Si el viewport cobreix tot Catalunya, el mapa és immòbil (no cal desplaçar-se).
  // Si no ho cobreix (finestra petita), permet el desplaçament per accedir a tot el territori.
  function actualitzaDragging() {
    if (!mapa) return
    if (mapa.getZoom() > zoomInicial) {
      mapa.dragging.enable()
      return
    }
    const b = mapa.getBounds()
    const [sw, ne] = LIMITS_CATALUNYA
    const cobreixTot =
      b.getSouth() <= sw[0] && b.getNorth() >= ne[0] && b.getWest() <= sw[1] && b.getEast() >= ne[1]
    if (cobreixTot) {
      mapa.dragging.disable()
    } else {
      mapa.dragging.enable()
    }
  }

  mapa.on('zoomend', () => {
    const zoom = mapa!.getZoom()
    mapaStore.actualitzaZoom(zoom)
    carregaCapa(zoom)
    actualitzaMaxBounds()
    if (zoom <= zoomInicial) {
      mapa!.setView(centreInicial, zoomInicial, { animate: true })
      mapa!.once('moveend', actualitzaDragging)
    } else {
      mapa!.dragging.enable()
    }
  })

  mapa.on('resize', () => {
    actualitzaMaxBounds()
    actualitzaDragging()
  })

  mapa.on('moveend', () => {
    const { lat, lng } = mapa!.getCenter()
    mapaStore.actualitzaCentre(lat, lng)
  })

  carregaMascaraCatalunya()
  carregaCapa(mapaStore.zoom)
  actualitzaMaxBounds()
  actualitzaDragging()
})

onUnmounted(() => {
  mapa?.remove()
  mapa = null
})

// Quan la selecció canvia des del selector On?, actualitza els colors del mapa
watch(
  () => territoris.municipisSeleccionats.size,
  () => actualitzaEstilsTotes()
)
</script>

<template>
  <div id="mapa-contenidor" class="mapa-contenidor" />
</template>

<style scoped>
.mapa-contenidor {
  flex: 1;
  min-height: 0;
  width: 100%;
}
</style>
