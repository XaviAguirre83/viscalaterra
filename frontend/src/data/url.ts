// Adreces que venen de dades externes (datasets oficials, Wikidata) i que la web
// fa servir com a href. Només passen les http(s) absolutes: un «javascript:…» o un
// «data:…» en un enllaç seria una porta a l'XSS. La CSP ja ho bloquejaria, però
// val més no arribar-hi. Retorna la forma canònica (la que obriria el navegador)
// o null si no és vàlida.
export function urlSegura(url: string | null | undefined): string | null {
  if (!url) return null
  let u: URL
  try {
    u = new URL(url.trim())
  } catch {
    return null
  }
  return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null
}
