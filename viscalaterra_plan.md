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

Tres naturaleses de contingut segons temporalitat:

- **Permanent**: sempre disponible (parc infantil, taula de ping-pong, castell...)
  No requereix filtre temporal però pot incloure's en qualsevol cerca.
- **Recurrent**: patró repetitiu (mercat setmanal els dimarts, festa major cada agost...)
  Filtrable per dia de la setmana o per data concreta.
- **Puntual**: esdeveniment únic amb data concreta (fira, concert, activitat...)
  Filtrable per rang de dates.

Cas d'ús típic: "Estic de vacances al Maresme del 15 al 22 de juliol,
què passa a prop meu aquesta setmana?" → combina On? + Quan? + opcionalment Què?

Interfície del Quan? _(pendent de definir: selector de dies, calendari, rang de dates...)_

## Funcionalitats principals

- Mapa de Catalunya amb selector de divisió territorial (ràdio button, una sola activa):
  - Província (4)
  - Vegueria (8)
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

| Capa          | Tecnologia           | Notes                                                     |
| ------------- | -------------------- | --------------------------------------------------------- |
| Frontend      | Vue 3 + Vite         | Més accessible que React per a qui ve de fora del món web |
| Llenguatge    | TypeScript           | JS amb tipat estàtic — natural per a qui ve de C          |
| Backend       | Node.js + Express    | Ja iniciat en el prototip                                 |
| Base de dades | PostgreSQL + PostGIS | Relacional + suport natiu de dades geogràfiques           |
| Mapa          | Leaflet.js           | Ja decidit                                                |
| Temps real    | Socket.io            | Per al Trivial multijugador                               |
| Autenticació  | JWT + bcrypt         | Control propi; migrable a servei extern si cal            |
| i18n          | i18next              | Frontend i backend comparteixen el mateix sistema         |

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

### Fases de desplegament

**Fase 1 — Desenvolupament (ara, cost 0€)**
Tot corre en local amb `docker compose up`. No cal cap servidor extern.

**Fase 2 — MVP / primers col·laboradors (cost 0€)**
| Peça | Servei | Notes |
|---|---|---|
| Frontend | Vercel o Cloudflare Pages | Deploy automàtic des de GitHub. Domini personalitzat inclòs. |
| Backend | Render (tier gratuït) | S'adorm als 15 min sense peticions. Vàlid per a proves. |
| Base de dades | Supabase (tier gratuït) | PostgreSQL + PostGIS. 500 MB. Suficient per a les geodades. |

**Fase 3 — Producció real (quan hi hagi usuaris, ~4-6€/mes)**
Un VPS (Hetzner, OVH o similar) on s'executa exactament el mateix `docker compose up` que en local. Tota la complexitat ja està resolta al `docker-compose.yml`. La migració des de la Fase 2 és trivial.

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
