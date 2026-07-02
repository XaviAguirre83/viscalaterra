# viscalaterra.cat

Plataforma de descoberta de Catalunya. El mapa actua com a filtre geogràfic: l'usuari selecciona primer el territori d'interès i després cerca contingut dins d'aquella selecció.

## Característiques principals

- **Llocs** — Filtra per territori (On?) i categoria (Què?) sobre el mapa de Catalunya
- **Agenda** — Esdeveniments arreu de Catalunya, amb filtre temporal (Quan?)
- **Jocs** — Jocs geogràfics sobre Catalunya. El primer, **GeoFreak**: identificació
  territorial (províncies, vegueries, comarques i municipis) amb 9 nivells de
  dificultat, dues modalitats, pista, i mode individual o **multijugador local**.
- **Compte d'usuari** — Registre i login (locals o amb Google)
- **Contingut col·laboratiu** — Els usuaris contribuiran i verificaran el contingut _(previst)_

## Stack tecnològic

| Capa          | Tecnologia                            |
| ------------- | ------------------------------------- |
| Frontend      | Vue 3 + Vite + TypeScript             |
| Backend       | Node.js + Express + TypeScript        |
| Base de dades | PostgreSQL + PostGIS                  |
| Mapa          | Leaflet.js                            |
| i18n          | Vue I18n (català · castellà · anglès) |
| Testing       | Vitest (unit) + Playwright (E2E)      |
| Temps real    | Socket.io _(previst)_                 |
| Contenidors   | Docker + Docker Compose               |

## Posada en marxa (desenvolupament local)

```bash
# 1. Clona el repositori
git clone https://github.com/<usuari>/viscalaterra.git
cd viscalaterra

# 2. Configura les variables d'entorn
cp .env.example .env
# Edita .env amb els teus valors

# 3. Baixa les geodades (ICC, divisions administratives v2r1)
# Consulta backend/data/README.md per a les instruccions de descàrrega
# Col·loca els fitxers a backend/data/geojson/

# 4. Aixeca l'entorn
docker compose up

# 5. Importa les geodades a la base de dades (només el primer cop)
docker compose exec backend npm run seed
```

## Contribuir

Les contribucions són benvingudes. Consulta [CONTRIBUTING.md](CONTRIBUTING.md) per a les instruccions.

## Llicència

[AGPL-3.0](LICENSE) — Xavi Aguirre Torres, 2026
