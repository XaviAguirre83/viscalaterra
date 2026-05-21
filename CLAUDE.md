# viscalaterra.cat — Contexto para Claude Code

## Qué es este proyecto
Plataforma de descubrimiento de Catalunya. El mapa es el filtro principal: el usuario selecciona territorio y luego busca contenido dentro de esa selección geográfica.

Spec de producto detallada: `viscalaterra_plan.md`

## Concepto de las tres pestañas
- **On?** — selector geográfico (Província → Comarca → Municipi)
- **Què?** — categorías de espacio público y equipamientos colectivos (datos abiertos)
- **Quan?** — temporalidad: Permanent / Recurrent / Puntual

## Stack técnico
| Capa | Tecnología |
|------|-----------|
| Frontend | Vue 3 + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL + PostGIS |
| Mapa | Leaflet.js |
| Tiempo real | Socket.io (Trivial multijugador) |
| Auth | JWT + bcrypt |
| i18n | i18next |
| Contenedores | Docker + Docker Compose |
| Testing | Vitest (unit) + Playwright/Cucumber.js (E2E/BDD) |
| Linting | ESLint + Prettier |
| Pre-commit | Husky + lint-staged |
| CI/CD | GitHub Actions (plataforma Git pendiente de decidir) |

- GeoJSON: Institut Cartogràfic de Catalunya
- Desarrollo en local (Ubuntu 24.04), migración a servidor cuando haya versión presentable
- Proyecto OpenSource — Docker garantiza onboarding de colaboradores con un solo comando

## Repositorio y licencia
- GitHub, repo público, licencia **AGPL-3.0**
- OpenSource — se busca comunidad de colaboradores
- Secrets gestionados con `.env` (nunca en el repo) + `.env.example` como plantilla

## Arquitectura
- Un solo dominio `viscalaterra.cat`, código modular internamente
- Secciones: **Cerca** (mapa + filtres) | **Agenda** (vista de Cerca) | **Jocs** (juegos geográficos) | **Merchandising** | **Espai d'usuari**
- Sistema de usuarios compartido entre secciones
- Responsive mobile-first (laptop / tablet / smartphone)

## Decisiones tomadas
- La unidad mínima de selección es siempre el **municipi**
- Los niveles superiores (Comarca, Vegueria, Província) son atajos para seleccionar conjuntos de municipis
- Las Veguerías NO aparecen en el desplegable On? pero sí en el mapa
- Sincronización bidireccional: mapa ↔ desplegable On?
- Cuatro niveles de líneas delimitantes según opacidad/grosor (ver tabla en `viscalaterra_plan.md`)
- Inspiración visual: meteo.cat (Catalunya destacada, resto de España en tenue)

## Pendiente de decidir
- Público objetivo
- Stack backend y base de datos
- Interfaz del Quan? (calendario, selector de días, rango de fechas…)
- Criterio de ordenación cuando una división pertenece a múltiples unidades superiores
