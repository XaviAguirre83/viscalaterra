---
títol: Auditoria de bugs — frontend
data: 2026-07-02
abast: codi nou des del 2026-06-13 (auth, enriquiment, fitxa, mapaOpcions, ModalAuth, Explorador, nivellSeleccio) + stores i mapa
eines: 105/105 tests · type-check net · lint 0/0 · i18n ca/es/en 220/220 claus sincronitzades
---

# Auditoria de bugs frontend — 2026-07-02

## Estat dels hallazgos del 2026-06-13

| Hallazgo                                                                                                  | Estat                                                 |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 🔴 Mapa zombie (caché/renderers a nivell de mòdul)                                                        | ✅ aplicat (tot per instància + neteja a onUnmounted) |
| 🟠 tornaAJugar incoherent · halo de flaixJoc · arbre no carregat al wizard                                | ✅ aplicats                                           |
| 🟡 hexARgb amb #rgb                                                                                       | ✅ aplicat                                            |
| 🟡 localStorage sense try/catch                                                                           | ✅ aplicat AVUI (i18n + auth)                         |
| 🟡 regex amb combinants literals a text.ts · ticker 500ms a totes les fases · entraModeJoc abans de capes | ⏳ pendents (menors)                                  |

## Hallazgos nous

### 🔴 ALT 1 — El zoom persistit es convertia en minZoom en re-muntar el mapa — ✅ APLICAT

`MapaLeaflet.vue` (onMounted) llegia `mapaStore.zoom` (l'ÚLTIM zoom, no l'inicial)
com a vista base: `minZoom`, re-centrat i maxBounds. **Reproducció:** /llocs → zoom
13 sobre Barcelona → /legal → tornar a /llocs = impossible fer zoom out (només es
resolia recarregant). Al mòbil, a més, cada visita al joc restava 1 nivell
acumulativament (el `-1` de mòbil es re-aplicava sobre el valor restaurat).
**Fix aplicat:** la vista base surt de les constants `ZOOM_INICIAL`/`CENTRE_INICIAL`
(exportades del store); el zoom/centre persistits només són el punt de partida
(clavats a ≥ base); en desmuntar en mode joc es reinicien les constants.

### 🟠 MITJÀ 1 — Respostes fora d'ordre a carregaCapa — ✅ APLICAT

Zoomends ràpids en xarxa lenta: la resolució antiga podia arribar l'última i
quedar-se com a capa activa; dues crides concurrents de la mateixa clau
descarregaven i construïen la capa dues vegades; el spinner s'apagava abans d'hora.
**Fix aplicat:** single-flight per clau (`cachePromeses`), descart si la resolució
ja no és la vigent en tornar de l'await, comptador de càrregues en vol.

### 🟠 MITJÀ 2 — carregaJo() podia esborrar el token d'una sessió acabada d'obrir — ✅ APLICAT

`stores/auth.ts`: si el token vell caducat trigava a respondre (401) i mentrestant
l'usuari feia login, `netejaToken()` esborrava el token NOU (UI "connectada" sense
token). **Fix aplicat:** es captura el token enviat i només es neteja si segueix
sent l'actual.

### 🟠 MITJÀ 3 — enriquiment.carrega() cacheava el fallo per sempre — ✅ APLICAT

Un tall de xarxa en activar l'escut deixava emblemes i fitxes buits tota la sessió
(es desava `BUIT` i mai es reintentava). **Fix aplicat:** el catch allibera la
promesa i deixa `dades` a null → reintent a la propera crida.

### 🟠 MITJÀ 4 — Girar el mòbil durant el compte enrere — ✅ APLICAT

`pausa()` només actua en fase 'partida': girar durant el "3, 2, 1" deixava el
rellotge corrent sota l'overlay "Gira el dispositiu". **Fix aplicat:** el watch de
fase crida `aplicaPausaLandscape()` en entrar a 'partida'.

### 🟠 MITJÀ 5 — Dos focus-traps actius: un sol Esc tancava els dos diàlegs — ✅ APLICAT

`useFocusTrap.ts`: tots els traps escoltaven a `document` i `stopPropagation` no
atura els listeners del mateix node (wizard + ModalAuth → Esc tancava el modal i
feia retrocedir el wizard). **Fix aplicat:** pila global de traps — només el del
capdamunt processa Escape/Tab.

### 🟡 BAIXOS — ✅ APLICATS

- **ModalAuth no retornava el focus** en tancar-se (es desmunta amb v-if i la
  restauració vivia només al watch) → restauració també a onBeforeUnmount.
- **Script de Google:** reobrir el modal durant la descàrrega deixava el botó
  sense renderitzar (el guard només mirava si el `<script>` existia al DOM) →
  single-flight amb promesa de mòdul + reintent si onerror.
- **localStorage sense try/catch** a l'arrencada d'i18n (pantalla en blanc amb
  "bloquejar dades de llocs") i al login → helper amb try/catch.
- **carregaArbre() sense single-flight** (Explorador + GeoFreak muntats de pressa
  = doble descàrrega de l'arbre) → promesa compartida.

## Verificat sense problemes

- **i18n:** 220 claus idèntiques a ca/es/en; totes les claus usades existeixen,
  incloses les famílies dinàmiques (quan._, geofreak._, auth.errors.\* cotejades
  amb els codis reals del backend).
- **modeJoc ↔ nivellSeleccio:** sense incoherències abastables (panell ocult en
  joc, watchers amb early-return, el mapa renaix en sortir).
- **Reactivitat Pinia** correcta a tots els stores; dobles clics ràpids inofensius;
  transfrontereres i Val d'Aran cobertes (els 43 codis); multijugador amb la
  invariant "tota transició a resultats passa per tancaTorn" intacta.
- **Fugues de memòria:** tots els listeners/timers/rAF amb neteja verificada.
