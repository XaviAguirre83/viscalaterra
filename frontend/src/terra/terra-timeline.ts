/**
 * Guió temporal de l'animació tipogràfica "La terra" (capçalera).
 *
 * Fitxer de configuració pensat per editar-se a mà: cada entrada és un grup
 * de mitges frases (la segona línia apareix RETARD_SEGONA_LINIA segons més
 * tard, amb sagnat) amb el seu segon d'entrada dins el timeline de
 * DURADA_TOTAL segons i la seva posició en % del contenidor.
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
  /** Mitges frases del grup; la segona entra amb retard i sagnat. */
  linies: string[]
  /** Segon d'entrada dins el timeline (0–DURADA_TOTAL). */
  tempsEntrada: number
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

/** Durada total del track, en segons. L'àudio futur s'hi ancorarà. */
export const DURADA_TOTAL = 85

/** Pausa en negre entre el final del track i el reinici del bucle, en segons. */
export const PAUSA_BUCLE = 5

/** Fade-in de cada línia, en segons. */
export const FADE_IN = 0.8

/** Fade-out de cada grup, en segons (comença quan entra el grup següent). */
export const FADE_OUT = 1.2

/** Fade-out del clímax final, en segons (acaba just a DURADA_TOTAL). */
export const FADE_OUT_FINAL = 2

/** Retard de la segona línia respecte de la primera, en segons. */
export const RETARD_SEGONA_LINIA = 0.6

/** Opacitat de repòs d'una frase visible (el destacat va al 100%).
 *  Baixa a consciència: les frases són textura de fons i no han de competir
 *  amb el logo, el nom ni els controls de la capçalera. */
export const OPACITAT_REPOS = 0.5

/** Recorregut de la deriva mentre la frase és visible, en píxels. */
export const DERIVA_PX = 12

export const FRASES: FraseTerra[] = [
  // ── Estrofa 1 · El paisatge ──────────────────────────────────────────
  {
    linies: ['Visc a la terra,', 'bella terra mediterrània'],
    tempsEntrada: 0.5,
    posX: 12,
    posY: 18,
  },
  {
    linies: ['admirada pels Pirineus', 'que tossen tramuntana,'],
    tempsEntrada: 2.9,
    posX: 55,
    posY: 40,
  },
  // La tramuntana baixa: deriva cap avall.
  {
    linies: ['i baixa enrabiada,', 'alçant la veu,'],
    tempsEntrada: 5.6,
    posX: 22,
    posY: 36,
    deriva: 'avall',
  },
  {
    linies: ['esverant un mar', "on l'onada esculpeix la roca a cop de sal."],
    tempsEntrada: 7.5,
    posX: 34,
    posY: 14,
  },

  // ── Estrofa 2 · Història i llegenda ──────────────────────────────────
  { linies: ['Terra de camps', 'que respiren història,'], tempsEntrada: 12.4, posX: 14, posY: 38 },
  { linies: ['de cavallers,', 'dracs i princeses,'], tempsEntrada: 14.6, posX: 58, posY: 16 },
  { linies: ['del Sant Jordi', 'del llibre i la rosa,'], tempsEntrada: 16.5, posX: 30, posY: 44 },
  {
    linies: ['de llegendes', 'que el vent encara escampa'],
    tempsEntrada: 18.6,
    posX: 48,
    posY: 26,
  },
  {
    linies: ["de l'Empordà al Montsià,", 'del Segrià al Maresme.'],
    tempsEntrada: 20.9,
    posX: 13,
    posY: 14,
  },

  // ── Estrofa 3 · Castellers ───────────────────────────────────────────
  { linies: ['Ferma terra', 'de castells i castellers'], tempsEntrada: 25.2, posX: 52, posY: 42 },
  {
    linies: ['que en germanor aixequen torres', 'comandades pel so de la gralla,'],
    tempsEntrada: 27.3,
    posX: 15,
    posY: 24,
  },
  { linies: ["alçant l'enxaneta", 'fins a tocar el cel.'], tempsEntrada: 31.1, posX: 44, posY: 44 },

  // ── Estrofa 4 · Cultura popular de foc ───────────────────────────────
  {
    linies: ['Terra de gegants i capgrossos,', 'de bastoners que piquen fort,'],
    tempsEntrada: 34.8,
    posX: 11,
    posY: 16,
  },
  {
    linies: ['de trabucaires', 'que ens fan saltar del llit'],
    tempsEntrada: 38.3,
    posX: 54,
    posY: 38,
  },
  { linies: ['i diables', 'que fan tronar la nit.'], tempsEntrada: 40.8, posX: 26, posY: 46 },

  // ── Estrofa 5 · La sardana ───────────────────────────────────────────
  { linies: ['Festiva.'], tempsEntrada: 44.2, posX: 46, posY: 24 },
  {
    linies: ['On flabiol, tible i tenora', 'fan rodar la sardana,'],
    tempsEntrada: 45.6,
    posX: 14,
    posY: 42,
  },
  {
    linies: ['formant un cercle tancat', 'que és obert a tothom.'],
    tempsEntrada: 48.5,
    posX: 50,
    posY: 14,
  },

  // ── Estrofa 6 · Montserrat ───────────────────────────────────────────
  {
    linies: ["Terra de la Rosa d'abril,", 'la Morena de la serra'],
    tempsEntrada: 52.7,
    posX: 12,
    posY: 32,
  },
  { linies: ['que vetlla el país', "des de l'abadia,"], tempsEntrada: 55.5, posX: 56, posY: 44 },
  { linies: ['on escolanets', 'posen veu al silenci.'], tempsEntrada: 57.6, posX: 32, posY: 12 },

  // ── Estrofa 7 · La taula ─────────────────────────────────────────────
  { linies: ['Visc a la terra', 'que ens asseu a taula,'], tempsEntrada: 61.1, posX: 14, posY: 30 },
  {
    linies: ['amb calçots i mans brutes,', 'botifarra amb mongetes,'],
    tempsEntrada: 63.4,
    posX: 48,
    posY: 42,
  },
  {
    linies: ['fuet, pa amb tomàquet i allioli,', 'regat amb un porró que ronda.'],
    tempsEntrada: 66.3,
    posX: 16,
    posY: 16,
  },

  // ── Final · centrat a pantalla ───────────────────────────────────────
  {
    linies: ['Del mar a la muntanya,', 'de la plaça a la taula,'],
    tempsEntrada: 71.5,
    posX: 50,
    posY: 34,
    centrat: true,
  },
  {
    linies: ['amb cava a les copes,', 'tots plegats clamem:'],
    tempsEntrada: 76,
    posX: 50,
    posY: 52,
    centrat: true,
  },
  {
    linies: ['VISCA LA TERRA!'],
    tempsEntrada: 80,
    posX: 50,
    posY: 50,
    centrat: true,
    destacat: true,
    deriva: 'cap',
  },
]
