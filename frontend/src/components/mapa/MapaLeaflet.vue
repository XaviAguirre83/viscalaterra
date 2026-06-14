<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTerritorisStore } from '@/stores/territoris'
import { useMapaStore, type ModeJocMapa, type NivellTerritorial } from '@/stores/mapa'
import {
  temaPerProvincia,
  temaPerVegueria,
  temaPerComarca,
  nomProvinciesPerComarca,
  nomVeguiesPerComarca,
  TEMA_NEUTRE,
} from '@/theme/provincies'

const territoris = useTerritorisStore()
const mapaStore = useMapaStore()

// ── Mode joc (GeoFreak) ────────────────────────────────────────────────────
// Quan `modeJoc` arriba informat, el mapa serveix el joc: el nivell actiu el
// determina el joc (no el selector), el panell info-territori s'amaga (el
// hover delataria la resposta), els clics s'emeten cap al pare en lloc de
// seleccionar, i si hi ha territori contenidor el mapa s'hi enquadra i no se'n
// pot sortir.
const props = defineProps<{ modeJoc?: ModeJocMapa | null }>()
const emit = defineEmits<{
  clicJoc: [codi: string, nom: string]
  obreFitxa: [objectiu: { nivell: NivellTerritorial; codi: string; nom: string }]
}>()

// Nivell que mana al mapa: el del joc en mode joc, el del selector altrament.
const nivellEfectiu = computed<NivellTerritorial>(
  () => props.modeJoc?.nivell ?? mapaStore.nivellActiu
)

// Features jugables (Set per a cerca O(1)); null = totes les del nivell.
const codisJugables = computed<Set<string> | null>(() =>
  props.modeJoc?.codisPermesos ? new Set(props.modeJoc.codisPermesos) : null
)

const codisEncertats = computed<Set<string>>(() => new Set(props.modeJoc?.codisEncertats ?? []))

function esJugable(info: InfoFeature): boolean {
  return !codisJugables.value || codisJugables.value.has(info.codi)
}

// Una demarcació encertada deixa de jugar: ni hover ni clic (el clic repetit
// tampoc compta com a error — el store l'ignoraria igualment).
function esEncertada(info: InfoFeature): boolean {
  return codisEncertats.value.has(info.codi)
}

let mapa: L.Map | null = null
let mascaraCatalunya: L.Polygon | null = null

// ── Tiles: base OSM en mode normal, Carto Positron SENSE ETIQUETES en mode
// joc — cap nom de municipi o ciutat al fons (anti-trampa d'arrel) i el
// relleu/trama urbana es veu net sota el joc.
const URL_TILES_BASE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const URL_TILES_JOC = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'
let tilesBase: L.TileLayer | null = null
let tilesJoc: L.TileLayer | null = null

function activaTilesJoc(actiu: boolean) {
  if (!mapa) return
  if (actiu) {
    tilesJoc ??= L.tileLayer(URL_TILES_JOC, {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    })
    if (tilesBase && mapa.hasLayer(tilesBase)) mapa.removeLayer(tilesBase)
    if (!mapa.hasLayer(tilesJoc)) tilesJoc.addTo(mapa)
  } else {
    if (tilesJoc && mapa.hasLayer(tilesJoc)) mapa.removeLayer(tilesJoc)
    if (tilesBase && !mapa.hasLayer(tilesBase)) tilesBase.addTo(mapa)
  }
}

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
  return NIVELLS_ORDRE[nivellEfectiu.value].indexOf(capa) + 1
}

// ── Extracció de codis ─────────────────────────────────────────────────────

interface InfoFeature {
  codi: string
  nom?: string
  codiProvincia?: string
  nomProvincia?: string
  nomsProvincia?: string[]
  codiVegueria?: string
  nomVegueria?: string
  nomsVegueria?: string[]
  codiComarca?: string
  nomComarca?: string
}

interface InfoHover {
  nivell: NivellTerritorial
  nom: string
  nomProvincia?: string
  nomsProvincia?: string[]
  nomVegueria?: string
  nomsVegueria?: string[]
  nomComarca?: string
}

const hoverInfo = ref<InfoHover | null>(null)

// Indicador de càrrega: actiu mentre es descarreguen els GeoJSON de les capes.
const carregant = ref(false)
// Estat d'error: actiu si falla la descàrrega de capes (xarxa intermitent al mòbil).
const errorMapa = ref(false)

const filesHover = computed(() => {
  if (!hoverInfo.value) return null
  const { nivell, nom, nomProvincia, nomsProvincia, nomVegueria, nomsVegueria, nomComarca } =
    hoverInfo.value

  let provincies: string[]
  let vegueries: string[]
  switch (nivell) {
    case 'provincies':
      provincies = nom ? [nom] : []
      vegueries = []
      break
    case 'vegueries':
      provincies = []
      vegueries = nom ? [nom] : []
      break
    case 'comarques':
      provincies = nomsProvincia ?? []
      vegueries = nomsVegueria ?? []
      break
    case 'municipis':
      provincies = nomProvincia ? [nomProvincia] : []
      vegueries = nomVegueria ? [nomVegueria] : []
      break
  }

  return {
    provincies,
    vegueries,
    comarca: nivell === 'comarques' || nivell === 'municipis' ? (nomComarca ?? '—') : '—',
    municipi: nivell === 'municipis' ? nom : '—',
  }
})

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
        nom: props.NOMMUNI ? String(props.NOMMUNI) : undefined,
        codiProvincia: props.CODIPROV ? String(props.CODIPROV) : undefined,
        nomProvincia: props.NOMPROV ? String(props.NOMPROV) : undefined,
        codiVegueria: props.CODIVEGUE ? String(props.CODIVEGUE) : undefined,
        nomVegueria: props.NOMVEGUE ? String(props.NOMVEGUE) : undefined,
        codiComarca: props.CODICOMAR ? String(props.CODICOMAR) : undefined,
        nomComarca: props.NOMCOMAR ? String(props.NOMCOMAR) : undefined,
      }
    case 'comarques': {
      const codi = String(props.CODICOMAR)
      return {
        codi,
        nom: props.NOMCOMAR ? String(props.NOMCOMAR) : undefined,
        codiComarca: codi,
        nomComarca: props.NOMCOMAR ? String(props.NOMCOMAR) : undefined,
        nomsProvincia: nomProvinciesPerComarca(codi),
        nomsVegueria: nomVeguiesPerComarca(codi),
      }
    }
    case 'vegueries':
      return {
        codi: String(props.CODIVEGUE),
        nom: props.NOMVEGUE ? String(props.NOMVEGUE) : undefined,
        codiVegueria: String(props.CODIVEGUE),
        nomVegueria: props.NOMVEGUE ? String(props.NOMVEGUE) : undefined,
      }
    case 'provincies':
      return {
        codi: String(props.CODIPROV),
        nom: props.NOMPROV ? String(props.NOMPROV) : undefined,
        codiProvincia: String(props.CODIPROV),
        nomProvincia: props.NOMPROV ? String(props.NOMPROV) : undefined,
      }
  }
}

// Retorna el tema cromàtic adequat per a una feature: província > vegueria > comarca > neutre.
function temaDeInfo(info: InfoFeature): ReturnType<typeof temaPerProvincia> {
  if (info.codiProvincia) return temaPerProvincia(info.codiProvincia)
  if (info.codiVegueria) return temaPerVegueria(info.codiVegueria)
  if (info.codiComarca) return temaPerComarca(info.codiComarca)
  return TEMA_NEUTRE
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

// Un renderer Canvas per nivell (un <canvas> per pane). Leaflet agrupa totes
// les features del nivell en un sol canvas i coalesça les crides a setStyle()
// en un únic requestAnimationFrame — molt més ràpid que 947 operacions SVG DOM.
const canvasRenderers: Record<NivellTerritorial, L.Canvas> = {
  provincies: L.canvas({ pane: PANE_NOMS.provincies }),
  vegueries: L.canvas({ pane: PANE_NOMS.vegueries }),
  comarques: L.canvas({ pane: PANE_NOMS.comarques }),
  municipis: L.canvas({ pane: PANE_NOMS.municipis }),
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
  const actiu = nivellEfectiu.value
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

  // ── Mode joc: estils propis (la selecció d'usuari no es pinta) ───────────
  if (props.modeJoc) {
    const mj = props.modeJoc
    // El territori contenidor destaca amb vora forta a la seva pròpia capa.
    if (mj.contenidor && nivell === mj.contenidor.nivell && info.codi === mj.contenidor.codi) {
      return { color: '#1a2635', weight: 2.5, opacity: 1, fillOpacity: 0 }
    }
    if (nivell === mj.nivell) {
      // Exterior al contenidor: atenuat (rentat blanc, com la màscara de
      // Catalunya). Els handlers l'exclouen del joc via esJugable.
      if (!esJugable(info)) {
        return { color: '#999', weight: 0.5, opacity: 0.4, fillColor: '#ffffff', fillOpacity: 0.6 }
      }
      // Objectiu de «Com es diu...?»: il·luminat en daurat (color neutre —
      // el tema cromàtic delataria la província i, de retruc, la resposta).
      if (mj.codiObjectiu && info.codi === mj.codiObjectiu) {
        return {
          color: '#1a2635',
          weight: 2.5,
          opacity: 1,
          fillColor: '#f7c948',
          fillOpacity: 0.85,
        }
      }
      // Encertada: pintada permanentment — amb el color del jugador que l'ha
      // conquerida (multijugador) o amb el color de tema del territori (el
      // relleu del tile sense etiquetes es transparenta una mica).
      if (esEncertada(info)) {
        const colorJugador = mj.colorsEncertats?.[info.codi]
        if (colorJugador) {
          return {
            color: colorJugador,
            weight: 1.5,
            opacity: 1,
            fillColor: colorJugador,
            fillOpacity: 0.8,
          }
        }
        const tema = temaDeInfo(info)
        return {
          color: tema.vora,
          weight: 1.5,
          opacity: 1,
          fillColor: tema.base,
          fillOpacity: 0.8,
        }
      }
      // Pista activa: els 4 candidats destaquen; la resta s'esvaeix (i deixa
      // de respondre — vegeu els handlers).
      if (mj.codisPista) {
        if (mj.codisPista.includes(info.codi)) {
          return {
            color: '#1a2635',
            weight: 2.5,
            opacity: 1,
            fillColor: '#fdf0c0',
            fillOpacity: 0.85,
          }
        }
        return { color: '#aaa', weight: 0.5, opacity: 0.5, fillColor: '#ffffff', fillOpacity: 0.6 }
      }
      // Territori jugat: transparent sobre el tile sense etiquetes — el
      // terreny es veu net i no hi ha cap nom a tapar.
      return { color: '#555', weight: 1.5, opacity: 1, fillOpacity: 0 }
    }
    // Capes de context: només traç, segons la matriu de prominència.
    return baseEstil
  }

  const esCapaActiva = nivell === nivellEfectiu.value

  // ── Únicament la capa de municipis mostra farcit de color ──────────────────
  // Les capes superiors (comarca, vegueria, província) mantenen fillOpacity:0
  // sempre. La selecció es veu pintada als municipis individuals, independentment
  // del nivell que s'hagi usat per seleccionar-los.
  if (nivell === 'municipis') {
    const estat = estatSeleccioFeature(info, 'municipis')
    if (estat === 'cap') return baseEstil
    const tema = temaDeInfo(info)
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
      const tema = temaDeInfo(info)
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
  const tema = temaDeInfo(info)

  // Mode joc: hover amb el to parcial del tema sobre el tile sense etiquetes.
  if (props.modeJoc) {
    return { color: tema.vora, weight: 2.5, opacity: 1, fillColor: tema.parcial, fillOpacity: 0.7 }
  }

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
    fillOpacity: 0.55,
  }
}

// ── Feedback visual del joc ────────────────────────────────────────────────
//
// Animacions de resposta sobre el canvas (interpolació per rAF):
// - Error: la demarcació s'encén en vermell opac i es va esvaint (α 1 → 0)
//   mentre la vora fon cap al gris normal.
// - Encert: verd intens amb un halo blanc al contorn; halo, verd i gruix es
//   fonen progressivament cap a l'estil definitiu d'encertada (color de tema).

const VERD_ENCERT = '#27a35f'
const ROIG_ERROR = '#d8402f'
const ROIG_ERROR_VORA = '#8f1d10'

function hexARgb(hex: string): [number, number, number] {
  // Accepta #rgb i #rrggbb (expandeix la forma curta a llarga).
  let h = hex.replace('#', '')
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexARgb(a)
  const [r2, g2, b2] = hexARgb(b)
  const c = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `rgb(${c(r1, r2)}, ${c(g1, g2)}, ${c(b1, b2)})`
}

// Una animació viva per demarcació (un clic ràpid cancel·la l'anterior).
const animacionsFlaix = new Map<string, number>()

function flaixJoc(codi: string, tipus: 'encert' | 'error') {
  const mj = props.modeJoc
  if (!mj || !mapa) return
  const capa = capesActives[mj.nivell]
  if (!capa) return

  const previ = animacionsFlaix.get(codi)
  if (previ !== undefined) cancelAnimationFrame(previ)

  const objectius: (L.Path & { feature?: GeoJSON.Feature })[] = []
  capa.eachLayer((layer) => {
    const geo = layer as L.Path & { feature?: GeoJSON.Feature }
    if (geo.feature && codiDeFeature(geo.feature, mj.nivell)?.codi === codi) objectius.push(geo)
  })
  const primer = objectius[0]
  if (!primer?.feature) return

  const info = codiDeFeature(primer.feature, mj.nivell)
  const tema = info ? temaDeInfo(info) : TEMA_NEUTRE

  const acabaAmbEstilNormal = () => {
    animacionsFlaix.delete(codi)
    objectius.forEach((o) => {
      if (o.feature) o.setStyle(estilPerFeature(o.feature, mj.nivell))
    })
  }

  // Amb reduced-motion: marca breu estàtica, sense interpolacions.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    objectius.forEach((o) =>
      o.setStyle(
        tipus === 'encert'
          ? { color: tema.vora, weight: 2, opacity: 1, fillColor: VERD_ENCERT, fillOpacity: 0.9 }
          : {
              color: ROIG_ERROR_VORA,
              weight: 2,
              opacity: 1,
              fillColor: ROIG_ERROR,
              fillOpacity: 0.9,
            }
      )
    )
    setTimeout(acabaAmbEstilNormal, 250)
    return
  }

  // Halo blanc del contorn (capa temporal amb la mateixa geometria, dibuixada
  // per sobre dins el mateix canvas del nivell).
  let halo: L.GeoJSON | null = null
  if (tipus === 'encert') {
    halo = L.geoJSON(
      {
        type: 'FeatureCollection',
        features: objectius.map((o) => o.feature!),
      } as GeoJSON.FeatureCollection,
      {
        ...({ renderer: canvasRenderers[mj.nivell] } as L.GeoJSONOptions),
        pane: PANE_NOMS[mj.nivell],
        interactive: false,
        style: { color: '#ffffff', weight: 14, opacity: 0.85, fillOpacity: 0 },
      }
    ).addTo(mapa)
  }

  const durada = tipus === 'encert' ? 1600 : 1200
  const inici = performance.now()

  const pas = (ara: number) => {
    const t = Math.min(1, (ara - inici) / durada)
    const suau = 1 - Math.pow(1 - t, 2) // ease-out quadràtic

    if (tipus === 'encert') {
      // Destí del fos: el color del jugador (conquesta multijugador, llegit
      // en viu — la prop s'actualitza just després del clic) o el de tema.
      const colorFinal = props.modeJoc?.colorsEncertats?.[codi] ?? tema.base
      const voraFinal = props.modeJoc?.colorsEncertats?.[codi] ?? tema.vora
      halo?.setStyle({ weight: 14 * (1 - suau), opacity: 0.85 * (1 - suau) })
      objectius.forEach((o) =>
        o.setStyle({
          color: lerpColor('#ffffff', voraFinal, suau),
          weight: 3 - 1.5 * suau,
          opacity: 1,
          fillColor: lerpColor(VERD_ENCERT, colorFinal, suau),
          fillOpacity: 1 - 0.2 * suau,
        })
      )
    } else {
      objectius.forEach((o) =>
        o.setStyle({
          color: lerpColor(ROIG_ERROR_VORA, '#555555', suau),
          weight: 3 - 1.5 * suau,
          opacity: 1,
          fillColor: ROIG_ERROR,
          fillOpacity: 1 - suau,
        })
      )
    }

    if (t < 1 && mapa) {
      animacionsFlaix.set(codi, requestAnimationFrame(pas))
      return
    }
    if (halo) {
      mapa?.removeLayer(halo)
      halo = null
    }
    acabaAmbEstilNormal()
  }

  animacionsFlaix.set(codi, requestAnimationFrame(pas))
}

defineExpose({ flaixJoc })

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

// ── Vista base ─────────────────────────────────────────────────────────────
// El zoom mínim, el centre de retorn i els límits de desplaçament del mapa.
// Normalment és Catalunya sencera; en mode joc amb territori contenidor passa
// a ser el bbox del contenidor (mateixa lògica, límits més estrets).
let zoomInicial = 0
let centreInicial: [number, number] = [0, 0]
let zoomBase = 0
let centreBase: [number, number] = [0, 0]
let limitsBase: [[number, number], [number, number]] = LIMITS_CATALUNYA
// Bbox del contenidor del joc (null fora de mode joc). Es conserva per poder
// recalcular l'enquadrament quan canvia la mida del viewport (resize/rotació).
let boundsJoc: L.LatLngBounds | null = null

const LIMITS_MON: L.LatLngBoundsExpression = [
  [-90, -180],
  [90, 180],
]

function actualitzaMaxBounds() {
  if (!mapa) return
  const b = mapa.getBounds()
  const halfLat = (b.getNorth() - b.getSouth()) / 2
  const halfLng = (b.getEast() - b.getWest()) / 2
  mapa.setMaxBounds([
    [limitsBase[0][0] - halfLat, limitsBase[0][1] - halfLng],
    [limitsBase[1][0] + halfLat, limitsBase[1][1] + halfLng],
  ])
}

// Al zoom mínim: si el viewport ja cobreix tots els límits base, no cal poder
// desplaçar-se (tot és visible); si no (finestra petita), sí. Zooms superiors:
// sempre habilitat.
function actualitzaDragging() {
  if (!mapa) return
  if (mapa.getZoom() > zoomBase) {
    mapa.dragging.enable()
    return
  }
  const b = mapa.getBounds()
  const [sw, ne] = limitsBase
  const cobreixTot =
    b.getSouth() <= sw[0] && b.getNorth() >= ne[0] && b.getWest() <= sw[1] && b.getEast() >= ne[1]
  if (cobreixTot) {
    mapa.dragging.disable()
  } else {
    mapa.dragging.enable()
  }
}

// ── Mode joc: enquadrament al territori contenidor ─────────────────────────

// Bbox del contenidor a partir de la capa ja carregada (acumula per si el
// territori té més d'una feature).
function boundsContenidor(contenidor: { nivell: NivellTerritorial; codi: string }) {
  const capa = capesActives[contenidor.nivell]
  if (!capa) return null
  let bounds: L.LatLngBounds | null = null
  capa.eachLayer((layer) => {
    const geo = layer as L.Polygon & { feature?: GeoJSON.Feature }
    if (!geo.feature) return
    if (codiDeFeature(geo.feature, contenidor.nivell)?.codi !== contenidor.codi) return
    const b = geo.getBounds()
    bounds = bounds ? bounds.extend(b) : L.latLngBounds(b.getSouthWest(), b.getNorthEast())
  })
  return bounds as L.LatLngBounds | null
}

// Redefineix la vista base (límits + zoom mínim + centre) i hi porta el mapa.
// Ordre crític: primer s'alliberen les restriccions velles (un setMinZoom per
// sobre del zoom actual dispara un setZoom implícit ANIMAT, i Leaflet ignora
// el setView següent mentre anima — el mapa quedava descentrat en territoris
// lluny del centre, p. ex. Val d'Aran). El moviment es fa sense animació i
// les restriccions noves s'apliquen quan el mapa ja és a lloc.
function aplicaVistaBase() {
  if (!mapa) return
  hoverInfo.value = null
  mapa.setMinZoom(0)
  mapa.setMaxBounds(LIMITS_MON)
  mapa.setView(centreBase, zoomBase, { animate: false })
  mapa.setMinZoom(zoomBase)
  actualitzaMaxBounds()
  actualitzaDragging()
  actualitzaEstilsTotes()
  actualitzaInteractivitatPanes()
}

function entraModeJoc(mj: ModeJocMapa) {
  if (!mapa) return
  // Sense contenidor (o si no es troba), el territori de joc és Catalunya
  // sencera — també s'enquadra amb zoom fraccionari per omplir el viewport
  // (la vista inicial de l'app usa el zoom enter 8 i queda més petita).
  boundsJoc =
    (mj.contenidor ? boundsContenidor(mj.contenidor) : null) ??
    L.latLngBounds(LIMITS_CATALUNYA[0], LIMITS_CATALUNYA[1])
  limitsBase = [
    [boundsJoc.getSouth(), boundsJoc.getWest()],
    [boundsJoc.getNorth(), boundsJoc.getEast()],
  ]
  zoomBase = mapa.getBoundsZoom(boundsJoc)
  centreBase = [boundsJoc.getCenter().lat, boundsJoc.getCenter().lng]
  aplicaVistaBase()
  activaTilesJoc(true)
  mascaraCatalunya?.setStyle({ fillOpacity: OPACITAT_MASCARA_JOC })
}

function surtModeJoc() {
  boundsJoc = null
  limitsBase = LIMITS_CATALUNYA
  zoomBase = zoomInicial
  centreBase = centreInicial
  aplicaVistaBase()
  activaTilesJoc(false)
  mascaraCatalunya?.setStyle({ fillOpacity: OPACITAT_MASCARA })
}

// ── Màscara: destaca Catalunya, atenua la resta del món ───────────────────

// En mode joc la màscara puja una mica per centrar l'atenció al territori
// jugat (els tiles del joc ja no porten cap etiqueta que calgui tapar).
const OPACITAT_MASCARA = 0.55
const OPACITAT_MASCARA_JOC = 0.7

async function carregaMascaraCatalunya() {
  if (!mapa || mascaraCatalunya) return

  try {
    const res = await fetch('/api/geojson/comunitat?resolucio=1000000')
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
      fillOpacity: props.modeJoc ? OPACITAT_MASCARA_JOC : OPACITAT_MASCARA,
      interactive: false,
    }).addTo(mapa)
  } catch (err) {
    console.error('Error carregant la màscara de Catalunya', err)
  }
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
    const res = await fetch(`/api/geojson/${nivell}?resolucio=${resolucio}`)
    if (!res.ok) return
    const dades = await res.json()

    capa = L.geoJSON(dades, {
      // renderer és vàlid en runtime però @types/leaflet no el declara a GeoJSONOptions
      ...({ renderer: canvasRenderers[nivell] } as L.GeoJSONOptions),
      pane: PANE_NOMS[nivell],
      style: (feature) => estilPerFeature(feature, nivell),
      onEachFeature(feature, layer) {
        const pathLayer = layer as L.Path
        layer.on({
          mouseover() {
            if (nivell !== nivellEfectiu.value) return
            const info = codiDeFeature(feature, nivell)
            if (!info) return
            // En mode joc no es mostra cap nom (delataria la resposta): només
            // feedback visual, i únicament a les features jugables no encertades
            // i quan es respon clicant («On és...?»).
            if (props.modeJoc) {
              if (!props.modeJoc.interactiu || !esJugable(info) || esEncertada(info)) return
              // Amb pista activa, només els 4 candidats reaccionen.
              if (props.modeJoc.codisPista && !props.modeJoc.codisPista.includes(info.codi)) return
              pathLayer.setStyle(estilHoverPerFeature(feature, nivell))
              return
            }
            pathLayer.setStyle(estilHoverPerFeature(feature, nivell))
            hoverInfo.value = {
              nivell,
              nom: info.nom ?? '',
              nomProvincia: info.nomProvincia,
              nomsProvincia: info.nomsProvincia,
              nomVegueria: info.nomVegueria,
              nomsVegueria: info.nomsVegueria,
              nomComarca: info.nomComarca,
            }
          },
          mouseout() {
            if (nivell !== nivellEfectiu.value) return
            pathLayer.setStyle(estilPerFeature(feature, nivell))
            hoverInfo.value = null
          },
          click() {
            if (nivell !== nivellEfectiu.value) return
            if (props.modeJoc) {
              if (!props.modeJoc.interactiu) return
              const info = codiDeFeature(feature, nivell)
              if (!info || !esJugable(info) || esEncertada(info)) return
              if (props.modeJoc.codisPista && !props.modeJoc.codisPista.includes(info.codi)) return
              emit('clicJoc', info.codi, info.nom ?? '')
              return
            }
            gestionaClicFeature(feature, nivell)
          },
          contextmenu(e: L.LeafletMouseEvent) {
            // Clic dret (desktop) / long-press (mòbil) sobre el territori del
            // nivell actiu → fitxa amb enllaços. No en mode joc.
            if (props.modeJoc || nivell !== nivellEfectiu.value) return
            e.originalEvent?.preventDefault?.()
            const info = codiDeFeature(feature, nivell)
            if (!info) return
            emit('obreFitxa', { nivell, codi: info.codi, nom: info.nom ?? '' })
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
  carregant.value = true
  errorMapa.value = false
  try {
    await Promise.all(nivells.map((n) => carregaCapa(n, zoom)))
    // El z-order el determinen els panes (PANE_Z_INDEX); no cal bringToFront/Back.
    // Apliquem la interactivitat al pane segons quin nivell és l'actiu.
    actualitzaInteractivitatPanes()
  } catch (err) {
    console.error('Error carregant les capes del mapa', err)
    errorMapa.value = true
  } finally {
    carregant.value = false
  }
}

// Reintenta la càrrega de capes (i la màscara) després d'un error de xarxa.
function reintentaCarrega() {
  carregaMascaraCatalunya()
  carregaTotesCapes(mapa?.getZoom() ?? mapaStore.zoom)
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

// ── Lifecycle ──────────────────────────────────────────────────────────────

onMounted(() => {
  zoomInicial = mapaStore.zoom
  centreInicial = mapaStore.centre
  zoomBase = zoomInicial
  centreBase = centreInicial

  mapa = L.map('mapa-contenidor', {
    center: centreInicial,
    zoom: zoomInicial,
    minZoom: zoomInicial,
    dragging: false,
    maxBoundsViscosity: 1.0,
    zoomControl: true,
    // Zoom fraccionari: getBoundsZoom pot retornar p. ex. 9.5 i l'enquadrament
    // del mode joc omple el viewport. Amb el valor enter per defecte, un
    // territori que no cap al següent nivell queda petit i amb grans marges.
    zoomSnap: 0.25,
    zoomDelta: 1,
  })

  tilesBase = L.tileLayer(URL_TILES_BASE, {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(mapa)

  creaPanesTerritorials()

  mapa.on('zoomend', () => {
    const zoom = mapa!.getZoom()
    mapaStore.actualitzaZoom(zoom)
    carregaTotesCapes(zoom)
    actualitzaMaxBounds()
    if (zoom <= zoomBase) {
      mapa!.setView(centreBase, zoomBase, { animate: true })
      mapa!.once('moveend', actualitzaDragging)
    } else {
      mapa!.dragging.enable()
    }
  })

  mapa.on('resize', () => {
    // En mode joc l'enquadrament depèn de la mida del viewport: en canviar
    // (rotació del mòbil, redimensionar la finestra) es re-enquadra el
    // territori de joc des de zero.
    if (boundsJoc) {
      zoomBase = mapa!.getBoundsZoom(boundsJoc)
      centreBase = [boundsJoc.getCenter().lat, boundsJoc.getCenter().lng]
      aplicaVistaBase()
      return
    }
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

  // Si el mapa neix ja en mode joc (la vista del joc el passa des del primer
  // render), el watch de modeJoc no es dispara: s'aplica aquí.
  if (props.modeJoc) entraModeJoc(props.modeJoc)
})

onUnmounted(() => {
  animacionsFlaix.forEach((id) => cancelAnimationFrame(id))
  animacionsFlaix.clear()
  // Si es desmunta en plena partida (navegació directa a una altra secció),
  // restaura zoom/centre del store: el proper mapa arrencaria amb minZoom
  // clavat dins el territori del joc.
  if (props.modeJoc) {
    mapaStore.actualitzaZoom(zoomInicial)
    mapaStore.actualitzaCentre(centreInicial[0], centreInicial[1])
  }
  mapa?.remove()
  mapa = null
  // Neteja defensiva: tot i que en `<script setup>` aquestes estructures són
  // per-instància, buidar-les en desmuntar evita estats penjats en escenaris
  // d'edge (HMR en desenvolupament, o un futur <keep-alive>) i ajuda el GC.
  Object.keys(cacheLayers).forEach((k) => delete cacheLayers[k])
  ;(Object.keys(capesActives) as NivellTerritorial[]).forEach((n) => (capesActives[n] = null))
  tilesBase = null
  tilesJoc = null
  mascaraCatalunya = null
})

// Quan la selecció canvia des del panell On?, re-aplica colors a totes les capes.
watch(
  () => territoris.municipisSeleccionats.size,
  () => actualitzaEstilsTotes()
)

// Quan el nivell actiu canvia, re-aplica estils i la interactivitat dels panes.
// (En mode joc el selector està amagat i el nivell el mana el joc — s'ignora.)
watch(
  () => mapaStore.nivellActiu,
  () => {
    if (props.modeJoc) return
    actualitzaEstilsTotes()
    actualitzaInteractivitatPanes()
    hoverInfo.value = null
  }
)

// Entrada/sortida del mode joc: redefineix la vista base i els estils.
// Si només canvien els encertats (mateixa capa i contenidor — passa a cada
// encert de la partida), n'hi ha prou amb re-pintar: re-enquadrar el mapa
// a cada resposta seria car i molest.
watch(
  () => props.modeJoc,
  (mj, anterior) => {
    if (!mj) {
      surtModeJoc()
      return
    }
    const mateixaVista =
      anterior &&
      anterior.nivell === mj.nivell &&
      anterior.contenidor?.nivell === mj.contenidor?.nivell &&
      anterior.contenidor?.codi === mj.contenidor?.codi
    if (mateixaVista) {
      actualitzaEstilsTotes()
      return
    }
    entraModeJoc(mj)
  }
)
</script>

<template>
  <div id="mapa-contenidor" class="mapa-contenidor">
    <!-- Panell ocult en mode joc: mostrar el nom en hover faria trivial el GeoFreak -->
    <div v-if="!modeJoc" class="info-territori">
      <div class="info-territori__grid" role="radiogroup" :aria-label="$t('mapa.nivellAria')">
        <div class="info-territori__cel">
          <button
            type="button"
            class="info-territori__cap"
            :class="{ 'info-territori__cap--actiu': mapaStore.nivellActiu === 'provincies' }"
            role="radio"
            :aria-checked="mapaStore.nivellActiu === 'provincies'"
            @click="mapaStore.defineixNivellActiu('provincies')"
          >
            {{ $t('nivells.provincia') }}
          </button>
          <div class="info-territori__val-cel">
            <template v-if="filesHover?.provincies.length">
              <span
                v-for="(p, i) in filesHover.provincies"
                :key="p"
                :class="{ 'info-territori__val--secundari': i > 0 }"
                >{{ p }}</span
              >
            </template>
            <span v-else class="info-territori__val--buit">—</span>
          </div>
        </div>
        <div class="info-territori__cel">
          <button
            type="button"
            class="info-territori__cap"
            :class="{ 'info-territori__cap--actiu': mapaStore.nivellActiu === 'vegueries' }"
            role="radio"
            :aria-checked="mapaStore.nivellActiu === 'vegueries'"
            @click="mapaStore.defineixNivellActiu('vegueries')"
          >
            {{ $t('nivells.vegueria') }}
          </button>
          <div class="info-territori__val-cel">
            <template v-if="filesHover?.vegueries.length">
              <span
                v-for="(v, i) in filesHover.vegueries"
                :key="v"
                :class="{ 'info-territori__val--secundari': i > 0 }"
                >{{ v }}</span
              >
            </template>
            <span v-else class="info-territori__val--buit">—</span>
          </div>
        </div>
        <div class="info-territori__cel">
          <button
            type="button"
            class="info-territori__cap"
            :class="{ 'info-territori__cap--actiu': mapaStore.nivellActiu === 'comarques' }"
            role="radio"
            :aria-checked="mapaStore.nivellActiu === 'comarques'"
            @click="mapaStore.defineixNivellActiu('comarques')"
          >
            {{ $t('nivells.comarca') }}
          </button>
          <span
            :class="{ 'info-territori__val--buit': !filesHover || filesHover.comarca === '—' }"
            >{{ filesHover?.comarca ?? '—' }}</span
          >
        </div>
        <div class="info-territori__cel">
          <button
            type="button"
            class="info-territori__cap"
            :class="{ 'info-territori__cap--actiu': mapaStore.nivellActiu === 'municipis' }"
            role="radio"
            :aria-checked="mapaStore.nivellActiu === 'municipis'"
            @click="mapaStore.defineixNivellActiu('municipis')"
          >
            {{ $t('nivells.municipi') }}
          </button>
          <span
            :class="{ 'info-territori__val--buit': !filesHover || filesHover.municipi === '—' }"
            >{{ filesHover?.municipi ?? '—' }}</span
          >
        </div>
      </div>
    </div>

    <div v-if="carregant" class="mapa-carregant" role="status" aria-live="polite">
      <span class="mapa-carregant__spinner" aria-hidden="true"></span>
      <span class="mapa-carregant__text">{{ $t('mapa.carregant') }}</span>
    </div>
    <div v-else-if="errorMapa" class="mapa-error" role="alert">
      <span class="mapa-error__text">{{ $t('mapa.error') }}</span>
      <button class="mapa-error__boto" @click="reintentaCarrega">{{ $t('comu.reintenta') }}</button>
    </div>
  </div>
</template>

<style scoped>
.mapa-contenidor {
  flex: 1;
  min-height: 0;
  width: 100%;
  position: relative;
}

.info-territori {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.85rem;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.info-territori__grid {
  display: grid;
  grid-template-columns: 100px 160px 150px 240px;
  column-gap: 16px;
  pointer-events: auto;
}

.info-territori__cel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.info-territori__cap {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0 0 3px;
  margin: 0;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--color-text-secundari, #737373);
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.15s;
}

.info-territori__cap:hover {
  color: #444;
}

.info-territori__cap--actiu {
  color: #1a1a1a;
  border-bottom-color: #1a1a1a;
}

.info-territori__cel > span,
.info-territori__val-cel span {
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-territori__val-cel {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

@media (max-width: 768px) {
  .info-territori {
    width: calc(100vw - 80px);
    max-width: 340px;
  }

  .info-territori__grid {
    grid-template-columns: 1fr 1fr;
    column-gap: 12px;
    row-gap: 8px;
  }
}

.info-territori__val--buit {
  color: #bbb;
}

.info-territori__val--secundari {
  color: #888;
  font-size: 0.8rem;
}

/* ── Indicador de càrrega ──────────────────────────────────────────────── */
.mapa-carregant {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(26, 38, 53, 0.92);
  color: #fff;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.mapa-carregant__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: mapa-carregant-gir 0.7s linear infinite;
}

@keyframes mapa-carregant-gir {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mapa-carregant__spinner {
    animation-duration: 1.8s;
  }
}

/* ── Estat d'error de càrrega ──────────────────────────────────────────── */
.mapa-error {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(150, 40, 30, 0.96);
  color: #fff;
  padding: 8px 10px 8px 14px;
  border-radius: 20px;
  font-size: 0.8rem;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4);
  max-width: calc(100vw - 32px);
}

.mapa-error__boto {
  background: #fff;
  color: #962820;
  border: none;
  border-radius: 14px;
  padding: 4px 12px;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.mapa-error__boto:hover {
  background: #f0f0f0;
}
</style>

<style>
/* Interactivitat dels canvases territorials (Canvas renderer).

   Amb Canvas renderer, Leaflet dibuixa totes les features d'un nivell en un
   sol <canvas> i fa el hit-testing internament (point-in-polygon en JS). No hi
   ha elements <path> individuals al DOM — el CSS controla el <canvas> del pane.

   - Panes no actius: pointer-events:none — el canvas és transparent als events,
     que travessen cap al pane actiu per z-order.
   - Pane actiu (.territori-actiu): pointer-events:auto — el canvas rep els
     events; Leaflet resol quin polígon s'ha tocat, fins i tot amb fillOpacity:0. */
.leaflet-pane[class*='leaflet-territori-'] canvas {
  pointer-events: none;
}

.leaflet-pane[class*='leaflet-territori-'].territori-actiu canvas {
  pointer-events: auto;
  cursor: pointer;
}

@media (max-width: 768px) {
  .leaflet-control-zoom {
    display: none;
  }
}
</style>
