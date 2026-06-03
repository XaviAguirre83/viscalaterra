# Auditoría integral de viscalaterra.cat — Resumen ejecutivo

> Auditoría realizada el 2026-06-03 por 4 agentes especializados (seguridad, rendimiento, UI/UX, arquitectura/calidad). Cada área tiene su informe detallado con citas `archivo:línea`, snippets de corrección y priorización propia.

## Informes

| #   | Área                 | Informe                                                    | Hallazgo más grave                                                    |
| --- | -------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| 01  | Seguridad            | [`01-seguridad.md`](01-seguridad.md)                       | Sin Helmet, CORS `*` y sin rate limiting (bloqueantes pre-producción) |
| 02  | Rendimiento          | [`02-rendimiento.md`](02-rendimiento.md)                   | Sin gzip: ~6,2 MB de GeoJSON en la carga inicial                      |
| 03  | UI/UX y a11y         | [`03-ui-ux.md`](03-ui-ux.md)                               | `<title>` = "Vite App", `lang=""` vacío, sin meta description/OG      |
| 04  | Arquitectura/calidad | [`04-arquitectura-calidad.md`](04-arquitectura-calidad.md) | Carpeta de tests unitarios vacía; CI no protege runtime               |

## Veredicto general

**El código que existe está muy bien hecho.** No hay vulnerabilidades críticas, no hay inyección SQL ni XSS, `strict: true` en ambos lados, cero `any`/`TODO` en `src`, y el caso difícil del dominio (comarcas/veguerías transfronterizas) está resuelto con corrección de punta a punta. La deuda no está en bugs flagrantes, sino en **andamiaje que falta** (tests, hardening, compresión, metadatos) y en **detalles de pulido** antes de exponer la web a producción.

La mayoría de los problemas de mayor impacto son **fixes baratos** (minutos a una hora cada uno).

---

## Plan de acción priorizado (global)

### 🔴 Bloque 1 — Antes de exponer a internet (alto impacto, bajo esfuerzo)

Casi todo aquí son cambios de minutos con retorno enorme:

1. **Activar gzip en Express** (`compression`) — de ~6,2 MB a ~1,5 MB en la carga inicial. _[Rendimiento #1]_ — **el mejor coste/beneficio del proyecto entero**.
2. **Arreglar `index.html`**: `<title>` real, `lang="ca"`, `<meta description>`, Open Graph. _[UI/UX SEO]_ — bloquea el lanzamiento y arregla de paso el test E2E que fallaría.
3. **Helmet + cerrar CORS** al dominio propio en lugar de `*`. _[Seguridad H-01, H-02]_.
4. **Rate limiting** (`express-rate-limit`) en la API. _[Seguridad H-03]_ — el stream de GeoJSON es un DoS trivial.
5. **Error handler central + `NODE_ENV=production`** para no filtrar stack traces; añadir `.catch()` a `/arbre`. _[Seguridad M-01 + Arquitectura]_.

### 🟠 Bloque 2 — Rendimiento percibido (alto impacto)

6. **Corregir el desajuste de resolución cliente/servidor**: el frontend pide `?zoom=15` y recibe resolución 5.000 para províncies/vegueries cuando le bastaría 250.000 (de ~16 MB combinados a ~2,3 MB). _[Rendimiento #2]_.
7. **Caché en memoria de los GeoJSON** en el backend + `Cache-Control` en `/arbre` (datos estáticos releídos de disco/DB en cada request). _[Rendimiento #3, #4]_.
8. **Spinner/indicador de carga del mapa**: hoy puede parecer congelado mientras descarga. _[UI/UX Flujo]_.

### 🟡 Bloque 3 — Robustez y base de calidad (medio impacto, evita regresiones futuras)

9. **Reparar la base de tests/lint/CI**: carpeta de tests unitarios vacía → `test:unit` pasa sin verificar nada; falta el `.oxlintrc.json` referenciado; el lint corre con `--fix` en CI (debería verificar). Hacer que el CI ejecute realmente E2E/PostGIS. _[Arquitectura — máximo retorno por esfuerzo]_.
10. **try/catch en los fetch del mapa** (`carregaTotesCapes` se llama sin `await`/`catch`) — crítico por el uso móvil objetivo. _[Arquitectura + UI/UX]_.
11. **Bug latente del seed**: `ST_GeomFromGeoJSON` en columna `MULTIPOLYGON` sin `ST_Multi` → una feature `Polygon` aborta el seed entero. _[Arquitectura]_.
12. **Robustecer el stream de GeoJSON** con listener `error` (puede tumbar el proceso). _[Seguridad M-04]_.
13. **Hardening Docker**: usuario no-root, no publicar el puerto de Postgres al host. _[Seguridad M-02, M-03]_.

### 🟢 Bloque 4 — Pulido UI/UX y accesibilidad (mejora la percepción de calidad)

14. **Accesibilidad**: `aria-expanded`/`aria-pressed` en hamburger y tabs, `role="radiogroup"` en el selector de nivell, focus visible global, corregir 5 colores de texto que fallan WCAG AA. _[UI/UX a11y]_.
15. **Zonas táctiles ≥44px**: hamburger, idiomas, botones de municipi, campo de cerca están por debajo (problemático en móvil, que es la interacción principal). _[UI/UX]_.
16. **Botones "Executar cerca" / "Netejar cerca"** de la spec, que no existen en el código. _[UI/UX Flujo]_.
17. **Debounce + micro-optimización en `CercaRapida`** (`normalitza(q)` se invoca ~1000 veces por tecla). _[Rendimiento #5 + UI/UX]_.
18. **Sistema tipográfico** (9 tamaños de fuente ad-hoc) y transiciones en los desplegables; decidir si se mantiene el dark mode de `base.css` (hoy no funciona porque ningún componente usa las custom properties). _[UI/UX Visual + Arquitectura]_.

### 🔵 Bloque 5 — Refactors estructurales (cuando haya tiempo, no urgente)

19. **Dividir `MapaLeaflet.vue` (851L)** en composables: `useMapaTerritoris`, `useEstilTerritori`, `useNavegacioMapa`, `useMascaraCatalunya` — las funciones puras quedan testeables. _[Arquitectura]_.
20. **Capa de servicios en el backend** (separar rutas / lógica / datos). _[Arquitectura]_.
21. **Paquete de tipos compartido FE/BE** + validación de respuestas `fetch` (hoy casteadas con `as` sin validar). _[Arquitectura]_.
22. **Limpiar desfases con CLAUDE.md**: código muerto (`HomeView`, `mapa.ts:volaA`), enlaces del menú a rutas inexistentes (`/merchandising`, `/sobre`). _[Arquitectura]_.

---

## Sugerencia de orden para esta noche

Si dispones de poco tiempo, el **Bloque 1 completo + puntos 6, 7 y 8** transforman el proyecto de "prototipo local" a "listo para enseñar online" en una sola sesión, y casi todo son cambios pequeños y de bajo riesgo. El Bloque 3 (punto 9) es la mejor inversión a medio plazo porque evita que futuras regresiones pasen el CI sin que nadie se entere.
