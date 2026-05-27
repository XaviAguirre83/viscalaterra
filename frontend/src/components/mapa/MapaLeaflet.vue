<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTerritorisStore } from '@/stores/territoris'
import { useMapaStore, type NivellTerritorial } from '@/stores/mapa'
import { temaPerProvincia, TEMA_NEUTRE } from '@/theme/provincies'

const territoris = useTerritorisStore()
const mapaStore = useMapaStore()

let mapa: L.Map | null = null
let mascaraCatalunya: L.Polygon | null = null

// Capes actualment visibles per nivell (al màxim, una per nivell).
const capesActives: Record<NivellTerritorial, L.GeoJSON | null> = {
  provincies: null,
  vegueries: null,
  comarques: null,
  municipis: null,
}
// Cache de capes carregades per (nivell, resolució) — evita re-fetch en canviar zoom.
const cacheLayers: Record<string, L.GeoJSON> = {}

// ── Sistema de nivells ─────────────────────────────────────────────────────
// El selector del mapa determina el "Nivell 1" (capa activa, interactiva, més
// prominent). La resta de nivells es distribueixen segons la matriu del pla:
//   Selector → ordre de prominència [Nivell 1, 2, 3, 4]
const NIVELLS_ORDRE: Record<NivellTerritorial, NivellTerritorial[]> = {
  provincies: ['provincies', 'vegueries', 'comarques', 'municipis'],
  vegueries: ['vegueries', 'provincies', 'comarques', 'municipis'],
  comarques: ['comarques', 'provincies', 'vegueries', 'municipis'],
  municipis: ['municipis', 'provincies', 'vegueries', 'comarques'],
}

const ESTIL_NIVELL: Record<number, { weight: number; opacity: number }> = {
  1: { weight: 2, opacity: 1.0 },
  2: { weight: 1.5, opacity: 0.6 },
  3: { weight: 1, opacity: 0.4 },
  4: { weight: 0.5, opacity: 0.4 },
}

function nivellNumero(capa: NivellTerritorial): number {
  return NIVELLS_ORDRE[mapaStore.nivellActiu].indexOf(capa) + 1
}

// ── Extracció de codis ─────────────────────────────────────────────────────

interface InfoFeature {
  codi: string
  codiProvincia?: string
}

function codiDeFeature(
  feature: GeoJSON.Feature | undefined,
  nivell: NivellTerritorial
): InfoFeature | null {
  const props = feature?.properties
  if (!props) return null
  switch (nivell) {
    case 'municipis':
      return {
        codi: String(props.CODIMUNI),
        codiProvincia: props.CODIPROV ? String(props.CODIPROV) : undefined,
      }
    case 'comarques':
      return { codi: String(props.CODICOMAR) }
    case 'vegueries':
      return { codi: String(props.CODIVEGUE) }
    case 'provincies':
      return { codi: String(props.CODIPROV), codiProvincia: String(props.CODIPROV) }
  }
}

function estatSeleccioFeature(
  info: InfoFeature,
  nivell: NivellTerritorial
): 'cap' | 'parcial' | 'total' {
  switch (nivell) {
    case 'municipis':
      return territoris.municipisSeleccionats.has(info.codi) ? 'total' : 'cap'
    case 'comarques':
      return territoris.estatSeleccioComarca(info.codi)
    case 'vegueries':
      return territoris.estatSeleccioVegueria(info.codi)
    case 'provincies':
      return territoris.estatSeleccioProvincia(info.codi)
  }
}

// ── Sistema de panes territorials ──────────────────────────────────────────
//
// Per què panes? Leaflet 1.9.4 NO actualitza `pointer-events` via `setStyle`.
// I amb `fillOpacity:0`, el CSS per defecte fa que NOMÉS la vora del polígon
// sigui clicable — l'interior no respon.
//
// Cada capa territorial té el seu propi pane (un `<div>` contenidor amb
// z-index). El pane actiu rep la classe `.territori-actiu`, i el CSS d'aquest
// fitxer aplica `pointer-events: fill` només als paths d'aquest pane (interior
// del polígon clicable) i `pointer-events: none` als de la resta — els events
// travessen cap al pane actiu encara que aquest estigui per sota en z-order.
//
// Important: NO usem `pane.style.pointerEvents = 'none'` al pare div, perquè
// un fill amb `pointer-events != none` el sobreescriu, i els municipis (al
// front) capturarien tots els events.

const PANE_NOMS: Record<NivellTerritorial, string> = {
  provincies: 'territori-provincies',
  vegueries: 'territori-vegueries',
  comarques: 'territori-comarques',
  municipis: 'territori-municipis',
}

// Z-order: de més gran (fons) a més petit (front). Així les vores dels
// territoris més petits queden visibles per sobre dels farcits dels més grans.
// Leaflet reserva 200 (tiles), 400 (overlay), 500+ (markers/popups).
// Anem entre 410 i 440 — per sobre del overlayPane (màscara) i sota markers.
const PANE_Z_INDEX: Record<NivellTerritorial, number> = {
  provincies: 410,
  vegueries: 420,
  comarques: 430,
  municipis: 440,
}

function creaPanesTerritorials() {
  if (!mapa) return
  ;(Object.keys(PANE_NOMS) as NivellTerritorial[]).forEach((nivell) => {
    const nom = PANE_NOMS[nivell]
    if (!mapa!.getPane(nom)) {
      const pane = mapa!.createPane(nom)
      pane.style.zIndex = String(PANE_Z_INDEX[nivell])
    }
  })
}

function actualitzaInteractivitatPanes() {
  if (!mapa) return
  const actiu = mapaStore.nivellActiu
  ;(Object.keys(PANE_NOMS) as NivellTerritorial[]).forEach((nivell) => {
    const pane = mapa!.getPane(PANE_NOMS[nivell])
    if (!pane) return
    // Una classe CSS marca el pane actiu. El CSS només aplica pointer-events:fill
    // als paths d'aquesta classe — els paths dels altres panes reben none i deixen
    // que els events travessin fins al pane actiu (encara que estiguin per davant).
    pane.classList.toggle('territori-actiu', nivell === actiu)
  })
}

// ── Estils ─────────────────────────────────────────────────────────────────

function estilPerFeature(
  feature: GeoJSON.Feature | undefined,
  nivell: NivellTerritorial
): L.PathOptions {
  const info = codiDeFeature(feature, nivell)
  const num = nivellNumero(nivell)
  const { weight, opacity } = ESTIL_NIVELL[num]!

  // Estil base: vora gris, sense farcit. La interactivitat la gestiona el pane.
  const baseEstil: L.PathOptions = {
    color: '#555',
    weight,
    opacity,
    fillOpacity: 0,
  }

  if (!info) return baseEstil

  const esCapaActiva = nivell === mapaStore.nivellActiu

  // ── Únicament la capa de municipis mostra farcit de color ──────────────────
  // Les capes superiors (comarca, vegueria, província) mantenen fillOpacity:0
  // sempre. La selecció es veu pintada als municipis individuals, independentment
  // del nivell que s'hagi usat per seleccionar-los.
  if (nivell === 'municipis') {
    const estat = estatSeleccioFeature(info, 'municipis')
    if (estat === 'cap') return baseEstil
    const tema = info.codiProvincia ? temaPerProvincia(info.codiProvincia) : TEMA_NEUTRE
    const total = estat === 'total'
    return {
      color: tema.vora,
      weight,
      opacity,
      fillColor: total ? tema.base : tema.parcial,
      fillOpacity: total ? 0.7 : 0.55,
    }
  }

  // Capes superiors: sense farcit. Si és la capa activa i té selecció, destaca
  // la vora amb el color temàtic per indicar que conté territori seleccionat.
  if (esCapaActiva) {
    const estat = estatSeleccioFeature(info, nivell)
    if (estat !== 'cap') {
      const tema = info.codiProvincia ? temaPerProvincia(info.codiProvincia) : TEMA_NEUTRE
      return {
        ...baseEstil,
        color: tema.vora,
        weight: weight + 0.5,
        opacity: 1,
      }
    }
  }

  return baseEstil
}

function estilHoverPerFeature(
  feature: GeoJSON.Feature | undefined,
  nivell: NivellTerritorial
): L.PathOptions {
  const info = codiDeFeature(feature, nivell)
  if (!info) return {}

  const num = nivellNumero(nivell)
  const { opacity } = ESTIL_NIVELL[num]!
  const tema = info.codiProvincia ? temaPerProvincia(info.codiProvincia) : TEMA_NEUTRE

  // Municipis: farcit intens en hover (única capa amb farcit persistent a selecció).
  if (nivell === 'municipis') {
    const estaSeleccionat = estatSeleccioFeature(info, nivell) !== 'cap'
    if (estaSeleccionat) {
      return { color: tema.vora, weight: 3, opacity, fillOpacity: 0.85 }
    }
    return {
      color: tema.vora,
      weight: 2.5,
      opacity,
      fillColor: tema.parcial,
      fillOpacity: 0.55,
    }
  }

  // Capes superiors (comarca, vegueria, província):
  // Farcit subtil en hover per feedback visual; en mouseout estilPerFeature
  // restaura fillOpacity:0. pointer-events no canvia (gestionat per separat).
  return {
    color: tema.vora,
    weight: 2.5,
    opacity: 1,
    fillColor: tema.parcial,
    fillOpacity: 0.25,
  }
}

// ── Gestió de clic ─────────────────────────────────────────────────────────

function gestionaClicFeature(feature: GeoJSON.Feature, nivell: NivellTerritorial) {
  const info = codiDeFeature(feature, nivell)
  if (!info) return
  switch (nivell) {
    case 'municipis': {
      const ja = territoris.municipisSeleccionats.has(info.codi)
      territoris.seleccionaMunicipi(info.codi, !ja)
      break
    }
    case 'comarques': {
      const total = territoris.estatSeleccioComarca(info.codi) === 'total'
      territoris.seleccionaComarca(info.codi, !total)
      break
    }
    case 'vegueries': {
      const total = territoris.estatSeleccioVegueria(info.codi) === 'total'
      territoris.seleccionaVegueria(info.codi, !total)
      break
    }
    case 'provincies': {
      const total = territoris.estatSeleccioProvincia(info.codi) === 'total'
      territoris.seleccionaProvincia(info.codi, !total)
      break
    }
  }
}

// ── Límits geogràfics del mapa ─────────────────────────────────────────────

const LIMITS_CATALUNYA: [[number, number], [number, number]] = [
  [40.51, 0.15],
  [42.86, 3.33],
]

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

// ── Màscara: destaca Catalunya, atenua la resta del món ───────────────────

async function carregaMascaraCatalunya() {
  if (!mapa || mascaraCatalunya) return

  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  const res = await fetch(`${apiUrl}/api/geojson/comunitat?zoom=8`)
  if (!res.ok) return

  const dades = (await res.json()) as GeoJSON.FeatureCollection

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

// ── Resolució per nivell i zoom ────────────────────────────────────────────
// Cada nivell territorial té un rang sensat de resolucions:
// - Provincies/Vegueries: territoris grans, no cal màxim detall mai.
// - Comarques: detall mitjà.
// - Municipis: rang complet, fins a màxim detall a zoom alts.

function resolucioPerCapa(nivell: NivellTerritorial, zoom: number): number {
  if (nivell === 'provincies' || nivell === 'vegueries') {
    if (zoom >= 11) return 250000
    return 1000000
  }
  if (nivell === 'comarques') {
    if (zoom >= 13) return 100000
    if (zoom >= 11) return 250000
    if (zoom >= 9) return 500000
    return 1000000
  }
  // municipis
  if (zoom >= 15) return 5000
  if (zoom >= 13) return 100000
  if (zoom >= 11) return 250000
  if (zoom >= 9) return 500000
  return 1000000
}

// ── Càrrega de capes ───────────────────────────────────────────────────────

async function carregaCapa(nivell: NivellTerritorial, zoom: number) {
  if (!mapa) return

  const resolucio = resolucioPerCapa(nivell, zoom)
  const clau = `${nivell}-${resolucio}`

  let capa = cacheLayers[clau]
  if (!capa) {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
    const res = await fetch(`${apiUrl}/api/geojson/${nivell}?zoom=${zoom}`)
    if (!res.ok) return
    const dades = await res.json()

    capa = L.geoJSON(dades, {
      pane: PANE_NOMS[nivell],
      style: (feature) => estilPerFeature(feature, nivell),
      onEachFeature(feature, layer) {
        const pathLayer = layer as L.Path
        layer.on({
          mouseover() {
            if (nivell !== mapaStore.nivellActiu) return
            pathLayer.setStyle(estilHoverPerFeature(feature, nivell))
          },
          mouseout() {
            if (nivell !== mapaStore.nivellActiu) return
            pathLayer.setStyle(estilPerFeature(feature, nivell))
          },
          click() {
            if (nivell !== mapaStore.nivellActiu) return
            gestionaClicFeature(feature, nivell)
          },
        })
      },
    })
    cacheLayers[clau] = capa
  }

  const anterior = capesActives[nivell]
  if (anterior && anterior !== capa) {
    mapa.removeLayer(anterior)
  }
  if (!mapa.hasLayer(capa)) {
    capa.addTo(mapa)
  }
  capesActives[nivell] = capa

  // Refresca els estils: en cache hit o en canviar de resolució, els estils
  // poden haver-se desfasat si nivellActiu o la selecció van canviar mentre
  // aquesta capa no era visible.
  capa.eachLayer((layer) => {
    const geoLayer = layer as L.Path & { feature?: GeoJSON.Feature }
    if (geoLayer.feature) geoLayer.setStyle(estilPerFeature(geoLayer.feature, nivell))
  })
}

async function carregaTotesCapes(zoom: number) {
  const nivells: NivellTerritorial[] = ['provincies', 'vegueries', 'comarques', 'municipis']
  await Promise.all(nivells.map((n) => carregaCapa(n, zoom)))
  // El z-order el determinen els panes (PANE_Z_INDEX); no cal bringToFront/Back.
  // Apliquem la interactivitat al pane segons quin nivell és l'actiu.
  actualitzaInteractivitatPanes()
}

function actualitzaEstilsTotes() {
  ;(Object.entries(capesActives) as Array<[NivellTerritorial, L.GeoJSON | null]>).forEach(
    ([nivell, capa]) => {
      capa?.eachLayer((layer) => {
        const geoLayer = layer as L.Path & { feature?: GeoJSON.Feature }
        if (geoLayer.feature) geoLayer.setStyle(estilPerFeature(geoLayer.feature, nivell))
      })
    }
  )
}

// ── Selector de nivell (control Leaflet) ───────────────────────────────────

const ETIQUETES_NIVELL: Record<NivellTerritorial, string> = {
  provincies: 'Província',
  vegueries: 'Vegueria',
  comarques: 'Comarca',
  municipis: 'Municipi',
}

function creaSelectorNivell(): L.Control {
  const control = new L.Control({ position: 'topright' })
  control.onAdd = () => {
    const div = L.DomUtil.create('div', 'leaflet-bar selector-nivell')
    div.innerHTML = `
      <div class="selector-nivell__titol">Nivell territorial</div>
      ${(['provincies', 'vegueries', 'comarques', 'municipis'] as NivellTerritorial[])
        .map(
          (n) => `
        <label class="selector-nivell__opcio">
          <input type="radio" name="nivell-territorial" value="${n}" ${
            n === mapaStore.nivellActiu ? 'checked' : ''
          } />
          <span>${ETIQUETES_NIVELL[n]}</span>
        </label>`
        )
        .join('')}
    `
    L.DomEvent.disableClickPropagation(div)
    L.DomEvent.disableScrollPropagation(div)
    div.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement
      if (target.name === 'nivell-territorial') {
        mapaStore.defineixNivellActiu(target.value as NivellTerritorial)
      }
    })
    return div
  }
  return control
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

  creaSelectorNivell().addTo(mapa)
  creaPanesTerritorials()

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
    carregaTotesCapes(zoom)
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
  carregaTotesCapes(mapaStore.zoom)
  actualitzaMaxBounds()
  actualitzaDragging()
})

onUnmounted(() => {
  mapa?.remove()
  mapa = null
})

// Quan la selecció canvia des del panell On?, re-aplica colors a totes les capes.
watch(
  () => territoris.municipisSeleccionats.size,
  () => actualitzaEstilsTotes()
)

// Quan el nivell actiu canvia, re-aplica estils i la interactivitat dels panes.
watch(
  () => mapaStore.nivellActiu,
  () => {
    actualitzaEstilsTotes()
    actualitzaInteractivitatPanes()
  }
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

<style>
/* Interactivitat dels paths territorials.

   IMPORTANT — guerra d'especificitat amb el CSS de Leaflet:
   Leaflet defineix `.leaflet-pane > svg path.leaflet-interactive { pointer-events: auto }`
   amb especificitat (0,2,2). Per sobreescriure-ho necessitem una regla amb
   especificitat superior. Afegir `.leaflet-interactive` (que Leaflet posa a
   tots els paths interactius) al nostre selector és el truc.

   - Per defecte (panes no actius): pointer-events:none — els events travessen
     cap al pane actiu, encara que la capa estigui al davant per z-order.
   - Pane actiu (.territori-actiu): pointer-events:fill — tota l'àrea interior
     del polígon és clicable, no només la vora (necessari amb fillOpacity:0). */
.leaflet-pane[class*='leaflet-territori-'] path.leaflet-interactive {
  pointer-events: none;
}

.leaflet-pane[class*='leaflet-territori-'].territori-actiu path.leaflet-interactive {
  pointer-events: fill;
  cursor: pointer;
}

/* Estils del control selector de nivell — sense scope perquè L.DomUtil
   crea l'element fora de l'àmbit del component Vue. */
.selector-nivell {
  background: white;
  padding: 8px 10px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.85rem;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4);
}

.selector-nivell__titol {
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #555;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.selector-nivell__opcio {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  cursor: pointer;
  color: #2c2c2c;
}

.selector-nivell__opcio:hover {
  color: #000;
}

.selector-nivell__opcio input[type='radio'] {
  margin: 0;
  cursor: pointer;
}
</style>
