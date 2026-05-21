# viscalaterra.cat

Plataforma de descoberta de Catalunya. El mapa actua com a filtre geogràfic: l'usuari selecciona primer el territori d'interès i després cerca contingut dins d'aquella selecció.

## Característiques principals

- **Cerca** — Filtra per territori (On?), categoria (Què?) i temporalitat (Quan?)
- **Agenda** — Esdeveniments culturals de tot tipus arreu de Catalunya
- **Jocs** — Jocs geogràfics i trivial de Catalunya
- **Contingut col·laboratiu** — Els usuaris contribueixen i verifiquen el contingut

## Stack tecnològic

| Capa | Tecnologia |
|------|-----------|
| Frontend | Vue 3 + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Base de dades | PostgreSQL + PostGIS |
| Mapa | Leaflet.js |
| Temps real | Socket.io |
| Contenidors | Docker + Docker Compose |

## Posada en marxa (desenvolupament local)

```bash
# 1. Clona el repositori
git clone https://github.com/<usuari>/viscalaterra.git
cd viscalaterra

# 2. Configura les variables d'entorn
cp .env.example .env
# Edita .env amb els teus valors

# 3. Aixeca l'entorn
docker compose up
```

## Contribuir

Les contribucions són benvingudes. Consulta [CONTRIBUTING.md](docs/CONTRIBUTING.md) per a les instruccions i el codi de conducta.

## Llicència

[AGPL-3.0](LICENSE) — Xavier Tecnic, 2026
