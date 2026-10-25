// Catàleg de categories del filtre Què? — temes amb subtemes.
//
// NOTA fonts (2026-07-24): els Agents Rurals / guardes forestals NO tenen
// inventari obert de seus com a PUNTS (s'organitzen per àrees/polígons) →
// candidats al model d'àrees futur, no a `llocs`. Vegeu memòria project_llocs_cerca.
// Llista provisional: la definitiva dependrà de les fonts de dades obertes.
// Per afegir/treure: edita aquest fitxer i la secció "que" dels locales (ca/es/en).

export interface Subtema {
  codi: string // identificador únic global (és el que es desa a la selecció)
  clau: string // clau i18n
}

export interface Tema {
  codi: string
  clau: string
  subtemes: Subtema[]
}

export const TEMES: Tema[] = [
  {
    codi: 'esports',
    clau: 'que.esports.titol',
    subtemes: [
      { codi: 'ping-pong', clau: 'que.esports.pingPong' },
      { codi: 'calistenia', clau: 'que.esports.calistenia' },
      { codi: 'skatepark', clau: 'que.esports.skatepark' },
      { codi: 'futbol', clau: 'que.esports.futbol' },
      { codi: 'basquet', clau: 'que.esports.basquet' },
      { codi: 'tennis', clau: 'que.esports.tennis' },
      { codi: 'patinatge', clau: 'que.esports.patinatge' },
      { codi: 'petanca', clau: 'que.esports.petanca' },
      { codi: 'gimnas', clau: 'que.esports.gimnas' },
      { codi: 'gimnas-geriatric', clau: 'que.esports.gimnasGeriatric' },
    ],
  },
  {
    codi: 'nens',
    clau: 'que.nens.titol',
    subtemes: [
      { codi: 'parc-infantil', clau: 'que.nens.parcInfantil' },
      { codi: 'tobogans', clau: 'que.nens.tobogans' },
      { codi: 'gronxadors', clau: 'que.nens.gronxadors' },
      { codi: 'sorral', clau: 'que.nens.sorral' },
      { codi: 'jocs-aigua', clau: 'que.nens.jocsAigua' },
      { codi: 'tirolina', clau: 'que.nens.tirolina' },
    ],
  },
  {
    codi: 'culinari',
    clau: 'que.culinari.titol',
    subtemes: [
      { codi: 'mercat-setmanal', clau: 'que.culinari.mercatSetmanal' },
      { codi: 'fira-gastronomica', clau: 'que.culinari.firaGastronomica' },
      { codi: 'food-trucks', clau: 'que.culinari.foodTrucks' },
    ],
  },
  {
    codi: 'aire-lliure',
    clau: 'que.aireLliure.titol',
    subtemes: [
      { codi: 'picnic', clau: 'que.aireLliure.picnic' },
      { codi: 'barbacoa', clau: 'que.aireLliure.barbacoa' },
      { codi: 'font', clau: 'que.aireLliure.font' },
      { codi: 'mirador', clau: 'que.aireLliure.mirador' },
    ],
  },
  {
    codi: 'patrimoni',
    clau: 'que.patrimoni.titol',
    subtemes: [
      { codi: 'castell', clau: 'que.patrimoni.castell' },
      { codi: 'monument', clau: 'que.patrimoni.monument' },
      { codi: 'esglesia', clau: 'que.patrimoni.esglesia' },
      { codi: 'jaciment', clau: 'que.patrimoni.jaciment' },
    ],
  },
  {
    codi: 'natura',
    clau: 'que.natura.titol',
    subtemes: [
      { codi: 'senderisme', clau: 'que.natura.senderisme' },
      { codi: 'btt', clau: 'que.natura.btt' },
      { codi: 'cim', clau: 'que.natura.cim' },
      { codi: 'bany-natural', clau: 'que.natura.banyNatural' },
    ],
  },
  {
    codi: 'equipaments-publics',
    clau: 'que.equipamentsPublics.titol',
    subtemes: [
      { codi: 'wc', clau: 'que.equipamentsPublics.wc' },
      { codi: 'fonts-aigua', clau: 'que.equipamentsPublics.fontsAigua' },
      { codi: 'dutxes', clau: 'que.equipamentsPublics.dutxes' },
      { codi: 'zones-ombra', clau: 'que.equipamentsPublics.zonesOmbra' },
      { codi: 'bancs', clau: 'que.equipamentsPublics.bancs' },
    ],
  },
  {
    codi: 'salut',
    clau: 'que.salut.titol',
    subtemes: [
      { codi: 'cap', clau: 'que.salut.cap' },
      { codi: 'cuap', clau: 'que.salut.cuap' },
      { codi: 'hospital', clau: 'que.salut.hospital' },
      { codi: 'dea', clau: 'que.salut.dea' },
    ],
  },
  {
    codi: 'emergencies',
    clau: 'que.emergencies.titol',
    subtemes: [
      { codi: 'bombers', clau: 'que.emergencies.bombers' },
      { codi: 'mossos', clau: 'que.emergencies.mossos' },
      { codi: 'policia-local', clau: 'que.emergencies.policiaLocal' },
      { codi: 'policia-nacional', clau: 'que.emergencies.policiaNacional' },
      { codi: 'proteccio-civil', clau: 'que.emergencies.proteccioCivil' },
    ],
  },
  {
    codi: 'administracio',
    clau: 'que.administracio.titol',
    subtemes: [
      { codi: 'ajuntament', clau: 'que.administracio.ajuntament' },
      { codi: 'oac', clau: 'que.administracio.oac' },
      { codi: 'registre-civil', clau: 'que.administracio.registreCivil' },
      { codi: 'correus', clau: 'que.administracio.correus' },
      { codi: 'oficina-treball', clau: 'que.administracio.oficinaTreball' },
      { codi: 'seguretat-social', clau: 'que.administracio.seguretatSocial' },
      { codi: 'hisenda', clau: 'que.administracio.hisenda' },
    ],
  },
  {
    codi: 'justicia',
    clau: 'que.justicia.titol',
    // Des de la LO 1/2025 els jutjats unipersonals són seccions dels Tribunals
    // d'Instància (classificació a backend/src/scripts/organs-judicials.ts).
    subtemes: [
      { codi: 'jutjat-pau', clau: 'que.justicia.jutjatPau' },
      { codi: 'seccio-civil-instruccio', clau: 'que.justicia.civilInstruccio' },
      { codi: 'seccio-civil', clau: 'que.justicia.civil' },
      { codi: 'seccio-instruccio', clau: 'que.justicia.instruccio' },
      { codi: 'seccio-penal', clau: 'que.justicia.penal' },
      { codi: 'seccio-social', clau: 'que.justicia.social' },
      { codi: 'seccio-familia', clau: 'que.justicia.familia' },
      { codi: 'seccio-violencia-dona', clau: 'que.justicia.violenciaDona' },
      { codi: 'seccio-contenciosa', clau: 'que.justicia.contenciosa' },
      { codi: 'seccio-mercantil', clau: 'que.justicia.mercantil' },
      { codi: 'seccio-menors', clau: 'que.justicia.menors' },
      { codi: 'seccio-vigilancia-penitenciaria', clau: 'que.justicia.vigilanciaPenitenciaria' },
      { codi: 'jutjat-guardia', clau: 'que.justicia.guardia' },
      { codi: 'audiencia-provincial', clau: 'que.justicia.audienciaProvincial' },
      { codi: 'tsjc', clau: 'que.justicia.tsjc' },
      { codi: 'fiscalia', clau: 'que.justicia.fiscalia' },
      { codi: 'centre-penitenciari', clau: 'que.justicia.centrePenitenciari' },
    ],
  },
]
