import { createI18n } from 'vue-i18n'
import ca from './locales/ca.json'
import es from './locales/es.json'
import en from './locales/en.json'

// Idiomes suportats. Afegir-ne un de nou = afegir el codi aquí + el seu JSON.
export const IDIOMES = ['ca', 'es', 'en'] as const
export type Idioma = (typeof IDIOMES)[number]

// Etiqueta curta per al selector (mentre no hi hagi icones de bandera).
export const ETIQUETA_IDIOMA: Record<Idioma, string> = {
  ca: 'CA',
  es: 'ES',
  en: 'EN',
}

// Nom de cada idioma en la seva pròpia llengua (endònim), per a la llista desplegable.
export const NOM_IDIOMA: Record<Idioma, string> = {
  ca: 'Català',
  es: 'Español',
  en: 'English',
}

// Codi de bandera (flag-icons) per a cada idioma. Per al català fem servir la
// senyera (subdivisió 'es-ct'); l'anglès, la bandera del Regne Unit ('gb').
// Futurs: gl → 'es-ga', eu → 'es-pv', fr → 'fr', de → 'de', ru → 'ru'.
export const BANDERA_IDIOMA: Record<Idioma, string> = {
  ca: 'es-ct',
  es: 'es',
  en: 'gb',
}

const STORAGE_KEY = 'viscalaterra-idioma'

function esIdiomaValid(codi: string): codi is Idioma {
  return (IDIOMES as readonly string[]).includes(codi)
}

// Tria l'idioma inicial: el que l'usuari hagi triat abans (desat a localStorage) o,
// per defecte, sempre català — és l'idioma principal de la plataforma, independentment
// de la configuració del navegador del visitant.
function idiomaInicial(): Idioma {
  // localStorage pot llançar (p. ex. "bloquejar dades de llocs" al navegador);
  // com que això s'executa en importar el mòdul, sense el try/catch l'app
  // sencera quedaria en blanc.
  try {
    const desat = localStorage.getItem(STORAGE_KEY)
    if (desat && esIdiomaValid(desat)) return desat
  } catch {
    // Sense accés al desat: català per defecte.
  }
  return 'ca'
}

const inicial = idiomaInicial()

export const i18n = createI18n({
  legacy: false, // Composition API (useI18n)
  globalInjection: true, // permet usar $t directament als templates
  locale: inicial,
  fallbackLocale: 'ca',
  messages: { ca, es, en },
})

// Sincronitza l'atribut <html lang> amb l'idioma (SEO + accessibilitat).
document.documentElement.setAttribute('lang', inicial)

// Canvia l'idioma actiu, el persisteix i actualitza <html lang>.
export function canviaIdioma(nou: Idioma) {
  i18n.global.locale.value = nou
  try {
    localStorage.setItem(STORAGE_KEY, nou)
  } catch {
    // Sense persistència: l'idioma triat dura només aquesta sessió.
  }
  document.documentElement.setAttribute('lang', nou)
}
