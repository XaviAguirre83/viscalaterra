# .claude/

Configuració de Claude Code per a aquest projecte.

## Contingut

| Fitxer                | A git | Què és                                                                       |
| --------------------- | ----- | ---------------------------------------------------------------------------- |
| `settings.json`       | Sí    | Política compartida: permisos de només lectura, preguntes i prohibicions     |
| `settings.local.json` | No    | Permisos personals: ordres que Claude pot executar sense demanar confirmació |
| `README.md`           | Sí    | Aquest fitxer                                                                |

`settings.local.json` l'ignora el `.gitignore` global de l'usuari (`~/.config/git/ignore`), així que cada màquina té el seu. S'omple sol quan es tria "Sí, i no tornis a preguntar" en un avís de permís.

Precedència: `deny` guanya sobre `ask`, i `ask` sobre `allow`, sigui quin sigui el fitxer on estigui la regla.

JSON no admet comentaris, per això es documenten les regles aquí.

## Regles de `settings.json` (compartides)

| Regla                                      | Tipus | Per a què serveix                                              |
| ------------------------------------------ | ----- | -------------------------------------------------------------- |
| `git status`, `git diff`, `git log`        | allow | Consultar l'estat del repo (només lectura)                     |
| `npm ls`, `npm audit`                      | allow | Veure versions i vulnerabilitats de dependències               |
| `git commit`, `git push`                   | ask   | Sempre demana permís abans de fer commit o push                |
| `Read(.env)`, `.env.local`, `.env.*.local` | deny  | Claude no pot llegir secrets (`JWT_SECRET`, credencials de BD) |
| `git push --force` / `-f`                  | deny  | Evitar reescriure l'historial remot                            |
| `rm -rf`                                   | deny  | Evitar esborrats massius                                       |

`.env.example` sí es pot llegir: no conté secrets.

## Regles de `settings.local.json` (personals)

| Regla                           | Per a què serveix                                     |
| ------------------------------- | ----------------------------------------------------- |
| `npm run *`                     | Scripts del projecte (lint, test, build…)             |
| `npx prettier *`                | Formatar codi                                         |
| `docker exec *`                 | Executar ordres dins dels contenidors (BD, backend)   |
| `python3 -m json.tool`          | Formatar JSON per llegir-lo millor                    |
| `curl … overpass-api.de …`      | Consultes a OpenStreetMap per a les ingestes de dades |
| `WebFetch(domain:datos.gob.es)` | Llegir el portal de dades obertes de l'Estat          |

## Notes

- Les regles àmplies (`npm run *`, `docker exec *`) es deixen al fitxer local a propòsit: són decisió de cada màquina, no política del repo.
- Convé podar `settings.local.json` de tant en tant: acumula regles d'un sol ús.
