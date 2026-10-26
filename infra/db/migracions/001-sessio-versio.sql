-- Versió de sessió per usuari. El token de sessió (cookie) en porta una còpia i,
-- a cada petició autenticada, el backend la compara amb la d'aquí: incrementar-la
-- tanca d'un cop totes les sessions obertes de l'usuari (p. ex. quan Google
-- demostra que l'email és seu i s'anul·la una contrasenya que ningú havia verificat).
ALTER TABLE usuaris ADD COLUMN sessio_versio INTEGER NOT NULL DEFAULT 0;
