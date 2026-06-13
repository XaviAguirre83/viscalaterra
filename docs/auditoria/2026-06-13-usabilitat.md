---
titol: Auditoría de usabilidad y accesibilidad — viscalaterra.cat
fecha: 2026-06-13
autor: Claude (rol experto UX / usabilidad / accesibilidad web)
metodo: lectura de código (componentes Vue + CSS scoped), sin ejecución de navegador
alcance: Cerca (mapa + filtros), buscador rápido, cabecera/navegación, juego GeoFreak
formatos: LAPTOP (desktop) y SMARTPHONE (móvil, breakpoint max-width 768px)
auditoria_previa: docs/auditoria/03-ui-ux.md (2026-06-03)
---

# Auditoría de usabilidad y accesibilidad — viscalaterra.cat

## Resumen ejecutivo

Desde la auditoría del 2026-06-03 el proyecto ha resuelto **la gran mayoría** de los
problemas señalados: `:focus-visible` global (`main.css`), token de gris secundario
accesible (`--color-text-secundari: #737373`), escala tipográfica
(`--text-xs…--text-lg`), `aria-expanded`/`aria-pressed`/`role="radio"` en navegación,
selector de nivel y selector de idioma, tamaños táctiles de 44px en móvil para
hamburguesa/tabs/buscador/municipios/idioma, indicador de carga y estado de error del
mapa con reintento, mensaje "8 de N" en el buscador, navegación por teclado en buscador
y en GeoFreak, soporte de `prefers-reduced-motion` en casi todas las animaciones, e i18n
**perfectamente sincronizado** (183 claves idénticas en ca/es/en). El nivel de pulido es
alto, sobre todo en GeoFreak.

Esta auditoría se centra en lo que **queda pendiente** y en lo **nuevo** (el juego, que
no existía en junio 3). Predomina lo móvil y la accesibilidad del juego.

### Conteo por severidad

| Severidad              | Total  | Desktop | Móvil | Ambos |
| ---------------------- | :----: | :-----: | :---: | :---: |
| 🔴 Bloqueante          |   2    |    0    |   2   |   0   |
| 🟠 Fricción importante |   7    |    1    |   4   |   2   |
| 🟡 Mejora notable      |   9    |    2    |   3   |   4   |
| 🔵 Pulido              |   8    |    2    |   2   |   4   |
| **Total**              | **26** |    5    |  11   |  10   |

### Lo más urgente

1. 🔴 (móvil) El **overlay "Gira el dispositiu"** bloquea TODA la app en landscape con
   `max-height: 600px`, lo que también afecta a móviles grandes y a la inmensa mayoría
   de tablets pequeñas en horizontal. Decisión de producto cuestionable: GeoFreak en
   particular se juega muy bien en landscape.
2. 🔴 (móvil) El **HUD de GeoFreak puede solaparse / tapar el mapa jugable** en
   pantallas pequeñas: el chip de marcadores envuelve a varias filas bajo la barra y la
   caja de respuesta de «Com es diu...?» queda muy cerca, dejando poca superficie de
   mapa táctil.
3. 🟠 Falta cierre por **tecla Esc** y **focus-trap** en los modales (configuración y
   resultados de GeoFreak); el foco no se mueve al abrirlos.

---

## LAPTOP (desktop)

### 🟠 D-1 · Modales de GeoFreak sin foco inicial, sin Esc, sin focus-trap

**Fichero:** `views/GeoFreakView.vue` (`.gf-modal`, `role="dialog" aria-modal="true"`).
El modal de configuración y el de resultados declaran `aria-modal` pero: (a) al abrirse
el foco no se traslada al diálogo (queda en el `<body>` o en el botón previo); (b) no se
puede cerrar/avanzar con teclado más allá de tabular; (c) no hay focus-trap, así que con
Tab se puede salir al mapa de fondo. `ModalAuth.vue` tiene el mismo patrón.
**Recomendación:** al montar, `focus()` al primer control (o al `<h2>` con `tabindex=-1`);
atrapar Tab dentro del diálogo; en resultados, permitir Esc → "Torna a jugar"/cerrar.
Lo mismo en `ModalAuth.vue`.

### 🟡 D-2 · El selector de nivel territorial sigue siendo poco descubrible

**Fichero:** `MapaLeaflet.vue` (`.info-territori`). Ya es un `radiogroup` accesible (bien),
pero visualmente es un panel blanco con cabeceras en gris secundario; un usuario nuevo
puede no intuir que las 4 cabeceras (Província/Vegueria/Comarca/Municipi) son botones
que cambian el modo de interacción. No hay icono ni microcopy ("Mostra per…").
**Recomendación:** añadir un rótulo/affordance o un `cursor: pointer` + subrayado sutil
en hover sobre toda la cabecera, no solo color.

### 🟡 D-3 · `info-territori` con ancho fijo de 650px sobre el mapa

**Fichero:** `MapaLeaflet.vue` `.info-territori__grid` usa
`grid-template-columns: 100px 160px 150px 240px` (≈650px + gaps). En laptops de 1280px
es aceptable, pero el panel queda anclado arriba-centro y, con la barra de navegación
encima, reduce notablemente la franja superior del mapa. Es un panel de _hover_ (solo
informativo); ocupa mucho de forma permanente aunque esté vacío ("—").
**Recomendación:** permitir que las columnas vacías colapsen (ancho `auto`/`min-content`)
o reducir el ancho de la columna Municipi.

### 🔵 D-4 · GeoFreak: dos breakpoints distintos (920px barra, 768px HUD)

**Fichero:** `GeoFreakView.vue`. `.gf-barra` cambia a 2 líneas en `max-width: 920px`,
pero el resto del HUD usa 768px. Entre 769–920px la barra ya está apilada mientras el
HUD sigue en modo desktop: combinación poco probada visualmente.
**Recomendación:** unificar criterios o documentar el rango intermedio.

### 🔵 D-5 · `cerca-btn` con `tabindex="-1"` (buscador)

**Fichero:** `CercaRapida.vue:222`. El botón "Cerca" no es alcanzable por teclado (es un
disparador visual del foco del input). Es una decisión defendible, pero conviene marcarlo
`aria-hidden="true"` para que los lectores de pantalla no lo anuncien como acción muerta.

---

## SMARTPHONE (móvil)

### 🔴 M-1 · Overlay de orientación bloquea landscape de forma demasiado agresiva

**Fichero:** `App.vue` (`.overlay-orientacio`, media
`(orientation: landscape) and (max-height: 600px)`).
Bloquear por completo la app en horizontal es una decisión fuerte. El umbral
`max-height: 600px` captura no solo móviles pequeños sino móviles grandes y tablets
modestas en horizontal. Problemas concretos:

- **GeoFreak** (mapa a pantalla completa, clic en territorios) es un caso de uso natural
  en landscape; bloquearlo penaliza precisamente la sección más lúdica.
- En un mapa, el horizontal suele dar **más** superficie útil, no menos.
- No hay forma de "continuar igualmente"; es un muro.
  **Recomendación:** reconsiderar como decisión de producto. Como mínimo, no aplicar el
  bloqueo en `/jocs/*` (el juego va bien en landscape), o sustituir el muro por un aviso
  descartable. Si se mantiene, el overlay (con `role="alert"`) debería además impedir el
  foco del contenido de fondo (hoy el DOM detrás sigue tabulable).

### 🔴 M-2 · HUD de GeoFreak: solapamiento y poca superficie de mapa en móvil

**Fichero:** `GeoFreakView.vue`.

- `.gf-xip--dreta` (marcadores ✓/✗/intentos/💡Pista/↷Passa/Surt) se ancla en `top: 10px`
  centrado y en móvil hace `flex-wrap: wrap`. Con multijugador (hasta 4 nombres + color
  - ✗ + 3 intentos + 3 botones) puede ocupar **3–4 filas**, empujando contenido y
    comiéndose la parte superior del mapa.
- `.gf-pregunta--resposta` (input de «Com es diu...?») se baja a `top: 96px` en móvil
  para no chocar con el chip, pero si el chip envuelve a 3 filas el solape vuelve.
- `.gf-xip--esquerra` (cronómetro + progreso) está en `bottom: 34px`: en móviles con
  barra de navegador inferior puede quedar pegado o tapado pese al uso de `dvh` en el
  layout (el chip usa valor fijo, no dvh-aware).
  **Recomendación:** en móvil, fijar los marcadores como barra compacta de altura conocida
  y reservar ese espacio; mover Pista/Passa/Surt a un menú "⋯" o a una barra inferior;
  calcular `top` del input a partir de la altura real del chip; revisar el `bottom: 34px`
  frente a barras inferiores.

### 🟠 M-3 · Lista de sugerencias de «Com es diu...?» con objetivos táctiles ~31px

**Fichero:** `GeoFreakView.vue` `.gf-suggeriments button` → `padding: 7px 10px`, font
`var(--text-sm)` ≈ 30–32px de alto. Por debajo de los 44px recomendados, y es la
interacción central de esa modalidad en móvil (se toca repetidamente y rápido).
**Recomendación:** `padding: 11px 12px` en `max-width: 768px`. Igual para
`.gf-opcions button` (opciones de pista, 2×2) que ronda los 36px.

### 🟠 M-4 · Botones del HUD (Pista/Passa/Surt) muy pequeños para el dedo

**Fichero:** `GeoFreakView.vue` `.gf-xip__surt`, `.gf-xip__pista` → `padding: 2px 10px`,
font `--text-xs`. Altura efectiva ~22–24px. Son acciones frecuentes durante la partida
(Passa, Pista) y están además apretadas entre sí dentro del chip que envuelve.
**Recomendación:** en móvil subir a `min-height: 40px` con más separación, o reubicarlos
(ver M-2). Cuidado: ✗/intentos/💡 quedan muy juntos y son fáciles de pulsar por error.

### 🟠 M-5 · El mapa en táctil: hover no existe, el panel info-territori queda inerte

**Fichero:** `MapaLeaflet.vue`. La fila de valores de `info-territori` se rellena en
`mouseover`. En táctil no hay hover: un usuario móvil **nunca** ve el nombre del
territorio bajo el dedo; solo verá que se selecciona (relleno) al tocar. El panel ocupa
espacio (M-2/D-3) pero su mitad informativa es inútil en móvil.
**Recomendación:** en táctil, mostrar el nombre del territorio tocado tras el `click`
(antes/junto a la selección), o reducir el panel a solo el selector de nivel en móvil.

### 🟡 M-6 · Modal de configuración: paleta de color de jugador (18px) demasiado pequeña

**Fichero:** `GeoFreakView.vue` `.gf-colors__opcio` → `width/height: 18px`. Elegir color
de conquista en móvil con puntos de 18px y `gap: 4px` es difícil y propenso a error
(toca el de al lado). Es configuración inicial del multijugador local, justo el flujo que
más se hará en móvil compartido.
**Recomendación:** en móvil, círculos de ≥32px y más separación; mantener tamaño actual
solo en desktop.

### 🟡 M-7 · Selects nativos del wizard sin altura mínima táctil garantizada

**Fichero:** `GeoFreakView.vue` `.gf-camp select` → `padding: 9px 10px`, font `--text-sm`
≈ 36px. Aceptable pero por debajo de 44px; en móvil el desplegable nativo lo mitiga, pero
el área de apertura es justa. Los inputs de nombre de jugador (`.gf-jugadors__nom`) igual.
**Recomendación:** `min-height: 44px` en móvil para selects e inputs del wizard.

### 🟡 M-8 · Multijugador local en una sola pantalla: paso de turno poco evidente

**Fichero:** `GeoFreakView.vue` (`anunciTorn`, cuenta atrás "Torn de {nom}").
El cambio de turno se comunica con un anuncio que **se desvanece** (`gf-anunci`, 2.4s) y
con el chip de jugador activo. En un móvil que pasa de mano en mano, si el anuncio ya se
fundió, el jugador entrante debe deducir de quién es el turno por el chip pequeño. No hay
un indicador persistente grande de "te toca a ti, [color]".
**Recomendación:** indicador de turno persistente y prominente en multijugador (banda
superior con color y nombre del jugador activo) mientras dura el turno, no solo al inicio.

### 🔵 M-9 · Tabla de clasificación multijugador puede desbordar en pantallas estrechas

**Fichero:** `GeoFreakView.vue` `.gf-classificacio` (5 columnas: nombre, ✓, punts, temps,
✗). El nombre trunca a `max-width: 140px`, pero con 4 jugadores y cabeceras la tabla
puede quedar muy apretada bajo 360px dentro de un modal de `width: min(460px, 100%)` con
padding reducido.
**Recomendación:** verificar a 320–360px; considerar ocultar la columna menos crítica
(temps o ✗) en móvil muy estrecho.

### 🔵 M-10 · Cuenta atrás y anuncios a gran tamaño sin reserva contra notch/safe-area

**Fichero:** `GeoFreakView.vue` `.gf-compte`, `.gf-anunci` (inset:0, centrado). Centrados,
así que no chocan con notch, pero el HUD fijo (chips) no usa `env(safe-area-inset-*)`.
En iPhone con notch/barra, los chips a `top: 10px` / `bottom: 34px` pueden quedar bajo la
zona segura.
**Recomendación:** añadir `padding`/offset con `env(safe-area-inset-top/bottom)` a los
chips del HUD.

### 🔵 M-11 · Teclado virtual y dropdown del buscador (heredado, sin resolver)

**Fichero:** `CercaRapida.vue` `.cerca-rapida__dropdown` (`position: absolute`, sin
`max-height`). Al abrir el teclado en móvil, la lista de resultados puede quedar bajo el
teclado. El desplegable de tabs sí limita altura con `dvh`, pero este dropdown no.
**Recomendación:** `max-height` dinámico / asegurar scroll dentro del viewport reducido.

---

## AMBOS FORMATOS

### 🟠 X-1 · GeoFreak: anuncios y feedback clave marcados `aria-hidden`

**Fichero:** `GeoFreakView.vue`. `.gf-anunci` (nuevo objetivo / turno) y `.gf-compte`
están como `aria-hidden="true"` o son puramente visuales. La pregunta del turno sí está
en `role="status" aria-live="polite"` (bien), pero el **resultado de cada respuesta**
(acierto/error) se comunica solo con color/animación en el canvas y la sacudida del
input: un usuario de lector de pantalla o con visión reducida no recibe confirmación
textual ("Correcte" / "Error, torna-ho a provar").
**Recomendación:** añadir una región `aria-live` que anuncie el resultado de cada
respuesta y, en «On és...?», el nuevo objetivo de forma accesible.

### 🟠 X-2 · GeoFreak depende casi por completo del color

**Fichero:** `MapaLeaflet.vue` (estilos de juego) + HUD. Acierto = verde, error = rojo,
conquista = color de jugador, objetivo/pista = dorado. Para daltónicos (rojo/verde es el
caso más común) acierto y error pueden confundirse, y los colores de jugador del
multijugador (azul/rojo/verde/morado) son difíciles de distinguir entre sí.
**Recomendación:** reforzar con icono/forma (✓ sobre acertada, ✗ sobre fallada) además
del color; permitir patrón o etiqueta en conquistas multijugador.

### 🟡 X-3 · TabQue: categorías sin contexto de fuente de datos (heredado)

**Fichero:** `TabQue.vue`. Las categorías (temas/subtemas) son checkboxes sin descripción
de qué tipo de lugares representan. Un usuario novel no sabe qué encontrará bajo cada una.
**Recomendación:** tooltip o línea de descripción por tema (como en TabQuan).

### 🟡 X-4 · No hay "Ejecutar búsqueda" ni resumen de filtros activos fuera del panel (heredado, parcial)

**Ficheros:** `PanellFiltres.vue`, `TabOn.vue`. TabOn ya muestra resumen "N seleccionats"

- "Neteja" (mejora real respecto a junio 3). Pero al cerrar el panel On?, no queda
  indicación en la barra de cuántos territorios/categorías/fechas hay activos, ni un botón
  explícito de ejecutar. El modelo "el mapa filtra en vivo" puede no ser evidente.
  **Recomendación:** badge de recuento en los tabs On?/Què?/Quan? cuando tengan filtros
  activos (p. ej. "On? •3").

### 🟡 X-5 · Foco visible puede perderse sobre fondos de marca

**Ficheros varios.** El `:focus-visible` global usa `outline: 2px solid #2d6a2d` (verde de
marca). Sobre superficies verdes (tab activa `#2d6a2d`, `dia-chip.actiu`, `gf-somhi`,
fila de provincia Girona en estado total) el contorno verde sobre verde es casi
invisible.
**Recomendación:** usar un outline de doble color o `outline` blanco + `box-shadow`
oscuro, para garantizar contraste sobre cualquier fondo.

### 🔵 X-6 · El `<video>` de cabecera está vacío (source comentado)

**Fichero:** `CabeceraApp.vue:47-49`. El `<video autoplay loop>` no tiene `<source>`
(comentado). Correcto como placeholder, y ya tiene `aria-hidden`. Cuando se active,
recordar respetar `prefers-reduced-motion` (pausar el vídeo) y verificar contraste del
texto "viscalaterra.cat" sobre el vídeo (hoy hay gradiente, pero el vídeo es variable).

### 🔵 X-7 · `gf-pregunta` con `white-space: nowrap` puede truncar nombres largos

**Fichero:** `GeoFreakView.vue` `.gf-pregunta`. En «On és...?» la pregunta
("On és... Sant Quirze Safaja?") usa `nowrap` + `ellipsis`. Nombres largos de municipio
pueden cortarse justo en la parte importante (el nombre objetivo), que es la información
crítica del turno.
**Recomendación:** permitir 2 líneas (`white-space: normal`, `line-clamp: 2`) en la
pregunta para no truncar el objetivo.

### 🔵 X-8 · Consistencia de microcopy: "Surt" reutilizado con dos sentidos

**Fichero:** `GeoFreakView.vue`. El botón "Surt" del HUD en realidad **abre la
configuración** (`obreConfiguracio` → `tornaAConfiguracio`), no abandona el juego. La
clase CSS es `gf-xip__surt` (igual que "Passa"). Puede confundir: el usuario espera salir
de la sección.
**Recomendación:** renombrar a "Acaba"/"Nova partida" o aclarar que vuelve a la
configuración; separar el estilo de "Passa".

---

## Notas sobre lo ya resuelto (no repetir)

Verificado como **corregido** respecto a `03-ui-ux.md`:
`<html lang>` y metadatos (fuera de este alcance, revisar `index.html`), `:focus-visible`
global, gris secundario accesible vía token, escala tipográfica, `aria-expanded` en
hamburguesa/idioma/usuario, `role="radio"`+`aria-checked` en selector de nivel,
`aria-pressed`/estado accesible en idioma, tamaños 44px en móvil (hamburguesa, tabs,
buscador, municipios, idioma), indicador de carga + estado de error del mapa con
reintento, "8 de N" en buscador, transiciones con `<Transition>` y respeto a
`prefers-reduced-motion`, i18n completo en ca/es/en, navegación por teclado en buscador y
en respuestas/sugerencias de GeoFreak.

---

_Auditoría por lectura de código, sin ejecución de navegador. Los tamaños táctiles y
contrastes son estimaciones a partir del CSS; conviene verificar con dispositivo real y
herramientas (axe DevTools, WCAG Contrast Analyzer)._
