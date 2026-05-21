# Plan del Proyecto: viscalaterra.cat

## Descripción general

Plataforma de descubrimiento de Catalunya. El mapa actúa como filtro geográfico:
el usuario primero selecciona el territorio de interés (municipis, comarques, etc.)
y luego busca contenido dentro de esa selección geográfica.

El mapa está construido con Leaflet.js. Catalunya aparece como región principal;
el resto del territorio español en color más tenue (inspirado en meteo.cat).

## Manifest / Esperit del projecte

**Descentralitzar la descoberta de Catalunya.** Més enllà de Barcelona, la plataforma vol posar en valor qualsevol racó del territori — que algú de fora o de casa pugui trobar atractiu a llocs poc turístics, reduint la massificació dels indrets més concorreguts i donant visibilitat als que no la tenen.

**Sense intencionalitat política de cap mena.** El projecte neix per diversió, per conèixer millor la terra i per al gaudi de qui vulgui fer-la servir. Que el focus sigui Catalunya no implica cap biaix nacionalista ni ideològic.

**Fet amb passió.** El creador el fa per gaudir-lo fent-lo, i per compartir-lo.

## Idiomes

- **V1:** Català exclusivament (requisit per al domini `.cat`)
- **Futur:** Castellà, anglès, gallec, basc i altres _(sense límit definit)_
- **Visió a llarg termini:** Versió "Països Catalans" ampliant a Comunitat Valenciana i Illes Balears — descartada per ara, apuntada per si hi ha èxit

**Implicació tècnica important:** cal construir la plataforma amb i18n (internacionalització) des del primer dia, encara que inicialment només hi hagi català. Afegir-ho a posteriori és molt més costós que preveure-ho des de l'inici.

## Público objetivo

_(pendiente de definir)_

## Barra de menú (encima del mapa)

Tres pestañas principales: **On?** | **Què?** | **Quan?**
Cada pestaña expande un desplegable hacia abajo al hacer clic.

### On?

- Desplegable de 4 columnas, una por Província
- Dentro de cada Província: sus Comarques desplegables
- Dentro de cada Comarca: sus Municipis (checkboxes)
- Las Veguerías NO aparecen en este desplegable (poco conocidas popularmente)
  pero sí aparecen como capa visual en el mapa y como opción en el selector del mapa
- Sincronización bidireccional con el mapa:
  - Seleccionar en el desplegable → se refleja en el mapa
  - Seleccionar en el mapa → se refleja en el desplegable
- La unidad de selección final siempre es el municipi (igual que en el mapa)

### Què?

Desplegable con grandes temas, cada uno con subtemas. Enfocado en **espacio público
y equipamientos colectivos** (no negocios privados). El contenido proviene de fuentes
de datos abiertos (Generalitat, ajuntaments, diputacions).

Temas y subtemas iniciales (lista abierta):

- **Esports**: pistas de fútbol, básquet, tenis, patinaje, ping-pong, skate park...
- **Nens**: parcs infantils, toboganes, columpios...
- **Culinari**: mercats setmanals, fires culinàries...
- **Activitats a l'aire lliure**: zones de picnic, merenderos, zones de barbacoa...
- **Patrimoni**: castells, monuments...
- **Natura i aventura**: 100 cims, rutes de muntanya, rutes de bici...
- _(lista completamente abierta, el concepto puede pivotar)_

### Quan?

Tres naturalezas de contenido según temporalidad:

- **Permanent**: siempre disponible (parc infantil, taula de ping-pong, castell...)
  No requiere filtro temporal pero puede incluirse en cualquier búsqueda.
- **Recurrent**: patrón repetitivo (mercat setmanal els dimarts, festa major cada agost...)
  Filtrable por día de la semana o por fecha concreta.
- **Puntual**: evento único con fecha concreta (fira, concert, activitat...)
  Filtrable por rango de fechas.

Caso de uso típico: "Estic de vacances al Maresme del 15 al 22 de juliol,
¿què passa a prop meu aquesta setmana?" → combina On? + Quan? + opcionalment Què?

Interfaz del Quan? _(pendiente de definir: selector de días, calendario, rango de fechas...)_

## Funcionalidades principales

- Mapa de Catalunya con selector de división territorial (radio button, una sola activa):
  - Província (4)
  - Vegueria (8)
  - Comarca (42)
  - Municipi (+900)
- Cuatro estados visuales por zona:
  1. **Normal** — zona no seleccionada
  2. **Hover** — zona bajo el cursor
  3. **Seleccionat** — territoire incluido en el filtro On? activo
  4. **Resultat** — municipi que cumple todos los filtros tras ejecutar la cerca (color distintivo)
- Los municipis "Seleccionat" que no coinciden con el resultado mantienen su color de selección (el filtro On? sigue activo)
- Cada nivel tiene su propio GeoJSON (fuente: Institut Cartogràfic de Catalunya)
- La unidad mínima de selección es siempre el **municipi**
- Los niveles superiores (Província, Vegueria, Comarca) son atajos para seleccionar conjuntos de municipis
- Clic sobre una división: toggle que selecciona/deselecciona todos los municipis que contiene
- La selección respeta los límites exactos: si una comarca pertenece parcialmente a dos provincias,
  seleccionar la provincia solo marca los municipis de esa comarca que le pertenecen
  (ej. seleccionar Província Girona → Cerdanya queda parcialmente seleccionada)
- Seleccionar directamente la Comarca Cerdanya sí marca todos sus municipis (Girona + Lleida)
- Ejemplo de filtro refinado:
  1. Selector Província → clic Barcelona → todos los municipis de Barcelona seleccionados
  2. Selector Municipi → clic Barcelona ciutat + L'Hospitalet → se deseleccionan
  3. Filtro resultante = todos los municipis de la província excepto esos dos
- Las divisiones seleccionadas actuarán como filtros de búsqueda

## Cerca (búsqueda)

### Botón "Executar cerca"

- Combina los tres filtros activos: On? + Què? + Quan?
- Pinta de color **Resultat** los municipis que cumplen los criterios dentro del territorio seleccionado
- Los criterios son **persistentes**: se puede modificar cualquier filtro y re-ejecutar sin perder el contexto
- La lista de resultados aparece en un scroll list debajo del mapa con información adicional de cada resultado

### Botón "Netejar cerca"

- Resetea los tres filtros (On?, Què?, Quan?) completamente
- El mapa vuelve al estado inicial (sin selecciones ni resultados)
- _(Posible futura distinción entre reset parcial y total — pendiente de definir)_

## Interactividad

### Sistema de niveles de líneas delimitantes

- Nivel 1: 100% opacidad, 2px
- Nivel 2: 75% opacidad, 1.5px
- Nivel 3: 50% opacidad, 1px
- Nivel 4: 25% opacidad, 0.5px

La división seleccionada en el selector toma siempre Nivel 1. El resto se distribuyen así:

| Selector  | Nivel 1   | Nivel 2   | Nivel 3  | Nivel 4  |
| --------- | --------- | --------- | -------- | -------- |
| Província | Província | Vegueria  | Comarca  | Municipi |
| Vegueria  | Vegueria  | Província | Comarca  | Municipi |
| Comarca   | Comarca   | Província | Vegueria | Municipi |
| Municipi  | Municipi  | Província | Vegueria | Comarca  |

### Panel de contexto geográfico (parte superior central del mapa)

Muestra la jerarquía completa desde el nivel superior hasta el nivel activo en el selector:

| Selector  | Panel muestra (de arriba a abajo)               |
| --------- | ----------------------------------------------- |
| Província | Província                                       |
| Vegueria  | Província(s) → Vegueria                         |
| Comarca   | Província(s) → Vegueria → Comarca               |
| Municipi  | Província(s) → Vegueria(s) → Comarca → Municipi |

- Si una división pertenece a más de una unidad superior, se muestran todas (ej. Cerdanya → "Girona, Lleida")
- Criterio de ordenación/representación cuando hay múltiples unidades superiores: _(pendiente, posiblemente por % de territorio)_

## Stack tecnològic

| Capa          | Tecnologia           | Notes                                                     |
| ------------- | -------------------- | --------------------------------------------------------- |
| Frontend      | Vue 3 + Vite         | Més accessible que React per a qui ve de fora del món web |
| Llenguatge    | TypeScript           | JS amb tipat estàtic — natural per a qui ve de C          |
| Backend       | Node.js + Express    | Ja iniciat en el prototip                                 |
| Base de dades | PostgreSQL + PostGIS | Relacional + suport natiu de dades geogràfiques           |
| Mapa          | Leaflet.js           | Ja decidit                                                |
| Temps real    | Socket.io            | Per al Trivial multijugador                               |
| Autenticació  | JWT + bcrypt         | Control propi; migracle a servei extern si cal            |
| i18n          | i18next              | Frontend i backend comparteixen el mateix sistema         |

## Entorn de desenvolupament

- **SO:** Ubuntu 24.04.4 LTS
- **IDE:** VSCode
- **Contenidors:** Docker + Docker Compose — tot l'entorn definit en codi (PostgreSQL, Node, Vue). Facilita la col·laboració i l'onboarding de nous contribuïdors.
- **Desenvolupament en local** fins a tenir una versió presentable. Migració a servidor dedicat posteriorment.

## Best practices i ways of working

| Pràctica         | Eina                                                | Equivalent embedded  |
| ---------------- | --------------------------------------------------- | -------------------- |
| Unit testing     | Vitest                                              | TDD amb CUnit/Unity  |
| E2E / BDD        | Playwright + Cucumber.js                            | BDD                  |
| Linting          | ESLint + Prettier                                   | Linters              |
| Anàlisi estàtic  | TypeScript                                          | Anàlisi estàtic de C |
| Pre-commit hooks | Husky + lint-staged                                 | Pre-commit hooks     |
| CI/CD pipelines  | GitHub Actions _(pendent de decisió de plataforma)_ | Pipelines CI/CD      |
| Code coverage    | Integrat a Vitest                                   | Coverage             |

**Principi:** totes aquestes pràctiques es configuren des del primer commit, no s'afegeixen després. Si s'incorporen col·laboradors, les regles ja estan definides i automatitzades.

## Repositori i control de versions

- **Plataforma:** GitHub (repo públic)
- **Llicència:** AGPL-3.0 — qui faci servir el codi ha de publicar les seves modificacions també com a OpenSource, inclús si és un servei web
- **OpenSource per convicció:** es vol fomentar la col·laboració externa. Docker garanteix que qualsevol col·laborador pugui aixecar l'entorn amb un sol comandament.

## Seguretat

- Credencials i secrets **mai** al repositori — gestionats amb variables d'entorn (`.env`)
- `.env` sempre al `.gitignore` des del primer commit
- `.env.example` al repo com a plantilla sense valors reals
- Bones pràctiques de seguretat aplicades durant tot el desenvolupament (OWASP top 10, validació d'inputs, etc.)

## Estructura de la página

### Hero (franja superior)

- Ocupa todo el ancho de la pantalla, altura de franja apaisada (no full viewport)
- El mapa debe ser visible directamente debajo sin necesidad de hacer scroll
- Contenido: pase de diapositivas de imágenes estáticas emblemáticas de Catalunya
  - Paisajes: Montserrat, Pica d'Estats, Pedraforca, Montseny...
  - Cultura popular: Castellers, Sardanes, Balls de Bastons, Trabucaires, Caga Tió, Castanyera, Correfocs, La Patum...
  - Patrimoni: Sagrada Família, Catedral de Girona, Amfiteatre de Tarragona...
- Texto superpuesto: título del proyecto + claim ("Descobreix Catalunya" o similar)
- Sin CTA de momento

### Mapa + Cerca

- Inmediatamente debajo del hero
- Ver sección "Funcionalitats principals" y "Cerca"

## Espai d'usuari

### Registro y login

Necesario para contribuir contenido y participar en el sistema de verificación.

### Contribución de contenido

Un usuario registrado puede aportar un elemento nuevo no existente en la base de datos (ej. pista de petanca, font d'aigua, pipican...). El elemento entra en estado **pendent de verificació** y no aparece en el mapa hasta alcanzar el umbral de confirmaciones.

### Sistema de verificación colectiva

Tres tipos de reporte que los usuarios pueden hacer sobre cualquier elemento:

- **Confirmar existència** — corroboran que el elemento existe y está activo
- **Reportar canvi d'estat** — el elemento existe pero algo ha cambiado (la fuente no tiene agua, el parque está en obras...)
- **Reportar que ja no existeix** — el elemento ha desaparecido (demolición, cambio de uso...)

Esto aplica tanto a **contenido de usuarios** como a **contenido de fuentes oficiales** (Generalitat, ajuntaments, diputacions). El contenido oficial es fiable por defecto pero puede ser refutado si un número suficiente de usuarios lo reporta.

**Umbral de verificación:** _(pendiente de definir — número mínimo de confirmaciones para que un elemento pase a visible o sea marcado como inactivo)_

### Sistema de reputación de usuarios

El peso de la verificación de un usuario no es igual para todos — depende de su historial de contribuciones correctas. Un usuario con muchas verificaciones acertadas tiene más peso que uno nuevo.

Aspectos a definir:

- _(Cómo se calcula la reputación)_
- _(Si la reputación afecta al umbral necesario para verificar)_
- _(Si hay roles diferenciados — usuario básico, verificador de confianza, moderador...)_

## Arquitectura general

**Un sol domini — `viscalaterra.cat`** amb múltiples seccions.

Cerca, Jocs i Merchandising conviuen bajo el mismo dominio, comparten sistema de usuarios e identidad visual. El código es modular internamente (cada sección bien separada) aunque compartan el mismo deploy. Si en el futuro el shop crece, se puede externalizar a subdominio sin romper nada.

### Seccions principals (barra de menú)

**Cerca** — La funcionalidad principal. Mapa + filtres On?/Què?/Quan? + resultats.

**Jocs** — Juegos que reutilizan el mapa y el conocimiento de Catalunya. Mecánicas:

- _Identificació territorial_: te dan un nombre → marcas en el mapa, o al revés. Aplicable a comarques, municipis, províncies, veguerías. El usuario puede acotar el territorio antes de jugar (ej. "solo municipis del Maresme").
- _Localització de punts d'interès_: rius, muntanyes (100 cims), castells, parcs naturals... → los ubicas en el mapa, o al revés.
- _Trivial de Catalunya_: preguntas de todo tipo sobre Catalunya. Modalidad multijugador online (jugar contra otros usuarios en tiempo real). _(Requiere infraestructura de tiempo real — WebSockets o similar)_
- Modo invitado: se puede jugar sin registrarse, sin persistencia.
- Usuario registrado: puntuaciones, progreso y rankings guardados.

**Agenda Cultural** — Vista especializada de Cerca, no sección independiente. Acceso rápido desde el menú, pero comparte base de datos y lógica con Cerca. Esencialmente es Cerca pre-filtrada por Què? → Cultura + Quan? → Puntual, con presentación orientada a calendario/eventos. Cualquier persona o colectivo puede anunciar un evento sin distinción entre profesional y amateur. Los municipis con eventos activos aparecen destacados en el mapa.

**Merchandising** — Venta de artículos de la marca. Integrado en el mismo dominio; si crece, candidato a externalizar (ej. Shopify en subdominio).

**Espai d'usuari** — Registro, login, perfil, contribuciones, reputación.

## Requisits de disseny

### Responsive (prioritat alta)

La plataforma debe funcionar correctamente en:

- **Laptop** — experiencia completa
- **Tablet** — adaptación del layout
- **Smartphone** — prioritat màxima, el mapa és el element més complex d'adaptar

El diseño debe pensarse mobile-first. La interacción con el mapa en táctil (pinch, tap, selección de municipis) requiere atención especial.

## Plans de futur

Idees anotades per a versions posteriors. No formen part del roadmap actiu — s'apunten per no perdre-les.

### JulIA — Assistent IA de la plataforma

Un assistent d'intel·ligència artificial integrat a la plataforma per ajudar l'usuari en les seves cerques.

- **Nom:** JulIA (nom català/espanyol comú + acrònim de IA)
- **Casos d'ús previstos:**
  - Cerca en llenguatge natural que es tradueix automàticament als filtres On?/Què?/Quan? ("vull anar a una piscina natural prop de Vic")
  - Assistent contextual del mapa ("quines fires hi ha a la Selva aquest mes?")
  - Descubriment aleatori ("sorprèn-me amb alguna cosa a prop meu", amb geolocalització)
  - Possible presentadora del mòdul Jocs (trivial geogràfic amb personalitat pròpia)
- **Integració tècnica:** Socket.io (ja al stack) + API de Claude amb streaming de respostes

### Viscalaterra Països Catalans

Expansió del mapa i la base de dades per incloure la Comunitat Valenciana i les Illes Balears, completant els territoris de parla catalana.

- Descartada per ara, condicionada a l'èxit de la versió Catalunya
- Implicació tècnica: les capes GeoJSON haurien d'ampliar-se; l'arquitectura modular ho hauria de permetre sense grans refactors
- Ja mencionat a la secció d'Idiomes com a visió a llarg termini

## Notas y decisiones

_(aquí iremos apuntando decisiones importantes y su razonamiento)_
