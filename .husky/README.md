# .husky/

Git hooks del projecte: scripts que git executa automàticament en moments concrets (abans d'un commit, en escriure'n el missatge…). Husky els instal·la i els comparteix pel repo.

## Contingut

| Fitxer       | A git | Què és                                                            |
| ------------ | ----- | ----------------------------------------------------------------- |
| `pre-commit` | Sí    | Abans de cada commit: `lint-staged` (Prettier als fitxers staged) |
| `commit-msg` | Sí    | En escriure el missatge: `commitlint` (Conventional Commits)      |
| `_/`         | No    | Codi intern de Husky, generat. No es toca                         |
| `README.md`  | Sí    | Aquest fitxer                                                     |

## Els hooks propis

- **`pre-commit`** executa `npx lint-staged`. La configuració és a `package.json` (`lint-staged`): passa `prettier --write` als fitxers `.js`, `.ts`, `.vue`, `.json` i `.md` que van al commit.
- **`commit-msg`** executa `commitlint`. La configuració és a `commitlint.config.js` (`@commitlint/config-conventional`): si el missatge no comença per `feat:`, `fix:`, `chore:`… el commit es rebutja.

## La carpeta `_/` (generada)

Es regenera a cada `npm install` pel script `"prepare": "husky"` del `package.json`. El seu `.gitignore` (`*`) fa que git la ignori.

- Els fitxers amb nom de hook (`pre-commit`, `pre-push`, `post-merge`…) són idèntics: només deleguen a `h`. Husky en crea un per a cada hook possible de git.
- `h` és el despatxador: busca a `.husky/` un script amb el mateix nom que el hook en curs i l'executa; si no n'hi ha, no fa res. Per això només `pre-commit` i `commit-msg` fan alguna cosa.
- `husky.sh` és un residu de compatibilitat amb versions antigues.

## Com encaixa

Husky fa que `git config core.hooksPath` apunti a `.husky/_` en comptes de `.git/hooks`. Un commit executa `.husky/_/pre-commit`, que delega a `h`, que executa el `.husky/pre-commit` propi.

Qui clona el repo i fa `npm install` obté els hooks activats automàticament.

## Notes

- Per saltar-se els hooks en una emergència: `git commit --no-verify` o `HUSKY=0 git commit …`.
- El CI repeteix la comprovació de format (`format:check`), de manera que si algú se salta els hooks, el CI ho detecta.
