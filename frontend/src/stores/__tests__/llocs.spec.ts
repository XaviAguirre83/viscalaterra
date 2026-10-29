import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLlocsStore, type Lloc } from '../llocs'

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

describe('llocs — enllaços que venen de datasets externs', () => {
  it('només conserva com a enllaç les adreces http(s)', async () => {
    const lloc: Lloc = {
      id: 1,
      nom: 'Lloc amb una web enverinada',
      subtema: 'cap',
      municipiCodi: '080193',
      municipiNom: 'Barcelona',
      comarcaCodi: '13',
      provinciaNom: 'Barcelona',
      lat: 41.38,
      lng: 2.17,
      adreca: null,
      cp: null,
      telefon: null,
      web: 'javascript:alert(document.cookie)',
      fontNom: 'Equipaments de Catalunya',
      fontUrl: 'https://analisi.transparenciacatalunya.cat/d/8gmd-gz7i',
      fontTipus: 'oficial',
    }
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockImplementation(async () => new Response(JSON.stringify({ total: 1, llocs: [lloc] })))
    )
    const s = useLlocsStore()
    await s.cerca(['cap'], [])
    expect(s.resultats[0]?.web).toBeNull()
    expect(s.resultats[0]?.fontUrl).toBe('https://analisi.transparenciacatalunya.cat/d/8gmd-gz7i')
  })
})
