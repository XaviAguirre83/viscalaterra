# terra/

Animació «La terra» de la capçalera: el poema (`docs/header/la_terra.md`) apareix paraula a paraula i, a sota, unes escenes il·lustrades el segueixen vers a vers. Tot penja d'un únic timeline GSAP en bucle.

## Contingut

| Fitxer                                         | Què és                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `terra-timeline.ts`                            | Guió del poema: frases, quan entra cada paraula i on es col·loca. Mòdul pur, s'edita a mà                |
| `terra-animation.ts` / `.css`                  | Munta el text a la capçalera i carrega les escenes a part (`import()`)                                   |
| `escenes/index.ts`                             | Munta les escenes, la càmera i la capa SVG                                                               |
| `escenes/guio.ts`                              | Enllaç amb el guió (`quan('rosa')`: quan sona una paraula) i perfil de velocitat de la càmera. Mòdul pur |
| `escenes/nucli.ts`                             | Utilitats compartides: SVG, paleta, `pilot()` (moviment procedural), `amaga()`, `pivot()`…               |
| `escenes/e1-paisatge.ts` … `e8-visca.ts`       | Una escena per estrofa                                                                                   |
| `escenes/ambient.ts`, `figures.ts`, `poble.ts` | Compartit entre escenes: sol, lluna i serra llunyana; ninots articulats; el poble de les festes          |
| `escenes/mapa-dades.ts`                        | Contorn de Catalunya i províncies. **Generat**: `npm --prefix backend run genera-mapa-terra`             |

## Què cal saber

- **Les escenes no porten segons escrits a mà**: tot s'ancora a paraules del poema (`quan('rosa')`, `frase('camps')`). Si es retoca el ritme del guió, les escenes el segueixen; si es canvia una paraula que una escena fa servir, `escenes/__tests__/escenes.spec.ts` falla i diu quina.
- **Càmera**: un tràveling lateral; `clausCamera()` (a `guio.ts`) en fixa la velocitat a cada estrofa. Les posicions de pantalla escrites a mà es multipliquen per `e.k`, la compressió de la composició en pantalles estretes.
- **Timelines mandrosos**: els `fromTo` de les escenes no apliquen l'estat inicial fins que arriba el seu moment (aplicar-lo en muntar feia el muntatge quatre vegades més lent). Un `fromTo` que comença amb `autoAlpha: 0` amaga l'element sol; per a la resta, `amaga()`. L'origen de gir i escala es fixa amb `pivot()` en crear l'element.
- **Rendiment**: els moviments procedurals van a 30 fotogrames per segon (20 en pantalles estretes); la càmera, a cada fotograma. Les escenes es munten una a una, en estones lliures del navegador.
- **Revisar la sincronia** (només en desenvolupament): `?terra-dev` a l'adreça mostra play/pausa i una barra de temps; des de la consola, `__terra.timeline.pause().seek(40)`.
- **Moviment reduït**: amb `prefers-reduced-motion` no es munta res.
