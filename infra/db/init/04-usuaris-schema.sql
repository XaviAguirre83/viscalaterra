-- ================================================================
-- Esquema d'usuaris — autenticació real (JWT + bcrypt) i Google OAuth
-- S'executa automàticament en crear la BD (docker-entrypoint-initdb.d).
-- ================================================================

CREATE TABLE IF NOT EXISTS usuaris (
  id            SERIAL PRIMARY KEY,
  nom           TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,            -- desat sempre en minúscules
  password_hash TEXT,                            -- NULL si l'usuari només entra amb Google
  google_id     TEXT UNIQUE,                     -- 'sub' de Google; NULL si només compte local
  proveidor     TEXT NOT NULL DEFAULT 'local',   -- 'local' | 'google'
  -- Nivells d'usuari previstos (roadmap): invitat/estandard/collaborador/publicador.
  -- De moment només s'activa 'estandard'; l'esquema queda preparat per a la resta.
  nivell        TEXT NOT NULL DEFAULT 'estandard',
  reputacio     INTEGER NOT NULL DEFAULT 0,
  creat_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
