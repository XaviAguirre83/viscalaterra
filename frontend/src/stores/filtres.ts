import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  ORDINALS,
  seleccioTemporalBuida,
  seleccioTemporalCompleta,
  type DiaSetmana,
  type ModeTemporal,
  type Ordinal,
  type SeleccioTemporal,
} from '@/data/temporal'
import { TEMES_PER_SECCIO, type SeccioCerca, type Tema } from '@/data/categories'

function seleccionsBuides(): Record<SeccioCerca, Set<string>> {
  return { llocs: new Set(), agenda: new Set() }
}

export const useFiltresStore = defineStore('filtres', () => {
  // Llocs i Agenda tenen cadascuna el seu catàleg Què? i la seva selecció: en
  // canviar de secció no s'arrosseguen categories que a l'altra no existeixen, i
  // en tornar-hi es recupera el que hi havia. L'On? (store territoris) és comú.
  // La secció la fixa PanellFiltres segons la ruta.
  const seccio = ref<SeccioCerca>('llocs')
  const seleccions = ref(seleccionsBuides())

  // Catàleg del Què? de la secció activa.
  const temes = computed<Tema[]>(() => TEMES_PER_SECCIO[seccio.value])

  // Codis de subtema (la unitat mínima de selecció del Què?) triats a la secció activa.
  const categoriesActives = computed(() => seleccions.value[seccio.value])

  // Selecció temporal del Quan? (vegeu @/data/temporal per al model).
  const temporal = ref<SeleccioTemporal>(seleccioTemporalBuida())

  // El Quan? aplica filtre només quan la selecció és completa (un mode amb els
  // seus paràmetres). Un mode triat però sense paràmetres encara no filtra.
  const teSeleccioTemporal = computed(() => seleccioTemporalCompleta(temporal.value))

  const teFiltresActius = computed(
    () => categoriesActives.value.size > 0 || teSeleccioTemporal.value
  )

  function defineixSeccio(s: SeccioCerca) {
    seccio.value = s
  }

  function toggleSubtema(codi: string, seleccionat: boolean) {
    if (seleccionat) categoriesActives.value.add(codi)
    else categoriesActives.value.delete(codi)
  }

  // Selecció bulk d'un tema sencer: assigna un nou Set en una sola operació
  // (com el store territoris) per disparar la reactivitat de Vue un sol cop.
  function seleccionaTema(codisSubtemes: string[], seleccionat: boolean) {
    const s = new Set(categoriesActives.value)
    codisSubtemes.forEach((c) => (seleccionat ? s.add(c) : s.delete(c)))
    seleccions.value[seccio.value] = s
  }

  function estatTema(codisSubtemes: string[]): 'cap' | 'parcial' | 'total' {
    if (codisSubtemes.length === 0) return 'cap'
    const sel = codisSubtemes.filter((c) => categoriesActives.value.has(c)).length
    if (sel === 0) return 'cap'
    if (sel === codisSubtemes.length) return 'total'
    return 'parcial'
  }

  // ── Quan? (selecció temporal) ─────────────────────────────────────────────

  // Canviar de modalitat neteja els paràmetres dels altres modes per evitar
  // estats incoherents (p. ex. un interval de dates residual en mode setmanal).
  // mode = null equival a "qualsevol moment".
  function defineixModeTemporal(mode: ModeTemporal | null) {
    temporal.value = { ...seleccioTemporalBuida(), mode }
  }

  function defineixRangDates(inici: string | null, fi: string | null) {
    temporal.value = { ...temporal.value, dataInici: inici, dataFi: fi }
  }

  function toggleDiaSetmana(dia: DiaSetmana, actiu: boolean) {
    const dies = new Set(temporal.value.diesSetmana)
    if (actiu) dies.add(dia)
    else dies.delete(dia)
    temporal.value = {
      ...temporal.value,
      diesSetmana: [...dies].sort((a, b) => a - b),
    }
  }

  function toggleOrdinal(ordinal: Ordinal, actiu: boolean) {
    const ords = new Set(temporal.value.ordinals)
    if (actiu) ords.add(ordinal)
    else ords.delete(ordinal)
    // Es manté l'ordre canònic d'ORDINALS (primer → últim).
    temporal.value = {
      ...temporal.value,
      ordinals: ORDINALS.filter((o) => ords.has(o)),
    }
  }

  function netejaTemporal() {
    temporal.value = seleccioTemporalBuida()
  }

  // Buida el Què? de la secció activa (l'altra secció conserva la seva selecció).
  function netejaCategories() {
    seleccions.value[seccio.value] = new Set()
  }

  // Buida tots els filtres: el Què? de totes dues seccions i el Quan?.
  function netejaTotsFiltres() {
    seleccions.value = seleccionsBuides()
    temporal.value = seleccioTemporalBuida()
  }

  return {
    seccio,
    temes,
    categoriesActives,
    temporal,
    teSeleccioTemporal,
    teFiltresActius,
    defineixSeccio,
    toggleSubtema,
    seleccionaTema,
    estatTema,
    defineixModeTemporal,
    defineixRangDates,
    toggleDiaSetmana,
    toggleOrdinal,
    netejaTemporal,
    netejaCategories,
    netejaTotsFiltres,
  }
})
