<script setup lang="ts">
import { useFiltresStore, type Temporalitat } from '@/stores/filtres'

const filtres = useFiltresStore()

const OPCIONS: { valor: Temporalitat; etiqueta: string; descripcio: string }[] = [
  { valor: 'permanent', etiqueta: 'Permanent', descripcio: 'Sempre disponible' },
  { valor: 'recurrent', etiqueta: 'Recurrent', descripcio: 'Es repeteix periòdicament' },
  { valor: 'puntual', etiqueta: 'Puntual', descripcio: 'Dates concretes' },
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
          <span class="opcio__etiqueta">{{ opcio.etiqueta }}</span>
          <span class="opcio__descripcio">{{ opcio.descripcio }}</span>
        </label>
      </li>
    </ul>
    <button v-if="filtres.temporalitat" @click="filtres.setTemporalitat(null)">
      Qualsevol moment
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
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
}

.opcio__descripcio {
  font-size: 0.8rem;
  color: #888;
}

button {
  align-self: flex-start;
  padding: 6px 14px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background: none;
  font-size: 0.85rem;
  color: #666;
  cursor: pointer;
}

button:hover {
  border-color: #2d6a2d;
  color: #2d6a2d;
}
</style>
