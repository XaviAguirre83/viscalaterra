import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { clauNom } from '@/data/text'
import type { NivellTerritorial } from '@/stores/mapa'

// Fitxa de territori: enllaços (web oficial, Viquipèdia) i imatges (escut,
// bandera) d'una demarcació, des de l'enriquiment generat de Wikidata
// (frontend/public/data/territoris-enriquiment.json, vegeu el script
// backend/src/scripts/enriqueix-territoris.ts).
//
// El JSON es carrega SOTA DEMANDA el primer cop que s'obre una fitxa (no entra
// al bundle). Estat de la fitxa oberta centralitzat aquí perquè qualsevol
// component (mapa, cercador) pugui obrir-la i FitxaTerritori la renderitzi.

export interface Enriquiment {
  web?: string
  wiki?: string
  escut?: string
  bandera?: string
}

interface DadesEnriquiment {
  municipis: Record<string, Enriquiment>
  comarques: Record<string, Enriquiment>
  provincies: Record<string, Enriquiment>
}

const BUIT: DadesEnriquiment = { municipis: {}, comarques: {}, provincies: {} }

export interface ObjectiuFitxa {
  nivell: NivellTerritorial
  // CODIMUNI (municipis) o CODIPROV (provincies); per a comarques s'ignora.
  codi: string
  nom: string
}

export const useFitxaStore = defineStore('fitxa', () => {
  const dades = ref<DadesEnriquiment | null>(null)
  const carregant = ref(false)
  let promesa: Promise<void> | null = null

  function carrega(): Promise<void> {
    if (dades.value) return Promise.resolve()
    if (promesa) return promesa
    carregant.value = true
    promesa = fetch('/data/territoris-enriquiment.json')
      .then((r) => (r.ok ? (r.json() as Promise<DadesEnriquiment>) : Promise.reject(r.status)))
      .then((d) => {
        dades.value = d
      })
      .catch(() => {
        // Sense enriquiment, la fitxa mostra "sense informació" en lloc de petar.
        dades.value = BUIT
      })
      .finally(() => {
        carregant.value = false
      })
    return promesa
  }

  // ── Fitxa oberta ───────────────────────────────────────────────────────
  const objectiu = ref<ObjectiuFitxa | null>(null)
  const obert = computed(() => objectiu.value !== null)

  const enriquiment = computed<Enriquiment | null>(() => {
    const o = objectiu.value
    if (!o || !dades.value) return null
    switch (o.nivell) {
      case 'municipis':
        // CODIMUNI de l'ICC són 6 xifres (INE de 5 + dígit de control); el JSON
        // s'indexa pel codi INE de 5 xifres (P772 de Wikidata).
        return dades.value.municipis[o.codi.slice(0, 5)] ?? null
      case 'provincies':
        return dades.value.provincies[o.codi] ?? null
      case 'comarques':
        return dades.value.comarques[clauNom(o.nom)] ?? null
      default:
        return null // vegueries: no enriquides encara
    }
  })

  function obre(t: ObjectiuFitxa) {
    objectiu.value = t
    void carrega()
  }

  function tanca() {
    objectiu.value = null
  }

  return { dades, carregant, objectiu, obert, enriquiment, carrega, obre, tanca }
})
