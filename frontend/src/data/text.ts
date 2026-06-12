// Normalització de text per a cerques: minúscules i sense accents
// ("Berguedà" → "bergueda"). Compartida pel cercador ràpid (CercaRapida)
// i per la resposta escrita del GeoFreak («Com es diu...?»).
export function normalitza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}
