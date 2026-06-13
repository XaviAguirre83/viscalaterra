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

export function useFocusTrap(
  contenidor: Ref<HTMLElement | null>,
  obert: Ref<boolean>,
  onEscape?: () => void
) {
  let focusPrevi: HTMLElement | null = null

  function focusables(): HTMLElement[] {
    if (!contenidor.value) return []
    return Array.from(contenidor.value.querySelectorAll<HTMLElement>(SELECTOR_FOCUSABLE)).filter(
      (el) => el.offsetParent !== null
    )
  }

  function onKeydown(e: KeyboardEvent) {
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

  watch(
    obert,
    async (esObert) => {
      if (esObert) {
        focusPrevi = document.activeElement as HTMLElement | null
        await nextTick()
        document.addEventListener('keydown', onKeydown, true)
        focusables()[0]?.focus()
      } else {
        document.removeEventListener('keydown', onKeydown, true)
        focusPrevi?.focus?.()
        focusPrevi = null
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown, true))
}
