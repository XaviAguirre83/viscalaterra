# Pla del Projecte: viscalaterra.cat

## Descripció general

Plataforma de descoberta de Catalunya. El mapa actua com a filtre geogràfic:
l'usuari primer selecciona el territori d'interès (municipis, comarques, etc.)
i després cerca contingut dins d'aquella selecció geogràfica.

El mapa està construït amb Leaflet.js. Catalunya apareix com a regió principal;
la resta del territori espanyol en color més tenue (inspirat en meteo.cat).

## Manifest / Esperit del projecte

**Descentralitzar la descoberta de Catalunya.** Més enllà de Barcelona, la plataforma vol posar en valor qualsevol racó del territori — que algú de fora o de casa pugui trobar atractiu a llocs poc turístics, reduint la massificació dels indrets més concorreguts i donant visibilitat als que no la tenen.

**Sense intencionalitat política de cap mena.** El projecte neix per diversió, per conèixer millor la terra i per al gaudi de qui vulgui fer-la servir. Que el focus sigui Catalunya no implica cap biaix nacionalista ni ideològic.

**Fet amb passió.** El creador el fa per gaudir-lo fent-lo, i per compartir-lo.

## Idiomes

- **V1:** Català exclusivament (requisit per al domini `.cat`)
- **Futur:** Castellà, anglès, gallec, basc i altres _(sense límit definit)_
- **Visió a llarg termini:** Versió "Països Catalans" ampliant a Comunitat Valenciana i Illes Balears — descartada per ara, apuntada per si hi ha èxit

**Implicació tècnica important:** cal construir la plataforma amb i18n (internacionalització) des del primer dia, encara que inicialment només hi hagi català. Afegir-ho a posteriori és molt més costós que preveure-ho des de l'inici.

## Públic objectiu

_(pendent de definir)_

## Barra de menú (sobre el mapa)

Tres pestanyes principals: **On?** | **Què?** | **Quan?**
Cada pestanya expandeix un desplegable cap avall en fer clic.

### On?

- Desplegable de 4 columnes, una per Província (ordre: Barcelona · Girona · Lleida · Tarragona)
- Cada columna usa els colors temàtics de la seva província (veure secció "Temàtica de colors")
- Dins de cada Província: les seves Comarques, cada una amb un botó expandir/col·lapsar (▶/▼)
  - Per defecte totes col·lapsades; expandir una no col·lapsa les altres
- Dins de cada Comarca: els seus Municipis com a botons de selecció (sense checkboxes)
  - Cantonades adaptatives: rodones a dalt al primer, rodones a baix a l'últim, totes rodones si és únic
  - Els municipis capital de comarca apareixen en negreta
- Les Vegueries NO apareixen en aquest desplegable (poc conegudes popularment)
  però sí apareixen com a capa visual al mapa i com a opció al selector del mapa
- Sincronització bidireccional amb el mapa:
  - Seleccionar al desplegable → es reflecteix al mapa
  - Seleccionar al mapa → es reflecteix al desplegable
- La unitat de selecció final sempre és el municipi (igual que al mapa)

### Què?

Desplegable amb grans temes, cadascun amb subtemes. Enfocat en **espai públic
i equipaments col·lectius** (no negocis privats). El contingut prové de fonts
de dades obertes (Generalitat, ajuntaments, diputacions).

Temes i subtemes inicials (llista oberta):

- **Esports**: pistes de futbol, bàsquet, tennis, patinatge, ping-pong, skate park...
- **Nens**: parcs infantils, tobogans, gronxadors...
- **Culinari**: mercats setmanals, fires culinàries...
- **Activitats a l'aire lliure**: zones de pícnic, merenderos, zones de barbacoa...
- **Patrimoni**: castells, monuments...
- **Natura i aventura**: 100 cims, rutes de muntanya, rutes de bici...
- _(llista completament oberta, el concepte pot pivotar)_

### Quan?

Respon "quan està disponible" el contingut dins el territori. La **unitat mínima
és el dia** — mai es trien hores. Quatre modalitats **mútuament excloents**
(implementades a `frontend/src/data/temporal.ts`; detall a CLAUDE.md § Panell Quan?):

- **Permanent**: sempre disponible (parc infantil, taula de ping-pong, castell...).
  No aplica cap restricció temporal.
- **Dates concretes**: un dia o un interval `[inici, fi]` (dos calendaris).
  Per a esdeveniments puntuals (fira, concert).
- **Dies de la setmana**: es repeteix cada setmana en uns dies (p. ex. el mercat
  dels dimarts i dijous).
- **Cada mes**: combinació d'ordinals (`primer · segon · tercer · quart · últim`)
  × dies de la setmana (p. ex. "primer i últim dilluns de cada mes").

Cas d'ús típic: "Estic de vacances al Maresme del 15 al 22 de juliol, què passa
a prop meu aquesta setmana?" → combina On? + Quan? (dates concretes) i,
opcionalment, Què?

## Funcionalitats principals

- Mapa de Catalunya amb selector de divisió territorial (ràdio button, una sola activa):
  - Província (4)
  - Vegueria (9, incloent la Val d'Aran com a entitat territorial singular)
  - Comarca (43)
  - Municipi (947)
- Quatre estats visuals per zona:
  1. **Normal** — zona no seleccionada
  2. **Hover** — zona sota el cursor
  3. **Seleccionat** — territori inclòs al filtre On? actiu
  4. **Resultat** — municipi que compleix tots els filtres en executar la cerca (color distintiu)
- Els municipis "Seleccionat" que no coincideixen amb el resultat mantenen el seu color de selecció (el filtre On? segueix actiu)
- Cada nivell té el seu propi GeoJSON (font: Institut Cartogràfic de Catalunya)
- La unitat mínima de selecció és sempre el **municipi**
- Els nivells superiors (Província, Vegueria, Comarca) són dreceres per seleccionar conjunts de municipis
- Clic sobre una divisió: toggle que selecciona/deselecciona tots els municipis que conté
- La selecció respecta els límits exactes: si una comarca pertany parcialment a dues províncies,
  seleccionar la província només marca els municipis d'aquella comarca que li pertanyen
  (ex. seleccionar Província Girona → Cerdanya queda parcialment seleccionada)
- Seleccionar directament la Comarca Cerdanya sí marca tots els seus municipis (Girona + Lleida)
- Exemple de filtre refinat:
  1. Selector Província → clic Barcelona → tots els municipis de Barcelona seleccionats
  2. Selector Municipi → clic Barcelona ciutat + L'Hospitalet → es deseleccionen
  3. Filtre resultant = tots els municipis de la província excepte aquests dos
- Les divisions seleccionades actuaran com a filtres de cerca

## Cerca

### Botó "Executar cerca"

- Combina els tres filtres actius: On? + Què? + Quan?
- Pinta de color **Resultat** els municipis que compleixen els criteris dins del territori seleccionat
- Els criteris són **persistents**: es pot modificar qualsevol filtre i re-executar sense perdre el context
- La llista de resultats apareix en un scroll list sota el mapa amb informació addicional de cada resultat

### Botó "Netejar cerca"

- Reinicia els tres filtres (On?, Què?, Quan?) completament
- El mapa torna a l'estat inicial (sense seleccions ni resultats)
- _(Possible futura distinció entre reset parcial i total — pendent de definir)_

## Interactivitat

### Sistema de nivells de línies delimitants

- Nivell 1: 100% opacitat, 2px
- Nivell 2: 75% opacitat, 1.5px
- Nivell 3: 50% opacitat, 1px
- Nivell 4: 25% opacitat, 0.5px

La divisió seleccionada al selector pren sempre el Nivell 1. La resta es distribueixen així:

| Selector  | Nivell 1  | Nivell 2  | Nivell 3 | Nivell 4 |
| --------- | --------- | --------- | -------- | -------- |
| Província | Província | Vegueria  | Comarca  | Municipi |
| Vegueria  | Vegueria  | Província | Comarca  | Municipi |
| Comarca   | Comarca   | Província | Vegueria | Municipi |
| Municipi  | Municipi  | Província | Vegueria | Comarca  |

### Selector de nivell territorial actiu (al mapa)

El mapa mostra **sempre les 4 capes de divisió territorial visibles** (Província, Vegueria, Comarca, Municipi). Un control de radio buttons a la cantonada superior dreta permet triar quin nivell és el "Nivell 1":

- El nivell actiu té el gruix de línia màxim, opacitat plena i és l'únic interactiu (hover, clic, selecció).
- Els altres nivells reben gruix i opacitat decreixents (veure "Sistema de nivells de línies delimitants" més avall).
- Clic sobre un polígon del nivell actiu selecciona/deselecciona tots els seus municipis (cascada cap a la unitat mínima). Per a Vegueries i Comarques transfrontereres, la selecció afecta tots els municipis del territori (independentment de la província).

### Restriccions de navegació del mapa

- **Zoom mínim**: el nivell de zoom inicial (Catalunya sencera visible) és el límit màxim de zoom out — no es pot allunyar més.
- **Re-centrat automàtic**: en fer zoom out fins al mínim, el mapa torna suaument a la posició inicial (Catalunya centrada), per evitar quedar-se descentrat després d'haver navegat.
- **Desplaçament adaptatiu al zoom mínim**:
  - Si la finestra del navegador és prou gran per veure tot Catalunya → el mapa és immòbil (no cal desplaçar-se).
  - Si la finestra és petita (part de Catalunya queda fora de la pantalla) → el desplaçament s'habilita per poder accedir a tot el territori.
- **Límits de desplaçament dinàmics**: els límits de moviment es calculen automàticament en funció de la mida del viewport i el zoom actual, garantint sempre que qualsevol punt de Catalunya sigui accessible sense poder anar a territoris irrellevants. Es recalculen en cada canvi de zoom i en redimensionar la finestra.

### Panell de context geogràfic (part superior central del mapa)

Mostra la jerarquia completa des del nivell superior fins al nivell actiu al selector:

| Selector  | Panell mostra (de dalt a baix)                  |
| --------- | ----------------------------------------------- |
| Província | Província                                       |
| Vegueria  | Província(s) → Vegueria                         |
| Comarca   | Província(s) → Vegueria → Comarca               |
| Municipi  | Província(s) → Vegueria(s) → Comarca → Municipi |

- Si una divisió pertany a més d'una unitat superior, es mostren totes (ex. Cerdanya → "Girona, Lleida")
- Criteri d'ordenació/representació quan hi ha múltiples unitats superiors: _(pendent, possiblement per % de territori)_

## Stack tecnològic

| Capa          | Tecnologia           | Notes                                                          |
| ------------- | -------------------- | -------------------------------------------------------------- |
| Frontend      | Vue 3 + Vite         | Més accessible que React per a qui ve de fora del món web      |
| Llenguatge    | TypeScript           | JS amb tipat estàtic — natural per a qui ve de C               |
| Backend       | Node.js + Express    | Ja iniciat en el prototip                                      |
| Base de dades | PostgreSQL + PostGIS | Relacional + suport natiu de dades geogràfiques                |
| Mapa          | Leaflet.js           | Ja decidit                                                     |
| Temps real    | Socket.io            | _Previst_ (Trivial multijugador online) — encara no instal·lat |
| Autenticació  | JWT + bcrypt         | Control propi; migrable a servei extern si cal                 |
| i18n          | Vue I18n (vue-i18n)  | Frontend (ca/es/en). El contingut de dades es traduirà a BD    |

## Entorn de desenvolupament

- **SO:** Ubuntu 24.04.4 LTS
- **IDE:** VSCode
- **Contenidors:** Docker + Docker Compose — tot l'entorn definit en codi (PostgreSQL, Node, Vue). Facilita la col·laboració i l'onboarding de nous contribuïdors.
- **Desenvolupament en local** fins a tenir una versió presentable. Migració a servidor dedicat posteriorment.

## Bones pràctiques i forma de treballar

| Pràctica         | Eina                     | Equivalent embedded  |
| ---------------- | ------------------------ | -------------------- |
| Unit testing     | Vitest                   | TDD amb CUnit/Unity  |
| E2E / BDD        | Playwright + Cucumber.js | BDD                  |
| Linting          | ESLint + Prettier        | Linters              |
| Anàlisi estàtic  | TypeScript               | Anàlisi estàtic de C |
| Pre-commit hooks | Husky + lint-staged      | Pre-commit hooks     |
| CI/CD pipelines  | GitHub Actions           | Pipelines CI/CD      |
| Code coverage    | Integrat a Vitest        | Coverage             |

**Principi:** totes aquestes pràctiques es configuren des del primer commit, no s'afegeixen després. Si s'incorporen col·laboradors, les regles ja estan definides i automatitzades.

## Infraestructura i desplegament

### Filosofia

Docker garanteix que l'entorn de producció sigui idèntic al de desenvolupament local. El `docker-compose.yml` que s'usa en local és el mateix que s'usa al servidor. Això elimina la clàssica bretxa "funciona a la meva màquina".

### Fases de desplegament — **DECIDIT: VPS únic amb Docker (no serverless)**

> El roadmap viu de desplegament és a `full de ruta.md`. Resum de la decisió:

**Fase 1 — Desenvolupament (ara, cost 0€)**
Tot corre en local amb `docker compose up`. No cal cap servidor extern.

**Fase 1.5 — Vitrina/preview per a feedback (cost 0€)**
Desplegament estàtic a Vercel o Cloudflare Pages per ensenyar la versió actual
(mapa + selector + jocs) i recollir feedback. URL de preview no indexada → accés
controlat de facto.

**Fase 2 — Producció real: VPS Hetzner CX22 + Docker**
Quan hi hagi usuaris, producció = **un sol VPS amb el mateix `docker compose up`
que en local** (no serverless). Motius: Socket.io (temps real) necessita un procés
sempre viu; PostGIS i el creixement de dades superen els tiers gratuïts; estat,
rate limiting i caché viuen millor en un procés estable i de cost fix.

- Màquina d'arrencada: **Hetzner CX22** (2 vCPU · 4 GB RAM · 40 GB SSD, ~4,5 €/mes)
  - backups; redimensionable sense reinstal·lar.
- Reverse proxy **Caddy** (HTTPS automàtic). Setup de paritat dev/prod ja
  implementat: `docker-compose.prod.yml`, `backend/Dockerfile`, `frontend/Dockerfile`,
  `frontend/Caddyfile`. La BD territorial s'autopobla (`infra/db/init/`).
- GeoJSON estàtics opcionalment via CDN (Cloudflare) per descarregar el VPS.

> _Alternativa serverless descartada_ (Vercel + Render + Supabase): Render s'adorm
> sense peticions i no encaixa amb el temps real; Supabase 500 MB es queda curt.

### Domini

`viscalaterra.cat` — ja adquirit. S'apunta al servidor de la fase activa.

### Costos estimats a llarg termini

| Concepte                  | Cost            |
| ------------------------- | --------------- |
| Domini `viscalaterra.cat` | ~10-15€/any     |
| Repositori GitHub         | 0€              |
| Frontend (Vercel)         | 0€              |
| VPS quan calgui           | ~4-6€/mes       |
| **Total fase producció**  | **~60-85€/any** |

## Repositori i control de versions

- **Plataforma:** GitHub (repo públic)
- **Llicència:** AGPL-3.0 — qui faci servir el codi ha de publicar les seves modificacions també com a OpenSource, inclús si és un servei web
- **OpenSource per convicció:** es vol fomentar la col·laboració externa. Docker garanteix que qualsevol col·laborador pugui aixecar l'entorn amb un sol comandament.

## Seguretat

- Credencials i secrets **mai** al repositori — gestionats amb variables d'entorn (`.env`)
- `.env` sempre al `.gitignore` des del primer commit
- `.env.example` al repo com a plantilla sense valors reals
- Bones pràctiques de seguretat aplicades durant tot el desenvolupament (OWASP top 10, validació d'inputs, etc.)

## Estructura de la pàgina

### Hero (franja superior)

- Ocupa tot l'ample de la pantalla, alçada de franja apaïsada (no full viewport)
- El mapa ha de ser visible directament a sota sense necessitat de fer scroll
- Contingut: passi de diapositives d'imatges estàtiques emblemàtiques de Catalunya
  - Paisatges: Montserrat, Pica d'Estats, Pedraforca, Montseny...
  - Cultura popular: Castellers, Sardanes, Balls de Bastons, Trabucaires, Caga Tió, Castanyera, Correfocs, La Patum...
  - Patrimoni: Sagrada Família, Catedral de Girona, Amfiteatre de Tarragona...
- Text superposat: títol del projecte + claim ("Descobreix Catalunya" o similar)
- Sense CTA de moment

### Mapa + Cerca

- Immediatament a sota del hero
- Veure seccions "Funcionalitats principals" i "Cerca"

## Espai d'usuari

### Registre i login

Necessari per contribuir contingut i participar en el sistema de verificació.

### Contribució de contingut

Un usuari registrat pot aportar un element nou no existent a la base de dades (ex. pista de petanca, font d'aigua, pipicà...). L'element entra en estat **pendent de verificació** i no apareix al mapa fins a assolir el llindar de confirmacions.

### Sistema de verificació col·lectiva

Tres tipus de reportatge que els usuaris poden fer sobre qualsevol element:

- **Confirmar existència** — corroboren que l'element existeix i està actiu
- **Reportar canvi d'estat** — l'element existeix però alguna cosa ha canviat (la font no té aigua, el parc està en obres...)
- **Reportar que ja no existeix** — l'element ha desaparegut (demolició, canvi d'ús...)

Això s'aplica tant al **contingut d'usuaris** com al **contingut de fonts oficials** (Generalitat, ajuntaments, diputacions). El contingut oficial és fiable per defecte però pot ser refutat si un nombre suficient d'usuaris ho reporta.

**Llindar de verificació:** _(pendent de definir — nombre mínim de confirmacions perquè un element passi a visible o sigui marcat com a inactiu)_

### Sistema de reputació d'usuaris

El pes de la verificació d'un usuari no és igual per a tots — depèn del seu historial de contribucions correctes. Un usuari amb moltes verificacions encertades té més pes que un de nou.

Aspectes a definir:

- _(Com es calcula la reputació)_
- _(Si la reputació afecta el llindar necessari per verificar)_
- _(Si hi ha rols diferenciats — usuari bàsic, verificador de confiança, moderador...)_

## Arquitectura general

**Un sol domini — `viscalaterra.cat`** amb múltiples seccions.

Cerca, Jocs i Marxandatge conviuen sota el mateix domini, comparteixen sistema d'usuaris i identitat visual. El codi és modular internament (cada secció ben separada) tot i compartir el mateix deploy. Si en el futur la botiga creix, es pot externalitzar a subdomini sense trencar res.

### Seccions principals (barra de menú)

**Cerca** — La funcionalitat principal. Mapa + filtres On?/Què?/Quan? + resultats.

**Jocs** — Jocs que reutilitzen el mapa i el coneixement de Catalunya. Mecàniques:

- _Identificació territorial_: et donen un nom → marques al mapa, o al revés. Aplicable a comarques, municipis, províncies, vegueries. L'usuari pot acotar el territori abans de jugar (ex. "només municipis del Maresme").
- _Localització de punts d'interès_: rius, muntanyes (100 cims), castells, parcs naturals... → els ubiques al mapa, o al revés.
- _Trivial de Catalunya_: preguntes de tot tipus sobre Catalunya. Modalitat multijugador online (jugar contra altres usuaris en temps real). _(Requereix infraestructura de temps real — WebSockets o similar)_
- Mode convidat: es pot jugar sense registrar-se, sense persistència.
- Usuari registrat: puntuacions, progrés i rànquings desats.

### GeoFreak (primer joc a implementar)

Joc d'identificació territorial. Ruta: `/jocs/geofreak`. La pàgina `/jocs` actua com a menú de tots els jocs.

> **Nom** (2026-06-11): rebatejat de "GeoMaster" → **GeoFreak** (passió per la geografia). "GeoMaster" ja existia a l'App Store amb el mateix concepte; "GeoGeek" també està ocupat (GeoGeek AR, App Store i Google Play). "GeoFreak" no presenta col·lisions conegudes. Obert a un nom millor més endavant.

**Dues modalitats** (seleccionables per separat), batejades amb la pregunta que formulen:

- **«On és...?»** (nom → mapa): apareix el nom d'una demarcació i l'usuari ha de clicar-la al mapa.
- **«Com es diu...?»** (mapa → nom): apareix una demarcació il·luminada al mapa i l'usuari n'escriu el nom en un recuadre tipus "Cerca per nom", amb autocomplete (imprescindible als nivells alts i per a grafies difícils, p. ex. Castell-Platja d'Aro).

**Pista** (2026-06-11 — substitueix l'antiga decisió "el joc no corregeix ni pista"):

- Botó «Pista» disponible a cada ronda; usar-lo penalitza (vegeu fórmula de puntuació).
- A «Com es diu...?»: desplega 4 opcions clicables (1 correcta + 3 distractors).
- A «On és...?» (simètric): s'il·luminen 4 territoris candidats i només aquests són clicables.
- Els distractors són veïns o del mateix àmbit (si toca l'Alt Empordà: Baix Empordà, Gironès, Pla de l'Estany…), mai de l'altra punta del país — si no, la pista regala massa.
- Cost: un encert amb pista compta com a **mig encert (0,5)** al ràtio de puntuació. Penalització multiplicativa: escala sola amb el nivell, sense números màgics.
- **Errar amb la pista activa salta la ronda** (2026-06-12): les 4 opcions desapareixen i l'objectiu torna a la cua. Si no, es podrien provar les opcions una a una i l'encert sortiria gairebé garantit.

**Mecànica**:

- Rondes infinites fins que s'encerten totes les demarcacions del nivell o l'usuari surt.
- Comptador d'encerts i errors. **Sense límit d'errors ni vides** (2026-06-11): el ràtio encerts/total ja penalitza a la puntuació, i provar a l'atzar surt car per si sol. Els errors mai acaben la partida.
- **3 intents per ronda i botó «Passa»** (2026-06-12): al tercer error sobre el mateix objectiu, la ronda se salta sola — l'objectiu torna a la cua (tornarà a sortir més endavant) i el comptador d'intents es reinicia. També es pot passar voluntàriament amb «Passa», per deixar un objectiu difícil per a quan quedin menys candidates. Passar no penalitza (els errors ja han comptat i el cronòmetre segueix corrent). Evita que una ronda encallada degeneri en clicar-ho tot.
- Cronòmetre de temps total.
- Una demarcació encertada queda marcada permanentment al mapa i no torna a sortir.
- El zoom és lliure en qualsevol modalitat i nivell.
- **El panell d'informació territorial (hover amb el nom) està ocult durant el joc.** Si es mostrés el nom en passar el cursor, la modalitat «On és...?» seria trivial (busques amb el cursor fins trobar el nom demanat). El mapa en mode joc desactiva el panell hover.
- **Enquadrament al territori contenidor** (2026-06-11 — nivells "a triar": 2, 3, 5, 6, 7): si es juga p. ex. a "Municipis del Maresme", el mapa fa `fitBounds` al bbox de la comarca (tan gran com permeti el viewport), els `maxBounds` impedeixen desplaçar-se fora i el `minZoom` queda fixat a l'enquadrament inicial. És la generalització de la lògica ja existent de `LIMITS_CATALUNYA`/`actualitzaMaxBounds` a `MapaLeaflet.vue`, amb el bbox del contenidor en lloc del de Catalunya. El territori exterior queda atenuat i no interactiu.

**Flux de configuració — wizard de 3 passos** (2026-06-12): en entrar al joc, un
modal sobre el mapa (amb indicador de passos i botons Enrere/Següent) configura
la partida. El fons ja mostra el mapa en mode joc (tiles sense etiquetes) i
previsualitza el territori en triar-lo.

1. **Jugadors** (1–4). Amb més d'un, cada jugador tria **nom** i **color** de
   conquesta (paleta de 6 colors intercanviables).
2. **Modalitat**: «On és...?» / «Com es diu...?» (amb la seva descripció).
3. **Nivell** (0–8) i, als nivells "a triar" (2, 3, 5, 6, 7), **territori
   contenidor** — amb botó **🎲 A l'atzar** per triar-lo aleatòriament.
4. Botó **«Som-hi!»** → compte enrere "3, 2, 1, Som-hi!" (fase de preparació, amb
   el mapa ja enquadrat; en multijugador anteposa "Torn de {nom}") i arrenca.

**HUD durant la partida**: el context i la pregunta del torn van a la barra de
menú («On és... el Ripollès?» o, a «Com es diu...?», un recuadre d'escriptura amb
autocomplete sobre el mapa). Sobre el mapa: barra de progrés, cronòmetre + progrés
(p. ex. 12/43), comptadors ✓/✗ amb ratxa 🔥, intents restants (●●●), i botons
«Pista», «Passa» i «Surt». En multijugador, marcador de conquestes per jugador
(amb el seu color) i el del torn ressaltat.

**Feedback i estètica**: encert → flaix verd + halo blanc que es fon cap al color
final; error → flaix vermell que s'esvaeix; anunci gran del nou objectiu al centre;
confeti i recompte animat de punts al final. Tot respecta `prefers-reduced-motion`.
Els noms es construeixen amb article català correcte ("del Maresme", "de l'Anoia",
"d'Osona" — mòdul `data/articles.ts`).

**Pausa**: mentre l'app està bloquejada en landscape al mòbil (overlay "Gira el
dispositiu"), la partida es pausa i el cronòmetre no corre.

**Final de partida**: modal de resultats. En solitari: punts (amb recompte animat),
temps, encerts, errors i pistes. En multijugador: **classificació** ordenada per
conquestes (desempat per punts) amb el guanyador destacat (🏆). Botons «Torna a
jugar» i «Canvia la configuració». Quan existeixi l'auth real, aquí anirà el CTA
«Registra't per sortir al rànquing» (costura prevista joc ↔ registre).

### Multijugador local del GeoFreak (mode conquesta)

Realitza la modalitat social **Local** (vegeu § Modalitats socials). 1–4 jugadors
per torns al mateix dispositiu, sense xarxa:

- **Torns alterns ronda a ronda** sobre la mateixa bossa de demarcacions (no
  tandes senceres). El torn es tanca amb encert, amb salt (3r error o error amb
  pista) o amb «Passa»; els errors 1–2 mantenen el torn.
- **Rellotge per jugador**: el cronòmetre de cadascú només corre al seu torn,
  pausat la resta.
- **Conquesta acolorida**: cada demarcació encertada es pinta al mapa amb el color
  del jugador que l'ha encertada → Catalunya acaba com un mapa de "territori
  conquerit" per colors.
- **Classificació final** per nombre de conquestes (desempat per punts).

**9 nivells de dificultat**:

| Nivell | Demarcacions                        | Quantitat |
| ------ | ----------------------------------- | --------- |
| 0      | Províncies                          | 4         |
| 1      | Vegueries                           | 9         |
| 2      | Comarques d'una vegueria (a triar)  | ~5–8      |
| 3      | Comarques d'una província (a triar) | ~8–15     |
| 4      | Totes les comarques de Catalunya    | 43        |
| 5      | Municipis d'una comarca (a triar)   | variable  |
| 6      | Municipis d'una vegueria (a triar)  | variable  |
| 7      | Municipis d'una província (a triar) | variable  |
| 8      | Tots els municipis de Catalunya     | ~947      |

**Accés i rànking**:

- **Mode convidat**: es pot jugar sense registrar-se. Sense persistència de puntuacions.
- **Usuari registrat**: les partides completades es desen i computen al rànking global.
- **Rànking unificat** (un sol rànking per joc, no per nivell): concentra la competència i evita taules buides als nivells poc jugats. Es pot filtrar per nivell com a vista secundària. Incentiva jugar nivells difícils perquè puntuen més.
- **Fórmula de puntuació** (v1 implementada a `calculaPunts`, a afinar amb joc real):

  ```
  punts = 1000 × multiplicador_nivell × ràtio × bonus_temps
  ```

  - `multiplicador_nivell` = `nivell + 1` (×1 per Províncies → ×9 per tots els municipis)
  - `ràtio` = `(encerts − 0,5 × encerts_amb_pista) / (encerts + errors)` — els errors
    penalitzen i un encert amb pista val mig encert
  - `bonus_temps` = `5 / (5 + segons_per_demarcació)` — respondre a l'instant → ~1;
    5 s de mitjana → 0,5; 15 s → 0,25

- El rànking **distingeix entre modalitats**: rànking nom→mapa i rànking mapa→nom per separat.

### EscutMaster i BanderaMaster (segon i tercer joc previstos)

**BanderaMaster funciona exactament amb la mateixa mecànica que EscutMaster** — l'única diferència és que les imatges són banderes en lloc d'escuts. Tot el que es descriu a continuació s'aplica a ambdós jocs.

Jocs d'identificació d'escuts heràldics i banderes de les demarcacions catalanes. Mecànica general idèntica al GeoFreak (rondes infinites, comptadors encerts/errors, cronòmetre, rànking per modalitat, mode convidat i registrat).

**Diferències respecte al GeoFreak:**

- Les **vegueries queden excloses** — no disposen d'escut ni bandera pròpies.
- **Dues modalitats** (rànking separat per a cadascuna):

- **Imatge → Mapa**: es mostra l'escut/bandera i l'usuari clica la demarcació correcta al mapa. El hover mostra el nom de cada element en passar el cursor — és l'ajuda legítima, ja que el repte és reconèixer la imatge, no trobar el nom. Exemple: "sé que aquest és l'escut d'Alella però no sé on és — faig hover pels municipis del Maresme fins trobar-la."
- **Mapa → Imatge** (selecció múltiple): es mostra la demarcació marcada al mapa amb el nom visible, i apareixen diverses opcions d'escuts/banderes en pantalla. L'usuari ha de triar el correcte. Té **dos eixos de dificultat independents i configurables**:
  - **Àmbit dels distractors** (d'on s'extreuen les opcions incorrectes):
    - Mateixa comarca ← més fàcil geogràficament, possiblement més difícil visualment (escuts similars)
    - Mateixa província
    - Tota Catalunya ← més difícil geogràficament
  - **Nombre de distractors**: de 1 a 6 (és a dir, entre 2 i 7 opcions totals en pantalla). Amb 1 distractor és gairebé cara o creu; amb 6 cal coneixement molt sòlid.
  - Excepció: als nivells amb poques demarcacions (ex. Províncies = 4), el nombre màxim de distractors queda limitat pel total disponible.
  - Ambdós eixos han d'entrar a la fórmula de puntuació.

- Combina dues habilitats en una sola interacció: **reconeixement visual** de l'escut/bandera + **localització geogràfica** al mapa.
- **Principi de disseny**: el joc educa passivament. A la modalitat Imatge→Mapa, el hover força l'usuari a explorar el mapa fins trobar la demarcació — aprèn on és sense que sigui l'objectiu explícit. A la modalitat Mapa→Imatge, veure el territori marcat al mapa mentre tries l'escut reforça l'associació visual. L'aprenentatge és un efecte secundari deliberat, no accidental — la UI ha de potenciar-lo.

**6 nivells de dificultat** (sense vegueries):

| Nivell | Demarcacions                        | Quantitat |
| ------ | ----------------------------------- | --------- |
| 0      | Províncies                          | 4         |
| 1      | Comarques d'una província (a triar) | ~8–15     |
| 2      | Totes les comarques de Catalunya    | 43        |
| 3      | Municipis d'una comarca (a triar)   | variable  |
| 4      | Municipis d'una província (a triar) | variable  |
| 5      | Tots els municipis de Catalunya     | ~947      |

**Requisit previ d'assets**: cal disposar de les imatges (SVG preferiblement) de tots els escuts i banderes de províncies, comarques i municipis. És feina de recollida de dades independent del desenvolupament del joc.

### Capitals de Comarca (quart joc previst)

Joc d'associació entre comarques i les seves capitals. Sempre les 43 comarques — **no hi ha nivells de dificultat**, ja que no hi ha marge on variar-la significativament. La dificultat ve donada únicament per la modalitat. Rànking separat per modalitat; la fórmula de puntuació no necessita multiplicador de nivell, només temps i ràtio encerts/errors.

**Modalitat 1 — Comarca → Capital**:

1. El mapa mostra únicament la capa de comarques.
2. El joc enuncia: "Capital del Maresme".
3. El joc il·lumina automàticament la comarca del Maresme (com un hover programàtic, sense intervenció de l'usuari) i fa zoom in centrant-la en pantalla.
4. Apareix ara la capa de municipis, però únicament els de la comarca seleccionada són interactius.
5. L'usuari fa hover sobre els municipis per veure els noms i clica el que creu que és la capital.
6. Encert o error, següent pregunta.

**Modalitat 2 — Capital → Comarca**:

1. El mapa mostra únicament la capa de comarques.
2. El joc enuncia: "Mataró és la capital de...".
3. L'usuari fa hover sobre les comarques per veure els noms i clica la que creu correcta.

**Mecànica nova respecte als altres jocs**: a la modalitat 1, el joc pren el control del mapa (zoom automàtic + highlight programàtic d'una comarca). És una funcionalitat nova a implementar: el component de joc ha de poder ordenar al mapa que faci zoom i il·lumini un polígon concret sense intervenció de l'usuari.

**Aprenentatge passiu**: igual que als jocs d'escuts i banderes, l'ús del mapa força l'usuari a explorar el territori. A la modalitat 1, fer hover pels municipis d'una comarca per trobar-ne la capital ensenya de retruc on és cada municipi. A la modalitat 2, explorar les comarques per trobar-ne una reforça la seva localització geogràfica. És un patró deliberat i transversal a tots els jocs de la secció Jocs: **el mapa com a eina d'aprenentatge geogràfic implícit**.

### Modalitats socials dels jocs (visió futura)

Tots els jocs de la secció Jocs podrien suportar tres modalitats de joc:

**A implementar (roadmap actiu):**

- **Sol** — un jugador, rànking individual. Ja dissenyat, és el punt de partida.
- **Local (mateix dispositiu)** — diversos jugadors per torns a la mateixa pantalla, sense xarxa. Ideal per jugar en família o amb amics reunits. Senzill d'implementar: gestió de torns i puntuació acumulada per jugador, sense infraestructura addicional.

**Visió futura (fora del roadmap actiu):**

- **Online (temps real)** — partida en xarxa contra altres usuaris via Socket.io (ja al stack). Implica: creació de sales, codi d'invitació, sincronització d'estat entre clients, gestió de desconnexions i timeouts. Es deixa per quan hi hagi base d'usuaris suficient. Podria integrar-se amb **JulIA** (l'assistent IA del projecte) com a presentadora o moderadora de partides online — vegeu secció "Plans de futur".

**Jocs futurs previstos** (idees, sense especificar encara):

- Rius de Catalunya → localitzar al mapa
- Els 100 Cims → localitzar al mapa
- Parcs naturals → localitzar al mapa
- Llocs emblemàtics (Museu Dalí, Pedraforca, Montserrat, Sagrada Família...) → localitzar al mapa
- Trivial de Catalunya (multijugador en temps real via Socket.io)
- Risk de Catalunya

**Agenda Cultural** — Vista especialitzada de Cerca, no secció independent. Accés ràpid des del menú, però comparteix base de dades i lògica amb Cerca. Essencialment és Cerca pre-filtrada per Què? → Cultura + Quan? → Puntual, amb presentació orientada a calendari/esdeveniments. Qualsevol persona o col·lectiu pot anunciar un esdeveniment sense distinció entre professional i amateur. Els municipis amb esdeveniments actius apareixen destacats al mapa.

**Marxandatge** — Venda d'articles de la marca. Integrat al mateix domini; si creix, candidat a externalitzar (ex. Shopify en subdomini).

**Espai d'usuari** — Registre, login, perfil, contribucions, reputació.

## Requisits de disseny

### Responsive (prioritat alta)

La plataforma ha de funcionar correctament en:

- **Laptop** — experiència completa
- **Tablet** — adaptació del layout
- **Smartphone** — prioritat màxima, el mapa és l'element més complex d'adaptar

El disseny s'ha de pensar mobile-first. La interacció amb el mapa en tàctil (pinch, tap, selecció de municipis) requereix atenció especial.

## Plans de futur

Idees anotades per a versions posteriors. No formen part del roadmap actiu — s'apunten per no perdre-les.

### JulIA — Assistent IA de la plataforma

Un assistent d'intel·ligència artificial integrat a la plataforma per ajudar l'usuari en les seves cerques.

- **Nom:** JulIA (nom català/espanyol comú + acrònim de IA)
- **Casos d'ús previstos:**
  - Cerca en llenguatge natural que es tradueix automàticament als filtres On?/Què?/Quan? ("vull anar a una piscina natural prop de Vic")
  - Assistent contextual del mapa ("quines fires hi ha a la Selva aquest mes?")
  - Descobriment aleatori ("sorprèn-me amb alguna cosa a prop meu", amb geolocalització)
  - Possible presentadora del mòdul Jocs (trivial geogràfic amb personalitat pròpia)
- **Integració tècnica:** Socket.io (ja al stack) + API de Claude amb streaming de respostes

### Viscalaterra Països Catalans

Expansió del mapa i la base de dades per incloure la Comunitat Valenciana i les Illes Balears, completant els territoris de parla catalana.

- Descartada per ara, condicionada a l'èxit de la versió Catalunya
- Implicació tècnica: les capes GeoJSON haurien d'ampliar-se; l'arquitectura modular ho hauria de permetre sense grans refactors
- Ja mencionat a la secció d'Idiomes com a visió a llarg termini

## Temàtica de colors per província

Cada província té una paleta pròpia usada tant al mapa (Leaflet) com al panell On?:

| Província | Codi | Color base | Ús                            |
| --------- | ---- | ---------- | ----------------------------- |
| Barcelona | `08` | Vermell    | `#c4382e` / parcial `#f0d4d2` |
| Girona    | `17` | Verd       | `#2d6a2d` / parcial `#dfe9d0` |
| Lleida    | `25` | Or         | `#b8860b` / parcial `#f0e3b8` |
| Tarragona | `43` | Blau       | `#2b6cb0` / parcial `#d4e2f3` |

- **Base**: selecció total (fons ple, text blanc)
- **Parcial**: selecció parcial (fons suau, text de color `vora`)
- **Hover**: previsualització al passar el cursor (fons molt suau)
- Les comarques al mapa (zoom intermedi) usen verd neutre perquè poden abastar dues províncies

### Comarques transfrontereres (partides entre dues províncies)

Quatre comarques tenen municipis a dues províncies diferents. Al panell On? apareixen
a les dues columnes corresponents, cadascuna amb només els seus municipis d'aquella província:

| Comarca  | Província A | Província B                                   |
| -------- | ----------- | --------------------------------------------- |
| Berguedà | Barcelona   | Lleida (Gósol, únic municipi)                 |
| Cerdanya | Girona      | Lleida                                        |
| Osona    | Barcelona   | Girona                                        |
| Selva    | Girona      | Barcelona (Fogars de la Selva, únic municipi) |

Seleccionar la comarca des del mapa (nivell comarca) selecciona **tots** els seus municipis
independentment de la província. Seleccionar des del panell On? afecta només els municipis
de la columna de la província on es fa clic.

## Funcionalitats futures del mapa (secció Cerca)

### Capa d'escuts i banderes al mapa

Un cop disponibles els assets d'imatge (escuts i banderes de províncies, comarques i municipis), afegir al mapa de la secció On? una capa opcional de superposició visual:

- **Toggle independent** per a escuts i per a banderes (mostrar/amagar cadascun per separat).
- Es mostra centrat al polígon de cada demarcació al nivell territorial actiu.
- Purament informatiu — no afecta la selecció ni els filtres.
- Activar els dos alhora pot saturar visualment; la UI ha de gestionar-ho (avisar o limitar).

## Notes i decisions

### Geodades (maig 2026)

- **Font:** ICC — divisions-administratives-v2r1, data de referència 2024-01-18. Llicència CC BY 4.0.
- **Estratègia híbrida:** els fitxers GeoJSON es serveixen estàtics des del backend per a Leaflet (ja estan optimitzats en 6 resolucions). PostGIS s'usa per a les queries territorials (quin municipi pertany a quina comarca, filtres de cerca). No es regenera GeoJSON des de PostGIS.
- **GeoJSON fora del repo:** 115 MB de fitxers no es guarden a Git. Es descarreguen manualment i s'importen amb `npm run seed`. Documentat a `backend/data/README.md`.
- **Resolució per zoom:** 1000000 (zoom ≤8) → 500000 → 250000 → 100000 → 5000 (zoom ≥15). El backend tria el fitxer automàticament segons el zoom que envia el frontend.

### API (maig 2026)

- `GET /api/territoris/arbre` — retorna l'arbre complet (província → comarca → municipi) en una sola petició. El frontend el carrega a l'inici i navega localment sense més peticions.
- `GET /api/geojson/:nivell?zoom=N` — GeoJSON per a Leaflet a la resolució adequada.
- Endpoints de `llocs` (Què?) i `auth` dissenyats però no implementats encara.

### Plataforma Git i estratègia de branques (maig 2026)

- **Plataforma:** GitHub, repositori públic.
- **Branques:** `main` (estable) → `develop` (integració) → `feature/*` / `fix/*`. PRs sempre cap a `develop`.
- **Commits:** format Conventional Commits en català.
