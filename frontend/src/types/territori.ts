export interface Municipi {
  codi: string
  nom: string
  es_cap_comarca: boolean
  comarca_codi: string
  vegueria_codi: string
  provincia_codi: string
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

export interface Vegueria {
  codi: string
  nom: string
}

export interface ArbreTerritorial {
  provincies: Provincia[]
  vegueries: Vegueria[]
}
