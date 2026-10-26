#!/bin/sh
# Aplica les migracions pendents (NNN-descripcio.sql d'aquesta carpeta), en ordre
# i un sol cop cadascuna, com a administrador de la BD: canviar l'estructura
# demana permisos que el rol de la web, a propòsit, no té.
#
# Cada migració s'aplica en una sola transacció juntament amb el seu registre a
# control.migracions: si falla, es desfà sencera i el procés s'atura (les
# següents no s'apliquen). Per això els fitxers NO han de portar BEGIN/COMMIT, i
# no s'hi pot fer res que no admeti transaccions (p. ex. CREATE INDEX CONCURRENTLY).
#
# Ús (des de l'arrel del projecte):
#   docker compose exec db sh /migracions/migra.sh                              (dev)
#   docker compose -f docker-compose.prod.yml exec db sh /migracions/migra.sh   (servidor)
# Una BD nova les aplica totes en néixer (infra/db/init/07-migracions.sh).
set -eu

DIR=$(dirname "$0")
PSQL="psql -X -q -v ON_ERROR_STOP=1 --username $POSTGRES_USER --dbname $POSTGRES_DB"

# Taula de control en un esquema propi: el rol de la web no hi té accés (els seus
# permisos per defecte són només per a l'esquema public).
$PSQL <<'SQL'
SET client_min_messages = warning;
CREATE SCHEMA IF NOT EXISTS control;
CREATE TABLE IF NOT EXISTS control.migracions (
  versio      TEXT PRIMARY KEY,
  aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL

aplicades=0
for fitxer in "$DIR"/[0-9][0-9][0-9]-*.sql; do
  [ -e "$fitxer" ] || continue # encara no hi ha cap migració
  versio=$(basename "$fitxer" .sql)
  # El nom va dins de l'SQL: només lletres minúscules, xifres i guions.
  case "$versio" in
  *[!a-z0-9-]*)
    echo "ERROR: nom de migració no vàlid: $versio" >&2
    exit 1
    ;;
  esac
  if [ -n "$($PSQL -tA -c "SELECT 1 FROM control.migracions WHERE versio = '$versio'")" ]; then
    continue
  fi
  echo "→ aplicant $versio"
  $PSQL --single-transaction -f "$fitxer" \
    -c "INSERT INTO control.migracions (versio) VALUES ('$versio')"
  aplicades=$((aplicades + 1))
done

echo "Migracions: $aplicades aplicades ara; $($PSQL -tA -c 'SELECT count(*) FROM control.migracions') en total."
