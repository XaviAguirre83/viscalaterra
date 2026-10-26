#!/bin/sh
# Rol d'aplicació amb privilegis mínims: el backend NO es connecta com a
# superusuari. Un superusuari de Postgres ho pot fer tot, fins i tot executar
# programes del sistema (COPY … FROM PROGRAM); si mai s'escolés una injecció SQL,
# amb aquest rol el dany es limitaria a les files que la web ja toca.
#
# Pot: llegir, afegir, canviar i esborrar files de les taules de l'esquema public,
# i fer servir les seqüències dels SERIAL. No pot: crear, alterar ni esborrar
# taules (DDL), crear rols ni executar programes. Les tasques d'estructura
# (migracions) i les còpies de seguretat es fan amb l'administrador (DB_USER).
#
# S'executa un sol cop, en néixer el volum, després de 01-05 (ordre alfabètic):
# les taules ja existeixen. Usuari i contrasenya: DB_APP_USER / DB_APP_PASSWORD.

if [ -z "${DB_APP_USER:-}" ] || [ -z "${DB_APP_PASSWORD:-}" ]; then
  echo "ERROR: falten DB_APP_USER o DB_APP_PASSWORD (vegeu .env.example)" >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_user="$DB_APP_USER" -v app_password="$DB_APP_PASSWORD" <<'SQL'
CREATE ROLE :"app_user" LOGIN PASSWORD :'app_password';
GRANT USAGE ON SCHEMA public TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";
-- Les taules i seqüències que l'administrador creï més endavant (migracions)
-- tindran els mateixos permisos sense haver-ho de recordar.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
-- La taula de sistemes de referència de PostGIS (ST_Transform) només es llegeix.
REVOKE INSERT, UPDATE, DELETE ON spatial_ref_sys FROM :"app_user";
SQL
