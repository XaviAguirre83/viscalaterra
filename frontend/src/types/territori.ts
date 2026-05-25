export interface Municipi {
  codi: string
  nom: string
  es_cap_comarca: boolean
  comarca_codi: string
}

export interface Comarca {
  codi: string
  nom: string
  cap: string
  municipis: Municipi[]
}

export interface Provincia {
  codi: string
  nom: string
  comarques: Comarca[]
}
