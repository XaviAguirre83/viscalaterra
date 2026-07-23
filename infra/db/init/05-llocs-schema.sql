-- Llocs: punts d'interès georeferenciats (equipaments i serveis públics).
-- Són ATEMPORALS (el filtre Quan? no s'hi aplica; això és per a l'Agenda).
-- El subtema_codi correspon al catàleg del Què? (frontend/src/data/categories.ts).
--
-- municipi_codi es DESNORMALITZA en importar (via ST_Contains contra municipis.geom):
-- així l'agregació "quins municipis tenen resultats" és un GROUP BY trivial i mai
-- fem point-in-polygon en temps de cerca. Comarca/vegueria/província es deriven
-- per JOIN a municipis, sense duplicar dades.

CREATE TABLE IF NOT EXISTS llocs (
  id             SERIAL PRIMARY KEY,
  nom            TEXT NOT NULL,
  subtema_codi   TEXT NOT NULL,                    -- 'policia-nacional', 'cap'… (catàleg Què?)
  municipi_codi  CHAR(6) NOT NULL REFERENCES municipis(codi),
  geom           GEOMETRY(POINT, 4326) NOT NULL,   -- coordenades exactes
  adreca         TEXT,
  telefon        TEXT,
  web            TEXT,
  font           TEXT,                             -- procedència de la dada (CatSalut, ICGC, seed-demo…)
  font_id        TEXT,                             -- id extern per deduplicar en reimportar
  actualitzat_at TIMESTAMPTZ DEFAULT now(),
  -- Permet upsert idempotent en reimportar d'una font (evita duplicats).
  UNIQUE (font, font_id)
);

CREATE INDEX IF NOT EXISTS llocs_geom_idx     ON llocs USING GIST (geom);
CREATE INDEX IF NOT EXISTS llocs_subtema_idx  ON llocs (subtema_codi);
CREATE INDEX IF NOT EXISTS llocs_municipi_idx ON llocs (municipi_codi);
