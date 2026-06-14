// Normalització de text per a cerques: minúscules i sense accents
// ("Berguedà" → "bergueda"). Compartida pel cercador ràpid (CercaRapida)
// i per la resposta escrita del GeoFreak («Com es diu...?»).
export function normalitza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Clau de territori per nom (sense article inicial): "el Maresme" i "Maresme"
// → "maresme". Ha de coincidir amb la clauNom de l'script d'enriquiment
// (backend/src/scripts/enriqueix-territoris.ts) que genera el JSON.
export function clauNom(s: string): string {
  return normalitza(s)
    .replace(/^(l'|d'|el |la |els |les |de |s')/, '')
    .trim()
}
