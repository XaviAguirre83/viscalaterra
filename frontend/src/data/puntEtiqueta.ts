// On es posa el nom d'un territori sobre el mapa (mòdul pur, sense Leaflet).
//
// El centroide sol (el que dona Leaflet amb getCenter) no serveix: una punta
// o una cua l'estiren cap a fora del «cor» visual, en formes còncaves pot
// caure fora del polígon, i en territoris de més d'una peça només mira la
// primera. El POL D'INACCESSIBILITAT sol (el punt de dins més allunyat de les
// vores) tampoc: en una franja allargada se'n va a l'extrem més ample (el nom
// del Maresme acabava tocant la Selva). Es busca el punt de dins que millor
// combina les dues coses:
//
//   valor = distància a la vora − PES_CENTRE × distància al centroide
//
// Amb el pes per sota d'1, on la vora és a prop (cap a una punta o una cua)
// mana allunyar-se'n, i on gairebé no canvia (al llarg d'una franja) mana el
// centre. Cerca de l'algorisme polylabel (Mapbox, 2016): es cobreix el
// polígon de quadrats i se subdivideixen només els que encara podrien
// contenir un punt millor que el millor trobat.
//
// Les coordenades han de ser planes (projectades, p. ex. Mercator en metres):
// en graus, un grau de longitud no mesura el mateix que un de latitud i les
// distàncies a la vora sortirien deformades.

export type Punt = [number, number]
// Un polígon: l'anell exterior primer i, darrere, els forats.
export type Poligon = Punt[][]

// Precisió per defecte, relativa a la mida del polígon: prou fina perquè la
// desviació no es vegi (0,5 % de l'amplada) i prou grossa perquè sigui ràpid.
const PRECISIO_RELATIVA = 1 / 200
// Abans de buscar, el contorn se simplifica (Douglas-Peucker) amb una
// tolerància d'una cinquena part de la precisió: el punt no canvia, però una
// costa retallada passa de milers de vèrtexs a uns centenars (i cada cel·la
// examinada en recorre tots).
const SIMPLIFICACIO_PER_PRECISIO = 1 / 5
// Topall de seguretat de cel·les examinades (formes patològiques).
const MAX_CELLES = 5000
// Pes de la proximitat al centroide davant la distància a la vora (vegeu a dalt).
const PES_CENTRE = 0.5

// Àrea (sense signe) d'un anell, per la fórmula del cordó (shoelace).
export function areaAnell(anell: Punt[]): number {
  let doble = 0
  for (let i = 0, j = anell.length - 1; i < anell.length; j = i++) {
    doble += anell[j]![0] * anell[i]![1] - anell[i]![0] * anell[j]![1]
  }
  return Math.abs(doble) / 2
}

// Distància d'un punt al polígon: positiva si és a dins, negativa si és a fora.
// (És el bucle calent del càlcul: accés per índex, sense desestructurar.)
export function distanciaVora(x: number, y: number, poligon: Poligon): number {
  let dins = false
  let minQuadrat = Infinity
  for (const anell of poligon) {
    const n = anell.length
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const a = anell[i]!
      const b = anell[j]!
      const ax = a[0]
      const ay = a[1]
      const bx = b[0]
      const by = b[1]
      // Raig horitzontal cap a la dreta: cada vora que travessa canvia dins/fora
      // (els forats, en ser anells interiors, ho resolen sols).
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) dins = !dins
      const d = distanciaSegmentQuadrat(x, y, ax, ay, bx, by)
      if (d < minQuadrat) minQuadrat = d
    }
  }
  return (dins ? 1 : -1) * Math.sqrt(minQuadrat)
}

// Simplificació Douglas-Peucker d'un anell: es queda només amb els vèrtexs
// que s'aparten més de `tolerancia` de la línia entre els que ja hi són.
export function simplifica(anell: Punt[], tolerancia: number): Punt[] {
  const n = anell.length
  if (n <= 4 || tolerancia <= 0) return anell
  const tol2 = tolerancia * tolerancia
  const queda = new Uint8Array(n)
  queda[0] = 1
  queda[n - 1] = 1
  const pila = [0, n - 1]
  while (pila.length > 0) {
    const fi = pila.pop()!
    const inici = pila.pop()!
    const a = anell[inici]!
    const b = anell[fi]!
    let maxim = tol2
    let index = -1
    for (let i = inici + 1; i < fi; i++) {
      const p = anell[i]!
      const d = distanciaSegmentQuadrat(p[0], p[1], a[0], a[1], b[0], b[1])
      if (d > maxim) {
        maxim = d
        index = i
      }
    }
    if (index !== -1) {
      queda[index] = 1
      pila.push(inici, index, index, fi)
    }
  }
  return anell.filter((_, i) => queda[i] === 1)
}

// Tots els anells; els forats que es queden en no res (menys de 3 vèrtexs)
// desapareixen, i si l'exterior es degenerés es manté l'original.
function simplificaPoligon(poligon: Poligon, tolerancia: number): Poligon {
  const exterior = simplifica(poligon[0]!, tolerancia)
  const forats = poligon
    .slice(1)
    .map((anell) => simplifica(anell, tolerancia))
    .filter((anell) => anell.length >= 3)
  return [exterior.length >= 3 ? exterior : poligon[0]!, ...forats]
}

function distanciaSegmentQuadrat(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  let x = ax
  let y = ay
  let dx = bx - x
  let dy = by - y
  if (dx !== 0 || dy !== 0) {
    const t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy)
    if (t > 1) {
      x = bx
      y = by
    } else if (t > 0) {
      x += dx * t
      y += dy * t
    }
  }
  dx = px - x
  dy = py - y
  return dx * dx + dy * dy
}

interface Cella {
  x: number
  y: number
  // Mitja amplada de la cel·la.
  h: number
  // Distància del centre a la vora (amb signe: negativa, fora).
  d: number
  // El que val el centre de la cel·la (vegeu a dalt).
  valor: number
  // Cota superior: el màxim que pot valer algun punt de la cel·la (a h√2 del
  // centre com a molt, la vora s'hi pot allunyar h√2 i el centroide acostar
  // h√2).
  max: number
}

function cella(x: number, y: number, h: number, poligon: Poligon, centroide: Punt): Cella {
  const d = distanciaVora(x, y, poligon)
  const penalitzacio = PES_CENTRE * Math.hypot(x - centroide[0], y - centroide[1])
  return {
    x,
    y,
    h,
    d,
    valor: d - penalitzacio,
    max: d + h * Math.SQRT2 * (1 + PES_CENTRE) - penalitzacio,
  }
}

// Centroide (centre de masses) de l'anell exterior.
export function centroide(anell: Punt[]): Punt {
  let area = 0
  let x = 0
  let y = 0
  for (let i = 0, j = anell.length - 1; i < anell.length; j = i++) {
    const [ax, ay] = anell[i]!
    const [bx, by] = anell[j]!
    const f = ax * by - bx * ay
    x += (ax + bx) * f
    y += (ay + by) * f
    area += f * 3
  }
  if (area === 0) return [anell[0]![0], anell[0]![1]]
  return [x / area, y / area]
}

// `precisioMinima`: no cal afinar més que això (p. ex. mig píxel de la vista
// actual, en les unitats de les coordenades): un territori petit en pantalla
// no necessita la precisió relativa d'un de gran.
export function puntEtiqueta(poligonOriginal: Poligon, precisioMinima = 0): Punt {
  const exterior = poligonOriginal[0]
  if (!exterior || exterior.length === 0) return [0, 0]

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of exterior) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  const amplada = maxX - minX
  const alcada = maxY - minY
  const mida = Math.min(amplada, alcada)
  // Polígon degenerat (una línia o un punt): no hi ha interior on buscar.
  if (mida === 0) return [minX + amplada / 2, minY + alcada / 2]
  const tolerancia = Math.max(Math.max(amplada, alcada) * PRECISIO_RELATIVA, precisioMinima)
  const poligon = simplificaPoligon(poligonOriginal, tolerancia * SIMPLIFICACIO_PER_PRECISIO)

  const centre = centroide(poligon[0]!)

  // Cua de prioritat (max-heap per `max`): primer les cel·les més prometedores.
  const cua = new CuaCelles()
  const h = mida / 2
  for (let x = minX; x < maxX; x += mida) {
    for (let y = minY; y < maxY; y += mida) cua.posa(cella(x + h, y + h, h, poligon, centre))
  }

  // Només val un punt de DINS (d > 0). Candidats de sortida: el centroide i
  // el centre de la caixa, si hi són.
  let millor: Cella | null = null
  for (const c of [
    cella(centre[0], centre[1], 0, poligon, centre),
    cella(minX + amplada / 2, minY + alcada / 2, 0, poligon, centre),
  ]) {
    if (c.d > 0 && (!millor || c.valor > millor.valor)) millor = c
  }

  let examinades = 0
  while (cua.mida > 0 && examinades++ < MAX_CELLES) {
    const c = cua.treu()!
    if (c.d > 0 && (!millor || c.valor > millor.valor)) millor = c
    // Cel·la tota fora del polígon, o que no pot millorar prou el millor: no
    // cal partir-la.
    if (c.d + c.h * Math.SQRT2 <= 0) continue
    if (millor && c.max - millor.valor <= tolerancia) continue
    const m = c.h / 2
    cua.posa(cella(c.x - m, c.y - m, m, poligon, centre))
    cua.posa(cella(c.x + m, c.y - m, m, poligon, centre))
    cua.posa(cella(c.x - m, c.y + m, m, poligon, centre))
    cua.posa(cella(c.x + m, c.y + m, m, poligon, centre))
  }
  // Sense cap punt de dins trobat (forma patològica): el centroide.
  return millor ? [millor.x, millor.y] : centre
}

// Territori de més d'una peça (enclavaments, illes): el nom va a la peça més
// gran. Retorna també l'àrea d'aquesta peça (prioritat entre etiquetes).
export function puntEtiquetaPeces(
  peces: Poligon[],
  precisioMinima = 0
): { punt: Punt; area: number } {
  let gran: Poligon | null = null
  let area = -1
  for (const p of peces) {
    const a = p[0] ? areaAnell(p[0]) : 0
    if (a > area) {
      area = a
      gran = p
    }
  }
  if (!gran) return { punt: [0, 0], area: 0 }
  return { punt: puntEtiqueta(gran, precisioMinima), area }
}

// Max-heap binari: dona sempre la cel·la amb la cota més alta.
class CuaCelles {
  private dades: Cella[] = []

  get mida(): number {
    return this.dades.length
  }

  posa(c: Cella) {
    const d = this.dades
    d.push(c)
    let i = d.length - 1
    while (i > 0) {
      const pare = (i - 1) >> 1
      if (d[pare]!.max >= c.max) break
      d[i] = d[pare]!
      i = pare
    }
    d[i] = c
  }

  treu(): Cella | undefined {
    const d = this.dades
    const primera = d[0]
    const ultima = d.pop()
    if (d.length > 0 && ultima) {
      let i = 0
      const meitat = d.length >> 1
      while (i < meitat) {
        let fill = 2 * i + 1
        if (fill + 1 < d.length && d[fill + 1]!.max > d[fill]!.max) fill++
        if (d[fill]!.max <= ultima.max) break
        d[i] = d[fill]!
        i = fill
      }
      d[i] = ultima
    }
    return primera
  }
}
