---
titulo: 'Auditoría de documentación — viscalaterra.cat'
fecha: 2026-06-13
autor: auditoría técnica (documentación)
alcance:
  - viscalaterra_plan.md
  - CLAUDE.md
  - README.md
estado: propuestas (ningún fichero modificado salvo este informe)
---

# Auditoría de documentación — 2026-06-13

Revisión de frescura de los tres documentos clave del proyecto contra el código
real (rama `feature/auditoria-bloque-1-2`). Cada afirmación de obsolescencia se
ha cruzado con el fichero/línea de código que la contradice. **No se ha editado
ningún fichero salvo este informe.**

Ficheros de código consultados como fuente de verdad:

- `frontend/src/data/geofreak.ts` — modelo, niveles, partida, pista, puntuación
- `frontend/src/stores/geofreak.ts` — estado del juego, multijugador conquesta
- `frontend/src/views/GeoFreakView.vue` — wizard, HUD, animaciones, random
- `frontend/src/stores/mapa.ts` — interfaz `ModeJocMapa`
- `frontend/src/components/mapa/MapaLeaflet.vue` — tiles Carto, mode joc
- `frontend/src/data/articles.ts`, `frontend/src/data/text.ts`
- `frontend/src/theme/provincies.ts` — `TEMA_VEGUERIA` (9 vegueries)
- `frontend/src/data/temporal.ts` (vía CLAUDE.md) — 4 modalidades Quan?
- `frontend/package.json` — `vue-i18n ^11.4.2`
- `frontend/src/views/JocsView.vue` — tarjetas de juegos

---

## 1. viscalaterra_plan.md

### 1.1 Incoherencias y contenido obsoleto (cruzado con código)

| #   | Línea(s) plan                                                  | Dice el plan                                                                    | Dice el código (fuente)                                                                                                                                                                 | Acción                                                                                          |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | L71-78 (§ Quan?)                                               | "Tres naturaleses de contingut: Permanent / Recurrent / Puntual"                | `data/temporal.ts`: **4 modalidades mutuamente excluyentes** `permanent` / `dates` / `setmanal` / `mensual`, con ordinals (primer…últim). La división "Recurrent/Puntual" ya no existe. | Reescribir § Quan? con las 4 modalidades reales.                                                |
| 2   | L83 (§ Quan?)                                                  | "Interfície del Quan? _(pendent de definir)_"                                   | Implementado en `TabQuan.vue` + `data/temporal.ts` con tests. Ya no está pendiente.                                                                                                     | Sustituir el "pendent de definir" por la descripción real (remitir a CLAUDE.md § Panell Quan?). |
| 3   | L90 (§ Funcionalitats)                                         | "Vegueria (8)"                                                                  | `theme/provincies.ts` `TEMA_VEGUERIA` tiene **9 códigos (00–08)** incluyendo Val d'Aran (`00`). El mapa carga 9.                                                                        | Cambiar a "Vegueria (9, incloent Val d'Aran)".                                                  |
| 4   | L377 (tabla niveles GeoFreak, nivell 1)                        | "Vegueries — Quantitat 8"                                                       | Mismo: 9 vegueries (Val d'Aran es entidad territorial singular pero cuenta como capa). `GeoFreakView.quantitatNivell(1)` devuelve `territoris.vegueries.length`.                        | Cambiar 8 → 9 (o verificar si el árbol del backend devuelve 8 u 9; ver nota al final de 1.1).   |
| 5   | L187 (Stack tecnològic)                                        | "i18n: i18next — Frontend i backend comparteixen"                               | `frontend/package.json`: **`vue-i18n ^11.4.2`**. No hay i18next. CLAUDE.md ya documenta vue-i18n.                                                                                       | Cambiar i18next → Vue I18n (vue-i18n). Matizar que de momento solo es frontend.                 |
| 6   | L221-229 (Fases desplegament 1.5 y 2)                          | Preview en Vercel; Fase 2 = Vercel + Render + Supabase                          | MEMORY/`project_next_steps.md`: "despliegue decidido = VPS Hetzner CX22 en prod, no serverless". Hay `Dockerfile`, `docker-compose.prod.yml`, `Caddyfile` ya en el repo (git status).   | Actualizar fases: la decisión es VPS/Docker desde producción; serverless descartado.            |
| 7   | L340 (§ GeoFreak Pista)                                        | "substitueix l'antiga decisió «el joc no corregeix ni pista»"                   | Correcto, pero conviven referencias antiguas. Verificar que no quede texto contradictorio en otras partes.                                                                              | Limpieza menor.                                                                                 |
| 8   | L371 ("9 nivells") vs L356/L358 ("nivells a triar: 2,3,5,6,7") | Coherente con `NIVELLS` (`data/geofreak.ts`, ids 0–8, contenidor en 2,3,5,6,7). | —                                                                                                                                                                                       | OK, sin cambios (confirmado correcto).                                                          |
| 9   | L323-325 (§ Jocs, mecàniques)                                  | Trivial multijugador online como mecánica                                       | No implementado; `socket.io` no está en `package.json` de back ni front todavía.                                                                                                        | Mantener como visión futura (ya lo está), pero marcar explícitamente "no iniciat".              |
| 10  | L185 / L25 CLAUDE                                              | "Socket.io — Per al Trivial multijugador"                                       | No instalado aún.                                                                                                                                                                       | Marcar Socket.io como "previst, no instal·lat".                                                 |

**Nota sobre el conteo de vegueries (items 3 y 4):** el código de tema usa 9
(`00`–`08`). Conviene verificar qué devuelve `GET /api/territoris/arbre`
(`territoris.vegueries`) para fijar el número con seguridad: si el backend
sirve Val d'Aran como vegueria, son 9; el plan debe alinearse con ese dato.
Recomendación: documentar "9 (8 vegueries + Val d'Aran com a entitat singular)".

### 1.2 Contenido por añadir (cambios recientes del GeoFreak NO reflejados)

La § GeoFreak del plan (L329-401) describe **modal de configuración de 1
paso lineal** y juego en solitario. El código ha evolucionado mucho más allá.
Falta documentar:

1. **Wizard de configuración de 3 pasos** (`GeoFreakView.vue` L127-167,
   L629-757). El plan (L360-366) describe un modal plano "Modalitat → Nivell →
   Contenidor → Som-hi". El real es: **Paso 1 jugadores (1–4) + nombres +
   colores**, **Paso 2 modalitat**, **Paso 3 nivell + contenidor**. Hay
   indicador de pasos (puntitos), botones Enrere/Següent, y validación por paso.

2. **Multijugador local "conquesta" (1–4 jugadores)** — el cambio más grande, no
   mencionado en absoluto en la § GeoFreak. Documentado en `stores/geofreak.ts`
   L28-33, L88-149, L216-294:
   - Turnos alternos ronda a ronda sobre la misma bolsa de demarcaciones.
   - Cada jugador tiene **color propio** que pinta sus conquistas en el mapa
     (`colorsConquestes`, `ModeJocMapa.colorsEncertats`).
   - **Reloj por jugador** (`tempsJugadorMs`, `marcaTornMs`): el cronómetro de
     cada uno solo corre en su turno, pausado el resto.
   - El turno se cierra con acierto, salto (3.º error o error con pista) o Passa;
     los errores 1–2 mantienen el turno.
   - **Clasificación final** ordenada por conquistas y luego puntos, con tabla y
     ganador destacado (🏆) (`GeoFreakView` L433-435, L941-967).
   - Esto realiza la "Modalitat social Local" que el plan ya prevé en L462-469
     ("Modalitats socials dels jocs") — pero esa sección está separada y genérica;
     conviene enlazar/consolidar: el GeoFreak **ya implementa** el modo Local.

3. **Selección de territorio aleatoria (🎲)** — `triaContenidorAleatori`
   (`GeoFreakView` L155-160, botón L718-726). Permite elegir contenedor al azar
   en los niveles "a triar". No aparece en el plan.

4. **Cuenta atrás "3, 2, 1, Som-hi!"** y fase `preparacio` — `executaCompte`
   (`GeoFreakView` L495-549), estado `preparacio` en el store. El mapa se
   encuadra durante la cuenta; el cronómetro arranca al acabar. En multijugador
   antepone "Torn de {nom}". No documentado.

5. **Animaciones de respuesta / feedback visual** — flaix al mapa en acierto/error
   (`flaixJoc`), sacudida del input, anuncio grande del nuevo objetivo que se
   funde (`gf-anunci`, L271-293), confeti de celebración, recuento animado de
   puntos (L555-576), barra de progreso. Respetan `prefers-reduced-motion`. El
   plan no lo menciona.

6. **Artículos catalanes** — módulo `data/articles.ts` (`nomAmbArticle`,
   `nomAmbDe`, `articleComarca`, `articleVegueria`). Genera "del Maresme", "de
   l'Anoia", "d'Osona" en prompts y contexto. Decisión de diseño de producto
   (calidad lingüística) no recogida en el plan.

7. **Tiles sin etiquetas (anti-trampa)** — `MapaLeaflet.vue` L53-73: en modo
   juego cambia de OSM a **Carto Positron `light_nolabels`** para que los
   nombres de los tiles no delaten la respuesta. Es una decisión de producto
   relevante para el juego; el plan solo dice "el panell hover està ocult"
   (L357) pero no menciona las etiquetas del mapa base.

8. **3 intentos por ronda + Passa + salto con pista** (L351-353, L347) — ya
   están en el plan; solo verificar que la redacción coincide con
   `MAX_INTENTS_RONDA = 3` y la lógica de `responClic`/`saltaObjectiu`. Coincide.

9. **Fórmula de puntuación concretada** — el plan (L390-399) la da como "idea
   base" con `bonus_temps` "a definir". El código (`calculaPunts`,
   `data/geofreak.ts` L223-249) ya la fija: `1000 × (nivell+1) × ràtio ×
bonus_temps`, con `ràtio = (encerts − 0,5·encerts_amb_pista)/(encerts+errors)`
   y `bonus = 5/(5+segons_per_demarcació)`. Conviene actualizar la fórmula del
   plan a la implementada (marcándola "v1, a afinar").

10. **Reentrada al wizard desde resultados / Surt** — `obreConfiguracio`,
    `tornaAConfiguracio`, `tornaAJugar` (store L296-307; vista L164-167). El
    modal de resultados tiene "Torna a jugar" y "Canvia configuració". El plan
    (L369) solo cita "Tornar a jugar" y "Canviar nivell".

### 1.3 Propuesta de reestructuración

**Problema actual:** el documento mezcla tres altitudes en un solo nivel de
secciones planas: (a) visión/manifiesto de producto, (b) especificación
funcional de cada sección, y (c) detalles muy técnicos de implementación
(opacidades exactas, fórmulas, paletas hex, lógica de maxBounds). Además, la
§ GeoFreak ha crecido tanto que merece documento propio o subsección con índice,
y la temática de colores y las comarcas transfronterizas están duplicadas entre
el plan y CLAUDE.md.

**Principio rector propuesto:** el plan = **producto y decisiones** (el "qué" y
el "por qué"); CLAUDE.md = **implementación** (el "cómo"). Los detalles técnicos
duros (opacidades, fórmulas, panes Leaflet, hex de paletas) deberían vivir en
CLAUDE.md y el plan remitir a él, no duplicarlos.

#### Índice nuevo propuesto

```
1.  Visió i manifest
    1.1 Descripció general
    1.2 Manifest / esperit
    1.3 Públic objectiu (pendent)
    1.4 Idiomes i i18n

2.  Producte — La plataforma
    2.1 Arquitectura general (un domini, seccions)
    2.2 Estructura de la pàgina (Hero + Mapa)

3.  Secció Cerca (funcionalitat principal)
    3.1 El mapa com a filtre
    3.2 On?  — selector territorial
    3.3 Què? — categories
    3.4 Quan? — 4 modalitats temporals   ← REESCRIURE (era 3 naturaleses)
    3.5 Executar / Netejar cerca
    3.6 Comarques transfrontereres (consolidar: avui surt 2 cops)
    → Detalls tècnics del mapa (nivells de línia, opacitats, navegació,
      maxBounds, panell context) → MOURE a CLAUDE.md i deixar resum + enllaç

4.  Secció Jocs
    4.1 Visió de la secció i mecàniques transversals
    4.2 Modalitats socials (Sol / Local / Online)   ← MOURE aquí des del final
    4.3 GeoFreak  (subdocument propi, veure sota)
    4.4 EscutMaster / BanderaMaster (previst)
    4.5 Capitals de Comarca (previst)
    4.6 Jocs futurs

5.  Secció Agenda Cultural
6.  Secció Marxandatge
7.  Espai d'usuari (registre, contribució, verificació, reputació)

8.  Stack i enginyeria
    8.1 Stack tecnològic   ← CORREGIR i18next→vue-i18n, Socket.io "previst"
    8.2 Entorn de desenvolupament
    8.3 Bones pràctiques / testing
    8.4 Repositori i branques
    8.5 Seguretat

9.  Infraestructura i desplegament   ← ACTUALITZAR a VPS/Docker (Hetzner)

10. Disseny (responsive, mobile-first)

11. Temàtica de colors   ← consolidar amb CLAUDE.md (evitar duplicat hex)

12. Plans de futur (JulIA, Països Catalans)

13. Notes i decisions (geodades, API, històric de decisions del joc)
```

#### Movimientos concretos justificados

- **§ GeoFreak → subdocumento propio** (`docs/geofreak.md`) o subsección 4.3 con
  su propio mini-índice. Razón: ya tiene ~70 líneas y va a crecer (wizard,
  multijugador, animaciones). Dentro, ordenar: Concepto → Modalidades → Mecánica
  (rondas/intentos/passa/pista) → **Wizard 3 pasos (NUEVO)** → **Multijugador
  conquesta (NUEVO)** → HUD y animaciones → Niveles (tabla) → Puntuación
  (fórmula real) → Acceso/ranking.

- **"Modalitats socials dels jocs" (L462-473) → subir a § Jocs cabecera (4.2)**.
  Hoy está al final, después de los juegos individuales; es una mecánica
  transversal y el modo Local **ya está implementado en GeoFreak**, así que debe
  preceder y enlazar.

- **Detalles técnicos del mapa** (sistema de niveles de línea L129-143, selector
  de nivel L145-151, restricciones de navegación L153-160, panel de contexto
  L162-174): **mover el detalle a CLAUDE.md** (que ya lo documenta mejor y más
  actualizado) y dejar en el plan solo la decisión de producto ("4 capas siempre
  visibles, la activa es interactiva"). Evita que el plan quede desfasado cada
  vez que cambia un px o un z-index.

- **Temática de colores** (L526-556): consolidar. Hoy el plan da la tabla de 4
  provincias y las 4 transfronterizas; CLAUDE.md da además las 9 vegueries y la
  función `temaPerComarca`. Dejar el plan con la **decisión de diseño** (cada
  territorio su color, mezcla RGB en transfronterizas) y remitir a
  `theme/provincies.ts` / CLAUDE.md para los hex exactos.

- **Comarcas transfronterizas**: aparecen dos veces (L104-105 en Funcionalidades
  y L542-556 sección propia). Consolidar en una sola (3.6).

- **Infraestructura** (L210-246): reescribir según decisión tomada (VPS Hetzner +
  Docker en producción). Las fases serverless (Vercel/Render/Supabase) pasan a
  "alternativa descartada" o nota histórica.

---

## 2. CLAUDE.md

CLAUDE.md está **mucho más fresco** que el plan (ya usa vue-i18n, 4 modalidades
Quan?, 9 vegueries en la tabla de tema). Pero la § "Secció Jocs" (L297-302) se
quedó en la fase inicial del GeoFreak y no refleja la evolución reciente.
Actualizaciones recomendadas:

1. **Ampliar `stores/geofreak.ts` (L301)**. Hoy dice solo "estat del joc
   (nivell, modalitat, demarcacions pendents/encertades, comptadors,
   cronòmetre)". Añadir:
   - Fases `configuracio → preparacio → partida → resultats`.
   - **Multijugador conquesta**: `jugadors`/`estatJugadors`/`tornActual`,
     turnos alternos, `colorsConquestes`, reloj por jugador (`tempsJugadorMs`,
     `marcaTornMs`), `resultats`/clasificación.
   - Cierre de turno (`tancaTorn`), 3 intentos, Passa, salto con pista.

2. **Documentar el wizard de 3 pasos** en la entrada de `GeoFreakView.vue`
   (jugadores+colores → modalidad → nivel+contenedor; random 🎲; cuenta atrás).

3. **Ampliar `ModeJocMapa` (L302)**. La interfaz real (`stores/mapa.ts` L13-32)
   tiene campos no documentados: `colorsEncertats` (conquesta), `codiObjectiu`
   (objetivo iluminado en «Com es diu...?»), `codisPista` (4 candidatos en «On
   és...?»), `interactiu` (false en modalidad escrita). Documentarlos.

4. **Tiles Carto en modo juego** (no documentado). Añadir a § "Sistema de panes"
   o a § Jocs: en modo juego `MapaLeaflet.vue` (L53-73) cambia de OSM a
   **Carto Positron `light_nolabels`** (`URL_TILES_JOC`) para que las etiquetas
   del mapa base no delaten la respuesta. Es la contrapartida del panel hover
   oculto.

5. **Nuevos módulos `data/`** no listados en la sección Frontend:
   - `data/articles.ts` — artículos catalanes (`nomAmbArticle`, `nomAmbDe`,
     `articleComarca`, `articleVegueria`) para construir prompts ("del Maresme",
     "de l'Anoia").
   - `data/text.ts` — `normalitza()` (lowercase + sin acentos), compartido por
     `CercaRapida` y la respuesta escrita del GeoFreak.
   - `data/geofreak.ts` — modelo puro del juego (niveles, máquina de estados de
     partida, pista, `calculaPunts`). Mismo patrón `data/ ↔ stores/` que
     `temporal.ts ↔ filtres.ts`, conviene mencionarlo igual que se hace con Quan?.

6. **Añadir sección breve "GeoFreak" análoga a "Panell Quan?"**, con la tabla de
   9 niveles y la fórmula de puntuación, o remitir a la § GeoFreak del plan ya
   actualizada.

7. **Verificación menor**: la tabla del stack (L25) cita "Socket.io (Trivial
   multijugador)" — marcar como previsto/no instalado (no está en package.json).

Nada en CLAUDE.md está abiertamente _erróneo_ respecto al código fuera de lo
anterior; es sobre todo **incompleto** en la parte de Jocs.

---

## 3. README.md

El README está **mayormente correcto** pero corto y algo desactualizado:

| #   | Línea                          | Observación                                                                                                                                                                          | Acción                                                                                                                       |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | L8-9                           | Lista Agenda y Jocs como características, pero de forma genérica. **No menciona el GeoFreak** (el componente más avanzado del proyecto y, según MEMORY, primer paso del MVP).        | Añadir una línea destacando el juego GeoFreak (identificación territorial, 9 niveles, modo individual y multijugador local). |
| 2   | L20-21                         | Stack omite **TypeScript** en frontend/backend, **i18n (vue-i18n)**, **Testing (Vitest/Playwright)**. CLAUDE.md sí los lista.                                                        | Alinear la tabla de stack con CLAUDE.md (al menos añadir TypeScript e i18n).                                                 |
| 3   | L47 CONTRIBUTING / L51 LICENSE | **Verificado: ambos ficheros existen** en la raíz. Los enlaces son correctos.                                                                                                        | Sin acción (la sospecha de que faltaban es falsa).                                                                           |
| 4   | L25-43 (Posada en marxa)       | Las instrucciones son correctas y coinciden con CLAUDE.md (`cp .env.example .env`, `docker compose up`, `npm run seed`). El repo clona como `viscalaterra` (placeholder `<usuari>`). | OK; opcional: mencionar puertos (frontend 5173, backend 3000, DB 5432).                                                      |
| 5   | —                              | No menciona el **despliegue de producción** ya iniciado (Dockerfiles, `docker-compose.prod.yml`, Caddyfile presentes en git status).                                                 | Opcional: breve nota o sección "Desplegament" remitiendo a la config de prod.                                                |
| 6   | L21                            | "Socket.io" en el stack pero no está instalado.                                                                                                                                      | Quitar o marcar "previst".                                                                                                   |

El README **no necesita reestructuración**, solo poner al día la lista de
características (mencionar GeoFreak) y la tabla de stack.

---

## Resumen de prioridades

1. **Alta** — Reescribir § Quan? del plan (3 naturalezas → 4 modalidades): es la
   contradicción más grave con el producto real.
2. **Alta** — Documentar en el plan el multijugador conquesta + wizard 3 pasos
   del GeoFreak (el mayor bloque de funcionalidad sin reflejar).
3. **Media** — Corregir "8 vegueries" → 9 (plan L90 y L377); i18next → vue-i18n
   (plan L187); fases de despliegue → VPS/Docker.
4. **Media** — Ampliar § Jocs de CLAUDE.md (store geofreak, ModeJocMapa, tiles
   Carto, módulos data/articles.ts y data/text.ts).
5. **Baja** — README: mencionar GeoFreak y completar tabla de stack.
6. **Baja** — Reestructuración del plan según el índice propuesto (consolidar
   duplicados, separar producto de implementación).
