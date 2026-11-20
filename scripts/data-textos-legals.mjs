// Posa la data del dia a la línia «Darrera actualització» dels textos legals
// (frontend/src/legal/<idioma>/*.md). L'executa lint-staged al pre-commit, només amb
// els textos que entren al commit: així cada text porta la data del seu darrer canvi
// sense haver-la de tocar a mà. Vegeu frontend/src/legal/README.md.
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname } from 'node:path'

const IDIOMES = {
  ca: { etiqueta: 'Darrera actualització', locale: 'ca' },
  es: { etiqueta: 'Última actualización', locale: 'es' },
  en: { etiqueta: 'Last updated', locale: 'en-GB' },
}

let errors = 0
for (const fitxer of process.argv.slice(2)) {
  const idioma = IDIOMES[basename(dirname(fitxer))]
  const text = readFileSync(fitxer, 'utf8')
  const linia = idioma && new RegExp(`^${idioma.etiqueta}:.*$`, 'm')
  if (!linia?.test(text)) {
    console.error(`${fitxer}: falta la línia «${idioma?.etiqueta ?? '(idioma desconegut)'}: …»`)
    errors++
    continue
  }
  const data = new Intl.DateTimeFormat(idioma.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Madrid',
  })
    .format(new Date())
    .replaceAll('’', "'") // els textos fan servir l'apòstrof recte
  writeFileSync(fitxer, text.replace(linia, `${idioma.etiqueta}: ${data}`))
}
process.exit(errors ? 1 : 0)
