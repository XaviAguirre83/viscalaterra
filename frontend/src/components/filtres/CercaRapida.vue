<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTerritorisStore } from '@/stores/territoris'

const territoris = useTerritorisStore()

const query = ref('')
const obert = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

// Normalitza text per cercar sense accents ni majúscules
function normalitza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function coincideix(nom: string, q: string): boolean {
  return normalitza(nom).includes(normalitza(q))
}

interface Resultat {
  tipus: 'municipis' | 'comarques' | 'vegueries' | 'provincies'
  codi: string
  nom: string
  context: string // comarca/província per a municipis, etc.
}

const resultats = computed<Resultat[]>(() => {
  const q = query.value.trim()
  if (q.length < 2 || !territoris.arbre) return []

  const res: Resultat[] = []

  // Províncies (4)
  for (const prov of territoris.arbre) {
    if (coincideix(prov.nom, q)) {
      res.push({ tipus: 'provincies', codi: prov.codi, nom: prov.nom, context: '' })
    }
  }

  // Vegueries (9)
  for (const veg of territoris.vegueries) {
    if (coincideix(veg.nom, q)) {
      res.push({ tipus: 'vegueries', codi: veg.codi, nom: veg.nom, context: '' })
    }
  }

  // Comarques (43, deduplica transfrontereres)
  const codesVistes = new Set<string>()
  for (const prov of territoris.arbre) {
    for (const com of prov.comarques) {
      if (!codesVistes.has(com.codi) && coincideix(com.nom, q)) {
        codesVistes.add(com.codi)
        res.push({ tipus: 'comarques', codi: com.codi, nom: com.nom, context: '' })
      }
    }
  }

  // Municipis (màx 8 per no saturar)
  let comptMunicipis = 0
  for (const [, mu] of territoris.municipiPerCodi) {
    if (comptMunicipis >= 8) break
    if (coincideix(mu.nom, q)) {
      // Troba el nom de la comarca
      let nomComarca = ''
      for (const prov of territoris.arbre!) {
        const com = prov.comarques.find((c) => c.codi === mu.comarca_codi)
        if (com) {
          nomComarca = com.nom
          break
        }
      }
      res.push({ tipus: 'municipis', codi: mu.codi, nom: mu.nom, context: nomComarca })
      comptMunicipis++
    }
  }

  return res
})

// Agrupa resultats per tipus mantenint l'ordre: prov → veg → com → mun
const grups = computed(() => {
  const ordre: Resultat['tipus'][] = ['provincies', 'vegueries', 'comarques', 'municipis']
  const etiquetes: Record<Resultat['tipus'], string> = {
    provincies: 'Província',
    vegueries: 'Vegueria',
    comarques: 'Comarca',
    municipis: 'Municipi',
  }
  return ordre
    .map((tipus) => ({
      tipus,
      etiqueta: etiquetes[tipus],
      items: resultats.value.filter((r) => r.tipus === tipus),
    }))
    .filter((g) => g.items.length > 0)
})

function selecciona(r: Resultat) {
  switch (r.tipus) {
    case 'municipis':
      territoris.seleccionaMunicipi(r.codi, true)
      break
    case 'comarques':
      territoris.seleccionaComarca(r.codi, true)
      break
    case 'vegueries':
      territoris.seleccionaVegueria(r.codi, true)
      break
    case 'provincies':
      territoris.seleccionaProvincia(r.codi, true)
      break
  }
  query.value = ''
  obert.value = false
}

function tancaEnBlur(e: FocusEvent) {
  // Deixa temps perquè el click al resultat es processi primer
  const related = e.relatedTarget as HTMLElement | null
  if (!related?.closest('.cerca-rapida')) {
    obert.value = false
  }
}
</script>

<template>
  <div class="cerca-rapida">
    <div class="cerca-rapida__camp">
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        placeholder="Cerca per nom…"
        class="cerca-input"
        autocomplete="off"
        @focus="obert = true"
        @blur="tancaEnBlur"
      />
      <button class="cerca-btn" tabindex="-1" @mousedown.prevent @click="inputRef?.focus()">
        Cerca
      </button>
    </div>

    <div v-if="obert && grups.length > 0" class="cerca-rapida__dropdown">
      <div v-for="grup in grups" :key="grup.tipus" class="cerca-grup">
        <div class="cerca-grup__titol">{{ grup.etiqueta }}</div>
        <button
          v-for="r in grup.items"
          :key="r.codi"
          class="cerca-resultat"
          @mousedown.prevent
          @click="selecciona(r)"
        >
          <span class="cerca-resultat__nom">{{ r.nom }}</span>
          <span v-if="r.context" class="cerca-resultat__context">{{ r.context }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="obert && query.trim().length >= 2 && grups.length === 0"
      class="cerca-rapida__dropdown cerca-rapida__buit"
    >
      Cap resultat per «{{ query.trim() }}»
    </div>
  </div>
</template>

<style scoped>
.cerca-rapida {
  position: relative;
  display: flex;
  align-items: center;
}

.cerca-rapida__camp {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cerca-input {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #d8d8d4;
  border-radius: 15px;
  font-size: 0.85rem;
  color: #333;
  background: #fafaf8;
  outline: none;
  width: 180px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.cerca-input:focus {
  border-color: #2d6a2d;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(45, 106, 45, 0.12);
}

.cerca-btn {
  height: 30px;
  padding: 0 16px;
  border: none;
  border-radius: 15px;
  background: #2d6a2d;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.cerca-btn:hover {
  background: #1e4e1e;
}

/* ── Dropdown ───────────────────────────────────────────────────────────── */

.cerca-rapida__dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 260px;
  background: #fff;
  border: 1px solid #e0e0dc;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  z-index: 3000;
}

.cerca-rapida__buit {
  padding: 12px 16px;
  font-size: 0.85rem;
  color: #999;
}

/* ── Grup de resultats ──────────────────────────────────────────────────── */

.cerca-grup + .cerca-grup {
  border-top: 1px solid #f0f0ec;
}

.cerca-grup__titol {
  padding: 6px 14px 3px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #aaa;
}

.cerca-resultat {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  padding: 7px 14px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
}

.cerca-resultat:hover {
  background: #f4f7f4;
}

.cerca-resultat__nom {
  font-size: 0.88rem;
  color: #222;
  font-weight: 500;
}

.cerca-resultat__context {
  font-size: 0.78rem;
  color: #999;
}
</style>
