// Jugadors de les partides locals dels jocs (1-4 al mateix dispositiu): la
// paleta de colors de conquesta i com surten del wizard.
//
// Mòdul pur (sense Vue): testejable i compartit per tots els jocs.

export const MAX_JUGADORS = 4

// Jugador tal com surt del wizard (el color pinta les seves conquestes).
export interface JugadorConfig {
  nom: string
  color: string
}

// Paleta de colors de conquesta (distingibles entre ells i del vermell
// d'error i el daurat de la pista). Per defecte, un per ordre de jugador.
export const COLORS_JUGADOR = ['#2b6cb0', '#c0392b', '#27a35f', '#8e44ad', '#d68910', '#16a085']

// Colors inicials dels 4 jugadors possibles al wizard.
export function colorsInicials(): string[] {
  return COLORS_JUGADOR.slice(0, MAX_JUGADORS)
}

// Tria el color del jugador i; si un altre ja el tenia, s'intercanvien (així
// mai n'hi ha dos d'iguals). Retorna una llista nova.
export function triaColor(colors: string[], i: number, color: string): string[] {
  const previ = colors[i]
  const altre = colors.findIndex((c, j) => j !== i && c === color)
  const nous = [...colors]
  nous[i] = color
  if (altre !== -1 && previ) nous[altre] = previ
  return nous
}

// Jugadors amb què arrenca la partida. Amb un de sol, sense nom ni color (es
// pinta amb el color de tema de cada territori); amb més, el nom escrit o
// «Jugador N» si s'ha deixat buit.
export function jugadorsDelWizard(
  num: number,
  noms: string[],
  colors: string[],
  nomPerDefecte: (n: number) => string
): JugadorConfig[] {
  if (num <= 1) return [{ nom: '', color: '' }]
  return Array.from({ length: Math.min(num, MAX_JUGADORS) }, (_, i) => ({
    nom: (noms[i] ?? '').trim() || nomPerDefecte(i + 1),
    color: colors[i] ?? COLORS_JUGADOR[i] ?? COLORS_JUGADOR[0]!,
  }))
}
