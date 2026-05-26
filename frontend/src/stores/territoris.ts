import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ArbreTerritorial, Provincia, Comarca, Municipi, Vegueria } from '@/types/territori'

export const useTerritorisStore = defineStore('territoris', () => {
  const arbre = ref<Provincia[] | null>(null)
  const vegueries = ref<Vegueria[]>([])
  const carregant = ref(false)
  const error = ref<string | null>(null)
  const municipisSeleccionats = ref(new Set<string>())

  async function carregaArbre() {
    if (arbre.value) return
    carregant.value = true
    error.value = null
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/territoris/arbre`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = (await res.json()) as ArbreTerritorial
      arbre.value = data.provincies
      vegueries.value = data.vegueries
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconegut'
    } finally {
      carregant.value = false
    }
  }

  // Una comarca pot estar repartida entre dues provincies (Cerdanya, Berguedà, Osona,
  // Selva). En l'arbre de la API, una comarca transfronterera apareix sota cada provincia
  // que la conté, amb només els seus municipis d'aquella provincia. Aquest mapa agrupa
  // pel codi de la comarca tots els "talls" per provincia.
  const tallsComarcaPerCodi = computed<Map<string, Comarca[]>>(() => {
    const m = new Map<string, Comarca[]>()
    arbre.value?.forEach((p) =>
      p.comarques.forEach((c) => {
        const existing = m.get(c.codi) ?? []
        existing.push(c)
        m.set(c.codi, existing)
      })
    )
    return m
  })

  const municipiPerCodi = computed<Map<string, Municipi>>(() => {
    const m = new Map<string, Municipi>()
    arbre.value?.forEach((p) =>
      p.comarques.forEach((c) => c.municipis.forEach((mu) => m.set(mu.codi, mu)))
    )
    return m
  })

  function municipisDeComarca(codiComarca: string): Municipi[] {
    return tallsComarcaPerCodi.value.get(codiComarca)?.flatMap((c) => c.municipis) ?? []
  }

  function municipisDeComarcaEnProvincia(codiComarca: string, codiProvincia: string): Municipi[] {
    const provincia = arbre.value?.find((p) => p.codi === codiProvincia)
    return provincia?.comarques.find((c) => c.codi === codiComarca)?.municipis ?? []
  }

  function municipisDeProvincia(codiProvincia: string): Municipi[] {
    const provincia = arbre.value?.find((p) => p.codi === codiProvincia)
    return provincia?.comarques.flatMap((c) => c.municipis) ?? []
  }

  // Vegueries: agrupació territorial ortogonal a la divisió per províncies.
  // Una vegueria pot abastar municipis de més d'una província (ex. Penedès).
  const municipisPerVegueria = computed<Map<string, Municipi[]>>(() => {
    const m = new Map<string, Municipi[]>()
    arbre.value?.forEach((p) =>
      p.comarques.forEach((c) =>
        c.municipis.forEach((mu) => {
          const llista = m.get(mu.vegueria_codi) ?? []
          llista.push(mu)
          m.set(mu.vegueria_codi, llista)
        })
      )
    )
    return m
  })

  function municipisDeVegueria(codiVegueria: string): Municipi[] {
    return municipisPerVegueria.value.get(codiVegueria) ?? []
  }

  function seleccionaMunicipi(codi: string, seleccionat: boolean) {
    seleccionat ? municipisSeleccionats.value.add(codi) : municipisSeleccionats.value.delete(codi)
  }

  // Selecció a nivell comarca: TOTS els municipis (les dues provincies si és
  // transfronterera). Usat pel clic al polígon del mapa.
  function seleccionaComarca(codiComarca: string, seleccionat: boolean) {
    municipisDeComarca(codiComarca).forEach((m) => seleccionaMunicipi(m.codi, seleccionat))
  }

  // Selecció comarcal restringida a una provincia. Usat pel checkbox d'una columna
  // del desplegable On? — només afecta els municipis d'aquella provincia.
  function seleccionaComarcaEnProvincia(
    codiComarca: string,
    codiProvincia: string,
    seleccionat: boolean
  ) {
    municipisDeComarcaEnProvincia(codiComarca, codiProvincia).forEach((m) =>
      seleccionaMunicipi(m.codi, seleccionat)
    )
  }

  function seleccionaProvincia(codiProvincia: string, seleccionat: boolean) {
    municipisDeProvincia(codiProvincia).forEach((m) => seleccionaMunicipi(m.codi, seleccionat))
  }

  function seleccionaVegueria(codiVegueria: string, seleccionat: boolean) {
    municipisDeVegueria(codiVegueria).forEach((m) => seleccionaMunicipi(m.codi, seleccionat))
  }

  function netejaSeleccio() {
    municipisSeleccionats.value.clear()
  }

  function estatPerMunicipis(municipis: Municipi[]): 'cap' | 'parcial' | 'total' {
    if (municipis.length === 0) return 'cap'
    const seleccionats = municipis.filter((m) => municipisSeleccionats.value.has(m.codi)).length
    if (seleccionats === 0) return 'cap'
    if (seleccionats === municipis.length) return 'total'
    return 'parcial'
  }

  function estatSeleccioComarca(codiComarca: string): 'cap' | 'parcial' | 'total' {
    return estatPerMunicipis(municipisDeComarca(codiComarca))
  }

  function estatSeleccioComarcaEnProvincia(
    codiComarca: string,
    codiProvincia: string
  ): 'cap' | 'parcial' | 'total' {
    return estatPerMunicipis(municipisDeComarcaEnProvincia(codiComarca, codiProvincia))
  }

  function estatSeleccioProvincia(codiProvincia: string): 'cap' | 'parcial' | 'total' {
    return estatPerMunicipis(municipisDeProvincia(codiProvincia))
  }

  function estatSeleccioVegueria(codiVegueria: string): 'cap' | 'parcial' | 'total' {
    return estatPerMunicipis(municipisDeVegueria(codiVegueria))
  }

  return {
    arbre,
    vegueries,
    carregant,
    error,
    municipisSeleccionats,
    municipiPerCodi,
    carregaArbre,
    seleccionaMunicipi,
    seleccionaComarca,
    seleccionaComarcaEnProvincia,
    seleccionaProvincia,
    seleccionaVegueria,
    netejaSeleccio,
    estatSeleccioComarca,
    estatSeleccioComarcaEnProvincia,
    estatSeleccioProvincia,
    estatSeleccioVegueria,
  }
})
