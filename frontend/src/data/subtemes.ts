// Emoji per subtema del Què?. Compartit pel pin del mapa i per la llista de
// resultats, perquè la fila de la llista i el seu pin es reconeguin a cop d'ull.
const EMOJI_SUBTEMA: Record<string, string> = {
  // Seguretat i emergències
  'policia-nacional': '👮',
  'policia-local': '👮',
  mossos: '👮',
  'guardia-civil': '👮',
  bombers: '🚒',
  'proteccio-civil': '🛟',
  // Salut
  cap: '🏥',
  cuap: '🏥',
  hospital: '🏥',
  dea: '❤️',
  // Administració i tràmits
  ajuntament: '🏛️',
  oac: '🏛️',
  'registre-civil': '🏛️',
  'jutjat-pau': '⚖️',
  correus: '✉️',
  'oficina-treball': '🏢',
  'seguretat-social': '🏢',
  hisenda: '🏢',
}

export function emojiSubtema(codi: string): string {
  return EMOJI_SUBTEMA[codi] ?? '📍'
}
