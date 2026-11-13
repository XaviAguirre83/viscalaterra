/**
 * El dia: el poema passa en una jornada sencera. Comença de nit, amb lluna i
 * estels; surt el sol sobre el mar, s'enfila fins dalt de tot i s'hi està durant
 * el tram central; després baixa, i es torna a fer de nit per al sopar i el clam
 * final, amb la lluna travessant el cel. El bucle empalma net: la nit del final
 * és la mateixa del principi.
 *
 * Mòdul pur (sense DOM), testejable: on són el sol i la lluna a cada instant i
 * quanta claror hi ha. Com tot, s'ancora a paraules del poema.
 */
import type { Guio } from './guio'
import { TERRA_Y } from './nucli'

/** Fotograma clau d'un astre: a l'instant t, posició de pantalla i opacitat. */
export type ClauAstre = [t: number, x: number, y: number, opacitat: number]

export interface Astre {
  /** Posició de pantalla respecte del centre (abans de la compressió `k`). */
  x: number
  y: number
  opacitat: number
}

export interface Dia {
  sol(t: number): Astre
  lluna(t: number): Astre
  /** Claror del cel: 0 de nit, 1 amb el sol ben amunt. */
  llum(t: number): number
  /** Instants en què el sol treu el cap i en què s'acaba de pondre. */
  alba: number
  posta: number
}

/** Alçada (y) a partir de la qual el sol ja fa ple dia. */
const Y_PLE_DIA = 24

/**
 * Pendents d'una corba que passa pels punts sense fer panxes (interpolació
 * cúbica monòtona): on la sèrie canvia de sentit, s'hi atura; entre dos trams
 * que van cap al mateix costat, hi passa amb una velocitat intermèdia.
 */
function pendents(ts: number[], vs: number[]): number[] {
  const n = ts.length
  const secant = (i: number) => (vs[i + 1]! - vs[i]!) / (ts[i + 1]! - ts[i]!)
  return ts.map((_, i) => {
    if (i === 0) return secant(0)
    if (i === n - 1) return secant(n - 2)
    const [a, b] = [secant(i - 1), secant(i)]
    if (a * b <= 0) return 0
    const [ha, hb] = [ts[i]! - ts[i - 1]!, ts[i + 1]! - ts[i]!]
    return (3 * (ha + hb)) / ((2 * hb + ha) / a + (hb + 2 * ha) / b)
  })
}

/**
 * Recorregut d'un astre per les seves claus: la posició hi passa en una corba
 * contínua (sense aturar-se a cada clau) i l'opacitat, en línia recta. Abans de
 * la primera clau i després de l'última, s'hi queda.
 */
export function trajectoria(claus: ClauAstre[]): (t: number) => Astre {
  const ts = claus.map((c) => c[0])
  const xs = claus.map((c) => c[1])
  const ys = claus.map((c) => c[2])
  const [mx, my] = [pendents(ts, xs), pendents(ts, ys)]
  const ultima = claus.length - 1
  return (t) => {
    if (t <= ts[0]!) return { x: xs[0]!, y: ys[0]!, opacitat: claus[0]![3] }
    if (t >= ts[ultima]!) return { x: xs[ultima]!, y: ys[ultima]!, opacitat: claus[ultima]![3] }
    let i = 1
    while (ts[i]! < t) i++
    const h = ts[i]! - ts[i - 1]!
    const u = (t - ts[i - 1]!) / h
    // Base d'Hermite.
    const [u2, u3] = [u * u, u * u * u]
    const corba = (vs: number[], m: number[]) =>
      (2 * u3 - 3 * u2 + 1) * vs[i - 1]! +
      (u3 - 2 * u2 + u) * h * m[i - 1]! +
      (-2 * u3 + 3 * u2) * vs[i]! +
      (u3 - u2) * h * m[i]!
    return {
      x: corba(xs, mx),
      y: corba(ys, my),
      opacitat: claus[i - 1]![3] + (claus[i]![3] - claus[i - 1]![3]) * u,
    }
  }
}

/** Claus del sol: surt per llevant (a la dreta), fa el cim al mig del poema i es pon a ponent. */
export function clausSol(guio: Guio): ClauAstre[] {
  const q = guio.quan
  const alba = q('bella') - 0.4
  const posta = q('silenci')
  return [
    [alba, 340, TERRA_Y + 12, 0],
    [alba + 0.8, 340, TERRA_Y + 4, 1],
    // Matí: s'enfila mentre el viatge travessa els Pirineus, el mar i els camps.
    [q('pirineus'), 336, 58, 1],
    [q('baixant'), 310, 44, 1],
    [q('esverant'), 236, 25, 1],
    [guio.frase('camps').entra, 226, 17, 1],
    [q('rosa'), 215, 11, 1],
    [q('garraf'), 150, 7, 1],
    // Migdia: arran del sostre durant tota la festa (castells, cercavila i sardana).
    [q('castells'), 112, 7, 1],
    [q('gegants'), 15, 6, 1],
    [q('nit'), -75, 7, 1],
    [q('sardana'), -125, 9, 1],
    // Tarda: baixa cap a ponent i es pon darrere Montserrat.
    [q('tothom'), -170, 15, 1],
    [q('serra'), -230, 30, 1],
    [q("l'abadia"), -290, 50, 1],
    [posta, -350, TERRA_Y - 6, 0.9],
    [posta + 1.2, -366, TERRA_Y + 12, 0],
  ]
}

/**
 * Claus de la lluna: fa el camí contrari al del sol. Surt per llevant mentre ell
 * es pon (pàl·lida fins que es fa fosc), travessa el cel per damunt de la taula
 * i es pon a la matinada, quan ell torna a sortir. Ha de ser a ponent abans del
 * brindis, perquè el text centrat del final ocupa el mig de la capçalera. La nit
 * queda partida pel bucle: l'última clau és igual que la primera.
 */
export function clausLluna(guio: Guio): ClauAstre[] {
  const q = guio.quan
  const alba = q('bella') - 0.4
  const posta = q('silenci')
  const surt = q("l'abadia")
  const repos: [x: number, y: number] = [-150, 20]
  return [
    [0, ...repos, 1],
    // Matinada: es pon.
    [alba, -215, 34, 1],
    [alba + 3.2, -290, 70, 0],
    // (De dia no es veu.)
    [surt - 0.5, 270, TERRA_Y + 6, 0],
    // Capvespre: surt per darrere de Montserrat, encara amb claror.
    [surt + 1.5, 268, 62, 0.45],
    [posta, 250, 40, 0.6],
    [posta + 2, 215, 26, 1],
    // Nit: travessa el cel durant el sopar…
    [q('calçots'), 112, 14, 1],
    [q('ronda'), -94, 10, 1],
    // …i s'atura a ponent per al brindis i el clam.
    [guio.frase('mar', 1).entra, -125, 10.5, 1],
    [guio.frase('visca').entra, -143, 14, 1],
    [guio.durada, ...repos, 1],
  ]
}

export function creaDia(guio: Guio): Dia {
  const claus = clausSol(guio)
  const sol = trajectoria(claus)
  const lluna = trajectoria(clausLluna(guio))
  return {
    sol,
    lluna,
    llum(t) {
      const { y, opacitat } = sol(t)
      if (opacitat <= 0) return 0
      const p = Math.min(1, Math.max(0, (TERRA_Y - y) / (TERRA_Y - Y_PLE_DIA)))
      return p * p * (3 - 2 * p)
    },
    alba: claus[0]![0],
    posta: claus[claus.length - 1]![0],
  }
}
