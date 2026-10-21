<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useLlocsStore, type Lloc } from '@/stores/llocs'
import { emojiSubtema } from '@/data/subtemes'

const llocs = useLlocsStore()
const collapsat = ref(false)

// Els resultats ja arriben ordenats per municipi i després per nom; els agrupem
// mantenint aquest ordre (un Map conserva l'ordre d'inserció).
const grups = computed(() => {
  const m = new Map<string, Lloc[]>()
  for (const l of llocs.resultats) {
    const arr = m.get(l.municipiNom) ?? []
    arr.push(l)
    m.set(l.municipiNom, arr)
  }
  return [...m.entries()].map(([municipi, items]) => ({ municipi, items }))
})

// Enllaç per obrir la ubicació a Google Maps (les coordenades sempre hi són).
function urlGoogleMaps(l: Lloc): string {
  return `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`
}

// "17820 - Banyoles (Girona)" — el CP pot faltar.
function liniaMunicipi(l: Lloc): string {
  const cp = l.cp ? `${l.cp} - ` : ''
  const prov = l.provinciaNom ? ` (${l.provinciaNom})` : ''
  return `${cp}${l.municipiNom}${prov}`
}

// Coordenades amb coma decimal, com és costum en català/castellà.
function coordFmt(n: number): string {
  return n.toFixed(6).replace('.', ',')
}
function liniaCoords(l: Lloc): string {
  return `Lat ${coordFmt(l.lat)}  Lon ${coordFmt(l.lng)}`
}

// Quan es destaca un lloc (des d'aquí o des del mapa), la fila s'il·lumina i es
// fa visible dins la llista.
watch(
  () => llocs.llocDestacat,
  (id) => {
    if (id == null) return
    void nextTick(() => {
      document
        .querySelector(`.resultats__fila[data-id="${id}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    })
  }
)

// ── Separador arrossegable entre el mapa i la llista ─────────────────────────
// La capçalera fa de separador: arrossegant-la amunt o avall, l'usuari reparteix
// la columna entre mapa i llista (el mapa es reajusta sol: MapaLeaflet observa la
// mida del seu contenidor). Un toc sense moviment continua plegant/desplegant la
// llista, com un "bottom sheet". L'alçada triada es desa al store.

const MIN_MAPA_PX = 120 // el mapa mai es queda més baix que això
const MIN_COS_PX = 60 // si en deixar anar la llista queda més baixa, es plega
const LLINDAR_PX = 4 // moviment mínim perquè un toc compti com a arrossegament
const PAS_TECLAT = 0.05 // fletxes ↑/↓ sobre l'agafador: 5 % de la columna

const seccio = ref<HTMLElement | null>(null)
const capcalera = ref<HTMLElement | null>(null)
const arrossegant = ref(false)

interface Mides {
  columna: number // columna sencera (mapa + llista)
  cap: number // capçalera de la llista
  actual: number // llista sencera, capçalera inclosa
}

function mides(): Mides | null {
  const el = seccio.value
  const columna = el?.parentElement?.clientHeight ?? 0
  if (!el || !capcalera.value || columna === 0) return null
  return { columna, cap: capcalera.value.offsetHeight, actual: el.offsetHeight }
}

// Fixa l'alçada de la llista a `px`, dins de [capçalera, columna − mapa mínim].
function fixaAlcada(px: number, m: Mides) {
  const max = Math.max(m.cap, m.columna - MIN_MAPA_PX)
  llocs.defineixFraccioLlista(Math.min(Math.max(px, m.cap), max) / m.columna)
}

// Sense alçada triada (null), la llista s'ajusta al contingut amb el màxim del CSS.
// El max-height protegeix el mapa si després la finestra s'encongeix.
const estilAlcada = computed(() => {
  const f = llocs.fraccioLlista
  if (collapsat.value || f == null) return undefined
  return { height: `${(f * 100).toFixed(2)}%`, maxHeight: `calc(100% - ${MIN_MAPA_PX}px)` }
})

// Gest en curs, del pointerdown al pointerup.
let gest: { id: number; y0: number; h0: number; m: Mides; fraccio0: number | null } | null = null
// En deixar anar, el navegador dispara un click: si s'ha arrossegat, s'ignora.
let ignoraClicFins = 0

function treuEscoltadors() {
  window.removeEventListener('pointermove', mouGest)
  window.removeEventListener('pointerup', acabaGest)
  window.removeEventListener('pointercancel', acabaGest)
}

function iniciaGest(e: PointerEvent) {
  if (e.button !== 0 || gest) return
  if ((e.target as Element).closest('.resultats__neteja')) return // el ✕ no arrossega
  const m = mides()
  if (!m) return
  gest = { id: e.pointerId, y0: e.clientY, h0: m.actual, m, fraccio0: llocs.fraccioLlista }
  window.addEventListener('pointermove', mouGest)
  window.addEventListener('pointerup', acabaGest)
  window.addEventListener('pointercancel', acabaGest)
}

function mouGest(e: PointerEvent) {
  if (!gest || e.pointerId !== gest.id) return
  const dy = gest.y0 - e.clientY // > 0: amunt ⇒ llista més alta
  if (!arrossegant.value) {
    if (Math.abs(dy) < LLINDAR_PX) return
    arrossegant.value = true
    collapsat.value = false
    // Amb la captura, el mapa no fa hover mentre el punter li passa per sobre.
    capcalera.value?.setPointerCapture(e.pointerId)
  }
  fixaAlcada(gest.h0 + dy, gest.m)
}

function acabaGest(e: PointerEvent) {
  if (!gest || e.pointerId !== gest.id) return
  const g = gest
  gest = null
  treuEscoltadors()
  if (!arrossegant.value) return // ha estat un toc: el click farà el toggle
  arrossegant.value = false
  ignoraClicFins = performance.now() + 400
  // Deixada gairebé sense cos ⇒ es plega i recupera l'alçada d'abans, per quan
  // es torni a desplegar.
  const px = (llocs.fraccioLlista ?? 0) * g.m.columna
  if (px - g.m.cap < MIN_COS_PX) {
    collapsat.value = true
    llocs.defineixFraccioLlista(g.fraccio0)
  }
}

function filtraClic(e: MouseEvent) {
  if (performance.now() >= ignoraClicFins) return
  e.stopPropagation()
  e.preventDefault()
}

// Teclat sobre l'agafador (patró «window splitter» d'ARIA): ↑/↓ mouen la barra,
// Inici plega la llista i Fi li dona l'alçada màxima.
function teclaAgafador(e: KeyboardEvent) {
  const m = mides()
  if (!m) return
  const pas = m.columna * PAS_TECLAT
  const desti: Record<string, number> = {
    ArrowUp: m.actual + pas,
    ArrowDown: m.actual - pas,
    Home: 0,
    End: Infinity,
  }
  const px = desti[e.key]
  if (px === undefined) return
  e.preventDefault()
  if (collapsat.value) {
    // Plegada: ↑ la desplega amb l'alçada que tenia, Fi al màxim; ↓ i Inici, res.
    if (px <= m.actual) return
    collapsat.value = false
    if (e.key === 'End') fixaAlcada(px, m)
    return
  }
  if (px - m.cap < MIN_COS_PX) collapsat.value = true
  else fixaAlcada(px, m)
}

// Percentatge de la columna que ocupa la llista (aria-valuenow de l'agafador).
const percentLlista = ref(0)
let observador: ResizeObserver | null = null

onMounted(() => {
  if (!seccio.value || !('ResizeObserver' in window)) return
  observador = new ResizeObserver(() => {
    const m = mides()
    if (m) percentLlista.value = Math.round((m.actual / m.columna) * 100)
  })
  observador.observe(seccio.value)
})

onBeforeUnmount(() => {
  observador?.disconnect()
  treuEscoltadors()
})
</script>

<template>
  <section
    ref="seccio"
    class="resultats"
    :class="{ 'resultats--collapsat': collapsat, 'resultats--arrossegant': arrossegant }"
    :style="estilAlcada"
    :aria-label="$t('cercaLlocs.titol')"
  >
    <header
      ref="capcalera"
      class="resultats__cap"
      @pointerdown="iniciaGest"
      @click.capture="filtraClic"
    >
      <div
        class="resultats__agafador"
        role="separator"
        tabindex="0"
        aria-orientation="horizontal"
        aria-controls="resultats-cos"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="percentLlista"
        :aria-label="$t('cercaLlocs.redimensiona')"
        :title="$t('cercaLlocs.redimensiona')"
        @keydown="teclaAgafador"
      />
      <button
        type="button"
        class="resultats__toggle"
        :aria-expanded="!collapsat"
        aria-controls="resultats-cos"
        @click="collapsat = !collapsat"
      >
        <span class="resultats__fletxa" :class="{ 'resultats__fletxa--obert': !collapsat }">▾</span>
        <span class="resultats__recompte">
          <template v-if="llocs.carregant">{{ $t('cercaLlocs.cercant') }}</template>
          <template v-else>
            {{ $t('cercaLlocs.resultats', { n: llocs.total }, llocs.total) }}
            <span v-if="llocs.totaCatalunya && !llocs.error" class="resultats__abast">{{
              $t('cercaLlocs.totaCatalunya')
            }}</span>
          </template>
        </span>
      </button>
      <button
        type="button"
        class="resultats__neteja"
        :aria-label="$t('on.neteja')"
        @click="llocs.neteja()"
      >
        ✕
      </button>
    </header>

    <div v-show="!collapsat" id="resultats-cos" class="resultats__cos">
      <p v-if="llocs.carregant" class="resultats__estat">{{ $t('cercaLlocs.cercant') }}</p>
      <p v-else-if="llocs.error" class="resultats__estat resultats__estat--error">
        {{ $t('cercaLlocs.error') }}
      </p>
      <p v-else-if="llocs.total === 0" class="resultats__estat">
        {{ $t('cercaLlocs.capResultat') }}
      </p>
      <ul v-else class="resultats__llista">
        <template v-for="grup in grups" :key="grup.municipi">
          <li class="resultats__municipi">{{ grup.municipi }}</li>
          <li
            v-for="l in grup.items"
            :key="l.id"
            class="resultats__fila"
            :class="{ 'resultats__fila--destacada': l.id === llocs.llocDestacat }"
            :data-id="l.id"
          >
            <div class="resultats__capdamunt">
              <button
                type="button"
                class="resultats__localitza"
                :aria-label="$t('cercaLlocs.mostraAlMapa')"
                :title="$t('cercaLlocs.mostraAlMapa')"
                @click="llocs.destaca(l.id)"
              >
                <span class="resultats__icona" aria-hidden="true">{{
                  emojiSubtema(l.subtema)
                }}</span>
              </button>
              <a
                v-if="l.web"
                class="resultats__nom resultats__nom--enllac"
                :href="l.web"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ l.nom }} <span class="resultats__ext" aria-hidden="true">↗</span>
              </a>
              <span v-else class="resultats__nom">{{ l.nom }}</span>
            </div>

            <a
              class="resultats__ubicacio"
              :href="urlGoogleMaps(l)"
              target="_blank"
              rel="noopener noreferrer"
              :title="$t('cercaLlocs.obreMaps')"
            >
              <span v-if="l.adreca" class="resultats__linia">{{ l.adreca }}</span>
              <span class="resultats__linia">{{ liniaMunicipi(l) }}</span>
              <span class="resultats__linia resultats__coords">{{ liniaCoords(l) }}</span>
            </a>

            <a
              v-if="l.fontUrl"
              class="resultats__font"
              :href="l.fontUrl"
              target="_blank"
              rel="noopener noreferrer"
              :title="l.fontNom || l.fontUrl"
            >
              {{ $t('cercaLlocs.font') }}: {{ l.fontNom || l.fontUrl }} ↗
            </a>
          </li>
        </template>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.resultats {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* No més alt que ~40% de la columna; la llista interior fa scroll. */
  max-height: 42%;
  background: var(--color-superficie, #ffffff);
  border-top: 1px solid var(--color-vora, #e3e5de);
}

/* Replegat: només es veu la capçalera (el cos s'amaga amb v-show). */
.resultats--collapsat {
  max-height: none;
}

/* Tota la barra és el separador arrossegable (vegeu iniciaGest); el ✕ no. */
.resultats__cap {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 8px 0 4px;
  height: 40px;
  border-bottom: 1px solid var(--color-vora, #eceeea);
  cursor: row-resize;
  /* Amb el dit, arrossegar la barra no ha de fer scroll ni zoom de la pàgina. */
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

/* Agafador: pastilla centrada a dalt de la barra que anuncia que s'arrossega.
   És també el separador accessible (focus + fletxes ↑/↓). */
.resultats__agafador {
  position: absolute;
  top: 2px;
  left: 50%;
  z-index: 1;
  width: 48px;
  height: 10px;
  transform: translateX(-50%);
  border-radius: var(--radi-pastilla);
}

.resultats__agafador::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 6px;
  right: 6px;
  height: 4px;
  border-radius: var(--radi-pastilla);
  background: var(--color-vora-forta);
  transition: background var(--mou-rapid);
}

.resultats__cap:hover .resultats__agafador::before,
.resultats--arrossegant .resultats__agafador::before {
  background: var(--color-marca);
}

.resultats__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 8px;
  border: none;
  background: none;
  font: inherit;
  color: var(--color-text, #1a2635);
  /* Hereta el row-resize de la barra: un toc plega, arrossegar redimensiona. */
  cursor: inherit;
}

.resultats__fletxa {
  font-size: 0.7rem;
  color: var(--color-text-secundari, #737373);
  transition: transform var(--mou-rapid, 0.15s) ease;
}

.resultats__fletxa--obert {
  transform: rotate(180deg);
}

.resultats__recompte {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-sm);
  font-weight: 700;
}

/* "a tota Catalunya": abast de la cerca quan l'On? era buit. */
.resultats__abast {
  font-weight: 400;
  color: var(--color-text-secundari, #737373);
}

.resultats__neteja {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: var(--radi-sm, 8px);
  background: none;
  color: var(--color-text-secundari, #999);
  font-size: 0.95rem;
  cursor: pointer;
  transition:
    background var(--mou-rapid, 0.13s),
    color var(--mou-rapid, 0.13s);
}

.resultats__neteja:hover {
  background: var(--color-marca-clar, #f0f4f0);
  color: var(--color-marca, #2d6a2d);
}

.resultats__cos {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.resultats__estat {
  padding: 16px;
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
}

.resultats__estat--error {
  color: #b32d2d;
}

.resultats__llista {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Capçalera de grup (municipi): enganxada a dalt mentre s'scrolleja el grup. */
.resultats__municipi {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 5px 14px 3px;
  background: var(--color-superficie, #fff);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--color-text-secundari, #737373);
  border-bottom: 1px solid #f0f0ec;
}

.resultats__fila {
  border-bottom: 1px solid #f4f4f0;
  padding: 7px 14px 10px;
}

.resultats__fila--destacada {
  background: var(--color-marca-clar, #eaf3ea);
  box-shadow: inset 3px 0 0 var(--color-marca, #2d6a2d);
}

/* Fila superior: botó de localització (icona) + nom (enllaç a la web si n'hi ha). */
.resultats__capdamunt {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.resultats__localitza {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  transition: background var(--mou-rapid, 0.12s);
}

.resultats__localitza:hover {
  background: var(--color-marca-clar, #eaf3ea);
}

.resultats__icona {
  font-size: 1.05rem;
  line-height: 1;
}

.resultats__nom {
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text, #222);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resultats__nom--enllac {
  color: var(--color-marca, #2d6a2d);
  text-decoration: none;
}

.resultats__nom--enllac:hover {
  text-decoration: underline;
}

.resultats__ext {
  font-size: 0.8em;
  opacity: 0.75;
}

/* Direcció + codi postal/població + coordenades: tot el bloc enllaça a Google
   Maps. La direcció pot faltar; les coordenades sempre hi són. */
.resultats__ubicacio {
  display: block;
  padding-left: 36px;
  color: var(--color-text-secundari, #6a6f68);
  text-decoration: none;
}

.resultats__ubicacio:hover .resultats__linia {
  text-decoration: underline;
}

.resultats__linia {
  display: block;
  font-size: var(--text-xs);
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resultats__coords {
  color: var(--color-text-secundari, #8a8f88);
  font-variant-numeric: tabular-nums;
}

/* Enllaç a la font oficial de la dada, sota el nom/adreça (fora del botó de la
   fila perquè no s'imbriqui un <a> dins un <button>). */
.resultats__font {
  display: block;
  margin-top: 4px;
  padding-left: 36px;
  font-size: var(--text-xs);
  color: var(--color-marca, #2d6a2d);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resultats__font:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .resultats {
    max-height: 44%;
  }

  .resultats__localitza {
    width: 34px;
    height: 34px;
  }
}
</style>
