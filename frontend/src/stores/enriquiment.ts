import { ref } from 'vue'
import { defineStore } from 'pinia'
import { clauNom } from '@/data/text'
import type { NivellTerritorial } from '@/stores/mapa'

// Enriquiment de territoris (web, Viquipèdia, escut, bandera) generat de
// Wikidata a frontend/public/data/territoris-enriquiment.json (vegeu l'script
// backend/src/scripts/enriqueix-territoris.ts). Carregat SOTA DEMANDA i
// compartit per la fitxa de territori (stores/fitxa) i la capa d'imatges del
// mapa (escut/bandera). Una sola font, una sola descàrrega.

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

// Converteix una imatge de Commons (http://…/Special:FilePath/…) a https i la
// dimensiona amb ?width per no baixar-la a mida completa.
export function imatgeCommons(url: string, width: number): string {
  return `${url.replace(/^http:/, 'https:')}?width=${width}`
}

export const useEnriquimentStore = defineStore('enriquiment', () => {
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
        dades.value = BUIT
      })
      .finally(() => {
        carregant.value = false
      })
    return promesa
  }

  // Cerca l'enriquiment d'una demarcació. Municipis pel codi INE (5 primeres
  // xifres del CODIMUNI de 6); comarques pel nom normalitzat; províncies per
  // CODIPROV. Vegueries: no enriquides.
  function busca(nivell: NivellTerritorial, codi: string, nom: string): Enriquiment | null {
    const d = dades.value
    if (!d) return null
    switch (nivell) {
      case 'municipis':
        return d.municipis[codi.slice(0, 5)] ?? null
      case 'provincies':
        return d.provincies[codi] ?? null
      case 'comarques':
        return d.comarques[clauNom(nom)] ?? null
      default:
        return null
    }
  }

  return { dades, carregant, carrega, busca }
})
