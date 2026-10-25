import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore, type Usuari } from '../auth'

const XAVI: Usuari = {
  id: 1,
  nom: 'Xavi',
  email: 'xavi@example.com',
  proveidor: 'local',
  nivell: 'estandard',
  reputacio: 0,
}

// Un Response nou a cada crida (el cos només es pot llegir una vegada).
function resposta(cos: unknown, status = 200): Response {
  return new Response(JSON.stringify(cos), { status })
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('auth — sessió en cookie HttpOnly (el JS no veu mai el token)', () => {
  it('entrar no desa res al navegador: només l’usuari en memòria', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(resposta({ usuari: XAVI })))
    const s = useAuthStore()
    await s.entra('xavi@example.com', 'contrasenya')
    expect(s.usuari).toEqual(XAVI)
    expect(localStorage.length).toBe(0)
  })

  it('esborra el token que hi deixaven les versions anteriors', () => {
    localStorage.setItem('viscalaterra-token', 'jwt.vell')
    useAuthStore()
    expect(localStorage.getItem('viscalaterra-token')).toBeNull()
  })

  it('carregaJo pregunta a /jo sense cap capçalera Authorization (la cookie la posa el navegador)', async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(resposta({ usuari: XAVI }))
    vi.stubGlobal('fetch', f)
    const s = useAuthStore()
    await s.carregaJo()
    expect(f.mock.calls[0]).toEqual(['/api/auth/jo'])
    expect(s.usuari).toEqual(XAVI)
  })

  it('sense sessió, carregaJo deixa l’usuari a null', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(resposta({ usuari: null })))
    const s = useAuthStore()
    await s.carregaJo()
    expect(s.autenticat).toBe(false)
  })

  it('una resposta de /jo que arriba després d’entrar no tanca la sessió nova', async () => {
    let respon!: (r: Response) => void
    const f = vi.fn<typeof fetch>()
    f.mockImplementationOnce(() => new Promise<Response>((r) => (respon = r))) // /jo, lent
    f.mockResolvedValueOnce(resposta({ usuari: XAVI })) // login
    vi.stubGlobal('fetch', f)
    const s = useAuthStore()
    const jo = s.carregaJo()
    await s.entra('xavi@example.com', 'contrasenya')
    respon(resposta({ usuari: null }))
    await jo
    expect(s.usuari).toEqual(XAVI)
  })

  it('surt demana al servidor que esborri la cookie', async () => {
    const f = vi.fn<typeof fetch>()
    f.mockResolvedValueOnce(resposta({ usuari: XAVI })) // login
    f.mockResolvedValueOnce(new Response(null, { status: 204 })) // surt
    vi.stubGlobal('fetch', f)
    const s = useAuthStore()
    await s.entra('xavi@example.com', 'contrasenya')
    await s.surt()
    expect(s.usuari).toBeNull()
    expect(f).toHaveBeenLastCalledWith('/api/auth/surt', { method: 'POST' })
  })

  it('un error del backend arriba com a codi traduïble i no obre sessió', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(resposta({ codi: 'credencials_incorrectes' }, 401))
    )
    const s = useAuthStore()
    await expect(s.entra('xavi@example.com', 'dolenta')).rejects.toThrow('credencials_incorrectes')
    expect(s.usuari).toBeNull()
  })
})
