# .claude/

Configuració de Claude Code per a aquest projecte.

## Contingut

| Fitxer                | A git | Què és                                                                       |
| --------------------- | ----- | ---------------------------------------------------------------------------- |
| `settings.json`       | Sí    | Política compartida: permisos de només lectura, preguntes i prohibicions     |
| `settings.local.json` | No    | Permisos personals: ordres que Claude pot executar sense demanar confirmació |
| `hooks/`              | Sí    | Scripts que Claude Code executa sol en moments concrets (vegeu més avall)    |
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

## Hooks de `settings.json`

| Hook           | Script                   | Per a què serveix                                                                |
| -------------- | ------------------------ | -------------------------------------------------------------------------------- |
| `SessionStart` | `hooks/prepara-nuvol.sh` | Sessions al núvol (claude.ai/code, app mòbil): Node 24 al PATH i `npm ci` si cal |

- En local no fa res (surt si `CLAUDE_CODE_REMOTE` no és `true`): aquí les dependències s'instal·len dins dels contenidors, mai a l'amfitrió.
- Node 24 no el baixa el hook: l'instal·la a `/opt/node24` l'script de preparació de l'entorn del núvol (configurat a claude.ai, fora del repo), que queda a la memòria cau de l'entorn. El hook només el posa al PATH.
- `npm ci` només es repeteix si ha canviat el lockfile, algun `package.json` o el mateix script (empremta a `node_modules/.prepara-nuvol.sha256`).

## Notes

- Les regles àmplies (`npm run *`, `docker exec *`) es deixen al fitxer local a propòsit: són decisió de cada màquina, no política del repo.
- Convé podar `settings.local.json` de tant en tant: acumula regles d'un sol ús.
