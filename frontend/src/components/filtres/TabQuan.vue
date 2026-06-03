<script setup lang="ts">
import { useFiltresStore, type Temporalitat } from '@/stores/filtres'

const filtres = useFiltresStore()

const OPCIONS: { valor: Temporalitat; clau: string; clauDesc: string }[] = [
  { valor: 'permanent', clau: 'quan.permanent', clauDesc: 'quan.permanentDesc' },
  { valor: 'recurrent', clau: 'quan.recurrent', clauDesc: 'quan.recurrentDesc' },
  { valor: 'puntual', clau: 'quan.puntual', clauDesc: 'quan.puntualDesc' },
]
</script>

<template>
  <div class="tab-quan">
    <ul class="opcions-temporalitat">
      <li v-for="opcio in OPCIONS" :key="opcio.valor">
        <label>
          <input
            type="radio"
            name="temporalitat"
            :value="opcio.valor"
            :checked="filtres.temporalitat === opcio.valor"
            @change="filtres.setTemporalitat(opcio.valor)"
          />
          <span class="opcio__etiqueta">{{ $t(opcio.clau) }}</span>
          <span class="opcio__descripcio">{{ $t(opcio.clauDesc) }}</span>
        </label>
      </li>
    </ul>
    <button
      v-if="filtres.temporalitat"
      type="button"
      class="netejar-temps"
      @click="filtres.setTemporalitat(null)"
    >
      {{ $t('quan.qualsevol') }}
    </button>
  </div>
</template>

<style scoped>
.tab-quan {
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.opcions-temporalitat {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.opcions-temporalitat li label {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s;
}

.opcions-temporalitat li label:hover {
  background: #f0f4f0;
}

.opcions-temporalitat input[type='radio'] {
  accent-color: #2d6a2d;
  width: 16px;
  height: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.opcio__etiqueta {
  font-size: var(--text-base);
  font-weight: 600;
  color: #333;
}

.opcio__descripcio {
  font-size: var(--text-sm);
  color: var(--color-text-secundari, #737373);
}

.netejar-temps {
  align-self: flex-start;
  padding: 6px 14px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background: none;
  font-size: 0.85rem;
  color: #666;
  cursor: pointer;
}

.netejar-temps:hover {
  border-color: var(--color-marca, #2d6a2d);
  color: var(--color-marca, #2d6a2d);
}
</style>
