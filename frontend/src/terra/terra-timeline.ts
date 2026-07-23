/**
 * Guió temporal de l'animació tipogràfica "La terra" (capçalera).
 *
 * Fitxer de configuració pensat per editar-se a mà: cada entrada és un grup
 * de mitges frases amb el seu segon d'entrada — absolut (`tempsEntrada`) o
 * encadenat a la frase anterior (`despres`, cursor autoincremental) — dins
 * el timeline de DURADA_TOTAL segons, i la seva posició en % del
 * contenidor. Les paraules
 * entren d'una en una: per defecte amb la cadència automàtica
 * (CADENCIA_PARAULA + RETARD_SEGONA_LINIA en canviar de línia), o amb temps
 * explícits per paraula via `tempsParaules` (vegeu la primera frase com a
 * exemple). El fundit de sortida sempre és del grup sencer.
 *
 * Els temps estan repartits proporcionalment a la llargada de cada grup,
 * amb ~1,5 s extra d'aire en cada canvi d'estrofa. Les posicions són
 * provisionals (zig-zag dins la zona segura del 8%) — s'ajustaran a mà.
 * Compte amb les Y: en una capçalera de 110 px, un grup de dues línies
 * ocupa ~40% de l'alçada; l'àncora (cantonada superior esquerra) no hauria
 * de passar gaire del 48% perquè la segona línia no surti de l'àrea visible.
 */

export type Deriva = 'amunt' | 'avall' | 'esquerra' | 'dreta' | 'cap'

export interface FraseTerra {
  /** Mitges frases del grup; les línies següents entren amb retard i sagnat. */
  linies: string[]
  /**
   * Segon d'entrada ABSOLUT dins el track (0–DURADA_TOTAL). Opcional: si no
   * hi és, la frase s'encadena a l'anterior amb `despres`. Útil com a àncora
   * fixa (inici d'estrofa, sincronització amb l'àudio futur). Si conviuen
   * tots dos camps, mana tempsEntrada.
   */
  tempsEntrada?: number
  /**
   * Entrada RELATIVA: segons després que hagi entrat l'ÚLTIMA paraula de la
   * frase anterior. El cursor s'autoincrementa frase rere frase: si canvies
   * el ritme d'una frase, totes les encadenades darrere es desplacen soles.
   * Per defecte 0 (encadena just quan l'anterior acaba d'escriure's).
   */
  despres?: number
  /**
   * Control fi paraula a paraula (opcional). Un array per línia; dins de cada
   * array, el segon d'entrada de cada paraula RELATIU a tempsEntrada (les
   * paraules són els trossos separats per espais de `linies`).
   *
   * Si el camp no hi és — o hi falta alguna paraula — s'aplica la cadència
   * automàtica: CADENCIA_PARAULA entre paraules consecutives i
   * RETARD_SEGONA_LINIA d'aire extra en saltar de línia.
   *
   * El fundit de sortida no es toca des d'aquí: sempre és del grup sencer.
   */
  tempsParaules?: number[][]
  /** Àncora horitzontal, en % del contenidor (zona segura: 8–92). */
  posX: number
  /** Àncora vertical, en % del contenidor (zona segura: 8–92). */
  posY: number
  /** Direcció de la deriva mentre és visible. Per defecte: 'amunt'. */
  deriva?: Deriva
  /** Bloc final: àncora al centre del grup i línies centrades, sense sagnat. */
  centrat?: boolean
  /** Moment culminant (VISCA LA TERRA!): més gran i opacitat 100%. */
  destacat?: boolean
}

/** Pausa en negre entre el final del track i el reinici del bucle, en segons. */
export const PAUSA_BUCLE = 5

/** Fade-in de cada paraula, en segons. */
export const FADE_IN = 0.3

/** Fade-out de cada grup, en segons (comença quan entra el grup següent). */
export const FADE_OUT = 1.2

/** Fade-out del clímax final, en segons (acaba just a DURADA_TOTAL). */
export const FADE_OUT_FINAL = 2

/** Temps que el clímax (VISCA LA TERRA!) aguanta plenament visible un cop
 *  s'ha acabat d'escriure, abans d'iniciar el seu fundit final. Puja o baixa
 *  aquest valor per allargar o escurçar el moment culminant. */
export const SOSTE_CLIMAX = 4

/** Cadència automàtica entre paraules consecutives, en segons.
 *  Només s'aplica quan la frase no porta `tempsParaules` explícit. */
export const CADENCIA_PARAULA = 0.22

/** Aire extra en saltar a la línia següent (cadència automàtica), en segons:
 *  la primera paraula de la línia 2 entra aquest temps després de la
 *  cadència normal rere l'última paraula de la línia 1. */
export const RETARD_SEGONA_LINIA = 0.6

/** Opacitat de repòs d'una frase visible (el destacat va al 100%).
 *  Baixa a consciència: les frases són textura de fons i no han de competir
 *  amb el logo, el nom ni els controls de la capçalera. */
export const OPACITAT_REPOS = 0.4

/** Recorregut de la deriva mentre la frase és visible, en píxels. */
export const DERIVA_PX = 12

/** Paraula amb el seu offset d'entrada resolt (segons des de l'entrada de la frase). */
export interface ParaulaResolta {
  mot: string
  offset: number
}

export interface FraseResolta {
  frase: FraseTerra
  /** Segon d'entrada absolut dins el track, ja resolt. */
  t: number
  /** Paraules de cada línia amb el seu offset resolt. */
  linies: ParaulaResolta[][]
}

/**
 * Resol el guió a temps absoluts. El cursor del track apunta al moment en
 * què entra l'última paraula de la frase anterior: `despres` hi encadena
 * (autoincrement) i `tempsEntrada` ancora en absolut re-sincronitzant el
 * cursor. Dins la frase, el cursor de la cadència continua després d'un
 * offset explícit, així es poden barrejar paraules fixades a mà
 * (tempsParaules) amb la resta en automàtic.
 */
export function resolFrases(frases: FraseTerra[] = FRASES): FraseResolta[] {
  let cursorTrack = 0
  return frases.map((frase) => {
    const t = frase.tempsEntrada ?? cursorTrack + (frase.despres ?? 0)
    let cursor = 0
    const linies = frase.linies.map((text, j) => {
      if (j > 0) cursor += RETARD_SEGONA_LINIA
      return text.split(' ').map((mot, k) => {
        const offset = frase.tempsParaules?.[j]?.[k] ?? cursor
        cursor = offset + CADENCIA_PARAULA
        return { mot, offset }
      })
    })
    cursorTrack = t + Math.max(0, ...linies.flat().map((p) => p.offset))
    return { frase, t, linies }
  })
}

export const FRASES: FraseTerra[] = [
  // ── Estrofa 1 · El paisatge ──────────────────────────────────────────
  {
    linies: ['Visc'],
    tempsEntrada: 1.5,
    tempsParaules: [
      [0], // Visc
    ],
    posX: 50,
    posY: 50,
    centrat: true,
    destacat: false,
    deriva: 'amunt',
  },
  {
    linies: ['a la terra,'],
    despres: 1.2,
    tempsParaules: [
      [0.0, 0.2, 0.4], // a · la · terra,
    ],
    posX: 50,
    posY: 65,
    centrat: true,
    deriva: 'avall',
  },
  {
    linies: ['bella terra mediterrània'],
    despres: 1.4,
    tempsParaules: [
      [0.0, 0.3, 0.7], // bella · terra · mediterrània
    ],
    posX: 10,
    posY: 8,
    deriva: 'esquerra',
  },
  {
    linies: ['admirada pels Pirineus', 'que tossen tramuntana,'],
    despres: 1.3,
    tempsParaules: [
      [0.0, 0.4, 0.6], // admirada · pels · pirineus
      [1.5, 1.8, 2.1], // que · tossen · tramuntana,
    ],
    posX: 45,
    posY: 40,
  },
  {
    linies: ['baixant enrabiada,', 'alçant la veu,'],
    despres: 1.5,
    tempsParaules: [
      [0.0, 0.6], // baixant · enrabiada
      [1.5, 1.8, 2.1], // alçant · la · veu,
    ],
    posX: 22,
    posY: 15,
    deriva: 'avall',
  },
  {
    linies: ['esverant un mar', "on l'onada esculpeix la roca", 'a cop de sal.'],
    despres: 0.8,
    tempsParaules: [
      [0.0, 0.4, 0.6], // esverant · un · mar
      [1.5, 1.8, 2.1, 2.5, 2.9], // on · l'onada · esculpeix · la · roca
      [3.5, 3.6, 3.8, 4.0], // a · cop · de · sal
    ],
    posX: 40,
    posY: 15,
    deriva: 'avall',
  },

  // ── Estrofa 2 · Història i llegenda ──────────────────────────────────
  {
    linies: ['Terra de camps', 'que respiren història,'],
    despres: 1.9,
    tempsParaules: [
      [0.0, 0.4, 0.6], // Terra · de · camps'
      [1.5, 1.8, 2.1], // que · respiren · història,
    ],
    posX: 25,
    posY: 38,
  },
  {
    linies: ['de cavallers,', 'dracs i princeses,'],
    despres: 1.0,
    tempsParaules: [
      [0.0, 0.3], // de · cavallers,
      [0.8, 1.3, 1.5], // dracs · i · princeses,
    ],
    posX: 58,
    posY: 16,
    deriva: 'esquerra',
  },
  {
    linies: ['del Sant Jordi', 'del llibre i la rosa,'],
    despres: 1.0,
    tempsParaules: [
      [0.0, 0.4, 0.6], // del · Sant · Jordi
      [1.5, 1.8, 2.1, 2.5, 2.9], // del · llibre · i · la · rosa,
    ],
    posX: 10,
    posY: 8,
    deriva: 'esquerra',
  },
  {
    linies: ['de llegendes', 'que el vent encara escampa'],
    despres: 1.0,
    tempsParaules: [
      [0.0, 0.5], // de · llegendes
      [1.5, 1.8, 2.1, 2.5, 2.9], // que · el · vent · encara · escampa
    ],
    posX: 12,
    posY: 26,
  },
  {
    linies: ["de l'Empordà al Montsià,", "de l'Aran al Garraf."],
    despres: 1.0,
    tempsParaules: [
      [0.0, 0.4, 0.6, 1.0], // de · l'Empordà · al · Montsià,
      [1.5, 1.8, 2.1, 2.5], // de · l'Aran · al · Garraf.
    ],
    posX: 54,
    posY: 12,
  },

  // ── Estrofa 3 · Castellers ───────────────────────────────────────────
  {
    linies: ['Ferma terra', 'de castells i castellers'],
    despres: 1.5,
    tempsParaules: [
      [0.0, 0.5], // Ferma · terra
      [1.5, 1.8, 2.1, 2.5], // de · castells · i · castellers
    ],
    posX: 52,
    posY: 42,
  },
  {
    linies: ['que en germanor aixequen torres', 'a toc de gralla,'],
    despres: 1.0,
    tempsParaules: [
      [0.0, 0.4, 0.6, 1.0, 1.4], // que · en · germanor · aixequen · torres
      [2.1, 2.5, 2.9, 3.3], // a · toc · de · gralla,
    ],
    posX: 15,
    posY: 24,
  },
  {
    linies: ["alçant l'enxaneta", 'fins a tocar el cel.'],
    despres: 1.0,
    tempsParaules: [
      [0.0, 0.5], // alçant · l'enxaneta
      [1.5, 1.8, 2.1, 2.5, 2.9], // fins · a · tocar · el · cel.
    ],
    posX: 44,
    posY: 44,
  },

  // ── Estrofa 4 · Cultura popular de foc ───────────────────────────────
  {
    linies: ['Terra de gegants i capgrossos,', 'de bastoners que piquen fort,'],
    despres: 1.8,
    tempsParaules: [
      [0.0, 0.4, 0.6, 1.0, 1.4], // Terra · de · gegants · i · capgrossos,
      [1.8, 2.1, 2.5, 2.9, 3.3], // de · bastoners · que · piquen · fort,
    ],
    posX: 11,
    posY: 16,
  },
  {
    linies: ['de trabucaires', 'que ens fan saltar del llit'],
    despres: 0.9,
    tempsParaules: [
      [0.0, 0.5], // de · trabucaires
      [1.5, 1.8, 2.1, 2.5, 2.9, 3.3], // que · ens · fan · saltar · del · llit
    ],
    posX: 54,
    posY: 38,
  },
  {
    linies: ['i diables', 'que fan tronar la nit.'],
    despres: 0.4,
    tempsParaules: [
      [0.0, 0.5], // i · diables
      [1.5, 1.8, 2.1, 2.5, 2.9], // que · fan · tronar · la · nit.
    ],
    posX: 26,
    posY: 46,
  },

  // ── Estrofa 5 · La sardana ───────────────────────────────────────────
  {
    linies: ['Festiva.'],
    despres: 1.5,
    posX: 46,
    posY: 24,
  },
  {
    linies: ['flabiol, tible i tenora', 'fan rodar la sardana,'],
    despres: 1.4,
    tempsParaules: [
      [0.0, 0.4, 0.6, 1.0], // flabiol, · tible · i · tenora
      [1.5, 1.8, 2.1, 2.5], // fan · rodar · la · sardana,
    ],
    posX: 14,
    posY: 42,
  },
  {
    linies: ['formant un cercle tancat', 'que és obert a tothom.'],
    despres: 0.8,
    tempsParaules: [
      [0.0, 0.4, 0.6, 1.0], // formant · un · cercle · tancat
      [1.8, 2.1, 2.5, 2.9, 3.3], // que · és · obert · a · tothom.
    ],
    posX: 50,
    posY: 14,
  },

  // ── Estrofa 6 · Montserrat ───────────────────────────────────────────
  {
    linies: ["Terra de la Rosa d'abril,", 'la Morena de la serra'],
    despres: 1.0,
    tempsParaules: [
      [0.0, 0.4, 0.6, 1.0, 1.4], // Terra · de · la · rosa · d'abril,
      [1.8, 2.1, 2.5, 2.9, 3.3], // la · Morena · de · la · serra
    ],
    posX: 12,
    posY: 32,
  },
  {
    linies: ['que vetlla el país', "des de l'abadia,"],
    despres: 1.0,
    tempsParaules: [
      [0.0, 0.4, 0.6, 1.0], // que · vetlla · el · país
      [1.5, 1.8, 2.1], // des · de · l'abadia,
    ],
    posX: 56,
    posY: 44,
  },
  {
    linies: ['on escolanets', 'posen veu al silenci.'],
    despres: 1.0,
    tempsParaules: [
      [0.0, 0.5], // on · escolanets
      [1.8, 2.1, 2.5, 2.9], // posen · veu · al · silenci.
    ],
    posX: 32,
    posY: 12,
  },

  // ── Estrofa 7 · La taula ─────────────────────────────────────────────
  {
    linies: ['Visc a la terra', 'que ens asseu a taula,'],
    despres: 1.0,
    tempsParaules: [
      [0.0, 0.4, 0.6, 1.0], // Visc · a · la · terra
      [1.5, 1.8, 2.1, 2.5, 2.9], // que · ens · asseu · a · taula,
    ],
    posX: 14,
    posY: 30,
  },
  {
    linies: ['amb calçots i mans brutes,', 'botifarra amb mongetes,'],
    despres: 1.0,
    tempsParaules: [
      [0.0, 0.4, 0.6, 1.0, 1.4], // amb · calçots · i · mans · brutes,
      [1.8, 2.1, 2.5], // botifarra · amb · mongetes,
    ],
    posX: 48,
    posY: 42,
  },
  {
    linies: ['fuet, pa amb tomàquet i allioli,', 'regat amb un porró que ronda.'],
    despres: 0.8,
    tempsParaules: [
      [0.0, 0.4, 0.6, 1.0, 1.4, 1.8], // fuet, · pa · amb · tomàquet · i · allioli,
      [1.8, 2.1, 2.5, 2.9, 3.3, 3.7], // regat · amb · un · porró · que · ronda.
    ],
    posX: 16,
    posY: 16,
  },

  // ── Final · centrat a pantalla ───────────────────────────────────────
  {
    linies: ['Del mar a la muntanya,', 'de la plaça a la taula,'],
    despres: 1.0,
    tempsParaules: [
      [0.0, 0.4, 0.6, 1.0, 1.4], // Del · mar · a · la · muntanya,
      [2.1, 2.5, 2.9, 3.3, 3.7, 4.1], // de · la · plaça · a · la · taula,
    ],
    posX: 50,
    posY: 34,
    centrat: true,
  },
  {
    linies: ['amb cava a les copes,', 'tots plegats clamem...'],
    despres: 1.0,
    tempsParaules: [
      [0.0, 0.4, 0.6, 1.0, 1.4], // amb · cava · a · les · copes,
      [1.8, 2.1, 2.5], // tots · plegats · clamem...
    ],
    posX: 50,
    posY: 52,
    centrat: true,
  },
  {
    linies: ['VISCA LA TERRA!'],
    despres: 1.0,
    tempsParaules: [
      [0.0, 0.5, 0.7], // VISCA · LA · TERRA!
    ],
    posX: 50,
    posY: 50,
    centrat: true,
    destacat: true,
    deriva: 'cap',
  },
]

/** Instant en què s'acaba d'escriure l'últim vers del guió: la paraula que
 *  entra més tard (t de la frase + offset de la paraula) més el seu fade-in. */
function fiEscriptura(): number {
  return Math.max(
    0,
    ...resolFrases().map(
      ({ t, linies }) => t + Math.max(0, ...linies.flat().map((p) => p.offset)) + FADE_IN
    )
  )
}

/**
 * Durada total del track, en segons — DERIVADA del guió, no fixada a mà: quan
 * s'acaba d'escriure l'últim vers + el sosteniment del clímax (SOSTE_CLIMAX) +
 * el seu fundit final (FADE_OUT_FINAL). Així el «VISCA LA TERRA!» sempre aguanta
 * visible i es fon net encara que els retocs dels versos anteriors desplacin el
 * clímax. (Abans era un 90 fix: en superar el guió els 90 s, el clímax es
 * programava per fondre's a t=88 i es desvania ABANS d'aparèixer.) L'àudio futur
 * podrà ancorar-se amb `tempsEntrada` absoluts sense trencar aquesta relació.
 */
export const DURADA_TOTAL = fiEscriptura() + SOSTE_CLIMAX + FADE_OUT_FINAL
