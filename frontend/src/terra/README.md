# terra/

Animació «La terra» de la capçalera: el poema (`docs/header/la_terra.md`) apareix paraula a paraula i, a sota, unes escenes il·lustrades el segueixen vers a vers. Tot penja d'un únic timeline GSAP en bucle.

## Contingut

| Fitxer                                         | Què és                                                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `terra-timeline.ts`                            | Guió del poema: frases, quan entra cada paraula i on es col·loca. Mòdul pur, s'edita a mà                      |
| `terra-animation.ts` / `.css`                  | Munta el text a la capçalera i carrega les escenes a part (`import()`)                                         |
| `emplacament.ts`                               | On va cada frase segons l'amplada, sense trepitjar el logo, el nom ni els controls. Mòdul pur                  |
| `composicio.ts`                                | Centre, escala i compressió de la capçalera segons l'amplada: el regle comú del text i les escenes             |
| `escenes/index.ts`                             | Munta les escenes, la càmera i la capa SVG                                                                     |
| `escenes/guio.ts`                              | Enllaç amb el guió (`quan('rosa')`: quan sona una paraula) i perfil de velocitat de la càmera. Mòdul pur       |
| `escenes/nucli.ts`                             | Utilitats compartides: SVG, paleta, `pilot()` (moviment procedural), `amaga()`, `pivot()`…                     |
| `escenes/dia.ts`                               | El dia del poema: on són el sol i la lluna i quanta claror hi ha a cada instant. Mòdul pur                     |
| `escenes/e1-paisatge.ts` … `e8-visca.ts`       | Una escena per estrofa                                                                                         |
| `escenes/trencadis.ts`                         | El mapa del principi s'esquerda per les comarques, pren color i esclata (part de l'escena 1)                   |
| `escenes/ambient.ts`, `figures.ts`, `poble.ts` | Compartit entre escenes: el cel (sol, lluna, estels i color de fons) i la serra llunyana; ninots; poble        |
| `escenes/mapa-dades.ts`                        | Contorn de Catalunya, províncies i peces de comarca. **Generat**: `npm --prefix backend run genera-mapa-terra` |

## Què cal saber

- **On va el text** (`emplacament.ts`): en pantalles amples cada frase s'ancora a l'escena (`x` en píxels des del seu centre, `y` des de dalt, al guió) i va al forat on hi ha menys dibuix mentre és visible, gairebé sempre al cel; només es corre si topa amb el logo, el nom o els controls, que la capçalera li passa mesurats (`reserves`). En pantalles estretes (menys de 700 px) no hi ha forats: totes les frases van a la franja de dalt, entre el logo i els controls, i la que se'n va es fon de pressa perquè no es trepitgi amb la que entra.
- **Clariana**: cada frase porta a sota una taca difosa del color del cel (`--terra-cel`, que pinten les escenes) que esborrona la il·lustració del voltant. Per això el fons de la capçalera ha de ser llis. La tinta del text (`OPACITAT_REPOS`) va al color, no a l'opacitat de l'element.
- **Si es retoca una escena o el ritme del guió**, pot ser que una frase quedi damunt d'un dibuix: cal revisar-ne la posició (`x`, `y`, `deriva`) mirant-ho en un navegador.
- **Les escenes no porten segons escrits a mà**: tot s'ancora a paraules del poema (`quan('rosa')`, `frase('camps')`). Si es retoca el ritme del guió, les escenes el segueixen; si es canvia una paraula que una escena fa servir, `escenes/__tests__/escenes.spec.ts` falla i diu quina.
- **Càmera**: un tràveling lateral; `clausCamera()` (a `guio.ts`) en fixa la velocitat a cada estrofa. Les posicions de pantalla escrites a mà es multipliquen per `e.k`, la compressió de la composició en pantalles estretes.
- **El dia** (`dia.ts`): el poema passa en una jornada. Comença de nit (lluna i estels), el sol surt, fa el cim durant el tram central i es pon a Montserrat; el sopar i el clam final són de nit, i el bucle empalma (la pausa és nit estelada). Amb el sol, `ambient.ts` aclareix el fons de **tota la capçalera** (de `FONS_NIT` a `FONS_DIA`, a `nucli.ts`): `FONS_DIA` no pot ser gaire clar, perquè el poema va en crema al 40 %. Per moure l'alba o la posta, n'hi ha prou de retocar `clausSol()`.
- **Pantalles estretes**: l'escena s'encongeix ancorada a baix, però el cel no: les alçades del sol, la lluna i els estels passen per `alCel()` perquè continuïn arribant al sostre.
- **Trencadís**: les peces i els seus colors surten de `docs/marca/comarques.svg` (via `mapa-dades.ts`). Si es retoca aquell mapa, cal tornar a generar les dades.
- **Timelines mandrosos**: els `fromTo` de les escenes no apliquen l'estat inicial fins que arriba el seu moment (aplicar-lo en muntar feia el muntatge quatre vegades més lent). Un `fromTo` que comença amb `autoAlpha: 0` amaga l'element sol; per a la resta, `amaga()`. L'origen de gir i escala es fixa amb `pivot()` en crear l'element.
- **Rendiment**: els moviments procedurals van a 30 fotogrames per segon (20 en pantalles estretes); la càmera, a cada fotograma. Les escenes es munten una a una, en estones lliures del navegador.
- **Revisar la sincronia** (només en desenvolupament): `?terra-dev` a l'adreça mostra play/pausa i una barra de temps; des de la consola, `__terra.timeline.pause().seek(40)`.
- **Moviment reduït**: amb `prefers-reduced-motion` no es munta res.
