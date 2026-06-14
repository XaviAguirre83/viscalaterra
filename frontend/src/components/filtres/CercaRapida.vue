<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTerritorisStore } from '@/stores/territoris'
import { useFiltresStore } from '@/stores/filtres'
import { TEMES } from '@/data/categories'
import { normalitza } from '@/data/text'
import { useFitxaStore } from '@/stores/fitxa'

const territoris = useTerritorisStore()
const filtres = useFiltresStore()
const fitxa = useFitxaStore()
const { t } = useI18n()

const queryBruta = ref('') // lligat a l'input (s'actualitza a cada tecla)
const query = ref('') // valor amb debounce (dispara la cerca)
const obert = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const MAX_MUNICIPIS = 8

// Debounce de 150ms: evita recórrer l'arbre sencer a cada pulsació de tecla.
let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch(queryBruta, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    query.value = val
  }, 150)
})

// Mapa codi comarca → nom, calculat una sola vegada (evita el bucle imbricat O(n×m)).
const nomComarcaPerCodi = computed<Map<string, string>>(() => {
  const m = new Map<string, string>()
  territoris.arbre?.forEach((p) => p.comarques.forEach((c) => m.set(c.codi, c.nom)))
  return m
})

interface Resultat {
  tipus: 'municipis' | 'comarques' | 'vegueries' | 'provincies' | 'categoria'
  codi: string
  nom: string
  context: string // comarca/província per a municipis; tema (Esports…) per a categories
}

// Una sola passada: calcula els resultats i el total de municipis coincidents
// (per poder mostrar "8 de N"). normalitza(q) es calcula una vegada, no per ítem.
const cerca = computed<{ res: Resultat[]; totalMunicipis: number }>(() => {
  const q = query.value.trim()
  if (q.length < 2) return { res: [], totalMunicipis: 0 }
  const qN = normalitza(q)

  const res: Resultat[] = []
  let totalMunicipis = 0

  if (territoris.arbre) {
    // Províncies (4)
    for (const prov of territoris.arbre) {
      if (normalitza(prov.nom).includes(qN)) {
        res.push({ tipus: 'provincies', codi: prov.codi, nom: prov.nom, context: '' })
      }
    }

    // Vegueries (9)
    for (const veg of territoris.vegueries) {
      if (normalitza(veg.nom).includes(qN)) {
        res.push({ tipus: 'vegueries', codi: veg.codi, nom: veg.nom, context: '' })
      }
    }

    // Comarques (43, deduplica transfrontereres)
    const codesVistes = new Set<string>()
    for (const prov of territoris.arbre) {
      for (const com of prov.comarques) {
        if (!codesVistes.has(com.codi) && normalitza(com.nom).includes(qN)) {
          codesVistes.add(com.codi)
          res.push({ tipus: 'comarques', codi: com.codi, nom: com.nom, context: '' })
        }
      }
    }

    // Municipis: compta tots els coincidents però només en mostra fins a MAX_MUNICIPIS.
    let mostrats = 0
    for (const [, mu] of territoris.municipiPerCodi) {
      if (normalitza(mu.nom).includes(qN)) {
        totalMunicipis++
        if (mostrats < MAX_MUNICIPIS) {
          res.push({
            tipus: 'municipis',
            codi: mu.codi,
            nom: mu.nom,
            context: nomComarcaPerCodi.value.get(mu.comarca_codi) ?? '',
          })
          mostrats++
        }
      }
    }
  }

  // Categories del Què? — subtemes que coincideixen pel seu nom traduït.
  for (const tema of TEMES) {
    for (const sub of tema.subtemes) {
      const nom = t(sub.clau)
      if (normalitza(nom).includes(qN)) {
        res.push({ tipus: 'categoria', codi: sub.codi, nom, context: t(tema.clau) })
      }
    }
  }

  return { res, totalMunicipis }
})

const resultats = computed(() => cerca.value.res)
const municipisOcults = computed(() => Math.max(0, cerca.value.totalMunicipis - MAX_MUNICIPIS))

// Agrupa resultats per tipus mantenint l'ordre: prov → veg → com → mun
const grups = computed(() => {
  const ordre: Resultat['tipus'][] = [
    'provincies',
    'vegueries',
    'comarques',
    'municipis',
    'categoria',
  ]
  const etiquetes: Record<Resultat['tipus'], string> = {
    provincies: t('nivells.provincia'),
    vegueries: t('nivells.vegueria'),
    comarques: t('nivells.comarca'),
    municipis: t('nivells.municipi'),
    categoria: t('cerca.categoria'),
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
    case 'categoria':
      filtres.toggleSubtema(r.codi, true)
      break
  }
  queryBruta.value = ''
  query.value = ''
  obert.value = false
}

// Nivells amb fitxa d'informació (enllaços). Les vegueries i les categories no.
function teFitxa(tipus: Resultat['tipus']): boolean {
  return tipus === 'provincies' || tipus === 'comarques' || tipus === 'municipis'
}

// Obre la fitxa del territori SENSE seleccionar-lo al mapa.
function obreFitxa(r: Resultat) {
  if (!teFitxa(r.tipus)) return
  fitxa.obre({
    nivell: r.tipus as 'provincies' | 'comarques' | 'municipis',
    codi: r.codi,
    nom: r.nom,
  })
}

function tancaEnBlur(e: FocusEvent) {
  // Deixa temps perquè el click al resultat es processi primer
  const related = e.relatedTarget as HTMLElement | null
  if (!related?.closest('.cerca-rapida')) {
    obert.value = false
  }
}

// ── Navegació amb teclat (fletxes amunt/avall + Enter + Esc) ───────────────

const indexActiu = ref(-1)

// Llista plana dels resultats en el mateix ordre visual que el desplegable.
const llistaPlana = computed(() => grups.value.flatMap((g) => g.items))

// Quan canvien els resultats (s'ha escrit més text), la selecció es reinicia.
watch(resultats, () => (indexActiu.value = -1))

function mouSeleccio(delta: number) {
  const n = llistaPlana.value.length
  if (n === 0) return
  obert.value = true
  indexActiu.value = (indexActiu.value + delta + n) % n
  void nextTick(() => {
    document.querySelector('.cerca-rapida .cerca-fila--actiu')?.scrollIntoView({ block: 'nearest' })
  })
}

function enterSeleccio() {
  const r = llistaPlana.value[indexActiu.value]
  if (r) selecciona(r)
}

function escTanca() {
  queryBruta.value = ''
  query.value = ''
  indexActiu.value = -1
  obert.value = false
}
</script>

<template>
  <div class="cerca-rapida">
    <div class="cerca-rapida__camp">
      <input
        ref="inputRef"
        v-model="queryBruta"
        type="text"
        :placeholder="$t('cerca.placeholder')"
        class="cerca-input"
        autocomplete="off"
        :aria-label="$t('cerca.aria')"
        @focus="obert = true"
        @blur="tancaEnBlur"
        @keydown.down.prevent="mouSeleccio(1)"
        @keydown.up.prevent="mouSeleccio(-1)"
        @keydown.enter.prevent="enterSeleccio"
        @keydown.esc.prevent="escTanca"
      />
      <button class="cerca-btn" tabindex="-1" @mousedown.prevent @click="inputRef?.focus()">
        {{ $t('cerca.boto') }}
      </button>
    </div>

    <div v-if="obert && grups.length > 0" class="cerca-rapida__dropdown">
      <div v-for="grup in grups" :key="grup.tipus" class="cerca-grup">
        <div class="cerca-grup__titol">{{ grup.etiqueta }}</div>
        <div
          v-for="r in grup.items"
          :key="r.codi"
          class="cerca-fila"
          :class="{ 'cerca-fila--actiu': llistaPlana[indexActiu] === r }"
        >
          <button type="button" class="cerca-resultat" @mousedown.prevent @click="selecciona(r)">
            <span class="cerca-resultat__nom">{{ r.nom }}</span>
            <span v-if="r.context" class="cerca-resultat__context">{{ r.context }}</span>
          </button>
          <button
            v-if="teFitxa(r.tipus)"
            type="button"
            class="cerca-resultat__info"
            :aria-label="$t('fitxa.webOficial')"
            title="ⓘ"
            @mousedown.prevent
            @click.stop="obreFitxa(r)"
          >
            ⓘ
          </button>
        </div>
      </div>
      <div v-if="municipisOcults > 0" class="cerca-rapida__mes">
        {{ $t('cerca.mesMunicipis', { n: municipisOcults }) }}
      </div>
    </div>

    <div
      v-if="obert && query.trim().length >= 2 && grups.length === 0"
      class="cerca-rapida__dropdown cerca-rapida__buit"
    >
      {{ $t('cerca.capResultat', { q: query.trim() }) }}
    </div>
  </div>
</template>

<style scoped>
.cerca-rapida {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.cerca-rapida__camp {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.cerca-input {
  height: 36px;
  padding: 0 12px;
  border: 1px solid #d8d8d4;
  border-radius: 18px;
  font-size: var(--text-sm);
  color: #333;
  background: #fafaf8;
  outline: none;
  width: 180px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

@media (max-width: 768px) {
  .cerca-input {
    flex: 1;
    width: auto;
    height: 44px;
  }
}

.cerca-input:focus {
  border-color: var(--color-marca, #2d6a2d);
  background: #fff;
  box-shadow: 0 0 0 2px rgba(45, 106, 45, 0.12);
}

.cerca-btn {
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 18px;
  background: var(--color-marca, #2d6a2d);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .cerca-btn {
    height: 44px;
  }
}

.cerca-btn:hover {
  background: var(--color-marca-fosc, #1e4e1e);
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
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
}

.cerca-rapida__mes {
  padding: 8px 14px;
  font-size: var(--text-xs);
  color: var(--color-text-secundari, #737373);
  background: #fafaf8;
  border-top: 1px solid #f0f0ec;
}

/* ── Grup de resultats ──────────────────────────────────────────────────── */

.cerca-grup + .cerca-grup {
  border-top: 1px solid #f0f0ec;
}

.cerca-grup__titol {
  padding: 6px 14px 3px;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--color-text-secundari, #737373);
}

/* Fila: el resultat seleccionable + la ⓘ d'informació, costat a costat */
.cerca-fila {
  display: flex;
  align-items: stretch;
}

.cerca-fila:hover,
.cerca-fila--actiu {
  background: #f4f7f4;
}

.cerca-resultat {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 9px 14px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
}

.cerca-resultat__info {
  flex-shrink: 0;
  width: 40px;
  border: none;
  background: none;
  color: var(--color-text-secundari, #737373);
  font-size: 1rem;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}

.cerca-resultat__info:hover {
  background: #eef4ee;
  color: #2d6a2d;
}

.cerca-resultat__nom {
  font-size: var(--text-base);
  color: #222;
  font-weight: 500;
}

.cerca-resultat__context {
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
}
</style>
