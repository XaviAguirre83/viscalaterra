import { describe, it, expect, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import ca from '@/i18n/locales/ca.json'
import TabQuan from '../TabQuan.vue'
import { useFiltresStore } from '@/stores/filtres'

const i18n = createI18n({ legacy: false, locale: 'ca', messages: { ca } })

function muntar() {
  return mount(TabQuan, { global: { plugins: [i18n] } })
}

// Helpers que estrenyen el tipus (noUncheckedIndexedAccess) i fallen amb un
// missatge clar si l'element no existeix.
function nth(w: VueWrapper, selector: string, i: number) {
  const el = w.findAll(selector)[i]
  if (!el) throw new Error(`No existeix ${selector}[${i}]`)
  return el
}

function triaMode(w: VueWrapper, mode: string) {
  return nth(w, `input[type="radio"][value="${mode}"]`, 0).setValue()
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('TabQuan.vue', () => {
  it('mostra els 4 modes temporals com a radios', () => {
    const w = muntar()
    expect(w.findAll('input[type="radio"]')).toHaveLength(4)
    expect(w.text()).toContain('Permanent')
    expect(w.text()).toContain('Dies de la setmana')
    expect(w.text()).toContain('Cada mes')
  })

  it('no mostra cap panell de paràmetres fins que es tria un mode', () => {
    const w = muntar()
    expect(w.find('fieldset').exists()).toBe(false)
  })

  it('triar "Dates concretes" mostra dos calendaris i actualitza el store', async () => {
    const w = muntar()
    const f = useFiltresStore()
    await triaMode(w, 'dates')
    const dates = w.findAll('input[type="date"]')
    expect(dates).toHaveLength(2)
    await nth(w, 'input[type="date"]', 0).setValue('2026-06-01')
    await nth(w, 'input[type="date"]', 1).setValue('2026-08-31')
    expect(f.temporal.mode).toBe('dates')
    expect(f.temporal.dataInici).toBe('2026-06-01')
    expect(f.temporal.dataFi).toBe('2026-08-31')
    expect(w.find('.error-rang').exists()).toBe(false)
  })

  it("mostra error quan la data de fi precedeix la d'inici", async () => {
    const w = muntar()
    await triaMode(w, 'dates')
    await nth(w, 'input[type="date"]', 0).setValue('2026-06-10')
    await nth(w, 'input[type="date"]', 1).setValue('2026-06-01')
    expect(w.find('.error-rang').exists()).toBe(true)
  })

  it('mode setmanal: marcar dies actualitza el store', async () => {
    const w = muntar()
    const f = useFiltresStore()
    await triaMode(w, 'setmanal')
    const checks = w.findAll('fieldset input[type="checkbox"]')
    expect(checks).toHaveLength(7)
    await nth(w, 'fieldset input[type="checkbox"]', 0).setValue(true) // dilluns (1)
    await nth(w, 'fieldset input[type="checkbox"]', 2).setValue(true) // dimecres (3)
    expect(f.temporal.diesSetmana).toEqual([1, 3])
  })

  it('mode mensual: combina ordinals i dies', async () => {
    const w = muntar()
    const f = useFiltresStore()
    await triaMode(w, 'mensual')
    // 5 ordinals + 7 dies
    expect(w.findAll('fieldset input[type="checkbox"]')).toHaveLength(12)
    await nth(w, 'fieldset input[type="checkbox"]', 0).setValue(true) // ordinal 'primer'
    await nth(w, 'fieldset input[type="checkbox"]', 4).setValue(true) // ordinal 'ultim'
    await nth(w, 'fieldset input[type="checkbox"]', 5).setValue(true) // dilluns
    expect(f.temporal.ordinals).toEqual(['primer', 'ultim'])
    expect(f.temporal.diesSetmana).toEqual([1])
    expect(w.find('.resum').text()).toContain('Dilluns')
  })

  it('triar "Permanent" activa el filtre temporal', async () => {
    const w = muntar()
    const f = useFiltresStore()
    await triaMode(w, 'permanent')
    expect(f.temporal.mode).toBe('permanent')
    expect(f.teSeleccioTemporal).toBe(true)
  })
})
