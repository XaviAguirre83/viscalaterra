import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// Un Lloc tal com el retorna GET/POST /api/llocs/cerca (camelCase).
export interface Lloc {
  id: number
  nom: string
  subtema: string
  municipiCodi: string
  municipiNom: string
  comarcaCodi: string | null
  provinciaNom: string | null
  lat: number
  lng: number
  adreca: string | null
  cp: string | null
  telefon: string | null
  web: string | null
  // Procedència de la dada: nom llegible + enllaç a la font oficial (+ tipus).
  fontNom: string | null
  fontUrl: string | null
  fontTipus: string | null
}

// Store de la cerca de Llocs (Què? + On?). Independent de filtres/territoris:
// aquests dos guarden la SELECCIÓ; aquest guarda el RESULTAT d'executar-la.
export const useLlocsStore = defineStore('llocs', () => {
  const resultats = ref<Lloc[]>([])
  const carregant = ref(false)
  const error = ref<string | null>(null)

  // true un cop s'ha executat una cerca (encara que retorni 0 resultats). Governa
  // que el mapa passi de "pintar la selecció (On?)" a "pintar els municipis amb
  // resultats". Es reinicia amb neteja().
  const cercaFeta = ref(false)

  // Id del lloc destacat: sincronitza la llista de resultats amb el pin del mapa
  // (clic a la fila ↔ pin ressaltat, i a l'inrevés).
  const llocDestacat = ref<number | null>(null)

  // Conjunt de municipis que tenen ≥1 resultat: el mapa els pinta.
  const municipisAmbResultats = computed(() => {
    const s = new Set<string>()
    for (const l of resultats.value) s.add(l.municipiCodi)
    return s
  })

  const total = computed(() => resultats.value.length)

  // Executa la cerca. subtemes = codis del Què?; municipis = codis del On?
  // (buit ⇒ tota Catalunya, s'omet del cos).
  async function cerca(subtemes: string[], municipis: string[]) {
    if (subtemes.length === 0) return
    carregant.value = true
    error.value = null
    try {
      const res = await fetch('/api/llocs/cerca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtemes,
          ...(municipis.length > 0 ? { municipis } : {}),
        }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = (await res.json()) as { total: number; llocs: Lloc[] }
      resultats.value = data.llocs
      cercaFeta.value = true
      llocDestacat.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconegut'
      resultats.value = []
      cercaFeta.value = true
    } finally {
      carregant.value = false
    }
  }

  function neteja() {
    resultats.value = []
    cercaFeta.value = false
    error.value = null
    llocDestacat.value = null
  }

  // Destaca (o desmarca amb null) un lloc: ho consumeixen la llista i el mapa.
  function destaca(id: number | null) {
    llocDestacat.value = id
  }

  return {
    resultats,
    carregant,
    error,
    cercaFeta,
    llocDestacat,
    municipisAmbResultats,
    total,
    cerca,
    neteja,
    destaca,
  }
})
