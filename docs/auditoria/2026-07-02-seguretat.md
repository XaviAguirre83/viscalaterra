---
títol: Auditoria de seguretat
data: 2026-07-02
abast: auth nou (JWT + bcrypt + Google) · rutes de dades · Docker/Caddy · dependències
---

# Auditoria de seguretat — 2026-07-02

**Veredicte:** el mòdul d'auth està, en l'essencial, ben construït (SQL parametritzat,
hash bcrypt, verificació del token de Google amb `audience` + `email_verified`, secret
JWT obligatori sense valor per defecte, missatge de login genèric). **Cap hallazgo
CRÍTIC.** Els ALTS/MITJOS de hardening es van aplicar la mateixa nit, excepte els que
requereixen decisió (cookie HttpOnly, rol de BD).

## Hallazgos

### 🟠 ALT 1 — Rate limiting inservible darrere de Caddy — ✅ APLICAT

`backend/src/index.ts`: faltava `app.set('trust proxy', 1)`. Sense això, `req.ip`
era la IP del contenidor de Caddy — idèntica per a tothom — i el limitador d'auth
(20/min) es podia esgotar globalment: **un sol client podia deixar sense login tota
la plataforma**. Confirmat als logs de prod (`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`).
**Fix aplicat:** `app.set('trust proxy', 1)`.

### 🟠 ALT 2 — JWT a localStorage + 7 dies sense revocació — ⏳ PENDENT (decisió)

`frontend/src/stores/auth.ts` + `backend/src/routes/auth.ts`. El backend retorna el
JWT al cos JSON i el frontend el persisteix a localStorage: qualsevol XSS pot
exfiltrar-lo, i amb 7 dies de vida i sense llista de revocació no es pot invalidar.
L'auditoria del 2026-06-13 (M-02) recomanava cookie `HttpOnly + Secure + SameSite`.
**Recomanació:** migrar a cookie (amb CSRF) o reduir `JWT_EXPIRES_IN` + refresh
token. És un canvi de flux sencer — decidir-ho i provar-ho amb calma, incloent el
login amb Google. Mitigacions vigents: CSP estricta, HS256 fixat, expiració
configurable per entorn.

### 🟡 MITJÀ 1 — Enumeració d'usuaris per timing al login — ✅ APLICAT / registre ⏳

Al login, quan l'email no existia es responia sense executar `bcrypt.compare`
(~desenes de ms més ràpid): la latència revelava quins emails hi ha registrats.
**Fix aplicat:** comparació contra un hash esquer constant quan el compte no
existeix. Al **registre**, el 409 `email_duplicat` segueix revelant emails: la
resposta uniforme necessita el flux de verificació per email (roadmap beta).

### 🟡 MITJÀ 2 — Dependències vulnerables — ✅ APLICAT

`npm audit`: shell-quote 1.8.3 (CRÍTIC, al lockfile), undici (HIGH, via jsdom),
vite 8.0.14 (HIGH). Totes dev-only. **Fix aplicat:** audit fix + vite 8.0.16 als
tres lockfiles (arrel sincronitzat, frontend, backend) → 0 vulnerabilitats.

### 🟡 MITJÀ 3 — L'app es connecta a PostgreSQL com a superusuari — ⏳ PENDENT

`backend/src/db.ts` + composes: el mateix `DB_USER` és el rol d'arrencada de la
imatge PostGIS (superusuari) i el de l'app. Si mai entrés una SQLi en endpoints
futurs, l'impacte seria total. **Fix recomanat:** rol d'aplicació amb privilegis
mínims abans de producció real (tocarà `infra/db/init/` + `.env` — coordinar amb
la recreació del volum de dades).

### 🟡 MITJÀ 4 — CI sense npm audit — ✅ APLICAT

`.github/workflows/ci.yml`: pas `npm audit --audit-level=high` afegit al job quality.

### 🔵 BAIX — Diversos — ✅ APLICATS

- `jwt.verify` sense fixar algorisme → HS256 explícit a sign i verify.
- Sense límit superior de contrasenya → màx. 72 (límit real de bcrypt), codi
  `contrasenya_llarga` + claus i18n.
- Dockerfiles amb `npm install` → `npm ci` (builds reproduïbles).
- CSP: faltaven els orígens d'`accounts.google.com` (script/connect/frame) — el
  botó de Google quedava **bloquejat per la CSP a producció**.

### 🔵 BAIX — Procés (no codi) — recordatoris per al VPS

- `JWT_SECRET` de producció: generar amb `openssl rand -base64 48` (el de dev és
  un placeholder correcte en local, temptador de reutilitzar).
- `DB_PASSWORD` fort i únic a prod.

## Verificat sense problemes

- **SQL injection:** totes les consultes d'`auth/usuaris.ts` i `territoris.ts`
  amb placeholders; cap concatenació.
- **Path traversal a /api/geojson/:nivell:** nivell i resolució per whitelist;
  nom de fitxer compost amb plantilla fixa.
- **Google:** `verifyIdToken` amb `audience` i exigència d'`email_verified`;
  vinculació de comptes per email verificat correcta.
- **password_hash mai surt** en cap resposta; registre no pot escalar
  `nivell`/`reputacio` (defaults de BD).
- **Cap log de credencials**; error handler genèric.
- **Secrets fora de git**; `.dockerignore` a lloc; usuari no-root a les imatges.
