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

// Resposta de /api/auth/*: l'usuari (null a /jo si no hi ha sessió).
interface RespostaAuth {
  usuari: Usuari | null
}

// La sessió viu en una cookie HttpOnly que posa i esborra el servidor
// (backend/src/auth/sessio.ts): el JavaScript no la pot llegir, i per tant un
// XSS no la pot robar. Les versions anteriors desaven el token en aquesta clau
// de localStorage; s'esborra perquè no hi quedi cap token vell.
const CLAU_TOKEN_ANTIC = 'viscalaterra-token'

function esborraTokenAntic() {
  // localStorage pot llançar (mode privat antic, "bloquejar dades de llocs").
  try {
    localStorage.removeItem(CLAU_TOKEN_ANTIC)
  } catch {
    // Res a esborrar.
  }
}

export const useAuthStore = defineStore('auth', () => {
  const usuari = ref<Usuari | null>(null)
  const carregant = ref(false)
  const autenticat = computed(() => usuari.value !== null)

  esborraTokenAntic()

  // Compta els canvis de sessió (entrar o sortir). Una resposta de /jo que arriba
  // després d'un canvi pertany a l'estat anterior i s'ignora: si no, el "sense
  // sessió" de la consulta de l'arrencada podria tancar la sessió acabada d'obrir.
  let canvis = 0

  // POST a /api/auth/*. Llança Error amb el missatge del backend si no és 2xx.
  async function peticio(ruta: string, cos: Record<string, unknown>): Promise<Usuari> {
    const r = await fetch(`/api/auth/${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cos),
    })
    const dades = await r.json().catch(() => ({}))
    // El backend retorna un `codi` d'error estable; el component el tradueix amb
    // i18n. Si no n'hi ha (p. ex. error de xarxa), cau al codi genèric.
    if (!r.ok) throw new Error(dades?.codi ?? 'generic')
    return (dades as RespostaAuth).usuari as Usuari
  }

  function aplica(u: Usuari) {
    canvis++
    usuari.value = u
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

  // En arrencar l'app: el JS no pot saber si hi ha cookie de sessió (és
  // HttpOnly), així que sempre ho pregunta; sense sessió /jo respon usuari null.
  async function carregaJo() {
    const abans = canvis
    try {
      const r = await fetch('/api/auth/jo')
      if (!r.ok) return
      const dades = (await r.json()) as RespostaAuth
      if (canvis !== abans) return
      usuari.value = dades.usuari ?? null
    } catch {
      // Sense xarxa: la interfície es queda sense sessió visible.
    }
  }

  // Només el servidor pot esborrar la cookie HttpOnly.
  async function surt() {
    canvis++
    usuari.value = null
    try {
      await fetch('/api/auth/surt', { method: 'POST' })
    } catch {
      // Sense xarxa la cookie no s'ha esborrat i, en recarregar, /jo tornaria a
      // obrir la sessió. És un cas rar i no es reintenta.
    }
  }

  return { usuari, carregant, autenticat, registra, entra, entraAmbGoogle, carregaJo, surt }
})
