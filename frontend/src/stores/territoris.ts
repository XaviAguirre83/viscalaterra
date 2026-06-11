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
      const res = await fetch('/api/territoris/arbre')
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
    if (seleccionat) municipisSeleccionats.value.add(codi)
    else municipisSeleccionats.value.delete(codi)
  }

  // Les funcions bulk treballen sobre un Set pla (no reactiu) i assignen el
  // resultat al ref en una sola operació. Mutar el Set reactiu N vegades
  // dispara el sistema reactiu de Vue N vegades (~9ms cadascuna); assignar
  // un nou Set al ref dispara Vue exactament 1 cop independentment de N.

  function seleccionaComarca(codiComarca: string, seleccionat: boolean) {
    const s = new Set(municipisSeleccionats.value)
    municipisDeComarca(codiComarca).forEach((m) => (seleccionat ? s.add(m.codi) : s.delete(m.codi)))
    municipisSeleccionats.value = s
  }

  function seleccionaComarcaEnProvincia(
    codiComarca: string,
    codiProvincia: string,
    seleccionat: boolean
  ) {
    const s = new Set(municipisSeleccionats.value)
    municipisDeComarcaEnProvincia(codiComarca, codiProvincia).forEach((m) =>
      seleccionat ? s.add(m.codi) : s.delete(m.codi)
    )
    municipisSeleccionats.value = s
  }

  function seleccionaProvincia(codiProvincia: string, seleccionat: boolean) {
    const s = new Set(municipisSeleccionats.value)
    municipisDeProvincia(codiProvincia).forEach((m) =>
      seleccionat ? s.add(m.codi) : s.delete(m.codi)
    )
    municipisSeleccionats.value = s
  }

  function seleccionaVegueria(codiVegueria: string, seleccionat: boolean) {
    const s = new Set(municipisSeleccionats.value)
    municipisDeVegueria(codiVegueria).forEach((m) =>
      seleccionat ? s.add(m.codi) : s.delete(m.codi)
    )
    municipisSeleccionats.value = s
  }

  function netejaSeleccio() {
    municipisSeleccionats.value = new Set()
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
    municipisDeComarca,
    municipisDeVegueria,
    municipisDeProvincia,
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
