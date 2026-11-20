import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ca from '@/i18n/locales/ca.json'

const i18n = createI18n({ legacy: false, locale: 'ca', messages: { ca } })

type FinestraAmbGoogle = { google?: unknown }
let w: VueWrapper | null = null

// El Client ID es llegeix en carregar el mòdul, i l'estat de la càrrega del
// script de Google també és del mòdul: cada test el torna a importar net.
async function muntar() {
  vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'client-de-prova')
  vi.resetModules()
  const { default: ModalAuth } = await import('../ModalAuth.vue')
  w = mount(ModalAuth, { global: { plugins: [i18n] }, attachTo: document.body })
  return w
}

const scriptGoogle = () => document.getElementById('gsi-script')

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  w?.unmount()
  w = null
  document.querySelectorAll('#gsi-script').forEach((s) => s.remove())
  delete (window as FinestraAmbGoogle).google
  vi.unstubAllEnvs()
})

describe('ModalAuth.vue — accés amb Google', () => {
  it('en obrir-se no carrega res de Google, només el nostre botó', async () => {
    const m = await muntar()
    expect(scriptGoogle()).toBeNull()
    expect(m.find('.modal-auth__google-boto').text()).toContain('Continua amb Google')
  })

  it('carrega Google en prémer el botó i li cedeix el lloc', async () => {
    const m = await muntar()
    await m.find('.modal-auth__google-boto').trigger('click')
    expect(scriptGoogle()?.getAttribute('src')).toBe('https://accounts.google.com/gsi/client')

    const initialize = vi.fn<(cfg: { client_id: string }) => void>()
    const renderButton = vi.fn<(el: HTMLElement, opts: Record<string, unknown>) => void>()
    ;(window as FinestraAmbGoogle).google = { accounts: { id: { initialize, renderButton } } }
    scriptGoogle()?.dispatchEvent(new Event('load'))
    await flushPromises()

    const contenidor = m.find('.modal-auth__google-iframe').element
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'client-de-prova' })
    )
    expect(renderButton).toHaveBeenCalledWith(contenidor, expect.objectContaining({ locale: 'ca' }))
    expect(m.find('.modal-auth__google-boto').exists()).toBe(false)
    expect(document.activeElement).toBe(contenidor)
  })

  it('si Google no carrega, ho diu i es pot tornar a provar', async () => {
    const m = await muntar()
    await m.find('.modal-auth__google-boto').trigger('click')
    expect(m.find('.modal-auth__google-boto').attributes('disabled')).toBeDefined()

    scriptGoogle()?.dispatchEvent(new Event('error'))
    await flushPromises()

    expect(m.find('[role="alert"]').text()).toContain("No s'ha pogut connectar amb Google")
    expect(m.find('.modal-auth__google-boto').attributes('disabled')).toBeUndefined()
  })
})
