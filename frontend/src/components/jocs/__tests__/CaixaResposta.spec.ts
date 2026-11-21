import { describe, it, expect, beforeAll, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CaixaResposta from '../CaixaResposta.vue'
import type { Candidat } from '@/data/partida'

const CANDIDATS: Candidat[] = [
  { codi: '21', nom: 'Mataró' },
  { codi: '41', nom: 'Granollers' },
  { codi: '24', nom: 'Vic' },
  { codi: '40', nom: 'Sabadell' },
  { codi: '40', nom: 'Terrassa' },
  { codi: '07', nom: 'Manresa' },
]

function muntar(opcionsPista: Candidat[] | null = null) {
  return mount(CaixaResposta, {
    props: { candidats: CANDIDATS, opcionsPista, placeholder: 'Escriu…', etiqueta: 'Resposta' },
    attachTo: document.body,
  })
}

// jsdom no implementa scrollIntoView (la caixa el fa servir en moure's amb
// les fletxes per mantenir el suggeriment ressaltat a la vista).
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn<() => void>()
})

describe('CaixaResposta.vue', () => {
  it('suggereix els candidats que contenen el text, sense accents ni majúscules', async () => {
    const w = muntar()
    await w.find('input').setValue('MATARO')
    expect(w.findAll('.joc-suggeriments button').map((b) => b.text())).toEqual(['Mataró'])
    await w.find('input').setValue('a')
    expect(w.findAll('.joc-suggeriments button').length).toBeGreaterThan(1)
    w.unmount()
  })

  it('Enter amb un únic suggeriment respon el seu codi i buida la caixa', async () => {
    const w = muntar()
    const input = w.find('input')
    await input.setValue('grano')
    await input.trigger('keydown', { key: 'Enter' })
    expect(w.emitted('respon')).toEqual([['41']])
    expect((input.element as HTMLInputElement).value).toBe('')
    w.unmount()
  })

  it('Enter amb el text exacte respon encara que hi hagi més suggeriments', async () => {
    const w = muntar()
    const input = w.find('input')
    await input.setValue('vic')
    await input.trigger('keydown', { key: 'Enter' })
    expect(w.emitted('respon')).toEqual([['24']])
    w.unmount()
  })

  it('Enter amb un text ambigu no respon (no penalitza)', async () => {
    const w = muntar()
    const input = w.find('input')
    await input.setValue('a')
    await input.trigger('keydown', { key: 'Enter' })
    expect(w.emitted('respon')).toBeUndefined()
    w.unmount()
  })

  it('les fletxes ressalten un suggeriment i Enter el respon', async () => {
    const w = muntar()
    const input = w.find('input')
    await input.setValue('ma') // Mataró, Manresa
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })
    expect(w.emitted('respon')).toEqual([['07']])
    w.unmount()
  })

  it('un codi amb dos noms respon igual amb qualsevol dels dos', async () => {
    const w = muntar()
    const input = w.find('input')
    await input.setValue('terrassa')
    await input.trigger('keydown', { key: 'Enter' })
    await input.setValue('sabadell')
    await input.trigger('keydown', { key: 'Enter' })
    expect(w.emitted('respon')).toEqual([['40'], ['40']])
    w.unmount()
  })

  it('amb la pista, les opcions substitueixen els suggeriments i responen en prémer', async () => {
    const w = muntar([
      { codi: '21', nom: 'Mataró' },
      { codi: '24', nom: 'Vic' },
    ])
    await w.find('input').setValue('ma')
    expect(w.find('.joc-suggeriments').exists()).toBe(false)
    const opcions = w.findAll('.joc-opcions button')
    expect(opcions.map((b) => b.text())).toEqual(['Mataró', 'Vic'])
    await opcions[1]!.trigger('mousedown')
    expect(w.emitted('respon')).toEqual([['24']])
    w.unmount()
  })
})
