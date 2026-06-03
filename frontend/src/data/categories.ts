// Catàleg de categories del filtre Què? — temes amb subtemes.
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
]
