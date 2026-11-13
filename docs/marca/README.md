# marca/

Fonts del logo de viscalaterra.cat: el mapa de Catalunya dividit en les quatre províncies, dibuixat amb poques línies rectes i amb una vora blanca d'adhesiu.

## Contingut

| Fitxer           | Què és                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `logo.svg`       | Font principal, per a 48 px o més                                                                |
| `logo-petit.svg` | La mateixa geometria amb la vora i les separacions més gruixudes, per a 16 i 32 px (la pestanya) |
| `comarques.svg`  | Germà del logo: el mapa per comarques, per a formats grans (no serveix com a icona)              |

Al logo, cada peça té nom (`lleida`, `tarragona`, `barcelona`, `girona`, `fronteres`, `adhesiu`, `filet`) per poder-la retocar a mà. Els gruixos de cada versió consten en un comentari dins del mateix SVG.

## D'on surt la forma

- Fronteres reals de les províncies (ICGC, `divisions-administratives-v2r1`, escala 1:1.000.000, CC BY 4.0), en projecció Mercator, la mateixa del mapa de la web.
- Simplificades amb Douglas-Peucker fins a deixar-ne poques línies rectes: tolerància 5 al contorn i 8 a les fronteres interiors, sobre una silueta de 100 d'alçada. Cada frontera se simplifica un sol cop per a les dues províncies que la comparteixen, i així encaixen sense escletxes.
- Sense illes ni enclavaments (Llívia, les Medes, l'illa de Buda).
- Colors: Lleida `#f2b818`, Tarragona `#2979c2`, Barcelona `#e34440`, Girona `#1f884f`; blanc `#fcfcfc`.

## Fitxers que se'n deriven

Si es retoca el logo, cal tornar-los a generar tots. Es rasteritzen amb Chromium (el de Playwright del frontend), amb el dibuix centrat dins de cada mida.

| Fitxer                                 | Mida                                 | Es genera a partir de                                                    |
| -------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| `frontend/src/assets/logo.png`         | 230×228 (es mostra a 76 px d'alçada) | `logo.svg`                                                               |
| `frontend/public/favicon.png`          | 512×512                              | `logo.svg`                                                               |
| `frontend/public/favicon.ico`          | 16, 32 i 48 px                       | `logo-petit.svg` (16 i 32) i `logo.svg` (48), cada mida dibuixada a part |
| `frontend/public/apple-touch-icon.png` | 180×180, fons blanc                  | `logo.svg`                                                               |
| `frontend/public/og-image.png`         | 1200×630                             | `logo.svg` a 330 px d'alçada, sobre la imatge amb el text                |

## Mapa de comarques (`comarques.svg`)

Mateix estil que el logo (vora d'adhesiu, filet, poques línies rectes), però dividit per comarques. Cada comarca porta el color de la seva província amb un nivell de saturació propi: de més intens i fosc a més apagat i clar, i repartit perquè dues comarques veïnes mai quedin amb tons propers. Totes les juntes són iguals (0,8). Les províncies es distingeixen pel color.

- Peces = comarca ∩ província, fetes a partir dels municipis (mateixa font a 1:1.000.000). Les comarques transfrontereres queden partides: la Cerdanya, meitat Lleida i meitat Girona; Osona, amb un tros de Girona (Viladrau i Espinelves).
- Els trossos de menys del 6 % de la comarca van amb la província dominant: Gósol (Berguedà), la part barcelonina de la Selva i Vidrà (Osona).
- Simplificació: tolerància 5 al contorn i 2,5 a les fronteres entre peces.
- Cada comarca és un `<g id="cCC-PP">` (codi de comarca i de província) amb `data-nom` i `data-nivell`.
- Es genera amb `docs/privat/eines/trencadis.py` (fora de git, necessita shapely): `trencadis.py comarques.svg bocí=0 lluentor=0 junta_comarca=0.8 junta_provincia=0.8`. Amb `bocí` > 0 trenca cada comarca en bocins de trencadís.
