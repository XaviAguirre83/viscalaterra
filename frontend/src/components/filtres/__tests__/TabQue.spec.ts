import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ca from '@/i18n/locales/ca.json'
import TabQue from '../TabQue.vue'
import { useFiltresStore } from '@/stores/filtres'

const i18n = createI18n({ legacy: false, locale: 'ca', messages: { ca } })

function muntar() {
  return mount(TabQue, { global: { plugins: [i18n] } })
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('TabQue.vue', () => {
  it('a Llocs mostra espais i equipaments públics, sense esdeveniments', () => {
    const text = muntar().text()
    expect(text).toContain('Equipaments públics')
    expect(text).toContain("Gimnàs a l'aire lliure")
    expect(text).not.toContain('Fira gastronòmica')
    expect(text).not.toContain('Mercat setmanal')
    expect(text).not.toContain('food trucks')
  })

  it("a l'Agenda mostra tipus d'esdeveniment, sense llocs", () => {
    useFiltresStore().defineixSeccio('agenda')
    const text = muntar().text()
    expect(text).toContain('Trobada castellera')
    expect(text).toContain('Fira gastronòmica')
    expect(text).toContain('Titelles')
    expect(text).not.toContain('Parc infantil')
    expect(text).not.toContain('Equipaments públics')
  })

  it('reparteix els temes per igual entre les files (Llocs 2×5, Agenda 1×6)', async () => {
    const f = useFiltresStore()
    const w = muntar()
    expect(w.find('.grid-temes').attributes('style')).toContain('--columnes: 5')
    f.defineixSeccio('agenda')
    await nextTick()
    expect(w.find('.grid-temes').attributes('style')).toContain('--columnes: 6')
  })

  it('en canviar de secció, cada una mostra la seva selecció', async () => {
    const f = useFiltresStore()
    const w = muntar()
    f.toggleSubtema('cap', true)
    await nextTick()
    expect(w.findAll('input[type="checkbox"]:checked')).toHaveLength(1)
    expect(w.text()).toContain('Neteja la selecció')

    f.defineixSeccio('agenda')
    await nextTick()
    expect(w.findAll('input[type="checkbox"]:checked')).toHaveLength(0)
    expect(w.text()).not.toContain('Neteja la selecció')

    f.defineixSeccio('llocs')
    await nextTick()
    expect(w.findAll('input[type="checkbox"]:checked')).toHaveLength(1)
  })
})
