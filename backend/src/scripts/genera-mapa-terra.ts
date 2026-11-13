// Genera el mapa de Catalunya que dibuixen les escenes de "La terra" (l'animació
// de la capçalera): el contorn del país, el de les quatre províncies, el tram de
// costa, les peces de comarca del trencadís i uns quants punts de referència, tot
// en coordenades llestes per a l'SVG.
//
// Entrada: backend/data/geojson/ (ICGC, escala 1:1.000.000; no és al repositori)
// i docs/marca/comarques.svg (d'on surt el color de cada comarca).
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
/** Tolerància de les fronteres entre peces: més alta, perquè siguin talls rectes de trencadís. */
const TOLERANCIA_PECES = 1.8
/** Fracció mínima d'una comarca perquè el tros que té en una altra província sigui una peça. */
const MINIM_TROS = 0.06
/** El mapa de comarques de la marca: en surt el color de cada peça. */
const MARCA = resolve(__dirname, '../../../docs/marca/comarques.svg')

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

// ── Peces del trencadís: comarca ∩ província ──────────────────────────────

const clauPunt = ([x, y]: Punt) => `${x},${y}`
const clauAresta = (a: Punt, b: Punt) => {
  const [ka, kb] = [clauPunt(a), clauPunt(b)]
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
}

/** Àrea d'un anell amb signe (positiva o negativa segons el sentit de gir). */
function areaAmbSigne(anell: Punt[]): number {
  let area = 0
  anell.forEach(([x0, y0], i) => {
    const [x1, y1] = anell[(i + 1) % anell.length]!
    area += x0 * y1 - x1 * y0
  })
  return area / 2
}

/**
 * Contorn de la unió d'uns quants polígons veïns: les arestes que dos polígons
 * comparteixen (recorregudes en sentits oposats) s'anul·len, i les que queden
 * s'encadenen en bucles. Torna el bucle més gran (la terra ferma: sense illots,
 * enclavaments ni forats).
 */
function contornUnio(anells: Punt[][]): Punt[] {
  const vores = new Map<string, [Punt, Punt]>()
  for (const anell of anells) {
    anell.forEach((a, i) => {
      const b = anell[(i + 1) % anell.length]!
      const [ka, kb] = [clauPunt(a), clauPunt(b)]
      if (ka === kb) return
      if (!vores.delete(`${kb}>${ka}`)) vores.set(`${ka}>${kb}`, [a, b])
    })
  }
  const sortides = new Map<string, [Punt, Punt][]>()
  for (const vora of vores.values()) {
    const clau = clauPunt(vora[0])
    sortides.set(clau, [...(sortides.get(clau) ?? []), vora])
  }
  const usades = new Set<[Punt, Punt]>()
  let millor: Punt[] = []
  let areaMillor = 0
  for (const inici of vores.values()) {
    const bucle: Punt[] = []
    let vora: [Punt, Punt] | undefined = inici
    while (vora && !usades.has(vora)) {
      usades.add(vora)
      bucle.push(vora[0])
      vora = sortides.get(clauPunt(vora[1]))?.find((v) => !usades.has(v))
    }
    const area = Math.abs(areaAmbSigne(bucle))
    if (area > areaMillor) {
      areaMillor = area
      millor = bucle
    }
  }
  return millor
}

interface Peca {
  comarca: string
  prov: string
  nom: string
  /** Contorn en longitud/latitud, sense simplificar. */
  anell: Punt[]
}

/**
 * Les peces del mapa de comarques, igual que a docs/marca/comarques.svg: cada
 * comarca partida per la frontera de província (a partir dels municipis). Els
 * trossos massa petits per fer-ne una peça (Gósol, la Selva de Barcelona, Vidrà)
 * van amb la província dominant de la comarca.
 */
function pecesReals(): Peca[] {
  const municipis = llegeix('municipis', 'municipis').features.map((f) => {
    const g = f.geometry
    const poligons =
      g.type === 'MultiPolygon' ? (g.coordinates as Punt[][][]) : [g.coordinates as Punt[][]]
    return {
      comarca: f.properties.CODICOMAR!,
      prov: f.properties.CODIPROV!,
      nom: f.properties.NOMCOMAR!,
      area: Number(f.properties.AREAM5000),
      // Tots els anells en el mateix sentit (i els forats, en el contrari): així una
      // frontera compartida sempre es recorre en sentits oposats des de cada costat.
      anells: poligons.flatMap((p) =>
        p.map((anell, i) => {
          const punts = anell.slice(0, -1)
          return areaAmbSigne(punts) > 0 === (i === 0) ? punts : [...punts].reverse()
        })
      ),
    }
  })

  const areaTros = new Map<string, number>()
  const areaComarca = new Map<string, number>()
  for (const m of municipis) {
    const tros = `${m.comarca}-${m.prov}`
    areaTros.set(tros, (areaTros.get(tros) ?? 0) + m.area)
    areaComarca.set(m.comarca, (areaComarca.get(m.comarca) ?? 0) + m.area)
  }
  const dominant = new Map<string, string>()
  for (const [tros, area] of areaTros) {
    const [comarca, prov] = tros.split('-') as [string, string]
    const actual = dominant.get(comarca)
    if (!actual || area > areaTros.get(`${comarca}-${actual}`)!) dominant.set(comarca, prov)
  }

  // Trossos connexos de cada (comarca, província): municipis que comparteixen frontera.
  const pare = municipis.map((_, i) => i)
  const arrel = (i: number): number => (pare[i] === i ? i : (pare[i] = arrel(pare[i]!)))
  const perAresta = new Map<string, number>()
  municipis.forEach((m, i) => {
    for (const anell of m.anells) {
      anell.forEach((a, j) => {
        const clau = clauAresta(a, anell[(j + 1) % anell.length]!)
        const altre = perAresta.get(clau)
        if (altre === undefined) perAresta.set(clau, i)
        else if (municipis[altre]!.comarca === m.comarca && municipis[altre]!.prov === m.prov)
          pare[arrel(i)] = arrel(altre)
      })
    }
  })
  const areaConnex = new Map<number, number>()
  municipis.forEach((m, i) => areaConnex.set(arrel(i), (areaConnex.get(arrel(i)) ?? 0) + m.area))
  const provDe = municipis.map((m, i) =>
    m.prov !== dominant.get(m.comarca) &&
    areaConnex.get(arrel(i))! < areaComarca.get(m.comarca)! * MINIM_TROS
      ? dominant.get(m.comarca)!
      : m.prov
  )

  const grups = new Map<string, Peca & { anells: Punt[][] }>()
  municipis.forEach((m, i) => {
    const clau = `${m.comarca}-${provDe[i]}`
    const grup = grups.get(clau) ?? {
      comarca: m.comarca,
      prov: provDe[i]!,
      nom: m.nom,
      anell: [],
      anells: [],
    }
    grup.anells.push(...m.anells)
    grups.set(clau, grup)
  })
  return [...grups.values()]
    .map(({ anells, ...peca }) => ({ ...peca, anell: contornUnio(anells) }))
    .sort((a, b) => `${a.prov}-${a.comarca}`.localeCompare(`${b.prov}-${b.comarca}`))
}

/**
 * Simplifica les peces sense obrir escletxes: cada tram de frontera (entre dos
 * nusos) se simplifica un sol cop, per a les dues peces que el comparteixen. Torna
 * el contorn de cada peça i, a part, les fronteres interiors (les esquerdes).
 */
function simplificaPeces(
  peces: Peca[],
  projecta: (p: Punt) => Punt
): { contorns: Punt[][]; esquerdes: Punt[][] } {
  const qui = new Map<string, Set<number>>()
  peces.forEach(({ anell }, i) => {
    anell.forEach((a, j) => {
      const clau = clauAresta(a, anell[(j + 1) % anell.length]!)
      qui.set(clau, (qui.get(clau) ?? new Set()).add(i))
    })
  })
  const memoria = new Map<string, Punt[]>()
  const esquerdes: Punt[][] = []
  const contorns = peces.map(({ anell }, i) => {
    const n = anell.length
    const veins = anell.map((a, j) => [...qui.get(clauAresta(a, anell[(j + 1) % n]!))!].sort())
    const talls = anell.flatMap((_, j) =>
      veins[j]!.join() !== veins[(j + n - 1) % n]!.join() ? [j] : []
    )
    if (talls.length === 0) talls.push(0)
    const punts: Punt[] = []
    talls.forEach((ini, k) => {
      const fi = talls[(k + 1) % talls.length]!
      const tram: Punt[] = []
      for (let j = ini; ; j = (j + 1) % n) {
        tram.push(anell[j]!)
        if (j === fi && tram.length > 1) break
      }
      // Sentit canònic: el mateix tram, vingui de la peça que vingui, dona els mateixos punts.
      const invers = clauPunt(tram[0]!) > clauPunt(tram[tram.length - 1]!)
      const canonic = invers ? [...tram].reverse() : tram
      const interior = veins[ini]!.length === 2
      const clau = `${clauPunt(canonic[0]!)}|${clauPunt(canonic[canonic.length - 1]!)}|${veins[ini]!.join()}|${tram.length}`
      let simple = memoria.get(clau)
      if (!simple) {
        simple = simplifica(canonic.map(projecta), interior ? TOLERANCIA_PECES : TOLERANCIA)
        memoria.set(clau, simple)
        if (interior) esquerdes.push(simple)
      }
      punts.push(...(invers ? [...simple].reverse() : simple).slice(0, -1))
    })
    return punts
  })
  return { contorns, esquerdes }
}

/** Color de cada peça (`CC-PP`) al mapa de comarques de la marca. */
function colorsMarca(): Map<string, string> {
  const svg = readFileSync(MARCA, 'utf8')
  const colors = new Map<string, string>()
  for (const [, comarca, prov, color] of svg.matchAll(
    /<g id="c(\d\d)-(\d\d)"[^>]*>\s*<path [^>]*fill="(#[0-9a-f]{6})"/g
  )) {
    colors.set(`${comarca}-${prov}`, color!)
  }
  return colors
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

  // Peces del trencadís, amb el color que tenen al mapa de comarques de la marca.
  const peces = pecesReals()
  const { contorns, esquerdes } = simplificaPeces(peces, projecta)
  const colors = colorsMarca()
  const sensColor = peces.filter((p) => !colors.has(`${p.comarca}-${p.prov}`))
  if (sensColor.length || colors.size !== peces.length) {
    throw new Error(
      `Les peces no quadren amb ${MARCA}: ${peces.length} peces, ${colors.size} colors` +
        (sensColor.length ? `; sense color: ${sensColor.map((p) => p.nom).join(', ')}` : '')
    )
  }
  // Comprovació: les peces han d'omplir el país sencer, sense forats ni encavalcaments.
  const areaPeces = contorns.reduce((suma, c) => suma + Math.abs(areaAmbSigne(c)), 0)
  const areaPais = Math.abs(areaAmbSigne(contorn))
  if (Math.abs(areaPeces / areaPais - 1) > 0.01) {
    throw new Error(
      `Les peces no omplen el país: ${areaPeces.toFixed(0)} de ${areaPais.toFixed(0)}`
    )
  }

  const linies = [
    '/**',
    ' * Contorn de Catalunya, de les quatre províncies i de les peces de comarca per a les',
    ' * escenes de "La terra".',
    ' *',
    " * FITXER GENERAT per backend/src/scripts/genera-mapa-terra.ts: no l'editis a mà.",
    ' *',
    ` * Dades derivades dels GeoJSON de l'ICGC (${VERSIO}, escala`,
    ' * 1:1.000.000, CC BY 4.0), que no són al repositori (backend/data/geojson/): només',
    ' * el polígon principal de cada territori, projectat (equirectangular amb el cosinus',
    ` * de la latitud central) i simplificat amb Douglas-Peucker (tolerància ${TOLERANCIA.toLocaleString('ca')} unitats).`,
    ' * Els colors de les peces surten de docs/marca/comarques.svg.',
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
    '/** Peça del trencadís: una comarca, o el tros que en cau a cada província. */',
    'export interface PecaMapa {',
    '  /** Codi de comarca i de província (`CC-PP`). */',
    '  id: string',
    '  /** Color al mapa de comarques de la marca (docs/marca/comarques.svg). */',
    '  color: string',
    '  /** Centre (centroide) de la peça. */',
    '  centre: readonly [number, number]',
    '  /** Contorn tancat. */',
    '  d: string',
    '}',
    '',
    '/**',
    ` * Les ${peces.length} peces del mapa de comarques. Encaixen sense escletxes: per fora segueixen`,
    ` * el contorn del país i per dins comparteixen fronteres de talls rectes (tolerància ${TOLERANCIA_PECES.toLocaleString('ca')}).`,
    ' */',
    'export const PECES: readonly PecaMapa[] = [',
    ...peces.flatMap((p, i) => {
      const [x, y] = centroide(contorns[i]!)
      return [
        `  // ${p.nom}`,
        '  {',
        `    id: '${p.comarca}-${p.prov}',`,
        `    color: '${colors.get(`${p.comarca}-${p.prov}`)}',`,
        `    centre: [${u(x)}, ${u(y)}],`,
        `    d: '${cami(contorns[i]!, true)}',`,
        '  },',
      ]
    }),
    ']',
    '',
    '/** Fronteres entre peces (camins oberts, de nus a nus): les esquerdes del trencadís. */',
    'export const ESQUERDES: readonly string[] = [',
    ...esquerdes.map((e) => `  '${cami(e, false)}',`),
    ']',
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
      provincies.map((p) => `${p.nom} ${p.punts.length}`).join(', ') +
      `\n  peces: ${peces.length} (${contorns.reduce((n, c) => n + c.length, 0)} punts) · esquerdes: ${esquerdes.length}`
  )
}

main()
