-- Taules territorials de Catalunya
-- Font: ICGC divisions-administratives-v2r1 (2024-01-18)
-- Poblades pel seed: backend/src/scripts/seed-geodata.ts

CREATE TABLE IF NOT EXISTS provincies (
  id    SERIAL PRIMARY KEY,
  codi  CHAR(2) UNIQUE NOT NULL,
  nom   TEXT NOT NULL,
  geom  GEOMETRY(MULTIPOLYGON, 4326)
);

CREATE TABLE IF NOT EXISTS vegueries (
  id    SERIAL PRIMARY KEY,
  codi  CHAR(2) UNIQUE NOT NULL,
  nom   TEXT NOT NULL,
  geom  GEOMETRY(MULTIPOLYGON, 4326)
);

-- Nota: les comarques NO tenen una provincia única.
-- Cerdanya (Girona+Lleida), Berguedà (Barcelona+Lleida), Osona (Barcelona+Girona)
-- i Selva (Barcelona+Girona) reparteixen els seus municipis entre dues provincies.
-- La pertinença a provincia es defineix només a nivell de municipi.
CREATE TABLE IF NOT EXISTS comarques (
  id    SERIAL PRIMARY KEY,
  codi  CHAR(2) UNIQUE NOT NULL,
  nom   TEXT NOT NULL,
  cap   TEXT,
  geom  GEOMETRY(MULTIPOLYGON, 4326)
);

CREATE TABLE IF NOT EXISTS municipis (
  id             SERIAL PRIMARY KEY,
  codi           CHAR(6) UNIQUE NOT NULL,
  nom            TEXT NOT NULL,
  es_cap_comarca BOOLEAN DEFAULT false,
  area_m2        NUMERIC,
  comarca_codi   CHAR(2) REFERENCES comarques(codi),
  veguerla_codi  CHAR(2) REFERENCES vegueries(codi),
  provincia_codi CHAR(2) REFERENCES provincies(codi),
  geom           GEOMETRY(MULTIPOLYGON, 4326)
);

CREATE INDEX IF NOT EXISTS provincies_geom_idx ON provincies USING GIST (geom);
CREATE INDEX IF NOT EXISTS vegueries_geom_idx  ON vegueries  USING GIST (geom);
CREATE INDEX IF NOT EXISTS comarques_geom_idx  ON comarques  USING GIST (geom);
CREATE INDEX IF NOT EXISTS municipis_geom_idx  ON municipis  USING GIST (geom);
