# infra/desplegament/

Botó de desplegament a staging: des de GitHub (també des del mòbil), **Actions → «Desplega a staging» → Run workflow** posa el servidor al dia amb `main`. Fa el mateix que la recepta manual: `git pull`, migracions i reconstruir els contenidors.

## Com funciona

```
GitHub Actions ── ssh, amb una clau que només serveix per a això ──▶ usuari «desplega»
  desplega-ssh       ordre forçada: només accepta «desplega» o «estat»
    └─ sudo ─▶ desplega-staging (root)
         git pull (com a ubuntu) → migracions → up --build --wait → neteja
```

| Fitxer                                         | S'instal·la a                             | Què fa                                                                    |
| ---------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| `desplega-staging`                             | `/usr/local/sbin/desplega-staging`        | El desplegament (`desplega`) o una consulta de només lectura (`estat`)    |
| `desplega-ssh`                                 | `/usr/local/sbin/desplega-ssh`            | Ordre forçada de l'usuari `desplega`: filtra l'ordre i crida el de dalt   |
| `sudoers-desplega`                             | `/etc/sudoers.d/desplega-staging`         | `desplega` pot executar com a root aquell script, amb aquells 2 arguments |
| `sshd-desplega.conf`                           | `/etc/ssh/sshd_config.d/20-desplega.conf` | Deixa entrar `desplega` només amb clau, sense terminal ni reenviaments    |
| `../../.github/workflows/desplega-staging.yml` | —                                         | El botó: entra per SSH i demana `desplega` o `estat`                      |

## Per què és així (seguretat)

- **Un usuari a part**, `desplega`, sense contrasenya ni sudo general. `ubuntu` no es toca.
- **Doble pany a l'ordre**: `ForceCommand` a sshd i `command=` a la mateixa clau. Demani el que demani el client, només corre `desplega-ssh`.
- **Còpies de root, no el repo**: els scripts s'executen des de `/usr/local/sbin`, mai des de la carpeta del repo, que és d'ubuntu i canvia amb cada `git pull`. Si no, un canvi a `main` podria reescriure el que corre com a root.
- **La clau privada és a l'entorn `staging` de GitHub**, que només la dona a execucions des de `main`: una branca amb el workflow modificat no la pot treure.
- **El registre de GitHub Actions és públic** (el repo ho és): el servidor només hi escriu un resum (commit d'abans i d'ara, migracions, estat dels contenidors) i, si falla, les 30 últimes línies. El detall complet va a `/var/log/desplega-staging/` (es guarden els 20 últims). Per això el script no pot fer mai `docker compose config`, que imprimeix el `.env`.
- **Si la clau es filtrés**, l'únic que es podria fer és posar staging al dia amb `main`, que només canvia per PR amb el CI en verd.

## Instal·lació (un sol cop, al servidor)

```bash
cd ~/viscalaterra && git pull --ff-only

# Usuari sense contrasenya. Necessita un shell perquè sshd hi executi l'ordre forçada.
sudo adduser --system --group --home /home/desplega --shell /bin/sh desplega

# Scripts i regles: còpies de root (no enllaços al repo).
sudo install -o root -g root -m 755 infra/desplegament/desplega-staging infra/desplegament/desplega-ssh /usr/local/sbin/
sudo visudo -cf infra/desplegament/sudoers-desplega
sudo install -o root -g root -m 440 infra/desplegament/sudoers-desplega /etc/sudoers.d/desplega-staging
sudo install -o root -g root -m 644 infra/desplegament/sshd-desplega.conf /etc/ssh/sshd_config.d/20-desplega.conf
sudo install -d -o root -g root -m 755 /etc/ssh/desplega
sudo sshd -t && sudo systemctl reload ssh
```

**Clau**: un parell ED25519 sense frase, creat només per a això. La pública va a `/etc/ssh/desplega/authorized_keys` (root, `644`), amb el pany a la mateixa línia:

```
restrict,command="/usr/local/sbin/desplega-ssh" ssh-ed25519 AAAA… desplega-staging
```

**GitHub**, a Settings → Environments → `staging`:

- _Deployment branches_: només `main`.
- Secret `DESPLEGA_CLAU_SSH`: la clau privada. Després, s'esborra de l'ordinador on s'ha creat.
- Variable `DESPLEGA_KNOWN_HOSTS`: la línia de `known_hosts` del servidor (`staging.viscalaterra.cat ssh-ed25519 …`), amb l'empremta comprovada.

## Ús

- **Botó**: Actions → «Desplega a staging» → Run workflow → `desplega` o `estat`.
- **A mà, des del servidor** (com a `ubuntu`): `sudo desplega-staging estat` o `sudo desplega-staging desplega`. Fa exactament el mateix, amb el mateix registre.

## Manteniment

- **Canviar els scripts**: un canvi en aquesta carpeta **no arriba sol** al servidor. Després del `git pull`, s'han de tornar a fer els `install` d'aquell fitxer. És a propòsit: el que corre com a root no canvia sense que algú ho decideixi.
- **Tancar el botó de seguida** (clau perduda o filtrada): `sudo truncate -s 0 /etc/ssh/desplega/authorized_keys`. Per tornar-lo a obrir, una clau nova: la pública al servidor i la privada al secret de GitHub.
- Si el desplegament diu que el repo del servidor té canvis locals o no és a `main`, no toca res: s'ha d'arreglar a mà al servidor.
