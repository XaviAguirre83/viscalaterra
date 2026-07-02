<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTerritorisStore } from '@/stores/territoris'
import {
  useMapaStore,
  ZOOM_INICIAL,
  CENTRE_INICIAL,
  type ModeJocMapa,
  type NivellTerritorial,
} from '@/stores/mapa'
import { useMapaOpcionsStore } from '@/stores/mapaOpcions'
import { useEnriquimentStore, type Credit } from '@/stores/enriquiment'
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
const mapaOpcions = useMapaOpcionsStore()
const enriquiment = useEnriquimentStore()

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

// Nivell que mana al mapa: el del joc en mode joc, el triat per l'usuari als
// quadres de valors del panell altrament (sempre n'hi ha exactament un;
// independent de quines capes de línies siguin visibles).
const nivellEfectiu = computed<NivellTerritorial>(
  () => props.modeJoc?.nivell ?? mapaStore.nivellSeleccio
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
// Basemap "atlas" net (Positron) per a la vista general: deixa que les
// delimitacions destaquin. A partir de ZOOM_DETALL es passa a un basemap amb
// més detall de carrers (Voyager), quan ja es mira un municipi de prop i la
// perspectiva territorial ja no és l'important.
const URL_TILES_BASE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const URL_TILES_DETALL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const URL_TILES_JOC = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'
const ZOOM_DETALL = 13
let tilesBase: L.TileLayer | null = null
let tilesDetall: L.TileLayer | null = null
let tilesJoc: L.TileLayer | null = null

function craftTiles(url: string): L.TileLayer {
  return L.tileLayer(url, {
    attribution: '© OpenStreetMap contributors © CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  })
}

// En mode normal, tria el basemap segons el zoom: Positron (atlas) a la vista
// general, Voyager (més detall) a partir de ZOOM_DETALL.
function actualitzaTilesNormal(zoom: number) {
  if (!mapa || props.modeJoc) return
  tilesBase ??= craftTiles(URL_TILES_BASE)
  tilesDetall ??= craftTiles(URL_TILES_DETALL)
  const vol = zoom >= ZOOM_DETALL ? tilesDetall : tilesBase
  const fora = zoom >= ZOOM_DETALL ? tilesBase : tilesDetall
  if (mapa.hasLayer(fora)) mapa.removeLayer(fora)
  if (!mapa.hasLayer(vol)) vol.addTo(mapa)
}

function activaTilesJoc(actiu: boolean) {
  if (!mapa) return
  if (actiu) {
    tilesJoc ??= craftTiles(URL_TILES_JOC)
    if (tilesBase && mapa.hasLayer(tilesBase)) mapa.removeLayer(tilesBase)
    if (tilesDetall && mapa.hasLayer(tilesDetall)) mapa.removeLayer(tilesDetall)
    if (!mapa.hasLayer(tilesJoc)) tilesJoc.addTo(mapa)
  } else {
    if (tilesJoc && mapa.hasLayer(tilesJoc)) mapa.removeLayer(tilesJoc)
    actualitzaTilesNormal(mapa.getZoom())
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
// Descàrregues en curs per clau (single-flight): dues crides concurrents de la
// mateixa capa comparteixen fetch i construcció en lloc de duplicar-los.
const cachePromeses: Record<string, Promise<L.GeoJSON | null>> = {}

// ── Sistema de delimitacions ───────────────────────────────────────────────
// Cada nivell té una línia FIXA (gruix + opacitat). La visibilitat és LLIURE:
// es mostren les capes que l'usuari activa al panell (qualsevol combinació). El
// contorn de Catalunya (comunitat) sempre és visible (gruix 4, vegeu
// carregaMascaraCatalunya).
const ESTIL_DELIMITACIO: Record<NivellTerritorial, { weight: number; opacity: number }> = {
  provincies: { weight: 4, opacity: 0.85 },
  vegueries: { weight: 3, opacity: 0.7 },
  comarques: { weight: 2, opacity: 0.55 },
  municipis: { weight: 1, opacity: 0.4 },
}

// Visibilitat lliure: cada capa es mostra si està als toggles del panell.
function liniaVisible(capa: NivellTerritorial): boolean {
  return mapaStore.capesVisibles.has(capa)
}

// Línia d'una capa: gruix fix; opacitat fixa si és visible al nivell actiu, o 0
// (amagada) si és un nivell més fi que l'actiu.
function estilLinia(nivell: NivellTerritorial): { weight: number; opacity: number } {
  const base = ESTIL_DELIMITACIO[nivell]
  return { weight: base.weight, opacity: liniaVisible(nivell) ? base.opacity : 0 }
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
  codi: string
  nom: string
  nomProvincia?: string
  nomsProvincia?: string[]
  nomVegueria?: string
  nomsVegueria?: string[]
  nomComarca?: string
}

const hoverInfo = ref<InfoHover | null>(null)

// Territori del qual mostrar escut/bandera abaix-centre: el del hover (desktop)
// o, si no n'hi ha, l'últim clicat (mòbil, sense hover). Vegeu `destacat`.
const clicInfo = ref<{ nivell: NivellTerritorial; codi: string; nom: string } | null>(null)

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

// Referència al panell info-territori per ajustar el carrusel (mòbil).
const infoTerritoriEl = ref<HTMLElement | null>(null)

// En mòbil el valor es mostra a la dreta de l'etiqueta; si no hi cap, fa
// marquee (vaivé) en lloc de truncar. Mesura cada valor i activa/desactiva
// l'animació segons si desborda la seva cel·la.
function ajustaCarrusel() {
  const arrel = infoTerritoriEl.value
  if (!arrel) return
  const mobil = window.matchMedia('(max-width: 768px)').matches
  arrel.querySelectorAll<HTMLElement>('.info-territori__val-cel').forEach((cel) => {
    const inner = cel.querySelector<HTMLElement>('.info-territori__val-inner')
    if (!inner) return
    const sobra = inner.scrollWidth - cel.clientWidth
    if (mobil && sobra > 2) {
      cel.classList.add('info-territori__val-cel--scroll')
      cel.style.setProperty('--marquee-dist', `-${sobra}px`)
      cel.style.setProperty('--marquee-dur', `${Math.max(2, sobra / 25)}s`)
    } else {
      cel.classList.remove('info-territori__val-cel--scroll')
      cel.style.removeProperty('--marquee-dist')
      cel.style.removeProperty('--marquee-dur')
    }
  })
}

watch(filesHover, () => void nextTick(ajustaCarrusel))
onMounted(() => {
  window.addEventListener('resize', ajustaCarrusel)
  window.addEventListener('keydown', onTeclaEsc)
})
onUnmounted(() => {
  window.removeEventListener('resize', ajustaCarrusel)
  window.removeEventListener('keydown', onTeclaEsc)
})

// Escut/bandera abaix-centre: del territori en hover (desktop) o, si no n'hi
// ha, de l'últim clicat (mòbil). Filtrat pels toggles del panell d'opcions.
// Mai en mode joc.
interface ImatgeDestacada {
  src: string
  tipus: 'escut' | 'bandera'
  credit?: Credit
}
const imatgesDestacat = computed<{ escut?: ImatgeDestacada; bandera?: ImatgeDestacada } | null>(
  () => {
    if (props.modeJoc) return null
    if (!mapaOpcions.mostraEscut && !mapaOpcions.mostraBandera) return null
    const d = hoverInfo.value ?? clicInfo.value
    if (!d) return null
    const e = enriquiment.busca(d.nivell, d.codi, d.nom)
    if (!e) return null
    return {
      escut:
        mapaOpcions.mostraEscut && e.escut
          ? { src: e.escut, tipus: 'escut', credit: e.escutCredit }
          : undefined,
      bandera:
        mapaOpcions.mostraBandera && e.bandera
          ? { src: e.bandera, tipus: 'bandera', credit: e.banderaCredit }
          : undefined,
    }
  }
)

// Lightbox: imatge (escut/bandera) ampliada al centre en clicar-la. Tanca amb
// clic fora, ✕ o Esc.
const ampliada = ref<ImatgeDestacada | null>(null)
function textCredit(c?: Credit): string {
  if (!c) return ''
  return [c.autor, c.llicencia].filter(Boolean).join(' · ') || 'Wikimedia Commons'
}
function onTeclaEsc(e: KeyboardEvent) {
  if (e.key === 'Escape' && ampliada.value) ampliada.value = null
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

// Pane del contorn de Catalunya (comunitat): per sobre dels territoris (és el
// marc exterior més gruixut, sempre visible).
const PANE_COMUNITAT = 'territori-comunitat'

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
  if (!mapa.getPane(PANE_COMUNITAT)) {
    mapa.createPane(PANE_COMUNITAT).style.zIndex = '445'
  }
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
  // Mode joc: línies de context fines (com abans). Normal: gruix fix per nivell
  // i opacitat 0 si el nivell és més fi que l'actiu (no es dibuixa la línia).
  const { weight, opacity } = props.modeJoc ? { weight: 1, opacity: 0.45 } : estilLinia(nivell)

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
  // la vora amb el color temàtic per indicar que conté territori seleccionat —
  // però només si les seves línies són visibles (el nivell de selecció és
  // independent dels toggles de visibilitat i no ha de fer aparèixer línies).
  if (esCapaActiva && liniaVisible(nivell)) {
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

  const tema = temaDeInfo(info)

  // Mode joc: hover amb el to parcial del tema sobre el tile sense etiquetes.
  if (props.modeJoc) {
    return { color: tema.vora, weight: 2.5, opacity: 1, fillColor: tema.parcial, fillOpacity: 0.7 }
  }

  // Municipis: farcit intens en hover (única capa amb farcit persistent a selecció).
  if (nivell === 'municipis') {
    const estaSeleccionat = estatSeleccioFeature(info, nivell) !== 'cap'
    if (estaSeleccionat) {
      return { color: tema.vora, weight: 3, opacity: 1, fillOpacity: 0.85 }
    }
    return {
      color: tema.vora,
      weight: 2.5,
      opacity: 1,
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
  // Per a l'escut/bandera abaix-centre al mòbil (sense hover): l'últim clicat.
  clicInfo.value = { nivell, codi: info.codi, nom: info.nom ?? '' }
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

    // Contorn de Catalunya (gruix 5, opacitat 100%): marc exterior sempre
    // visible, reaprofitant el mateix GeoJSON de la comunitat. No cal desar la
    // referència: es crea un cop (guard de dalt) i mapa.remove() el neteja.
    L.geoJSON(dades, {
      ...({ renderer: L.canvas({ pane: PANE_COMUNITAT }) } as L.GeoJSONOptions),
      pane: PANE_COMUNITAT,
      interactive: false,
      style: { color: '#555', weight: 4, opacity: 1, fillOpacity: 0 },
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
    cachePromeses[clau] ??= (async (): Promise<L.GeoJSON | null> => {
      const res = await fetch(`/api/geojson/${nivell}?resolucio=${resolucio}`)
      if (!res.ok) return null
      const dades = await res.json()

      const nova = L.geoJSON(dades, {
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
                if (props.modeJoc.codisPista && !props.modeJoc.codisPista.includes(info.codi))
                  return
                pathLayer.setStyle(estilHoverPerFeature(feature, nivell))
                return
              }
              pathLayer.setStyle(estilHoverPerFeature(feature, nivell))
              hoverInfo.value = {
                nivell,
                codi: info.codi,
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
                if (props.modeJoc.codisPista && !props.modeJoc.codisPista.includes(info.codi))
                  return
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
      cacheLayers[clau] = nova
      return nova
    })().finally(() => {
      delete cachePromeses[clau]
    })
    capa = (await cachePromeses[clau]) ?? undefined
    if (!capa) return
  }

  // Resposta fora d'ordre: si mentre esperàvem la descàrrega el zoom ha tornat
  // a canviar, aquesta resolució ja no és la vigent — la crida més recent
  // s'encarrega de posar la capa activa correcta i aquí no la trepitgem.
  if (!mapa || resolucioPerCapa(nivell, mapa.getZoom()) !== resolucio) return

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

// Càrregues de capes en vol: amb dues de solapades (zoomends ràpids), la
// primera que acaba no ha d'apagar l'indicador de la que encara corre.
let carreguesEnVol = 0

async function carregaTotesCapes(zoom: number) {
  const nivells: NivellTerritorial[] = ['provincies', 'vegueries', 'comarques', 'municipis']
  carreguesEnVol++
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
    carreguesEnVol--
    if (carreguesEnVol === 0) carregant.value = false
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

// Carrega l'enriquiment quan s'activa algun toggle (l'escut/bandera abaix-centre
// el consumeix via `imatgesDestacat`); lazy, només quan cal.
watch(
  () => mapaOpcions.mostraEscut || mapaOpcions.mostraBandera,
  (actiu) => {
    if (actiu) void enriquiment.carrega()
  },
  { immediate: true }
)

// ── Lifecycle ──────────────────────────────────────────────────────────────

onMounted(() => {
  // En mòbil la pantalla és més estreta: cal un nivell més de zoom out perquè
  // tota Catalunya càpiga a la vista inicial (en refrescar) i com a mínim.
  const mobil = window.matchMedia('(max-width: 768px)').matches
  // Vista base SEMPRE des de les constants, mai del zoom/centre persistits:
  // si no, el zoom amb què l'usuari marxa d'una secció es converteix en
  // minZoom del muntatge següent i el mapa queda clavat sense poder allunyar
  // (i al mòbil cada visita al joc restava un nivell acumulativament).
  zoomInicial = ZOOM_INICIAL - (mobil ? 1 : 0)
  centreInicial = CENTRE_INICIAL
  zoomBase = zoomInicial
  centreBase = centreInicial

  // L'última vista de l'usuari (store) es restaura només com a punt de
  // partida — mai per sota de la base ni com a límit.
  const esVistaVerge =
    mapaStore.zoom === ZOOM_INICIAL &&
    mapaStore.centre[0] === CENTRE_INICIAL[0] &&
    mapaStore.centre[1] === CENTRE_INICIAL[1]
  const zoomArrencada = esVistaVerge ? zoomInicial : Math.max(mapaStore.zoom, zoomInicial)
  const centreArrencada = esVistaVerge ? centreInicial : mapaStore.centre

  mapa = L.map('mapa-contenidor', {
    center: centreArrencada,
    zoom: zoomArrencada,
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

  actualitzaTilesNormal(zoomArrencada)

  creaPanesTerritorials()

  mapa.on('zoomend', () => {
    const zoom = mapa!.getZoom()
    mapaStore.actualitzaZoom(zoom)
    actualitzaTilesNormal(zoom)
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
  carregaTotesCapes(zoomArrencada)
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
  // reinicia la vista persistida a les constants: el zoom/centre del joc no
  // són una "última vista" que el proper mapa hagi de restaurar.
  if (props.modeJoc) {
    mapaStore.actualitzaZoom(ZOOM_INICIAL)
    mapaStore.actualitzaCentre(CENTRE_INICIAL[0], CENTRE_INICIAL[1])
  }
  mapa?.remove()
  mapa = null
  // Neteja defensiva: tot i que en `<script setup>` aquestes estructures són
  // per-instància, buidar-les en desmuntar evita estats penjats en escenaris
  // d'edge (HMR en desenvolupament, o un futur <keep-alive>) i ajuda el GC.
  Object.keys(cacheLayers).forEach((k) => delete cacheLayers[k])
  Object.keys(cachePromeses).forEach((k) => delete cachePromeses[k])
  ;(Object.keys(capesActives) as NivellTerritorial[]).forEach((n) => (capesActives[n] = null))
  tilesBase = null
  tilesDetall = null
  tilesJoc = null
  mascaraCatalunya = null
})

// Quan la selecció canvia des del panell On?, re-aplica colors a totes les capes.
watch(
  () => territoris.municipisSeleccionats.size,
  () => actualitzaEstilsTotes()
)

// Quan canvien les capes visibles, re-aplica estils (només afecta el dibuix de
// línies; la interactivitat la mana nivellSeleccio, independent).
watch(
  () => mapaStore.capesVisibles,
  () => {
    if (props.modeJoc) return
    actualitzaEstilsTotes()
  }
)

// Quan l'usuari canvia el nivell de selecció (quadres de valors del panell),
// re-aplica estils i mou la interactivitat al pane corresponent. (En mode joc
// el panell està amagat i el nivell el mana el joc.)
watch(
  () => mapaStore.nivellSeleccio,
  () => {
    if (props.modeJoc) return
    actualitzaEstilsTotes()
    actualitzaInteractivitatPanes()
    clicInfo.value = null
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
    <div v-if="!modeJoc" ref="infoTerritoriEl" class="info-territori">
      <div class="info-territori__grid" role="group" :aria-label="$t('mapa.nivellAria')">
        <div class="info-territori__cel">
          <button
            type="button"
            class="info-territori__cap"
            :class="{ 'info-territori__cap--actiu': mapaStore.esVisible('provincies') }"
            role="checkbox"
            :aria-checked="mapaStore.esVisible('provincies')"
            @click="mapaStore.alternaCapa('provincies')"
          >
            {{ $t('nivells.provincia') }}
          </button>
          <button
            type="button"
            class="info-territori__val-cel"
            :class="{ 'info-territori__val-cel--actiu': mapaStore.nivellSeleccio === 'provincies' }"
            :aria-pressed="mapaStore.nivellSeleccio === 'provincies'"
            :aria-label="$t('mapa.seleccioPer', { nivell: $t('nivells.provincia') })"
            :title="$t('mapa.seleccioPer', { nivell: $t('nivells.provincia') })"
            @click="mapaStore.defineixNivellSeleccio('provincies')"
          >
            <span class="info-territori__val-inner">
              <template v-if="filesHover?.provincies.length">
                <span
                  v-for="(p, i) in filesHover.provincies"
                  :key="p"
                  :class="{ 'info-territori__val--secundari': i > 0 }"
                  >{{ i > 0 ? `, ${p}` : p }}</span
                >
              </template>
              <span v-else class="info-territori__val--buit">—</span>
            </span>
          </button>
        </div>
        <div class="info-territori__cel">
          <button
            type="button"
            class="info-territori__cap"
            :class="{ 'info-territori__cap--actiu': mapaStore.esVisible('vegueries') }"
            role="checkbox"
            :aria-checked="mapaStore.esVisible('vegueries')"
            @click="mapaStore.alternaCapa('vegueries')"
          >
            {{ $t('nivells.vegueria') }}
          </button>
          <button
            type="button"
            class="info-territori__val-cel"
            :class="{ 'info-territori__val-cel--actiu': mapaStore.nivellSeleccio === 'vegueries' }"
            :aria-pressed="mapaStore.nivellSeleccio === 'vegueries'"
            :aria-label="$t('mapa.seleccioPer', { nivell: $t('nivells.vegueria') })"
            :title="$t('mapa.seleccioPer', { nivell: $t('nivells.vegueria') })"
            @click="mapaStore.defineixNivellSeleccio('vegueries')"
          >
            <span class="info-territori__val-inner">
              <template v-if="filesHover?.vegueries.length">
                <span
                  v-for="(v, i) in filesHover.vegueries"
                  :key="v"
                  :class="{ 'info-territori__val--secundari': i > 0 }"
                  >{{ i > 0 ? `, ${v}` : v }}</span
                >
              </template>
              <span v-else class="info-territori__val--buit">—</span>
            </span>
          </button>
        </div>
        <div class="info-territori__cel">
          <button
            type="button"
            class="info-territori__cap"
            :class="{ 'info-territori__cap--actiu': mapaStore.esVisible('comarques') }"
            role="checkbox"
            :aria-checked="mapaStore.esVisible('comarques')"
            @click="mapaStore.alternaCapa('comarques')"
          >
            {{ $t('nivells.comarca') }}
          </button>
          <button
            type="button"
            class="info-territori__val-cel"
            :class="{ 'info-territori__val-cel--actiu': mapaStore.nivellSeleccio === 'comarques' }"
            :aria-pressed="mapaStore.nivellSeleccio === 'comarques'"
            :aria-label="$t('mapa.seleccioPer', { nivell: $t('nivells.comarca') })"
            :title="$t('mapa.seleccioPer', { nivell: $t('nivells.comarca') })"
            @click="mapaStore.defineixNivellSeleccio('comarques')"
          >
            <span class="info-territori__val-inner">
              <span
                :class="{ 'info-territori__val--buit': !filesHover || filesHover.comarca === '—' }"
                >{{ filesHover?.comarca ?? '—' }}</span
              >
            </span>
          </button>
        </div>
        <div class="info-territori__cel">
          <button
            type="button"
            class="info-territori__cap"
            :class="{ 'info-territori__cap--actiu': mapaStore.esVisible('municipis') }"
            role="checkbox"
            :aria-checked="mapaStore.esVisible('municipis')"
            @click="mapaStore.alternaCapa('municipis')"
          >
            {{ $t('nivells.municipi') }}
          </button>
          <button
            type="button"
            class="info-territori__val-cel"
            :class="{ 'info-territori__val-cel--actiu': mapaStore.nivellSeleccio === 'municipis' }"
            :aria-pressed="mapaStore.nivellSeleccio === 'municipis'"
            :aria-label="$t('mapa.seleccioPer', { nivell: $t('nivells.municipi') })"
            :title="$t('mapa.seleccioPer', { nivell: $t('nivells.municipi') })"
            @click="mapaStore.defineixNivellSeleccio('municipis')"
          >
            <span class="info-territori__val-inner">
              <span
                :class="{ 'info-territori__val--buit': !filesHover || filesHover.municipi === '—' }"
                >{{ filesHover?.municipi ?? '—' }}</span
              >
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Engranatge d'opcions del mapa (escut/bandera, capes…): cantonada
         superior dreta, fent simetria amb el control de zoom (superior esq.). -->
    <button
      v-if="!modeJoc"
      type="button"
      class="mapa-opcions-btn"
      :class="{ 'mapa-opcions-btn--actiu': mapaOpcions.panelObert }"
      :title="$t('opcionsMapa.titol')"
      :aria-label="$t('opcionsMapa.titol')"
      :aria-expanded="mapaOpcions.panelObert"
      @click="mapaOpcions.alterna()"
    >
      <svg
        class="mapa-opcions-btn__icona"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        />
      </svg>
    </button>

    <!-- Escut/bandera del territori en hover (desktop) o clicat (mòbil),
         abaix-centre. Fons transparent amb halo blanc; clic → ampliar. -->
    <div
      v-if="imatgesDestacat && (imatgesDestacat.escut || imatgesDestacat.bandera)"
      class="emblemes"
    >
      <button
        v-if="imatgesDestacat.escut"
        type="button"
        class="emblemes__bto"
        :aria-label="$t('mapa.amplia')"
        @click="ampliada = imatgesDestacat.escut"
      >
        <img :src="imatgesDestacat.escut.src" class="emblemes__img" alt="" />
      </button>
      <button
        v-if="imatgesDestacat.bandera"
        type="button"
        class="emblemes__bto"
        :aria-label="$t('mapa.amplia')"
        @click="ampliada = imatgesDestacat.bandera"
      >
        <img :src="imatgesDestacat.bandera.src" class="emblemes__img" alt="" />
      </button>
    </div>

    <!-- Lightbox: emblema ampliat al centre, sobre recuadre blanc -->
    <Transition name="lightbox">
      <div v-if="ampliada" class="lightbox" @click.self="ampliada = null">
        <div class="lightbox__caixa">
          <button
            type="button"
            class="lightbox__tancar"
            :aria-label="$t('comu.tanca')"
            @click="ampliada = null"
          >
            ✕
          </button>
          <img
            :src="ampliada.src"
            class="lightbox__img"
            :class="`lightbox__img--${ampliada.tipus}`"
            alt=""
          />
          <a
            v-if="ampliada.credit"
            class="lightbox__credit"
            :href="ampliada.credit.pagina"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ textCredit(ampliada.credit) }} · Wikimedia Commons <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </Transition>

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

/* Engranatge d'opcions del mapa: overlay a la cantonada superior dreta
   (simètric al control de zoom de Leaflet, a la superior esquerra). */
.mapa-opcions-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid #d8d8d4;
  border-radius: 8px;
  background: #fff;
  color: #555;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}

.mapa-opcions-btn__icona {
  width: 20px;
  height: 20px;
}

.mapa-opcions-btn:hover {
  background: #f0f4f0;
  color: #2d6a2d;
}

.mapa-opcions-btn--actiu {
  background: #eef4ee;
  border-color: #2d6a2d;
  color: #2d6a2d;
}

.info-territori {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  /* Deixa ~60px lliures a cada costat dins el mapa perquè el control de zoom
     (esq.) i el ⚙️ (dreta) no es muntin sobre el recuadre en finestres estretes. */
  width: min(760px, calc(100vw - 120px));
  background: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.85rem;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

/* Quatre columnes del mateix ample (Província/Vegueria/Comarca/Municipi) */
.info-territori__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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

.info-territori__val-cel span {
  color: #1a1a1a;
}

/* Quadre de valor: botó amb comportament radio — el triat (un i només un dels
   quatre) determina el nivell de selecció al mapa (hover/clic). */
.info-territori__val-cel {
  min-width: 0;
  overflow: hidden;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 4px;
  transition:
    background 0.15s,
    box-shadow 0.15s;
}

/* El fons "pastilla" s'estén amb box-shadow (spread) en lloc de padding per no
   alterar el layout ni les mesures del marquee mòbil (ajustaCarrusel). */
.info-territori__val-cel:hover {
  background: #f0f0ec;
  box-shadow: 0 0 0 3px #f0f0ec;
}

.info-territori__val-cel--actiu {
  background: #e8f0e8;
  box-shadow:
    0 0 0 3px #e8f0e8,
    0 0 0 4px #2d6a2d;
}

/* Valor en una sola línia; els valors múltiples (comarques transfrontereres)
   es mostren separats per coma. Si no hi cap, … en desktop / marquee en mòbil. */
.info-territori__val-inner {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 768px) {
  /* Enganxat a la barra de navegació, a tota l'amplada, sense marge ni cantons */
  .info-territori {
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    max-width: none;
    transform: none;
    border-radius: 0;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  }

  /* La banda PVCM ocupa tot l'ample a dalt (top:0); el ⚙️ baixa a la cantonada
     inferior dreta per no solapar-s'hi (en mòbil no hi ha control de zoom). */
  .mapa-opcions-btn {
    top: auto;
    bottom: 26px;
    right: 10px;
  }

  /* 4 columnes: [etiqueta · valor] × 2. Les columnes "auto" igualen l'ample de
     les etiquetes, així els valors de Província/Comarca (i Vegueria/Municipi)
     queden alineats verticalment entre les dues files. */
  .info-territori__grid {
    grid-template-columns: auto 1fr auto 1fr;
    align-items: baseline;
    column-gap: 8px;
    row-gap: 8px;
  }

  /* La cel·la es dissol: etiqueta i valor passen a ser items directes del grid */
  .info-territori__cel {
    display: contents;
  }

  /* Una mica més d'aire entre la parella esquerra i la dreta */
  .info-territori__cel:nth-child(2) .info-territori__cap,
  .info-territori__cel:nth-child(4) .info-territori__cap {
    padding-left: 8px;
  }

  /* En mòbil el valor pot fer marquee: cal ample natural (inline-block) i que
     el recort el faci la finestra (.info-territori__val-cel), no l'inner. */
  .info-territori__val-inner {
    display: inline-block;
    overflow: visible;
    text-overflow: clip;
  }

  .info-territori__val-cel--scroll .info-territori__val-inner {
    animation: info-marquee var(--marquee-dur, 4s) linear infinite alternate;
  }
}

@keyframes info-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(var(--marquee-dist, 0));
  }
}

@media (prefers-reduced-motion: reduce) {
  .info-territori__val-cel--scroll .info-territori__val-inner {
    animation: none;
  }
}

.info-territori__val--buit {
  color: #bbb;
}

.info-territori__val--secundari {
  color: #888;
}

/* ── Escut/bandera abaix-centre (panell d'opcions) ─────────────────────── */
.emblemes {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  display: flex;
  align-items: flex-end;
  gap: 32px;
  /* Sense recuadre: fons transparent. El contrast el dona el halo blanc de
     l'.emblemes__img. Només els botons capturen el clic; la resta passa al mapa. */
  pointer-events: none;
}

.emblemes__bto {
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  pointer-events: auto;
  line-height: 0;
}

.emblemes__img {
  height: 64px;
  width: auto;
  max-width: 120px;
  object-fit: contain;
  /* Halo/glow blanc perquè l'emblema ressalti sobre qualsevol fons del mapa. */
  filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 2px #fff) drop-shadow(0 0 4px #fff)
    drop-shadow(0 1px 3px rgba(0, 0, 0, 0.35));
  transition: transform 0.12s ease;
}

.emblemes__bto:hover .emblemes__img {
  transform: scale(1.06);
}

@media (max-width: 768px) {
  .emblemes__img {
    height: 48px;
  }
}

/* ── Lightbox d'emblema ampliat ────────────────────────────────────────── */
/* Absolut: es centra dins del MAPA (no de tota la finestra). La mida de la
   imatge és fixa per tipus i prou acotada per no tapar el recuadre P/V/C/M de
   dalt ni el d'escut/bandera de baix. */
.lightbox {
  position: absolute;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(26, 38, 53, 0.5);
}

.lightbox__caixa {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  max-width: min(440px, 90vw);
  padding: 26px 28px 16px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
}

.lightbox__tancar {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: none;
  font-size: 1.05rem;
  color: #888;
  cursor: pointer;
}

.lightbox__tancar:hover {
  background: #f0f0ec;
  color: #333;
}

/* Mida fixa per tipus → tots els escuts iguals, totes les banderes iguals.
   Acotada (px + vh) perquè el modal càpiga entre els dos recuadres. */
.lightbox__img {
  object-fit: contain;
}

.lightbox__img--escut {
  height: min(300px, 38vh);
  width: auto;
  max-width: min(300px, 78vw);
}

.lightbox__img--bandera {
  width: min(340px, 78vw);
  height: auto;
  max-height: min(220px, 30vh);
}

.lightbox__credit {
  font-size: var(--text-xs);
  color: var(--color-text-secundari, #737373);
  text-decoration: none;
  text-align: center;
}

.lightbox__credit:hover {
  color: #2d6a2d;
  text-decoration: underline;
}

.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.15s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .lightbox-enter-active,
  .lightbox-leave-active {
    transition: none;
  }

  .emblemes__img {
    transition: none;
  }
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
