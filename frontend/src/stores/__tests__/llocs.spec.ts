import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLlocsStore } from '../llocs'

// fetch simulat: respon sempre una cerca buida; els tests inspeccionen el cos enviat.
// Un Response nou a cada crida (el cos només es pot llegir una vegada).
function simulaFetch() {
  const f = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => new Response(JSON.stringify({ total: 0, llocs: [] })))
  vi.stubGlobal('fetch', f)
  return f
}

function cosEnviat(f: ReturnType<typeof simulaFetch>): unknown {
  return JSON.parse(String(f.mock.calls[0]?.[1]?.body))
}

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('llocs — abast territorial de la cerca', () => {
  it('sense On? cerca a tota Catalunya i no envia el camp municipis', async () => {
    const f = simulaFetch()
    const s = useLlocsStore()
    await s.cerca(['cap'], [])
    expect(s.totaCatalunya).toBe(true)
    expect(cosEnviat(f)).toEqual({ subtemes: ['cap'] })
  })

  it('amb On? l’abast és la selecció de municipis', async () => {
    const f = simulaFetch()
    const s = useLlocsStore()
    await s.cerca(['cap'], ['080193'])
    expect(s.totaCatalunya).toBe(false)
    expect(cosEnviat(f)).toEqual({ subtemes: ['cap'], municipis: ['080193'] })
  })

  it('l’abast es fixa en cercar: una cerca nova el recalcula', async () => {
    simulaFetch()
    const s = useLlocsStore()
    await s.cerca(['cap'], [])
    await s.cerca(['cap'], ['080193'])
    expect(s.totaCatalunya).toBe(false)
  })

  it('neteja() reinicia l’abast', async () => {
    simulaFetch()
    const s = useLlocsStore()
    await s.cerca(['cap'], [])
    s.neteja()
    expect(s.totaCatalunya).toBe(false)
  })
})
