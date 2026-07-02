import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

// Accessibilitat de modals: mentre el modal és obert, mou el focus a dins,
// atrapa el Tab perquè no s'escapi al fons, tanca amb Escape i, en tancar,
// retorna el focus a l'element que el tenia abans d'obrir.
//
// Ús: useFocusTrap(refAlContenidor, computedObert, () => tanca())

const SELECTOR_FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

// Pila global de traps actius: amb dos diàlegs oberts alhora (p. ex. el wizard
// del joc i ModalAuth), només el més recent ha de processar Escape i Tab.
// Sense la pila, un sol Esc tancava tots dos (tots els listeners del mateix
// node reben l'event; stopPropagation no els atura).
const pilaTraps: symbol[] = []

export function useFocusTrap(
  contenidor: Ref<HTMLElement | null>,
  obert: Ref<boolean>,
  onEscape?: () => void
) {
  let focusPrevi: HTMLElement | null = null
  const id = Symbol('focus-trap')

  function focusables(): HTMLElement[] {
    if (!contenidor.value) return []
    return Array.from(contenidor.value.querySelectorAll<HTMLElement>(SELECTOR_FOCUSABLE)).filter(
      (el) => el.offsetParent !== null
    )
  }

  function onKeydown(e: KeyboardEvent) {
    // Només el trap del capdamunt de la pila respon; els de sota esperen.
    if (pilaTraps[pilaTraps.length - 1] !== id) return
    if (e.key === 'Escape') {
      e.stopPropagation()
      onEscape?.()
      return
    }
    if (e.key !== 'Tab') return
    const f = focusables()
    if (f.length === 0) return
    const primer = f[0]!
    const ultim = f[f.length - 1]!
    const actiu = document.activeElement as HTMLElement | null
    if (e.shiftKey && actiu === primer) {
      e.preventDefault()
      ultim.focus()
    } else if (!e.shiftKey && actiu === ultim) {
      e.preventDefault()
      primer.focus()
    }
  }

  // Desactivació idempotent: la fa servir tant el watch (obert → false) com
  // onBeforeUnmount (modals que es tanquen desmuntant-se amb v-if, com
  // ModalAuth) — així el focus SEMPRE torna a l'element que va obrir el modal.
  function desactiva() {
    const idx = pilaTraps.indexOf(id)
    if (idx !== -1) pilaTraps.splice(idx, 1)
    document.removeEventListener('keydown', onKeydown, true)
    focusPrevi?.focus?.()
    focusPrevi = null
  }

  watch(
    obert,
    async (esObert) => {
      if (esObert) {
        if (pilaTraps.includes(id)) return
        focusPrevi = document.activeElement as HTMLElement | null
        pilaTraps.push(id)
        await nextTick()
        document.addEventListener('keydown', onKeydown, true)
        focusables()[0]?.focus()
      } else {
        desactiva()
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(desactiva)
}
