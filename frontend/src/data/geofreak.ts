// Model de configuració del joc GeoFreak (identificació territorial).
//
// El joc té dues modalitats (mútuament excloents) i 9 nivells de dificultat.
// Alguns nivells es juguen dins d'un territori contenidor que cal triar
// (p. ex. nivell 5 = municipis d'UNA comarca concreta).
//
// Tot el mòdul és pur (sense Vue ni estat): la lògica de validació és fàcilment
// testejable i el store (`stores/geofreak.ts`) només hi afegeix reactivitat.
// Mateix patró que `data/temporal.ts` ↔ `stores/filtres.ts`.

// «On és...?»     → es mostra el nom i el jugador clica el territori al mapa.
// «Com es diu...?» → s'il·lumina el territori i el jugador n'escriu el nom.
export type ModalitatJoc = 'onEs' | 'comEsDiu'

export const MODALITATS: ModalitatJoc[] = ['onEs', 'comEsDiu']

export type TipusDemarcacio = 'provincia' | 'vegueria' | 'comarca' | 'municipi'

export interface NivellGeoFreak {
  id: number
  // Tipus de demarcació que s'endevina en aquest nivell.
  demarcacio: TipusDemarcacio
  // Territori dins del qual es juga. null = tota Catalunya (no cal triar res);
  // altrament el jugador ha de triar un contenidor concret abans de començar.
  contenidor: TipusDemarcacio | null
}

// Taula de nivells (vegeu viscalaterra_plan.md § GeoFreak). L'id és també
// el multiplicador de puntuació − 1 (nivell 0 → ×1 … nivell 8 → ×9).
export const NIVELLS: NivellGeoFreak[] = [
  { id: 0, demarcacio: 'provincia', contenidor: null },
  { id: 1, demarcacio: 'vegueria', contenidor: null },
  { id: 2, demarcacio: 'comarca', contenidor: 'vegueria' },
  { id: 3, demarcacio: 'comarca', contenidor: 'provincia' },
  { id: 4, demarcacio: 'comarca', contenidor: null },
  { id: 5, demarcacio: 'municipi', contenidor: 'comarca' },
  { id: 6, demarcacio: 'municipi', contenidor: 'vegueria' },
  { id: 7, demarcacio: 'municipi', contenidor: 'provincia' },
  { id: 8, demarcacio: 'municipi', contenidor: null },
]

export function nivellPerId(id: number): NivellGeoFreak | undefined {
  return NIVELLS.find((n) => n.id === id)
}

export function nivellNecessitaContenidor(id: number): boolean {
  return nivellPerId(id)?.contenidor != null
}

export interface ConfiguracioGeoFreak {
  // null = encara no triat (el modal de configuració no deixa començar).
  modalitat: ModalitatJoc | null
  nivell: number | null
  // Codi del territori contenidor (només als nivells que en demanen un).
  codiContenidor: string | null
}

export function configuracioBuida(): ConfiguracioGeoFreak {
  return { modalitat: null, nivell: null, codiContenidor: null }
}

// Una configuració és completa quan es pot començar la partida: modalitat i
// nivell triats, i contenidor triat si el nivell en demana un.
export function configuracioCompleta(c: ConfiguracioGeoFreak): boolean {
  if (c.modalitat === null || c.nivell === null) return false
  const nivell = nivellPerId(c.nivell)
  if (!nivell) return false
  return nivell.contenidor === null || c.codiContenidor !== null
}
