-- Dades de DEMO per a la cerca de Llocs (Fase 1) — NO és la ingesta real.
-- Institucions i municipis reals; les COORDENADES són aproximades (centre urbà),
-- prou per validar tot el flux i veure la presentació. Es reemplaçaran per la
-- ingesta real (Fase 5, fonts obertes: CatSalut, ICGC…). Per esborrar-les:
--   DELETE FROM llocs WHERE font = 'seed-demo';
--
-- municipi_codi es deriva per ST_Contains contra municipis.geom: si un punt cau
-- fora de tot municipi (coordenada dolenta) NO s'insereix — així el seed també
-- valida l'estratègia de desnormalització.

DELETE FROM llocs WHERE font = 'seed-demo';

INSERT INTO llocs (nom, subtema_codi, municipi_codi, geom, adreca, telefon, web, font, font_id)
SELECT v.nom, v.subtema, m.codi,
       ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326),
       v.adreca, v.telefon, v.web, 'seed-demo', v.font_id
FROM (VALUES
  -- ── Comissaries de la Policia Nacional (província de Barcelona) ──
  ('Comissaria de la Policia Nacional — Barcelona (Via Laietana)', 'policia-nacional', 2.1797::float8, 41.3862::float8, 'Via Laietana, 43'::text, NULL::text, NULL::text, 'pn-01'::text),
  ('Comissaria de la Policia Nacional — L''Hospitalet de Llobregat', 'policia-nacional', 2.0997, 41.3597, NULL, NULL, NULL, 'pn-02'),
  ('Comissaria de la Policia Nacional — Badalona', 'policia-nacional', 2.2440, 41.4530, NULL, NULL, NULL, 'pn-03'),
  ('Comissaria de la Policia Nacional — Santa Coloma de Gramenet', 'policia-nacional', 2.2080, 41.4520, NULL, NULL, NULL, 'pn-04'),
  ('Comissaria de la Policia Nacional — Sabadell', 'policia-nacional', 2.1075, 41.5450, NULL, NULL, NULL, 'pn-05'),
  ('Comissaria de la Policia Nacional — Terrassa', 'policia-nacional', 2.0089, 41.5638, NULL, NULL, NULL, 'pn-06'),
  ('Comissaria de la Policia Nacional — Mataró', 'policia-nacional', 2.4445, 41.5405, NULL, NULL, NULL, 'pn-07'),
  ('Comissaria de la Policia Nacional — Granollers', 'policia-nacional', 2.2870, 41.6076, NULL, NULL, NULL, 'pn-08'),
  ('Comissaria de la Policia Nacional — Manresa', 'policia-nacional', 1.8265, 41.7286, NULL, NULL, NULL, 'pn-09'),

  -- ── CAP — Centres d'Atenció Primària (arreu de Catalunya) ──
  ('CAP Raval Nord — Barcelona', 'cap', 2.1685, 41.3808, NULL, NULL, NULL, 'cap-01'),
  ('CAP Sabadell Centre', 'cap', 2.1090, 41.5460, NULL, NULL, NULL, 'cap-02'),
  ('CAP Mataró Centre', 'cap', 2.4450, 41.5390, NULL, NULL, NULL, 'cap-03'),
  ('CAP Girona — Santa Clara', 'cap', 2.8200, 41.9830, NULL, NULL, NULL, 'cap-04'),
  ('CAP Lleida — Cappont', 'cap', 0.6250, 41.6160, NULL, NULL, NULL, 'cap-05'),
  ('CAP Tarragona — Jaume I', 'cap', 1.2500, 41.1200, NULL, NULL, NULL, 'cap-06'),

  -- ── Ajuntaments ──
  ('Ajuntament de Barcelona', 'ajuntament', 2.1774, 41.3825, 'Plaça de Sant Jaume, 1', NULL, NULL, 'aj-01'),
  ('Ajuntament de Badalona', 'ajuntament', 2.2470, 41.4503, 'Plaça de la Vila, 1', NULL, NULL, 'aj-02'),
  ('Ajuntament de Terrassa', 'ajuntament', 2.0110, 41.5640, 'Raval de Montserrat, 14', NULL, NULL, 'aj-03'),
  ('Ajuntament de Girona', 'ajuntament', 2.8258, 41.9793, 'Plaça del Vi, 1', NULL, NULL, 'aj-04'),
  ('Ajuntament de Lleida (La Paeria)', 'ajuntament', 0.6270, 41.6148, 'Plaça de la Paeria, 1', NULL, NULL, 'aj-05'),
  ('Ajuntament de Tarragona', 'ajuntament', 1.2549, 41.1176, 'Plaça de la Font, 1', NULL, NULL, 'aj-06')
) AS v(nom, subtema, lng, lat, adreca, telefon, web, font_id)
JOIN municipis m ON ST_Contains(m.geom, ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326));
