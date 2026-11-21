import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCapitalComarcaStore } from '../capitalComarca'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('capitalComarca — store', () => {
  it('arrenca en configuració i només cal triar la modalitat', () => {
    const s = useCapitalComarcaStore()
    expect(s.fase).toBe('configuracio')
    expect(s.configCompleta).toBe(false)
    s.defineixModalitat('quinaCapital')
    expect(s.configCompleta).toBe(true)
  })

  it('sense modalitat la partida no comença', () => {
    const s = useCapitalComarcaStore()
    s.comencaPartida(['21', '24'])
    expect(s.fase).toBe('configuracio')
    expect(s.partida).toBeNull()
  })

  it('flux complet: errors, encerts, pistes i resultats sense multiplicador', () => {
    const s = useCapitalComarcaStore()
    s.defineixModalitat('quinaComarca')
    s.comencaPartida(['21', '24', '40'])
    expect(s.fase).toBe('partida')
    expect(s.totalObjectius).toBe(3)

    // Un error i una pista a la primera ronda; després, tot encerts.
    const primer = s.partida!.objectiu!
    const altre = s.partida!.pendents[0]!
    expect(s.respon(altre)).toBe('error')
    s.activaPista([primer, altre])
    expect(s.respon(primer)).toBe('encert')
    while (s.partida?.objectiu) s.respon(s.partida.objectiu)

    expect(s.fase).toBe('resultats')
    const [r] = s.resultats
    expect(r).toMatchObject({ conquestes: 3, errors: 1, encertsAmbPista: 1, pistes: 1 })
    // Sense nivells: ràtio (3 − 0,5) / 4 i bonus de temps ≈ 1 (respostes instantànies).
    expect(s.punts).toBeGreaterThan(600)
    expect(s.punts).toBeLessThanOrEqual(625)
  })

  it('multijugador: les pistes es compten al jugador del torn', () => {
    const s = useCapitalComarcaStore()
    s.defineixModalitat('quinaCapital')
    s.defineixJugadors([
      { nom: 'Anna', color: '#2b6cb0' },
      { nom: 'Biel', color: '#c0392b' },
    ])
    s.comencaPartida(['21', '24', '40'])
    s.respon(s.partida!.objectiu!) // encert d'Anna → torn de Biel
    expect(s.tornActual).toBe(1)
    s.activaPista([s.partida!.objectiu!])
    expect(s.estatJugadors.map((j) => j.pistes)).toEqual([0, 1])
  })

  it('reinicia torna a la configuració buida', () => {
    const s = useCapitalComarcaStore()
    s.defineixModalitat('quinaCapital')
    s.comencaPartida(['21'])
    s.reinicia()
    expect(s.fase).toBe('configuracio')
    expect(s.configuracio.modalitat).toBeNull()
    expect(s.partida).toBeNull()
    expect(s.jugadors).toHaveLength(1)
  })
})
