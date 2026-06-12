// Articles catalans de les demarcacions: els noms de la BD (ICC) van sense
// article ("Maresme", "Anoia", "Selva"), però la frase els necessita
// ("del Maresme", "de l'Anoia", "de la Selva"). Els municipis NO calen aquí:
// el seu nom oficial ja porta l'article inclòs ("el Masnou").
//
// Mòdul pur (sense Vue): testejable i compartible.

export type Article = 'el' | 'la' | "l'" | 'els' | 'les' | ''

// Forma nominativa: "el Maresme", "l'Anoia", "la Selva", "les Garrigues", "Osona".
export function nomAmbArticle(nom: string, article: Article): string {
  if (!article) return nom
  return article === "l'" ? `l'${nom}` : `${article} ${nom}`
}

// Forma amb "de": "del Maresme", "de l'Anoia", "de la Selva", "de les
// Garrigues", "d'Osona"… per a frases com "municipis del Maresme".
export function nomAmbDe(nom: string, article: Article): string {
  switch (article) {
    case 'el':
      return `del ${nom}`
    case 'els':
      return `dels ${nom}`
    case "l'":
      return `de l'${nom}`
    case 'la':
      return `de la ${nom}`
    case 'les':
      return `de les ${nom}`
    default:
      // Sense article: apostrofa davant de vocal ("d'Osona", "de Barcelona").
      return /^[aeiouàèéíòóúh]/i.test(nom) ? `d'${nom}` : `de ${nom}`
  }
}

// CODICOMAR → article (43 comarques, codis ICC).
const ARTICLE_COMARCA: Record<string, Article> = {
  '01': "l'", // l'Alt Camp
  '02': "l'", // l'Alt Empordà
  '03': "l'", // l'Alt Penedès
  '04': "l'", // l'Alt Urgell
  '05': "l'", // l'Alta Ribagorça
  '06': "l'", // l'Anoia
  '07': 'el', // el Bages
  '08': 'el', // el Baix Camp
  '09': 'el', // el Baix Ebre
  '10': 'el', // el Baix Empordà
  '11': 'el', // el Baix Llobregat
  '12': 'el', // el Baix Penedès
  '13': 'el', // el Barcelonès
  '14': 'el', // el Berguedà
  '15': 'la', // la Cerdanya
  '16': 'la', // la Conca de Barberà
  '17': 'el', // el Garraf
  '18': 'les', // les Garrigues
  '19': 'la', // la Garrotxa
  '20': 'el', // el Gironès
  '21': 'el', // el Maresme
  '22': 'el', // el Montsià
  '23': 'la', // la Noguera
  '24': '', // Osona (sense article)
  '25': 'el', // el Pallars Jussà
  '26': 'el', // el Pallars Sobirà
  '27': 'el', // el Pla d'Urgell
  '28': 'el', // el Pla de l'Estany
  '29': 'el', // el Priorat
  '30': 'la', // la Ribera d'Ebre
  '31': 'el', // el Ripollès
  '32': 'la', // la Segarra
  '33': 'el', // el Segrià
  '34': 'la', // la Selva
  '35': 'el', // el Solsonès
  '36': 'el', // el Tarragonès
  '37': 'la', // la Terra Alta
  '38': "l'", // l'Urgell
  '39': 'la', // la Val d'Aran
  '40': 'el', // el Vallès Occidental
  '41': 'el', // el Vallès Oriental
  '42': 'el', // el Moianès
  '43': 'el', // el Lluçanès
}

// CODIVEGUE → article (9 vegueries; Barcelona/Girona/Lleida són noms de
// ciutat i van sense article).
const ARTICLE_VEGUERIA: Record<string, Article> = {
  '00': 'la', // la Val d'Aran
  '01': '', // Barcelona
  '02': '', // Girona
  '03': '', // Lleida
  '04': 'el', // el Camp de Tarragona
  '05': 'les', // les Terres de l'Ebre
  '06': "l'", // l'Alt Pirineu
  '07': 'la', // la Catalunya Central
  '08': 'el', // el Penedès
}

export function articleComarca(codi: string): Article {
  return ARTICLE_COMARCA[codi] ?? ''
}

export function articleVegueria(codi: string): Article {
  return ARTICLE_VEGUERIA[codi] ?? ''
}
