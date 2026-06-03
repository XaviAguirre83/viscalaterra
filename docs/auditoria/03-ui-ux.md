# Auditoria UI/UX — viscalaterra.cat

**Data:** 2026-06-03  
**Auditor:** Claude Sonnet (rol: dissenyador de producte i especialista UI/UX i a11y)  
**Versió del codi:** commit `0d844f0`  
**Abast:** frontend Vue 3 — components, vistes, CSS, HTML base, paleta de colors

---

## Resum executiu

| Àrea                  | Estat         | Problemes crítics | Problemes greus | Millores |
| --------------------- | ------------- | :---------------: | :-------------: | :------: |
| Accessibilitat (a11y) | ⚠️ Deficient  |         3         |        5        |    4     |
| Responsive / mòbil    | ✅ Acceptable |         0         |        2        |    3     |
| Flux d'usuari         | ⚠️ Parcial    |         2         |        3        |    4     |
| Consistència visual   | ✅ Bona       |         0         |        1        |    4     |
| SEO / metadades       | 🔴 Crític     |         4         |        0        |    2     |

**Valoració general:** L'esquelet visual és sòlid i la paleta de colors és coherent. Els problemes principals es concentren en tres àrees: el `index.html` és un placeholder sense cap metadada real (bloqueig per a producció), hi ha mancances d'accessibilitat estructurals (focus no visible en la majoria de controls, semàntica ARIA absent), i el flux d'usuari té forats importants (no hi ha estat de càrrega del mapa, ni botó "Executar cerca", ni "Netejar cerca").

---

## 1. Accessibilitat (a11y)

### 1.1 CRÍTIC — `<html lang="">` buit

**Arxiu:** `frontend/index.html:2`

```html
<html lang=""></html>
```

L'atribut `lang` és buit. Els lectors de pantalla no saben en quin idioma llegir el contingut, cosa que provoca síntesi de veu incorrecta. Ha d'indicar `lang="ca"` (català) tal com especifica la spec del producte.

**Impacte:** ALTO | **Esforç:** S  
**Correccció:**

```html
<html lang="ca"></html>
```

---

### 1.2 CRÍTIC — Focus visible absent en la majoria de controls interactius

**Arxius:** `PanellFiltres.vue`, `CercaRapida.vue`, `MapaLeaflet.vue`, `CabeceraApp.vue`

Cap dels botons de la barra de navegació (`On?`, `Què?`, `Quan?`), ítems del menú principal, botons d'autenticació ni selector de nivell territorial té un estil `:focus-visible` explícit. El reset global de `base.css:55` fa `margin: 0` però no reseteja l'outline del navegador de forma explícita; no obstant, molts navegadors i configuracions l'eliminen per defecte o el fan poc visible.

`TabOn.vue:238` és l'únic lloc on hi ha un `:focus-visible` definit:

```css
button:focus-visible {
  outline: 2px solid var(--prov-base);
  outline-offset: 1px;
}
```

Però aquesta regla és `scoped` al component TabOn i no s'aplica a la resta de la UI.

El botó `cerca-btn` a `CercaRapida.vue:139` té `tabindex="-1"`, cosa que el fa inaccessible des de teclat (és un botó visual per fer focus a l'input, cosa acceptable, però cal documentar-ho).

**WCAG 2.1 — 2.4.7 (Focus Visible, nivell AA)**  
**Impacte:** ALTO | **Esforç:** S  
**Correcció recomanada:** afegir a `main.css` una regla global:

```css
:focus-visible {
  outline: 2px solid #2d6a2d;
  outline-offset: 2px;
}
```

I assegurar que cap component el sobreescriu amb `outline: none`.

---

### 1.3 CRÍTIC — Overlay de rotació sense `role` ni `aria-hidden` per a no-lectors

**Arxiu:** `App.vue:11-19`

```html
<div class="overlay-orientacio" aria-live="polite"></div>
```

L'overlay de "Gira el dispositiu" té `aria-live="polite"` (bé, anuncia quan apareix), però quan **no** és visible (`display: none`), els lectors de pantalla ja ho ignoren automàticament. El problema és diferent: quan l'overlay **sí** és visible, no té `role="alert"` ni `aria-modal`, i el contingut darrere (mapa, botons) segueix accessible per teclat. Un usuari de teclat pot seguir navegant per la UI oculta. Cal bloquejar el focus quan l'overlay és actiu.

**Impacte:** ALTO | **Esforç:** M

---

### 1.4 GREU — Selector d'idioma sense estat actiu accessible

**Arxiu:** `CabeceraApp.vue:23-30`

```html
<button
  class="selector-idioma__btn"
  :class="{ 'selector-idioma__btn--actiu': idioma === idiomeActiu }"
>
  {{ idioma }}
</button>
```

El botó actiu (CA) no té `aria-pressed="true"` ni `aria-current="true"`. Visualment es distingeix pel color de fons, però un lector de pantalla no pot saber quin idioma és l'actiu.

**Impacte:** MEDIO | **Esforç:** S  
**Correcció:**

```html
<button :aria-pressed="idioma === idiomeActiu" ...></button>
```

---

### 1.5 GREU — Botons de nivell territorial sense context accessible

**Arxiu:** `MapaLeaflet.vue:652-716`

Els quatre botons del panell `info-territori` (Província, Vegueria, Comarca, Municipi) no indiquen el seu estat actiu de forma accessible:

```html
<button
  class="info-territori__cap"
  :class="{ 'info-territori__cap--actiu': mapaStore.nivellActiu === 'provincies' }"
  @click="mapaStore.defineixNivellActiu('provincies')"
>
  Província
</button>
```

Manca `aria-pressed` o `role="radio"` + `aria-checked`. Un usuari de lector de pantalla no sap quin nivell és l'actiu. Funcionalment, aquests botons actuen com un grup de radio buttons (una selecció exclusiva).

**Impacte:** ALTO | **Esforç:** S  
**Correcció recomanada:**

```html
<div role="radiogroup" aria-label="Nivell territorial actiu">
  <button role="radio" :aria-checked="mapaStore.nivellActiu === 'provincies'" ...>Província</button>
  ...
</div>
```

---

### 1.6 GREU — Menú principal sense `role="menu"` ni gestió de focus

**Arxiu:** `PanellFiltres.vue:79-89`

El desplegable del menú principal s'obre amb `v-if="menuObert"` però quan s'obre no fa focus al primer ítem, i no té `role="menu"` ni `role="dialog"`. L'overlay transparent per tancar (`overlay-menu`) no té `aria-hidden`.

```html
<div v-if="menuObert" class="menu-principal">
  <button v-for="seccio in SECCIONS" ...></button>
</div>
```

**Impacte:** MEDIO | **Esforç:** M

---

### 1.7 GREU — Botó hamburger: l'estat obert/tancat no es comunica

**Arxiu:** `PanellFiltres.vue:51-57`

```html
<button
  class="btn-menu"
  :class="{ 'btn-menu--obert': menuObert }"
  aria-label="Menú principal"
  @click="menuObert = !menuObert"
></button>
```

Falta `aria-expanded`:

```html
<button aria-label="Menú principal" :aria-expanded="menuObert" ...></button>
```

Sense `aria-expanded`, el lector de pantalla no sap si el menú és obert o tancat.

**Impacte:** MEDIO | **Esforç:** S

---

### 1.8 GREU — Mida tàctil insuficient en múltiples controls

**WCAG 2.5.5 (Target Size, AA en WCAG 2.2)**

- **`selector-idioma__btn` (`CabeceraApp.vue:127-129`):** `padding: 4px 7px`, font 0.75rem → àrea clicable estimada ~28×22px. Mínim recomanat: 44×44px.
- **`comarca__expand` (`TabOn.vue:338-347`):** `width: 28px`, `padding: 6px 0` → àrea ~28×28px. Insuficient.
- **`municipi__btn` (`TabOn.vue:377-382`):** `padding: 4px 12px 4px 28px` → ~28-32px d'alçada. En mòbil, on se seleccionen municipis individuals, és massa petit.
- **`cerca-btn` i `cerca-input` (`CercaRapida.vue:212,219`):** `height: 30px`. Inferior als 44px recomanats.
- **Tabs `On?/Què?/Quan?` (`PanellFiltres.vue:228-230`):** `padding: 6px 16px` → alçada ~34px.

**Impacte:** ALTO (especialment en mòbil) | **Esforç:** S

---

### 1.9 Contrast de color — Anàlisi WCAG AA (4.5:1 per text normal)

| Element                                            | Color text                             | Fons                     | Rati estimat |               Compleix AA?               |
| -------------------------------------------------- | -------------------------------------- | ------------------------ | :----------: | :--------------------------------------: |
| `.selector-idioma__btn` (inactiu)                  | `rgba(255,255,255,0.55)` ≈ `#ffffff88` | `#1a2635`                |    ~3.5:1    |                    ❌                    |
| `.auth__btn--secundari`                            | `rgba(255,255,255,0.85)`               | `#1a2635`                |    ~4.2:1    |                  ~bord                   |
| `.cabecera__nom` "viscalaterra.cat"                | `#ffffff` + shadow                     | vídeo variable           |   variable   | ⚠️ sense vídeo OK, amb vídeo no garantit |
| `.info-territori__cap` (inactiu)                   | `#999`                                 | `#ffffff`                |    ~2.8:1    |                    ❌                    |
| `.cerca-grup__titol`                               | `#aaa`                                 | `#ffffff`                |    ~2.3:1    |                    ❌                    |
| `.cerca-resultat__context`                         | `#999`                                 | `#ffffff`                |    ~2.8:1    |                    ❌                    |
| `.opcio__descripcio`                               | `#888`                                 | `#ffffff`                |    ~3.5:1    |                    ❌                    |
| Municipi seleccionat — text `#444`                 | `#444`                                 | `var(--prov-hover)` clar |    >4.5:1    |                    ✅                    |
| Província seleccionada total — `contrast: #ffffff` | `#ffffff`                              | `base` sòlid             |    ≥4.8:1    |                    ✅                    |

**Problemes principals:**

1. **`CabeceraApp.vue:133`** — idiomes inactius: `rgba(255,255,255,0.55)` sobre `#1a2635` → rati ~3.5:1, insuficient.
2. **`MapaLeaflet.vue:769`** — `.info-territori__cap` color `#999` sobre blanc → rati ~2.8:1, falla WCAG AA.
3. **`CercaRapida.vue:258,292`** — etiquetes de grup i context en gris clar: `#aaa`/`#999` sobre blanc.
4. **`TabQuan.vue:81`** — `.opcio__descripcio` color `#888` sobre blanc.

**Impacte:** ALTO | **Esforç:** S  
**Correcció general:** substituir `#aaa`→`#767676`, `#999`→`#737373`, `#888`→`#767676`.

---

### 1.10 BAIX — `<video>` sense `<track>` per a descripció alternativa

**Arxiu:** `CabeceraApp.vue:10-12`

El vídeo de la capçalera (quan estigui actiu) no preveu un `<track kind="descriptions">`. Per a usuaris de lectors de pantalla és acceptable que sigui decoratiu, però caldria afegir `aria-hidden="true"` al `<video>`.

**Impacte:** BAJO | **Esforç:** S

---

## 2. Responsive i mòbil

### 2.1 GREU — El panell `info-territori` pot sortir dels límits de pantalla en mòbils petits

**Arxiu:** `MapaLeaflet.vue:802-813`

```css
@media (max-width: 768px) {
  .info-territori {
    width: calc(100vw - 80px);
    max-width: 340px;
  }
}
```

La graella 2×2 en mòbil funciona bé en pantalla de 375px d'ample. Però el panell s'ancora a `left: 50%; transform: translateX(-50%)` sense `min-width` ni protecció davant de textos molt llargs (p. ex. "Alt Pirineu i Aran" + "Catalunya Central" simultanis). El `white-space: nowrap` i `text-overflow: ellipsis` al valor ho mitiguen, però el cap de columna ("Vegueria") pot truncar-se en pantalles de 320px.

**Impacte:** MEDIO | **Esforç:** S

---

### 2.2 GREU — Zones tàctils del TabOn insuficients en mòbil

**Arxiu:** `TabOn.vue:377-382` (ja citat a 1.8)

En mòbil, on el panell On? és en columna única i l'usuari ha de seleccionar municipis individuals, l'alçada de `4px 12px` és massa petita. La selecció de municipis en mòbil és la interacció principal de la plataforma.

**Impacte:** ALTO | **Esforç:** S  
**Correcció:** `padding: 8px 12px 8px 28px` en mòbil (afegir media query).

---

### 2.3 MEDI — Mancança de `max-height` a l'input de cerca en mòbil quan el teclat virtual s'obre

**Arxiu:** `PanellFiltres.vue:323-332`

El desplegable de Tab actiu té `max-height: calc(100dvh - 160px)` i `overflow-y: auto` (bé). Però quan el teclat virtual del mòbil s'obre i redueix el `100dvh`, el dropdown del cerca ràpida (`CercaRapida.vue`) que té `position: absolute; z-index: 3000` pot quedar parcialment oculta sota el teclat. No hi ha cap `max-height` ni `bottom` limit al dropdown.

**Impacte:** MEDIO | **Esforç:** M

---

### 2.4 BAIX — Botó hamburger de 36×36px en mòbil, just per sota del mínim

**Arxiu:** `PanellFiltres.vue:152-155`

```css
.btn-menu {
  width: 36px;
  height: 36px;
}
```

36px és per sota dels 44px de WCAG 2.5.5 i de les guidelines d'Apple HIG / Material Design. En mòbil hauria de ser almenys 44px.

**Impacte:** BAJO | **Esforç:** S

---

### 2.5 BAIX — `overflow: hidden` al body bloqueja el scroll en futures vistes

**Arxiu:** `App.vue:22-28`

```css
.app-layout {
  height: 100vh;
  overflow: hidden;
}
```

Aquesta estructura és correcta per a la vista Cerca (mapa a pantalla completa), però quan s'implementin vistes com Agenda o Sobre nosaltres que necessiten scroll, caldria gestionar-ho per ruta. De moment les vistes stub no ho pateixen.

**Impacte:** BAJO | **Esforç:** M (a considerar quan s'implementin les vistes)

---

## 3. Flux d'usuari i descobribilitat

### 3.1 CRÍTIC — No hi ha "Executar cerca" ni "Netejar cerca"

La spec (`viscalaterra_plan.md:113-125`) descriu clarament dos botons fonamentals: "Executar cerca" (combina On?+Què?+Quan? i pinta resultats) i "Netejar cerca" (reseteja tot). Cap dels dos existeix al codi actual. Sense el botó d'execució, l'usuari no sap quan la seva selecció "fa alguna cosa" — la plataforma sembla inacabada fins i tot com a prototip.

**Impacte:** ALTO | **Esforç:** M

---

### 3.2 CRÍTIC — Estat de càrrega del mapa invisible per a l'usuari

**Arxiu:** `MapaLeaflet.vue:460-527` (funció `carregaCapa`)

La funció `carregaCapa` fa un `await fetch(...)` sense cap indicador visual. En la primera càrrega (o canvi de zoom), el mapa mostra tiles buits i polígons absents durant un temps variable sense cap `spinner`, `skeleton` ni missatge. L'usuari pot pensar que l'app no funciona.

Per contrast, `TabOn.vue:91` sí que té:

```html
<div v-if="territoris.carregant" class="estat-carregant">Carregant territoris…</div>
```

Però el mapa no té equivalent. El `carregaTotesCapes` és una Promise sense cap feedback visible.

**Impacte:** ALTO | **Esforç:** M

---

### 3.3 GREU — Discoverabilitat del selector de nivell territorial

**Arxiu:** `MapaLeaflet.vue:649-718`

El panell `info-territori` (Província/Vegueria/Comarca/Municipi) és la UI per canviar el mode d'interacció del mapa. És crucial, però és visualment discret: fons blanc, text gris, posicionat al centre superior. Un usuari primerenc pot no adonar-se que **és clicable** — no té icona, no té `cursor: pointer` visible a nivell de panell (sí als botons individuals), ni cap indicació textual ("Clica per canviar de nivell").

A més, la fila de valors (`info-territori__val-cel`) té `pointer-events: none` al panell sencer per defecte (`info-territori`), i `pointer-events: auto` a la grid. Però els valors textuals (noms del territori en hover) no donen cap indicació que els capçaleres siguin botons.

**Impacte:** MEDIO | **Esforç:** S

---

### 3.4 GREU — Estat buit de `TabQue` i `TabQuan` sense context

**Arxiu:** `TabQue.vue`, `TabQuan.vue`

`TabQue.vue` mostra checkboxes de categories sense cap descripció de la font de dades ni de si "Esports" és pistes municipals, clubs privats, o ambdós. Un usuari novell no sap a quins tipus de llocs apunten les categories.

`TabQuan.vue` té el botó "Qualsevol moment" (`linha 30`) que apareix condicionalment (`v-if="filtres.temporalitat"`), però no hi ha cap text que expliqui la diferència entre "Permanent", "Recurrent" i "Puntual". Les breus descripcions ("Sempre disponible", "Es repeteix periòdicament") ajuden, però no queda clar com interactuen amb la cerca.

**Impacte:** MEDIO | **Esforç:** S

---

### 3.5 GREU — Cerca ràpida: màxim 8 municipis sense avís

**Arxiu:** `CercaRapida.vue:58-75`

```typescript
if (comptMunicipis >= 8) break
```

Quan hi ha més de 8 municipis coincidents (p. ex. buscant "sant") el dropdown trunca silenciosament els resultats. No hi ha cap indicació de "i X resultats més" ni de "refina la cerca". L'usuari pot creure que "Sant Boi de Llobregat" no existeix si no apareix perquè ja s'han mostrat 8 "Sants".

**Impacte:** MEDIO | **Esforç:** S  
**Correcció:** afegir un missatge com "Mostrannt 8 de N resultats. Afina la cerca per veure'ls tots."

---

### 3.6 MEDI — No hi ha feedback visual de la selecció total activa

Quan l'usuari ha seleccionat, per exemple, la comarca del Maresme des del mapa, el panell On? ho reflecteix (color parcial/total a la comarca), però no hi ha cap resum visible fora del panell On? tancat. La barra de navegació no mostra "3 comarques seleccionades" ni res similar. L'usuari que tanca el panell On? perd el context de quins filtres té actius.

**Impacte:** MEDIO | **Esforç:** M

---

### 3.7 BAIX — Spinner de càrrega del `TabOn` massa discret

**Arxiu:** `TabOn.vue:91`

```html
<div v-if="territoris.carregant" class="estat-carregant">Carregant territoris…</div>
```

El text de càrrega no té cap indicador visual animat (spinner, skeleton). L'usuari pot confondre-ho amb un estat d'error.

**Impacte:** BAJO | **Esforç:** S

---

## 4. Consistència visual

### 4.1 GREU — Jerarquia tipogràfica inconsistent

El projecte usa `base.css` amb la font Inter i `font-size: 15px` de base. Però als components s'usen mides en `rem` sense seguir cap escala tipogràfica coherent: `0.7rem`, `0.75rem`, `0.78rem`, `0.8rem`, `0.82rem`, `0.85rem`, `0.88rem`, `0.9rem`, `1rem`. Això resulta en diferències visuals mínimes que no aporten jerarquia clara i dificulten la consistència.

Exemples:

- `CercaRapida.vue:258` — `.cerca-grup__titol` → `0.7rem`
- `CercaRapida.vue:283` — `.cerca-resultat__nom` → `0.88rem`
- `CercaRapida.vue:290` — `.cerca-resultat__context` → `0.78rem`
- `TabOn.vue:378` — `.municipi__btn` → `0.82rem`
- `PanellFiltres.vue:231` — `.tabs button` → `0.9rem`

**Recomanació:** Establir una escala tipogràfica de 4-5 mides com a custom properties CSS (`--text-xs: 0.75rem`, `--text-sm: 0.875rem`, `--text-base: 1rem`, etc.) i substituir les mides ad-hoc.

**Impacte:** BAJO | **Esforç:** M

---

### 4.2 MEDI — Hover/active states inconsistents entre components

- Tabs `On?/Què?/Quan?` (PanellFiltres) → background `#f0f4f0`, color `#2d6a2d` en hover.
- Ítems del menú principal → background `#f4f7f4`, color `#2d6a2d` en hover.
- Resultats del cerca ràpida → background `#f4f7f4`.
- Opcions de TabQue/TabQuan → background `#f0f4f0`.

Valors lleugerament diferents (`#f0f4f0` vs `#f4f7f4`) sense diferència visual perceptible. No és un problema crític, però sí un indicador de manca de sistema de disseny.

**Impacte:** BAJO | **Esforç:** S

---

### 4.3 MEDI — Transicions absents en accions clau

- Obrir/tancar el desplegable de Tab (`PanellFiltres.vue:92-96`) apareix/desapareix sense transició (`v-if` sec). Amb `<Transition>` de Vue seria trivial.
- El panell `info-territori` apareix i canvia de contingut sense transició.
- L'overlay del menú (`overlay-menu`) no té fade-in.

Les transicions suaus milloren la percepció de qualitat i ajuden l'usuari a entendre el model mental de la UI.

**Impacte:** MEDIO | **Esforç:** S

---

### 4.4 BAIX — El botó "Qualsevol moment" (TabQuan) no té classe CSS explícita

**Arxiu:** `TabQuan.vue:30-34`

```html
<button v-if="filtres.temporalitat" @click="filtres.setTemporalitat(null)">Qualsevol moment</button>
```

El botó no té cap classe CSS, cosa que fa que hereti l'estil global de `button` de `base.css` (que té `font-weight: normal`). Es veu com un botó genèric desconnectat del sistema de disseny, a diferència dels botons amb border-radius de la resta de la UI.

**Impacte:** BAJO | **Esforç:** S

---

### 4.5 BAIX — Manca de `dark mode` tot i tenir variables definides

**Arxiu:** `base.css:39-51`

`base.css` defineix un `@media (prefers-color-scheme: dark)` amb colors de fons foscos. Però cap component dels auditats usa `var(--color-background)` ni `var(--color-text)` — tots usen colors literals (`#ffffff`, `#222`, etc.). El dark mode no funcionaria si s'activés.

**Impacte:** BAJO | **Esforç:** L (sistemàtic, a llarg termini)

---

## 5. Microcopy en català

### 5.1 Observacions generals

El microcopy existent és correcte i natural en català. Punts positius:

- "Carregant territoris…" (TabOn) — clar i funcional.
- "Cap resultat per «X»" (CercaRapida) — el format amb cometes angulars (« ») és l'estàndard tipogràfic català, molt ben escollit.
- Etiquetes "Expandir"/"Replegar" als aria-label dels triangles — correctes.

### 5.2 Millores de microcopy recomanades

| Ubicació                 | Text actual             | Text proposat                                                               | Motiu                           |
| ------------------------ | ----------------------- | --------------------------------------------------------------------------- | ------------------------------- |
| `TabQuan.vue:30`         | "Qualsevol moment"      | "Elimina el filtre de temps"                                                | Més descriptiu de l'acció       |
| `TabOn.vue:91`           | "Carregant territoris…" | "Carregant el mapa de Catalunya…"                                           | Més contextual                  |
| `CabeceraApp.vue:34`     | "Registra't"            | "Crea un compte"                                                            | Més explícit per a nous usuaris |
| Futur estat buit TabQue  | —                       | "Les categories estaran disponibles aviat"                                  | Empty state amable              |
| Futur error càrrega mapa | —                       | "No s'ha pogut carregar el mapa. Comprova la connexió i torna-ho a provar." | Error amable amb acció          |

---

## 6. SEO i metadades (index.html)

**Arxiu:** `frontend/index.html`

```html
<!doctype html>
<html lang="">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
  </head>
</html>
```

### 6.1 CRÍTIC — Títol és "Vite App"

El `<title>` és el placeholder per defecte de Vite. En producció, Google indexaria la pàgina amb el títol "Vite App". Impacte SEO i branding devastador.

**Impacte:** ALTO | **Esforç:** S

---

### 6.2 CRÍTIC — Cap metadada de descripció

Manca completament `<meta name="description">`. La descripció és el segon element més important per SEO (après del title) i és el text que apareix als resultats de cerca.

**Impacte:** ALTO | **Esforç:** S

---

### 6.3 CRÍTIC — Cap Open Graph ni Twitter Card

Sense `og:title`, `og:description`, `og:image` i `og:url`, quan algú comparteixi l'enllaç a xarxes socials o missatgeria (WhatsApp, Telegram) no apareixerà cap preview. Per a una plataforma de descobriment que es voldrà compartir ("mira aquest lloc al Maresme que he trobat"), és un punt de fricció important.

**Impacte:** ALTO | **Esforç:** S

---

### 6.4 CRÍTIC — Cap favicon real ni `apple-touch-icon`

`<link rel="icon" href="/favicon.ico">` apunta a un fitxer que probablement no existeix (no s'ha fet push de cap favicon al repo). En mòbil, sense `apple-touch-icon` el shortcut de "Afegir a pantalla d'inici" mostrarà una icona genèrica.

**Impacte:** MEDIO | **Esforç:** M (requereix assets de disseny)

---

### Exemple de `index.html` complet recomanat

```html
<!doctype html>
<html lang="ca">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>viscalaterra.cat — Descobreix Catalunya</title>
    <meta
      name="description"
      content="Explora municipis, comarques i punts d'interès de Catalunya. Filtra per territori, categoria i data."
    />
    <meta property="og:title" content="viscalaterra.cat — Descobreix Catalunya" />
    <meta
      property="og:description"
      content="Explora municipis, comarques i punts d'interès de Catalunya."
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://viscalaterra.cat" />
    <meta property="og:image" content="https://viscalaterra.cat/og-image.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  </head>
  ...
</html>
```

---

## 7. Detalls que elevarien el producte

### 7.1 Skeleton loader per al TabOn

Quan `territoris.carregant` és `true`, en lloc del text "Carregant territoris…" es podria mostrar un skeleton loader que simuli les 4 columnes de l'On? (animació pulsant). Dona una percepció de velocitat molt superior.

### 7.2 Animació del panell `info-territori` en hover

Quan el cursor entra a un polígon del mapa, els valors (nom del territori) apareixen instantàniament. Una transició `opacity` suau (`transition: opacity 0.1s`) donaria una sensació molt més refinada sense cost de rendiment.

### 7.3 Confirmació visual de selecció al mapa

Quan l'usuari fa clic i selecciona un territori, no hi ha cap feedback de "clic acceptat". Una breu animació (flash de l'opacitat del fill durant 150ms) confirmaria visualment l'acció, especialment útil en mòbil on no hi ha cursor.

### 7.4 Comptadors de selecció visibles sempre

Al panell On?, els comptadors `[sel/total]` solo apareixen quan `sel > 0`. Però podria ser útil mostrar el total sempre ("0/47 municipis") per comunicar l'escala de la selecció possible.

---

## Top 8 millores prioritzades (impacte vs esforç)

| #   | Millora                                                                                          | Àrea         | Impacte | Esforç | Arxiu principal                                                        |
| --- | ------------------------------------------------------------------------------------------------ | ------------ | :-----: | :----: | ---------------------------------------------------------------------- |
| 1   | Corregir `<html lang="">` → `lang="ca"`                                                          | A11y + SEO   |  ALTO   |   S    | `index.html:2`                                                         |
| 2   | Completar metadades SEO (`<title>`, `description`, OG tags)                                      | SEO          |  ALTO   |   S    | `index.html`                                                           |
| 3   | Afegir `:focus-visible` global i aria-pressed/aria-expanded als controls interactius             | A11y         |  ALTO   |   S    | `main.css`, `PanellFiltres.vue`, `CabeceraApp.vue`, `MapaLeaflet.vue`  |
| 4   | Augmentar mides tàctils a ≥44px (idioma, hamburger, municipis, cerca)                            | A11y + Mòbil |  ALTO   |   S    | `CabeceraApp.vue`, `PanellFiltres.vue`, `TabOn.vue`, `CercaRapida.vue` |
| 5   | Afegir indicador de càrrega al mapa (spinner o skeleton)                                         | Flux         |  ALTO   |   M    | `MapaLeaflet.vue`                                                      |
| 6   | Implementar botons "Executar cerca" i "Netejar cerca"                                            | Flux         |  ALTO   |   M    | `CercaView.vue` / nou component                                        |
| 7   | Corregir contrastos de color insuficients (`#999`, `#aaa`, `rgba(255,255,255,0.55)`)             | A11y         |  ALTO   |   S    | `MapaLeaflet.vue`, `CercaRapida.vue`, `CabeceraApp.vue`, `TabQuan.vue` |
| 8   | Afegir `aria-expanded` al botó hamburger i `role="radiogroup"` al selector de nivell territorial | A11y         |  MEDIO  |   S    | `PanellFiltres.vue:55`, `MapaLeaflet.vue:649`                          |

---

_Auditoria realitzada sobre el codi font. No s'ha executat l'aplicació. Alguns problemes de contrast es basen en càlculs estimats — cal verificar amb eines com axe DevTools o WCAG Color Contrast Analyzer._
