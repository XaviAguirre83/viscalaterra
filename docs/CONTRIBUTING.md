# Com contribuir a viscalaterra.cat

Gràcies per l'interès en contribuir! Llegeix aquestes pautes abans de començar.

## Codi de conducta

- Respecte i col·laboració en tot moment
- El projecte no té cap intencionalitat política ni ideològica
- Totes les contribucions han de ser en català (codi, comentaris, documentació)

## Requisits previs

- Docker + Docker Compose
- Node.js 20+
- Git

## Posada en marxa

```bash
cp .env.example .env
docker compose up
```

## Flux de treball

1. Fes un fork del repositori
2. Crea una branca descriptiva: `git checkout -b feature/nom-de-la-funcionalitat`
3. Fes els teus canvis seguint les convencions del projecte
4. Assegura't que els tests passen: `npm test`
5. Obre una Pull Request descrivint els canvis

## Convencions

- **Llenguatge:** TypeScript estricte, sense `any`
- **Linting:** ESLint + Prettier (s'executa automàticament al pre-commit)
- **Tests:** Tot el codi nou ha d'anar acompanyat de tests
- **Commits:** Missatges en anglès, format [Conventional Commits](https://www.conventionalcommits.org/)

## Reportar bugs

Obre un issue a GitHub descrivint el problema, els passos per reproduir-lo i el comportament esperat.
