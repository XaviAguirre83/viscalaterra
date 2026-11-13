// Genera el mapa de Catalunya que dibuixen les escenes de "La terra" (l'animació
// de la capçalera): el contorn del país, el de les quatre províncies, el tram de
// costa i uns quants punts de referència, tot en coordenades llestes per a l'SVG.
//
// Entrada: backend/data/geojson/ (ICGC, escala 1:1.000.000; no és al repositori).
// Sortida: frontend/src/terra/escenes/mapa-dades.ts (sí que hi és: l'animació no
// depèn de tenir els GeoJSON). Només cal tornar-lo a executar si es vol canviar
// la tolerància, afegir-hi un punt de referència o canviar de font:
//   npm --prefix backend run genera-mapa-terra
//
// De cada territori només es fa servir el polígon principal (sense illots), es
// projecta (equirectangular, amb el cosinus de la latitud central) dins una
// caixa de 100 unitats d'alçada centrada a l'origen, i se simplifica amb
// Douglas-Peucker.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const GEOJSON = resolve(__dirname, '../../data/geojson')
const SORTIDA = resolve(__dirname, '../../../frontend/src/terra/escenes/mapa-dades.ts')
const VERSIO = 'divisions-administratives-v2r1'
const DATA = '20240118'

/** Alçada de la caixa de sortida, en unitats. */
const ALCADA = 100
/** Tolerància de la simplificació, en unitats (el mapa es dibuixa a ~1 px/unitat). */
const TOLERANCIA = 0.5

/** Punts de referència: [longitud, latitud] i com s'anomenen als comentaris. */
const LLOCS: Record<string, { on: [number, number]; nom: string }> = {
  emporda: { on: [3.02, 42.24], nom: "l'Empordà" },
  montsia: { on: [0.56, 40.68], nom: 'el Montsià' },
  aran: { on: [0.82, 42.72], nom: "l'Aran" },
  garraf: { on: [1.78, 41.27], nom: 'el Garraf' },
  montserrat: { on: [1.835, 41.6], nom: 'Montserrat' },
  capCreus: { on: [3.32, 42.32], nom: 'el cap de Creus' },
}

type Punt = [number, number]
interface Geometria {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: Punt[][] | Punt[][][]
}
interface Colleccio {
  features: { geometry: Geometria; properties: Record<string, string> }[]
}

function llegeix(nivell: string, fitxer: string): Colleccio {
  const cami = resolve(GEOJSON, nivell, `${VERSIO}-${fitxer}-1000000-${DATA}.json`)
  return JSON.parse(readFileSync(cami, 'utf8')) as Colleccio
}

/** Anell exterior del polígon més gran d'una geometria (la terra ferma, sense illots). */
function anellPrincipal(geometria: Geometria): Punt[] {
  const poligons =
    geometria.type === 'MultiPolygon'
      ? (geometria.coordinates as Punt[][][])
      : [geometria.coordinates as Punt[][]]
  return poligons.map((p) => p[0]!).sort((a, b) => b.length - a.length)[0]!
}

/** Douglas-Peucker (iteratiu) sobre una línia oberta. */
function simplifica(punts: Punt[], tolerancia: number): Punt[] {
  const conserva = new Uint8Array(punts.length)
  conserva[0] = conserva[punts.length - 1] = 1
  const pila: [number, number][] = [[0, punts.length - 1]]
  while (pila.length) {
    const [a, b] = pila.pop()!
    const [ax, ay] = punts[a]!
    const [bx, by] = punts[b]!
    const dx = bx - ax
    const dy = by - ay
    const llarg2 = dx * dx + dy * dy
    let maxim = 0
    let index = -1
    for (let i = a + 1; i < b; i++) {
      const [px, py] = punts[i]!
      // Distància del punt al segment a–b.
      const t =
        llarg2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / llarg2))
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
      if (d > maxim) {
        maxim = d
        index = i
      }
    }
    if (maxim > tolerancia && index > 0) {
      conserva[index] = 1
      pila.push([a, index], [index, b])
    }
  }
  return punts.filter((_, i) => conserva[i])
}

/**
 * Simplifica un anell tancat: el parteix en dos pel punt més allunyat del
 * primer, perquè Douglas-Peucker no el col·lapsi en un segment.
 */
function simplificaAnell(anell: Punt[], tolerancia: number): Punt[] {
  const p = anell.slice(0, -1) // sense el punt repetit de tancament
  let lluny = 0
  let distancia = 0
  p.forEach(([x, y], i) => {
    const d = Math.hypot(x - p[0]![0], y - p[0]![1])
    if (d > distancia) {
      distancia = d
      lluny = i
    }
  })
  const anada = simplifica(p.slice(0, lluny + 1), tolerancia)
  const tornada = simplifica([...p.slice(lluny), p[0]!], tolerancia)
  return [...anada, ...tornada.slice(1, -1)]
}

/** Centroide d'un polígon (fórmula de l'àrea amb signe). */
function centroide(punts: Punt[]): Punt {
  let area = 0
  let cx = 0
  let cy = 0
  punts.forEach(([x0, y0], i) => {
    const [x1, y1] = punts[(i + 1) % punts.length]!
    const creu = x0 * y1 - x1 * y0
    area += creu
    cx += (x0 + x1) * creu
    cy += (y0 + y1) * creu
  })
  return [cx / (3 * area), cy / (3 * area)]
}

const u = (v: number) => (Math.round(v * 10) / 10).toString()
const cami = (punts: Punt[], tancat: boolean) =>
  'M' + punts.map(([x, y]) => `${u(x)} ${u(y)}`).join('L') + (tancat ? 'Z' : '')

function main() {
  const catalunya = anellPrincipal(llegeix('comunitat', 'catalunya').features[0]!.geometry)
  const lons = catalunya.map((c) => c[0])
  const lats = catalunya.map((c) => c[1])
  const [lonMin, lonMax] = [Math.min(...lons), Math.max(...lons)]
  const [latMin, latMax] = [Math.min(...lats), Math.max(...lats)]
  const lon0 = (lonMin + lonMax) / 2
  const lat0 = (latMin + latMax) / 2
  const k = Math.cos((lat0 * Math.PI) / 180)
  const escala = ALCADA / (latMax - latMin)
  const projecta = ([lon, lat]: Punt): Punt => [(lon - lon0) * k * escala, -(lat - lat0) * escala]

  const contorn = simplificaAnell(catalunya.map(projecta), TOLERANCIA)

  // Costa: l'arc del contorn que va de Portbou (l'extrem nord de la façana de
  // llevant) a la Sénia (el punt més al sud) passant pel cap de Creus.
  const xLlevant = Math.max(...contorn.map((p) => p[0]))
  let iNord = 0
  let iSud = 0
  let yNord = Infinity
  contorn.forEach(([x, y], i) => {
    if (y > contorn[iSud]![1]) iSud = i
    if (x > xLlevant - 7 && y < yNord) {
      yNord = y
      iNord = i
    }
  })
  const arc = (de: number, a: number): Punt[] => {
    const punts: Punt[] = []
    for (let i = de; ; i = (i + 1) % contorn.length) {
      punts.push(contorn[i]!)
      if (i === a) break
    }
    return punts
  }
  const directe = arc(iNord, iSud)
  const costa = directe.some((p) => p[0] === xLlevant) ? directe : arc(iSud, iNord).reverse()

  const provincies = llegeix('provincies', 'provincies')
    .features.map((f) => ({
      codi: f.properties.CODIPROV!,
      nom: f.properties.NOMPROV!,
      punts: simplificaAnell(anellPrincipal(f.geometry).map(projecta), TOLERANCIA),
    }))
    .sort((a, b) => a.codi.localeCompare(b.codi))

  const linies = [
    '/**',
    ' * Contorn de Catalunya i de les quatre províncies per a les escenes de "La terra".',
    ' *',
    " * FITXER GENERAT per backend/src/scripts/genera-mapa-terra.ts: no l'editis a mà.",
    ' *',
    ` * Dades derivades dels GeoJSON de l'ICGC (${VERSIO}, escala`,
    ' * 1:1.000.000, CC BY 4.0), que no són al repositori (backend/data/geojson/): només',
    ' * el polígon principal de cada territori, projectat (equirectangular amb el cosinus',
    ` * de la latitud central) i simplificat amb Douglas-Peucker (tolerància ${TOLERANCIA.toLocaleString('ca')} unitats).`,
    ' *',
    " * Coordenades en una caixa de MAPA_AMPLADA × MAPA_ALCADA unitats amb l'origen al",
    " * centre (x cap a l'est, y cap al sud), pensades per escalar-les dins l'SVG.",
    ' */',
    '',
    `export const MAPA_AMPLADA = ${Math.round((lonMax - lonMin) * k * escala)}`,
    `export const MAPA_ALCADA = ${ALCADA}`,
    '',
    `/** Contorn tancat de Catalunya (${contorn.length} punts). */`,
    'export const CONTORN =',
    `  '${cami(contorn, true)}'`,
    '',
    '/** Tram de costa del contorn, de Portbou (nord) a la Sénia (sud): camí obert. */',
    'export const COSTA =',
    `  '${cami(costa, false)}'`,
    '',
    '/** Contorn de cada província, per codi (08 Barcelona, 17 Girona, 25 Lleida, 43 Tarragona). */',
    'export const PROVINCIES: Record<string, string> = {',
    // Cada província en una sola línia: és com la deixa Prettier.
    ...provincies.flatMap((p) => [`  // ${p.nom}`, `  '${p.codi}': '${cami(p.punts, true)}',`]),
    '}',
    '',
    '/** Centre (centroide) de cada província, per fer-les créixer des del seu mig. */',
    'export const CENTRES: Record<string, readonly [number, number]> = {',
    ...provincies.map((p) => {
      const [x, y] = centroide(p.punts)
      return `  '${p.codi}': [${u(x)}, ${u(y)}],`
    }),
    '}',
    '',
    '/** Punts de referència sobre el mapa (mateixes coordenades que el contorn). */',
    'export const PUNTS = {',
    ...Object.entries(LLOCS).flatMap(([clau, lloc]) => {
      const [x, y] = projecta(lloc.on)
      return [`  /** ${lloc.nom} */`, `  ${clau}: [${u(x)}, ${u(y)}],`]
    }),
    '} as const satisfies Record<string, readonly [number, number]>',
    '',
  ]
  writeFileSync(SORTIDA, linies.join('\n'), 'utf8')
  console.log(
    `✓ ${SORTIDA}\n  contorn: ${contorn.length} punts · costa: ${costa.length} · províncies: ` +
      provincies.map((p) => `${p.nom} ${p.punts.length}`).join(', ')
  )
}

main()
