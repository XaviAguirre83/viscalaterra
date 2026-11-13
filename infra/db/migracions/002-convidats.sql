-- Llista blanca del registre per invitació: només els emails d'aquesta taula poden
-- crear un compte (local o amb Google) mentre el backend corre amb
-- REGISTRE=invitacio. Només decideix qui pot CREAR un compte: treure'n un email
-- no tanca el compte que ja s'hagi creat. S'hi apunta amb
-- backend/src/scripts/convida.ts.
CREATE TABLE convidats (
  -- Sempre en minúscules i sense espais, com usuaris.email: un email apuntat a mà
  -- amb una majúscula no coincidiria mai, i així falla en apuntar-lo.
  email    TEXT PRIMARY KEY CHECK (email = lower(btrim(email))),
  nota     TEXT,                                -- qui és (només per a l'administrador)
  creat_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
