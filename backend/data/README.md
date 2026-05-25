# backend/data/geojson

Aquesta carpeta **no està al repositori** (vegeu `.gitignore`).

## Origen de les dades

- **Font**: Institut Cartogràfic i Geològic de Catalunya (ICGC)
- **Conjunt**: Divisions administratives de Catalunya
- **Versió**: v2r1 · Data de referència: 2024-01-18
- **Llicència**: Creative Commons Attribution 4.0 (CC BY 4.0)
- **Descàrrega**: <https://www.icgc.cat/ca/Administracio-i-empresa/Descarregues/Capes-de-geoinformacio/Divisions-administratives>

## Estructura esperada

```
backend/data/geojson/
├── comunitat/      # 6 resolucions — contorn de Catalunya
├── provincies/     # 6 resolucions — 4 províncies
├── comarques/      # 6 resolucions — 43 comarques
├── vegueries/      # 6 resolucions — 8 vegueries
├── municipis/      # 6 resolucions — 947 municipis
├── data/           # propietats alfanumèriques + caps de municipi
└── plantilles/     # esquemes de propietats (referència)
```

Les 6 resolucions corresponen als denominadors d'escala:
`5000 · 50000 · 100000 · 250000 · 500000 · 1000000`

## Propietats rellevants (fitxer data-municipi)

| Propietat | Descripció                       |
| --------- | -------------------------------- |
| CODIMUNI  | Codi INE del municipi (6 dígits) |
| NOMMUNI   | Nom oficial del municipi         |
| CAPMUNI   | És capital de comarca?           |
| AREAM5000 | Àrea en m² (escala 1:5000)       |
| CODICOMAR | Codi de comarca (2 dígits)       |
| NOMCOMAR  | Nom de la comarca                |
| CODIVEGUE | Codi de vegueria                 |
| NOMVEGUE  | Nom de la vegueria               |
| CODIPROV  | Codi de província (2 dígits)     |
| NOMPROV   | Nom de la província              |

## Configuració local

Descomprimeix el conjunt de dades a `backend/data/geojson/` i executa el seed:

```bash
cd backend && npm run seed
```
