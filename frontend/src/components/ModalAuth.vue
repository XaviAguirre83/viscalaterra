<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFocusTrap } from '@/composables/useFocusTrap'

const emit = defineEmits<{ tanca: [] }>()
const auth = useAuthStore()

// El modal sempre està obert mentre el component existeix (el pare el munta
// i el desmunta). Focus-trap + Esc per tancar + retorn del focus.
const caixaRef = ref<HTMLElement | null>(null)
useFocusTrap(caixaRef, ref(true), () => emit('tanca'))

type Mode = 'entra' | 'registra'
const mode = ref<Mode>('entra')
const nom = ref('')
const email = ref('')
const contrasenya = ref('')

function enviar() {
  // ⚠️ MOCK: simulem el login fins que hi hagi backend (JWT). No valida res.
  const base =
    mode.value === 'registra' && nom.value.trim() ? nom.value : (email.value.split('@')[0] ?? '')
  auth.entra(base)
  emit('tanca')
}
</script>

<template>
  <div class="modal-auth" @click.self="emit('tanca')">
    <div ref="caixaRef" class="modal-auth__caixa" role="dialog" aria-modal="true">
      <button
        type="button"
        class="modal-auth__tancar"
        :aria-label="$t('comu.tanca')"
        @click="emit('tanca')"
      >
        ✕
      </button>

      <div class="modal-auth__tabs">
        <button type="button" :class="{ actiu: mode === 'entra' }" @click="mode = 'entra'">
          {{ $t('capcalera.entra') }}
        </button>
        <button type="button" :class="{ actiu: mode === 'registra' }" @click="mode = 'registra'">
          {{ $t('capcalera.registra') }}
        </button>
      </div>

      <form class="modal-auth__form" @submit.prevent="enviar">
        <label v-if="mode === 'registra'" class="modal-auth__camp">
          <span>{{ $t('auth.nom') }}</span>
          <input v-model="nom" type="text" autocomplete="name" />
        </label>
        <label class="modal-auth__camp">
          <span>{{ $t('auth.email') }}</span>
          <input v-model="email" type="email" autocomplete="email" required />
        </label>
        <label class="modal-auth__camp">
          <span>{{ $t('auth.contrasenya') }}</span>
          <input
            v-model="contrasenya"
            type="password"
            :autocomplete="mode === 'entra' ? 'current-password' : 'new-password'"
            required
          />
        </label>
        <button type="submit" class="modal-auth__enviar">
          {{ mode === 'entra' ? $t('capcalera.entra') : $t('capcalera.registra') }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-auth {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(26, 38, 53, 0.55);
}

.modal-auth__caixa {
  position: relative;
  width: 100%;
  max-width: 380px;
  padding: 28px 28px 32px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
}

.modal-auth__tancar {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: none;
  font-size: 1.1rem;
  color: #888;
  cursor: pointer;
}

.modal-auth__tancar:hover {
  background: #f0f0ec;
  color: #333;
}

.modal-auth__tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid #ececec;
}

.modal-auth__tabs button {
  flex: 1;
  padding: 10px;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  font-size: var(--text-base);
  font-weight: 600;
  color: #888;
  cursor: pointer;
}

.modal-auth__tabs button.actiu {
  color: var(--color-marca, #2d6a2d);
  border-bottom-color: var(--color-marca, #2d6a2d);
}

.modal-auth__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-auth__camp {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.modal-auth__camp span {
  font-size: var(--text-sm);
  font-weight: 600;
  color: #444;
}

.modal-auth__camp input {
  height: 42px;
  padding: 0 12px;
  border: 1px solid #d8d8d4;
  border-radius: 8px;
  font-size: var(--text-base);
  color: #333;
}

.modal-auth__camp input:focus {
  outline: none;
  border-color: var(--color-marca, #2d6a2d);
  box-shadow: 0 0 0 2px rgba(45, 106, 45, 0.12);
}

.modal-auth__enviar {
  margin-top: 6px;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: var(--color-marca, #2d6a2d);
  color: #fff;
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.modal-auth__enviar:hover {
  background: var(--color-marca-fosc, #1e4e1e);
}

@media (max-width: 768px) {
  .modal-auth__caixa {
    max-width: none;
  }
}
</style>
