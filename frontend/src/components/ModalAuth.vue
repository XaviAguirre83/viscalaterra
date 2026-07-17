<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useFocusTrap } from '@/composables/useFocusTrap'

const emit = defineEmits<{ tanca: [] }>()
const auth = useAuthStore()
const { t, te } = useI18n()

// Tradueix el codi d'error del backend; si no hi ha clau, missatge genèric.
function missatgeError(codi: string): string {
  const clau = `auth.errors.${codi}`
  return te(clau) ? t(clau) : t('auth.errors.generic')
}

// El modal sempre està obert mentre el component existeix (el pare el munta
// i el desmunta). Focus-trap + Esc per tancar + retorn del focus.
const caixaRef = ref<HTMLElement | null>(null)
useFocusTrap(caixaRef, ref(true), () => emit('tanca'))

type Mode = 'entra' | 'registra'
const mode = ref<Mode>('entra')
const nom = ref('')
const email = ref('')
const contrasenya = ref('')
const error = ref('')

function canviaMode(m: Mode) {
  mode.value = m
  error.value = ''
}

async function enviar() {
  error.value = ''
  try {
    if (mode.value === 'registra') {
      await auth.registra(nom.value, email.value, contrasenya.value)
    } else {
      await auth.entra(email.value, contrasenya.value)
    }
    emit('tanca')
  } catch (e) {
    error.value = missatgeError((e as Error).message)
  }
}

// ── Login amb Google (Google Identity Services) ───────────────────────────
// El Client ID es configura a frontend/.env.local (VITE_GOOGLE_CLIENT_ID). Sense
// ell, el botó no es mostra (la resta del modal funciona igual).
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const googleBtnRef = ref<HTMLElement | null>(null)

interface GoogleId {
  accounts: {
    id: {
      initialize(cfg: { client_id: string; callback: (r: { credential: string }) => void }): void
      renderButton(el: HTMLElement, opts: Record<string, unknown>): void
    }
  }
}
type FinestraGoogle = Window & { google?: GoogleId }

// Single-flight a nivell de mòdul: si el modal es tanca i es reobre mentre el
// script encara es descarrega, la segona crida espera la MATEIXA promesa.
// (Abans es resolia immediatament perquè el <script> ja existia al DOM, i el
// botó de Google no es renderitzava perquè window.google encara no hi era.)
let promesaScriptGoogle: Promise<void> | null = null

function carregaScriptGoogle(): Promise<void> {
  promesaScriptGoogle ??= new Promise<void>((resolve, reject) => {
    if ((window as FinestraGoogle).google) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.id = 'gsi-script'
    s.onload = () => resolve()
    s.onerror = () => {
      promesaScriptGoogle = null // permet reintentar en reobrir el modal
      reject(new Error('Google no disponible'))
    }
    document.head.appendChild(s)
  })
  return promesaScriptGoogle
}

async function onCredentialGoogle(resp: { credential: string }) {
  error.value = ''
  try {
    await auth.entraAmbGoogle(resp.credential)
    emit('tanca')
  } catch (e) {
    error.value = missatgeError((e as Error).message)
  }
}

onMounted(async () => {
  if (!CLIENT_ID) return
  try {
    await carregaScriptGoogle()
    const g = (window as FinestraGoogle).google
    if (!g || !googleBtnRef.value) return
    g.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCredentialGoogle })
    g.accounts.id.renderButton(googleBtnRef.value, {
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'continue_with',
      shape: 'pill',
    })
  } catch {
    /* si Google falla, la resta del modal segueix funcionant */
  }
})
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
        <button type="button" :class="{ actiu: mode === 'entra' }" @click="canviaMode('entra')">
          {{ $t('capcalera.entra') }}
        </button>
        <button
          type="button"
          :class="{ actiu: mode === 'registra' }"
          @click="canviaMode('registra')"
        >
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

        <p v-if="error" class="modal-auth__error" role="alert">{{ error }}</p>

        <button type="submit" class="modal-auth__enviar" :disabled="auth.carregant">
          <span v-if="auth.carregant" class="modal-auth__spinner" aria-hidden="true" />
          {{ mode === 'entra' ? $t('capcalera.entra') : $t('capcalera.registra') }}
        </button>
      </form>

      <!-- Login amb Google -->
      <div class="modal-auth__separador">
        <span>{{ $t('auth.o') }}</span>
      </div>
      <div v-if="CLIENT_ID" ref="googleBtnRef" class="modal-auth__google"></div>
      <p v-else class="modal-auth__nota">{{ $t('auth.googlePendent') }}</p>
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
  background: rgba(19, 29, 41, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  animation: modal-fons 0.18s ease;
}

@keyframes modal-fons {
  from {
    opacity: 0;
  }
}

.modal-auth__caixa {
  position: relative;
  width: 100%;
  max-width: 380px;
  padding: 28px 28px 32px;
  background: #fff;
  border-radius: 20px;
  box-shadow: var(--ombra-4, 0 16px 48px rgba(0, 0, 0, 0.35));
  animation: modal-pop var(--mou-pop, 0.26s) backwards;
}

@keyframes modal-pop {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-auth,
  .modal-auth__caixa {
    animation: none;
  }
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
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--color-vora-forta, #d8d8d4);
  border-radius: var(--radi-sm, 10px);
  background: var(--pedra-50, #fafaf8);
  font-size: var(--text-base);
  color: #333;
  transition:
    border-color var(--mou-rapid, 0.15s),
    background var(--mou-rapid, 0.15s),
    box-shadow var(--mou-rapid, 0.15s);
}

.modal-auth__camp input:focus {
  outline: none;
  border-color: var(--color-marca, #2d6a2d);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(45, 106, 45, 0.13);
}

.modal-auth__enviar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 6px;
  height: 46px;
  border: none;
  border-radius: var(--radi-pastilla, 23px);
  background: linear-gradient(180deg, var(--verd-500, #3d7c3d), var(--color-marca, #2d6a2d));
  color: #fff;
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(45, 106, 45, 0.35);
  transition:
    filter var(--mou-rapid, 0.15s),
    transform var(--mou-mig, 0.2s),
    box-shadow var(--mou-mig, 0.2s);
}

.modal-auth__enviar:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow: 0 5px 16px rgba(45, 106, 45, 0.4);
}

.modal-auth__enviar:active:not(:disabled) {
  transform: translateY(0);
}

.modal-auth__enviar:disabled {
  opacity: 0.65;
  cursor: default;
}

.modal-auth__spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: modal-gir 0.7s linear infinite;
}

@keyframes modal-gir {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-auth__enviar:hover:not(:disabled) {
    transform: none;
  }

  .modal-auth__spinner {
    animation-duration: 1.6s;
  }
}

.modal-auth__error {
  margin: 0;
  padding: 9px 12px;
  background: #fdecec;
  border: 1px solid #f5c2c2;
  border-radius: 8px;
  font-size: var(--text-sm);
  color: #b3261e;
}

.modal-auth__separador {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 18px 0 14px;
  color: #aaa;
  font-size: var(--text-sm);
}

.modal-auth__separador::before,
.modal-auth__separador::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #ececec;
}

.modal-auth__google {
  display: flex;
  justify-content: center;
  min-height: 40px;
}

.modal-auth__nota {
  margin: 0;
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-text-secundari, #737373);
}

@media (max-width: 768px) {
  .modal-auth__caixa {
    max-width: none;
  }
}
</style>
