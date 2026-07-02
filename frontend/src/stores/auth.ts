import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface Usuari {
  id: number
  nom: string
  email: string
  proveidor: string
  nivell: string
  reputacio: number
}

interface RespostaAuth {
  token: string
  usuari: Usuari
}

const CLAU_TOKEN = 'viscalaterra-token'

// localStorage pot llançar (mode privat antic, "bloquejar dades de llocs" al
// navegador): mai ha de fer caure l'arrencada ni un login que el servidor ja
// ha acceptat — com a molt, la sessió viu només en memòria.
function storageGet(clau: string): string | null {
  try {
    return localStorage.getItem(clau)
  } catch {
    return null
  }
}

function storageSet(clau: string, valor: string) {
  try {
    localStorage.setItem(clau, valor)
  } catch {
    // Sessió només en memòria.
  }
}

function storageDel(clau: string) {
  try {
    localStorage.removeItem(clau)
  } catch {
    // Res a esborrar.
  }
}

export const useAuthStore = defineStore('auth', () => {
  const usuari = ref<Usuari | null>(null)
  const token = ref<string | null>(storageGet(CLAU_TOKEN))
  const carregant = ref(false)
  const autenticat = computed(() => usuari.value !== null)

  function desaToken(t: string) {
    token.value = t
    storageSet(CLAU_TOKEN, t)
  }

  function netejaToken() {
    token.value = null
    storageDel(CLAU_TOKEN)
  }

  // POST a /api/auth/*. Llança Error amb el missatge del backend si no és 2xx.
  async function peticio(ruta: string, cos: Record<string, unknown>): Promise<RespostaAuth> {
    const r = await fetch(`/api/auth/${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cos),
    })
    const dades = await r.json().catch(() => ({}))
    // El backend retorna un `codi` d'error estable; el component el tradueix amb
    // i18n. Si no n'hi ha (p. ex. error de xarxa), cau al codi genèric.
    if (!r.ok) throw new Error(dades?.codi ?? 'generic')
    return dades as RespostaAuth
  }

  function aplica(res: RespostaAuth) {
    desaToken(res.token)
    usuari.value = res.usuari
  }

  async function registra(nom: string, email: string, contrasenya: string) {
    carregant.value = true
    try {
      aplica(await peticio('registre', { nom, email, contrasenya }))
    } finally {
      carregant.value = false
    }
  }

  async function entra(email: string, contrasenya: string) {
    carregant.value = true
    try {
      aplica(await peticio('login', { email, contrasenya }))
    } finally {
      carregant.value = false
    }
  }

  async function entraAmbGoogle(credential: string) {
    carregant.value = true
    try {
      aplica(await peticio('google', { credential }))
    } finally {
      carregant.value = false
    }
  }

  // En arrencar l'app: si hi ha token desat, recupera l'usuari. Si el token ja no
  // és vàlid (caducat o secret canviat), el descarta silenciosament.
  async function carregaJo() {
    const t = token.value
    if (!t) return
    try {
      const r = await fetch('/api/auth/jo', {
        headers: { Authorization: `Bearer ${t}` },
      })
      // Si mentre esperàvem la resposta l'usuari ha iniciat sessió (token nou),
      // aquesta resposta pertany al token vell: no s'ha de tocar res — abans,
      // un 401 del token caducat esborrava el token de la sessió acabada d'obrir.
      if (token.value !== t) return
      if (!r.ok) {
        netejaToken()
        return
      }
      const dades = await r.json()
      if (token.value !== t) return
      usuari.value = dades.usuari
    } catch {
      if (token.value === t) netejaToken()
    }
  }

  function surt() {
    usuari.value = null
    netejaToken()
  }

  return { usuari, token, carregant, autenticat, registra, entra, entraAmbGoogle, carregaJo, surt }
})
