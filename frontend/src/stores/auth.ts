import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface Usuari {
  nom: string
}

export const useAuthStore = defineStore('auth', () => {
  const usuari = ref<Usuari | null>(null)
  const autenticat = computed(() => usuari.value !== null)

  // ⚠️ MOCK temporal: fins que hi hagi backend (JWT + bcrypt) simulem la sessió
  // en memòria. No valida res ni persisteix; serveix per provar la UI.
  function entra(nom: string) {
    usuari.value = { nom: nom.trim() || 'Usuari' }
  }

  function surt() {
    usuari.value = null
  }

  return { usuari, autenticat, entra, surt }
})
