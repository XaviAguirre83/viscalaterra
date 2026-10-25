// Classificació dels òrgans judicials del dataset «Equipaments de Catalunya»
// (categoria «Justícia|Jutjats i tribunals||») en subtemes del Què?.
//
// Amb la reforma de la LO 1/2025 (aplicada per fases entre l'1-07-2025 i el
// 31-12-2025) els antics jutjats unipersonals són seccions dels Tribunals
// d'Instància: «Secció Civil del Tribunal d'Instància de Girona. Plaça núm. 2».
// El dataset ja fa servir els noms nous i en conserva alguns d'antics (els
// jutjats de guàrdia, uns quants «Jutjat de Primera Instància»…). La categoria
// barreja els òrgans amb serveis interns (serveis comuns, oficines, deganats,
// presidències, medicina legal, arxius…), que no s'importen.

// Tots els subtemes que pot generar la classificació (per esborrar-los en reimportar).
export const SUBTEMES_ORGANS_JUDICIALS = [
  'seccio-civil-instruccio',
  'seccio-civil',
  'seccio-instruccio',
  'seccio-penal',
  'seccio-social',
  'seccio-familia',
  'seccio-violencia-dona',
  'seccio-contenciosa',
  'seccio-mercantil',
  'seccio-menors',
  'seccio-vigilancia-penitenciaria',
  'jutjat-guardia',
  'audiencia-provincial',
  'tsjc',
]

// Minúscules, sense accents, apòstrof únic i espais col·lapsats.
function normalitza(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// Tipus de secció d'un Tribunal d'Instància pel nom. L'ordre importa: els patrons
// que en contenen d'altres van abans («civil i d'instruccio» conté «civil» i
// «instruccio»). També val per als jutjats que encara porten el nom antic.
function tipusSeccio(n: string): string | null {
  if (n.includes("civil i d'instruccio")) return 'seccio-civil-instruccio'
  if (n.includes('violencia sobre la dona')) return 'seccio-violencia-dona'
  if (n.includes('vigilancia penitenciaria')) return 'seccio-vigilancia-penitenciaria'
  if (n.includes('familia')) return 'seccio-familia'
  // «contencios»: el dataset també escriu «Contenciosa AdministraTribunal
  // d'Instànciava» (un cerca-i-substitueix de «TI» mal fet).
  if (n.includes('contencios')) return 'seccio-contenciosa'
  if (n.includes('mercantil')) return 'seccio-mercantil'
  if (n.includes('menors')) return 'seccio-menors'
  if (n.includes('instruccio')) return 'seccio-instruccio'
  if (n.includes('penal')) return 'seccio-penal'
  if (n.includes('social')) return 'seccio-social'
  if (n.includes('civil')) return 'seccio-civil'
  return null
}

// Subtema d'un registre pel seu nom, o null si no és un òrgan judicial que
// s'hagi de mostrar (serveis interns, oficines, presidències…).
export function subtemaOrganJudicial(nom: string): string | null {
  const n = normalitza(nom)
  // Tribunal Superior de Justícia de Catalunya: les sales i les seves seccions.
  if (n.includes('tribunal superior de justicia')) {
    return /^(sala|seccio) /.test(n) ? 'tsjc' : null
  }
  // Audiència Provincial: «Secció 1a de l'Audiència Provincial de Barcelona (civil)».
  if (n.includes('audiencia provincial')) {
    return n.startsWith('seccio') ? 'audiencia-provincial' : null
  }
  // Guàrdia: «Jutjat de Guàrdia», «Servei de Guàrdia», «… de Detinguts»…
  if (/^(jutjat|servei) /.test(n) && n.includes('guardia')) return 'jutjat-guardia'
  // Seccions dels Tribunals d'Instància (el dataset a vegades abreuja «del TI»).
  if (n.startsWith('seccio') && (n.includes("tribunal d'instancia") || / del ti\b/.test(n))) {
    return tipusSeccio(n)
  }
  // Jutjats amb el nom antic: van a la secció que n'ha heretat les funcions.
  if (n.startsWith('jutjat')) {
    if (n.includes('primera instancia i instruccio')) return 'seccio-civil-instruccio'
    if (n.includes('primera instancia')) return 'seccio-civil'
    return tipusSeccio(n)
  }
  return null
}
