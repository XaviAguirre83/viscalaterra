# infra/db/

SQL d'inicialització de la base de dades (PostgreSQL + PostGIS).

## Contingut

| Fitxer                           | Què fa                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `init/01-extensions.sql`         | Activa PostGIS i postgis_topology                                                        |
| `init/02-territorial-schema.sql` | Taules `provincies`, `vegueries`, `comarques`, `municipis` (+ índexs GIST sobre `geom`)  |
| `init/03-territorial-data.sql`   | Dades de l'arbre territorial (codi, nom, jerarquia), ~1.000 línies. **Sense geometries** |
| `init/04-usuaris-schema.sql`     | Taula `usuaris` (login local amb bcrypt i Google OAuth)                                  |
| `init/05-llocs-schema.sql`       | Taula `llocs` (punts d'interès atemporals) i els seus índexs                             |
| `init/06-rol-aplicacio.sh`       | Rol de la web **sense superusuari** (`DB_APP_USER`): només llegeix i escriu dades        |
| `seed-llocs-demo.sql`            | Llocs de **demo** (font `seed-demo`). No s'executa sol; no és la ingesta real            |
| `README.md`                      | Aquest fitxer                                                                            |

## Com funciona `init/`

Postgres executa els `.sql` i els `.sh` de `/docker-entrypoint-initdb.d` en **ordre alfabètic** (per això van numerats) només quan **crea el volum de dades per primera vegada**. Si el volum ja existeix, no els torna a executar.

Conseqüències:

- Modificar un fitxer d'`init/` **no canvia una BD ja creada**. Cal aplicar el canvi a mà (`docker exec … psql`) o recrear el volum.
- Un volum nou (p. ex. en canviar de versió de Postgres) comença buit i es reinicialitza amb aquests fitxers.
- Des de la imatge `postgis/postgis:18-3.6` el volum (`db_pg18`) es munta a `/var/lib/postgresql`; amb l'antiga ruta `.../data` la imatge es nega a arrencar.
- L'ordre importa: `llocs` referencia `municipis`, que referencia `comarques`, `vegueries` i `provincies`.

## Rols: administrador i web

- **Administrador** (`DB_USER`, superusuari de la imatge): executa els scripts d'`init/` i el manteniment (migracions d'estructura, còpies de seguretat). La web no l'usa mai.
- **Web** (`DB_APP_USER`, creat per `06-rol-aplicacio.sh`): és amb el que es connecta el backend. Pot `SELECT/INSERT/UPDATE/DELETE` a les taules de `public` i fer servir les seqüències; **no** pot crear, alterar ni esborrar taules, fer `TRUNCATE`, crear rols ni executar programes (`COPY … PROGRAM`). Les taules que l'administrador creï més endavant hereten aquests permisos (`ALTER DEFAULT PRIVILEGES`). `spatial_ref_sys` és només de lectura.
- Els importadors i el seed també funcionen amb el rol de la web (només toquen dades).

## Geometries: on viuen

`03-territorial-data.sql` carrega només atributs; la columna `geom` queda a **NULL**. Els polígons per al mapa es serveixen des dels GeoJSON de disc (`/api/geojson`, carpeta `backend/data/geojson/`, fora de git).

Les geometries a la BD les posa `backend/src/scripts/seed-geodata.ts`: omple la `geom` de les files que ha creat el `03` (`ON CONFLICT (codi) DO UPDATE SET geom`), és idempotent i acaba amb error (i `ROLLBACK`) si alguna fila es queda sense geometria. Cal executar-lo **abans** de qualsevol ingesta de llocs:

- `seed-llocs-demo.sql` i els importadors de llocs (`importa-*.ts`) calculen o comproven `municipi_codi` amb `ST_Contains` contra `municipis.geom`: sense geometries, els llocs no troben el seu municipi.

## Notes

- `llocs` és atemporal: el filtre Quan? no s'hi aplica (és per a l'Agenda).
- `llocs` té `UNIQUE (font, font_id)` perquè reimportar una font sigui idempotent (upsert, sense duplicats).
- Esborrar la demo: `DELETE FROM llocs WHERE font = 'seed-demo';`
- Comarques i vegueries no tenen província única: la pertinència es defineix només a `municipis` (vegeu `CLAUDE.md`, § Comarques transfrontereres).
