# Full de ruta — viscalaterra.cat

> Document **viu**. Es va definint poc a poc, a mesura que prenem decisions. A diferència de
> `viscalaterra_plan.md` (visió de producte) i `CLAUDE.md` (referència tècnica del codi), aquí
> s'ordenen els **propers passos de desenvolupament** i es deixa constància de les decisions preses.

Última actualització: 2026-06-17

---

## 1. On som ara (estat actual)

El que ja està consolidat i funcionant:

- **Mapa de 4 nivells** (província / vegueria / comarca / municipi) amb selector de nivell actiu.
- **Selector territorial On?** amb sincronització mapa ↔ panell, comarques i vegueries
  transfrontereres resoltes de punta a punta.
- **Cercador ràpid** client-side sobre les dades ja carregades.
- **Backend endurit**: Helmet, CORS per llista blanca, rate limiting, compressió gzip,
  caché en memòria dels GeoJSON, gestor d'errors central.
- **i18n** català / castellà / anglès (Vue I18n), selector d'idioma amb banderes.
- **Accessibilitat i SEO** bàsics aplicats (auditoria 2026-06-03).
- **Catàleg de categories Què?** (provisional, encara **sense dades reals** al darrere).
- **Pestanya Quan?** (estructura present).
- **Espai d'usuari**: `ModalAuth` + store `auth` — de moment **mock**, sense JWT real.

### El gran buit identificat

El **cor del producte —la cerca real— encara no existeix**. Avui On?/Què?/Quan? són filtres
visuals, però no hi ha:

- dades de contingut (equipaments / punts d'interès) ni taula `elements`,
- endpoint que combini els tres filtres i retorni resultats,
- botons "Executar cerca" / "Netejar cerca" ni llista de resultats sota el mapa.

A més, **GeoMaster** (primer joc) està dissenyat però no implementat.

---

## 2. Infraestructura i desplegament — **DECIDIT**

### Fase vitrina (feedback)

Desplegament a **Vercel o Cloudflare Pages** (cost 0) per ensenyar la versió actual
(mapa + selector territorial) i recollir feedback. URL de preview no indexada → accés controlat
de facto.

### Fase producció real — **VPS únic**

Quan la web tingui usuaris de veritat, **producció = un sol VPS amb el mateix `docker compose up`
que en local** (no serverless). Tres motius de pes empenyen cap aquí:

1. **Temps real (Socket.io)** del Trivial multijugador → necessita un procés sempre viu;
   el serverless (funcions efímeres) no hi encaixa.
2. **PostGIS i creixement de dades** → els tiers gratuïts (Supabase 500 MB) es queden curts;
   al VPS la BD és pròpia i sense sostre artificial.
3. **Estat i previsibilitat** → sessions, rate limiting, caché en memòria viuen millor en un
   procés estable; cost fix i conegut.

Avantatge clau: és **exactament el mateix `docker-compose.yml`** que en local — migració trivial.

### Màquina recomanada

|               | Plà              | Specs                             | Cost           |
| ------------- | ---------------- | --------------------------------- | -------------- |
| **Arrencada** | **Hetzner CX22** | 2 vCPU · **4 GB RAM** · 40 GB SSD | **~4,5 €/mes** |
| Salt si cal   | Hetzner CX32     | 4 vCPU · 8 GB RAM · 80 GB SSD     | ~7,5 €/mes     |

Pressupost de RAM estimat: PostGIS 1-2 GB (sota càrrega) + Node 0,5-1 GB + SO/Docker ~0,7 GB
→ **~3-4 GB sota càrrega**, per tant 4 GB van **sobrats** per al llançament.

Decisions associades:

- **Començar amb el CX22 + backups automàtics** (~1 €/mes). Hetzner permet **redimensionar
  RAM/CPU sense reinstal·lar** → no cal encertar la mida avui; s'escala en minuts si fa falta.
- **GeoJSON estàtics via CDN** (Cloudflare/Vercel), no servits pel backend. Són estàtics i no
  canvien mai → es descarrega el VPS i la web va més ràpida arreu. Requereix un refactor petit
  (avui es serveixen des de disc, `backend/src/routes/geojson.ts`).
- **Repartiment ideal en producció**: VPS → backend (API + temps real) + PostGIS;
  CDN → frontend + GeoJSON estàtics.
- **Ubicació**: Hetzner Falkenstein/Núremberg (latència ~30-40 ms des de Catalunya, imperceptible).
  Alternativa més al sud: OVH.
- **Cost total fase producció**: ~60-85 €/any (domini + VPS).

⚠️ **Recordatori de provisió**: la carpeta `backend/data/geojson/` **no és al git**. A cada
desplegament cal proveir-la a part (com una taula de calibració en EEPROM externa: el binari
sol no arrenca). El refactor a CDN simplifica això perquè els fitxers passen a ser assets del
frontend.

---

## 3. Setup de producció (paritat dev/prod) — **FET**

Objectiu: que la màquina local corri (gairebé) el mateix que el VPS, perquè desplegar sigui
trivial. Implementat amb un segon compose espillo de producció.

### Fitxers

| Fitxer                                            | Què fa                                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.prod.yml`                         | Stack de producció. Projecte aïllat `viscalaterra-prod` (BD, xarxa i volums separats del dev → es poden tenir tots dos alhora). |
| `backend/Dockerfile`                              | Imatge de prod multi-stage: compila TS → `dist/`, runtime mínim sense devDeps, usuari no-root.                                  |
| `frontend/Dockerfile`                             | Multi-stage: compila la SPA → estàtics dins d'una imatge **Caddy**.                                                             |
| `frontend/Caddyfile`                              | Caddy: serveix la SPA, proxy `/api/*` → backend, HTTPS automàtic al VPS.                                                        |
| `backend/.dockerignore`, `frontend/.dockerignore` | Builds netes.                                                                                                                   |

### Arquitectura

```
Internet ─▶ Caddy (web, 80/443, HTTPS auto) ─┬─ /api/* ─▶ backend (node dist) ─▶ db (PostGIS)
                                              └─ /      ─▶ SPA estàtica
```

- Frontend fa servir rutes relatives `/api/...` → no cal recompilar amb URLs diferents per prod.
- Geodades (`backend/data/`, fora del git) muntades com a **volum read-only**, no dins la imatge.

### Simular en local

Docker local és **rootless** → no pot usar ports < 1024. Cal mapejar a ports alts:

```bash
HTTP_PORT=8080 HTTPS_PORT=8443 docker compose -f docker-compose.prod.yml up -d --build
# Web a http://localhost:8080  (conviu amb el dev a :5173 sense xocar)
# La BD territorial (panell On?) s'autopobla sola — NO cal cap seed manual.
# Aturar:
docker compose -f docker-compose.prod.yml down          # afegeix -v per esborrar també la BD
```

> Estat verificat (2026-06-04): `/` → 200 (SPA), `/api/geojson/...` → 200, `/api/territoris/arbre`
> → 200 amb 4 províncies / 9 vegueries / 43 comarques / 947 municipis. Simulació plenament
> funcional sense cap pas manual.

### Dades territorials autopoblades (sense seed)

Els límits administratius són **estàtics**. En lloc de sembrar la BD a cada desplegament,
`infra/db/init/03-territorial-data.sql` (41 KB, al git) conté els atributs (codi, nom, jerarquia)
i s'executa automàticament en crear la BD. Resultat: **qualsevol `docker compose up` aixeca la BD
ja poblada**. No porta geometries (geom queda NULL) perquè els polígons es serveixen des dels
GeoJSON de disc; el seed `seed-geodata.ts` només cal si algun dia es volen geometries a la BD.

### Desplegar al VPS (el dia D)

1. VPS nou: instal·lar Docker.
2. `git clone` del repo.
3. Crear `.env` amb valors de producció (`DB_HOST=db`, `NODE_ENV=production`,
   `SITE_ADDRESS=viscalaterra.cat`, `CORS_ORIGINS=https://viscalaterra.cat`, `JWT_SECRET`,
   `DB_PASSWORD` forts). **Sense** `HTTP_PORT`/`HTTPS_PORT` → usa 80/443.
4. Proveir `backend/data/` (no és al git) — **només** per als polígons del mapa (`/api/geojson`).
   La BD territorial (panell On?) s'autopobla sola; no cal seed.
5. `docker compose -f docker-compose.prod.yml up -d --build` → Caddy treu el certificat sol.

CDN opcional després: Cloudflare en mode proxy davant el VPS, sense tocar res del compose.

---

## 4. Properes tasques (prioritzades)

### 🔴 En breu — prerequisits per provar amb amics

Objectiu: tenir un entorn de staging accessible des de qualsevol lloc perquè el
propietari i amics puguin provar el sistema de contribucions abans de publicar-lo al món.

**4.1 Contractar el VPS (Hetzner CX22)**
Pas manual. Un cop fet, tota la resta es desbloqueja.

**4.2 Entorn de staging al VPS**
Un tercer entorn (a més de local dev i producció) accessible públicament per testar:

```
viscalaterra.cat          → producció (usuaris reals)
staging.viscalaterra.cat  → staging   (proves amb amics)
```

Caddy gestiona els dos dominis i certificats al mateix VPS sense cost addicional.
El staging apunta a la branca `develop`; producció a `main`.

**4.3 Autenticació real (JWT + bcrypt)**
Avui el login és un mock en memòria (`stores/auth.ts`). Cal implementar:

- Taula `usuaris` a la BD (email, password_hash, reputació, creat_en).
- Endpoints `POST /api/auth/registre` i `POST /api/auth/login` al backend.
- JWT real amb expiració; `localStorage` al frontend.

Prerequisit bloquejant per al sistema de contribucions.

**4.4 Sistema de contribucions i verificació col·lectiva**
El nucli diferenciador de viscalaterra. Vegeu secció 4.4 detallada més avall.

---

### 🟠 A mitjà termini

- **Cerca real**: fonts de dades obertes (Generalitat, ajuntaments) → importar equipaments
  oficials com a `elements` verificats per defecte → endpoint que combini On?/Què?/Quan? +
  botons Executar/Netejar + llista de resultats sota el mapa.
- ~~Primer joc — GeoMaster~~ → **promogut a prioritat immediata** com a **GeoFreak** (2026-06-11, vegeu registre de decisions).
- **Tancar deute d'auditoria** (blocs 3-5): tests/CI reals, refactor `MapaLeaflet.vue`.

---

### Secció 4.4 — Sistema de contribucions i verificació col·lectiva (disseny)

#### El problema que resol

Les dades oficials (Generalitat, ajuntaments) no ho cobreixen tot i envelleixen. Els usuaris
coneixen el territori millor que qualsevol base de dades. El sistema permet que la comunitat
mantingui el mapa viu, amb mecanismes per evitar duplicats, spam i dades obsoletes.

#### Flux complet (exemple real)

**Cas 1 — Publicació nova:**

> En Joan passeja per Sant Joan de les Fonts. Troba una font d'aigua a c/ Josep Puig que no
> apareix al mapa. Obre viscalaterra, prem "Afegir element", tria categoria "Font d'aigua",
> i envia. El sistema captura les seves coordenades GPS en aquell moment.

- L'element entra en estat **pendent** (no visible al mapa públic).
- En Joan queda registrat com a **autor** de la publicació.

**Cas 2 — Detecció de duplicat:**

> La Maria, uns dies després, vol publicar la mateixa font.

- El sistema detecta que ja existeix un element de la mateixa categoria a menys de _[X metres —
  pendent de decidir]_ de les seves coordenades.
- En lloc de crear un duplicat, li ofereix: "Ja hi ha una font aquí. Vols confirmar que és
  correcta?"

**Cas 3 — Verificació (suma de credibilitat):**

> La Maria confirma. En Pere també passa i confirma.

- Cada confirmació suma al **comptador de verificacions** de l'element.
- Quan arriba al llindar _[pendent de decidir: 3? 5?]_ l'element passa a **actiu** i
  apareix al mapa públic.
- La Maria i en Pere queden registrats com a **verificadors**; guanyen reputació.

**Cas 4 — Reporte de desaparició:**

> L'ajuntament fa obres. Un usuari passa i la font no hi és.

- Pot reportar "Aquest element ja no existeix".
- Cada reporte suma pes negatiu. Els **reportes recents** pesen més que els antics
  _[finestra de temps — pendent de decidir: 90 dies?]_.
- Quan el pes negatiu supera el llindar, l'element passa a **inactiu** (ocult del mapa)
  i posteriorment s'arxiva.

#### Model de dades previst

```
elements
  id, tipus, lat, lng, codi_municipi, estat (pendent/actiu/inactiu/arxivat),
  autor_id, creat_en, puntuació_confiança

verificacions
  id, element_id, usuari_id, tipus (confirma / reporta_canvi / reporta_eliminat),
  lat_usuari, lng_usuari, creat_en

usuaris
  id, nom, email, password_hash, reputació, creat_en
```

#### Decisions obertes (a concretar abans d'implementar)

| Qüestió                              | Opcions                               | Nota                                                            |
| ------------------------------------ | ------------------------------------- | --------------------------------------------------------------- |
| Radi de detecció de duplicats        | 10m? 20m? 50m?                        | Depèn del tipus d'element — una font és petita, un parc és gran |
| Llindar per passar a "actiu"         | 1, 3 o 5 verificacions                | Menys → spam; més → lent d'arrencar                             |
| Llindar per passar a "inactiu"       | N reportes en X dies                  | Ponderar per reputació de l'usuari?                             |
| Finestra de "reportes recents"       | 30, 90, 180 dies                      | Reportes antics pesen menys                                     |
| Validació de presència física        | Coordenades GPS en el moment d'enviar | GPS en interiors pot ser inexacte (±50m); cal marge             |
| Reputació de l'usuari afecta el pes? | Sí / No / Parcialment                 | Usuari nou = pes 1x; verificador de confiança = pes 2x?         |

---

### Secció 4.5 — Beta tancada per invitació (vouching) — _disseny, sense implementar_

Mecanisme per controlar qui entra a **staging** (i, més endavant, a la beta de producció):
creixement orgànic però controlat, on **cada usuari nou ve avalat per un d'existent**
(patró "vouching", estil invitacions de Gmail / Lobste.rs). Encaixa amb la filosofia
de "gent real darrere" (anti-spam/anti-fake) i amb el sistema de contribucions (4.4).

#### Flux (exemple)

1. **Arrel**: el propietari afegeix a mà uns quants contactes de confiança a la llista
   blanca (p. ex. Oriol, Alex, David, Julia) → es poden registrar.
2. **Sol·licitud**: un nou (Josep) que ha vist la plataforma de part d'Oriol omple un
   **formulari de sol·licitud** (a la secció "Contacte"): el seu email + l'email de qui
   l'avala (oriol@…). Es crea una **invitació pendent** a la BD.
3. **Aval per enllaç**: la plataforma envia un email a Oriol amb dos botons,
   **"Sí, l'avalo" / "No"** (enllaços amb token únic, sense haver de respondre el correu).
4. **Acceptació**: si Oriol clica "Sí" → Josep entra a la llista blanca i rep un email amb
   el seu **enllaç de registre**. Un cop registrat, Josep també pot avalar nous usuaris.
5. **Arbre de referits**: cada usuari guarda qui l'ha avalat (`referit_per`) → mapa de
   procedència (creixement, súper-connectors, podar branques problemàtiques, gamificar).

> **Decisió de disseny clau** [usuari + Claude, 2026-06-17]: l'aval es fa amb **enllaç
> tokenitzat** (botó "Sí/No" al correu), **no** llegint/parsejant correus entrants — molt
> més robust i menys codi. El "Contacte" passa a ser un **formulari estructurat**, no un
> email lliure.

#### Aportacions i promoció staging → producció

- Els usuaris de la beta **ja poden aportar** (publicar `llocs` nous, validar els existents
  — font d'aigua, zona d'escalada, banc de pícnic…), tot a la BD de staging.
- En llançar producció, la idea és **promoure usuaris (amb la seva reputació) i dades** de
  staging → els beta-testers passen a ser _founding users_ amb les seves aportacions. Bon
  incentiu per aportar de debò durant la beta.
- ⚠️ Promoure dades de forma **selectiva/revisada**, no un bolcat automàtic (evitar
  contaminar producció amb soroll de proves). Decisió per a més endavant.

#### Esquema previst

Sobre la taula `usuaris` (ja existent amb auth real): afegir `referit_per`; nova taula
`invitacions` (sol·licitant_email, referent_email, estat pendent/aprovada/rebutjada, token,
dates); la **llista blanca** = invitacions aprovades + arrels. Comprovació a `/registre` i
`/google`: un email no autoritzat no es pot registrar ni entrar.

#### Fases

- **Fase 1 — Llista blanca + comprovació**: rebutjar registre/login d'emails no autoritzats;
  arrels a mà. Dona la beta tancada **ja**, sense dependre de l'email. _Cimentació._
- **Fase 2 — Vouching complet**: formulari de sol·licitud + taula `invitacions` + emails amb
  enllaços d'aval. **Requereix servei d'email transaccional.**
- **Fase 3 (futur)** — promoció staging → producció.

#### Pendent de decidir abans d'implementar

- **Servei d'email transaccional** (Resend / Postmark / Brevo / Amazon SES…; free tier per a
  staging) + configurar el domini (SPF/DKIM). Dependència nova.
- Privacitat (RGPD lleu): consentiment en registrar-se + permetre esborrat (es guarden emails
  i un graf social de qui ha avalat qui).
- Límits anti-abús (nre. d'invitacions per usuari) — a futur, no per a l'MVP.

---

## 5. Decisions preses (registre)

- **2026-06-17** — Beta de staging per **invitació amb aval (vouching)**: cada usuari nou
  l'avala un d'existent; arrels a mà; aval via **enllaç tokenitzat** (botó Sí/No al correu),
  no parsejant correus; "Contacte" = formulari de sol·licitud. Aportacions de beta + usuaris
  promocionables a producció (selectiu). Per fases (llista blanca → vouching amb email →
  promoció). Pendent: servei d'email. Disseny detallat a la secció 4.5. **Sense implementar.**

- **2026-06-11** — Primer pas cap a l'MVP de staging: implementar el **primer joc** (rebatejat
  GeoMaster → **GeoFreak**, per col·lisió de nom a les app stores) **abans** de l'auth real —
  el joc no depèn d'auth i, quan l'auth arribi, serà el primer motiu real per registrar-se
  (CTA "Registra't per sortir al rànquing" al modal de resultats). Ordre: GeoFreak → auth
  (JWT+bcrypt, només nivell estàndard actiu, esquema preparat per als 4 nivells d'usuari) →
  rànquing. Spec del joc ampliada a `viscalaterra_plan.md` § GeoFreak (modalitats «On és...?» /
  «Com es diu...?», pista, modal de configuració, enquadrament al territori contenidor, sense vides).

- **2026-06-05** — Prioritat propera: VPS + staging + auth real + sistema de contribucions.
  Motiu: provar el sistema de contribucions/verificació amb amics reals abans de publicar.

- **2026-06-04** — Producció real sobre **VPS únic Hetzner CX22 (4 GB) + backups**, no serverless.
  Vitrina prèvia gratuïta a Vercel/Cloudflare Pages. CDN opcional via Cloudflare proxy (sense refactor).
- **2026-06-04** — Reverse proxy **Caddy** (HTTPS automàtic, config mínima) per sobre de Nginx.
- **2026-06-04** — Setup de paritat dev/prod implementat i verificat (secció 3).
- **2026-06-04** — Dades territorials (estàtiques) versionades a `infra/db/init/03-territorial-data.sql`
  → BD autopoblada a cada desplegament, sense seed manual. Sense geometries (els polígons són a disc).
