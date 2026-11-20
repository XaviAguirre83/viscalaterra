# Textos legals

Les quatre pàgines legals del lloc (avís legal, privacitat, galetes i condicions d'ús): un fitxer per text i idioma (`ca/`, `es/`, `en/`), que es mostra a `/legal/<nom-del-fitxer>` (`/legal` és l'índex). Mana el català: les altres versions n'han de dir exactament el mateix, i mentre un text no estigui traduït es mostra en català amb un avís.

Els analitza `data/legal.ts` i els pinten `components/legal/` sense `v-html`. Els tests (`data/__tests__/legal.spec.ts`) passen tots els fitxers: un camp desconegut o un enllaç que no sigui una pàgina del lloc, una web `http(s)` o un `mailto:` fan fallar el CI, i també una traducció que no tingui els mateixos apartats, paràgrafs, elements de llista i pendents que el català.

## Criteri

Els textos diuen només el que exigeix la llei (el que demanen el RGPD, la LSSI i les llicències dels continguts de tercers) o el que protegeix el titular (la limitació de responsabilitat, la reserva del nom i el logotip). Res de descripcions del servei ni de promeses que la llei no demana: cada frase és un compromís que s'ha de complir, i si deixa de ser veritat, el text incompleix. Per això tampoc s'hi escriu res que encara no funcioni: si un text s'avança al codi, es marca com a pendent.

## Format

Markdown reduït, sense HTML ni taules:

- `#` per al títol (un per fitxer), `##` i `###` per als apartats;
- paràgrafs separats per una línia en blanc;
- llistes amb `- `, i dins el text, `**negreta**` i `` `codi` ``;
- enllaços `[text](adreça)`: les adreces que comencen per `/` són pàgines del mateix lloc;
- just després del títol, la línia de la data: `Darrera actualització: …` (`Última actualización: …`, `Last updated: …`). No es toca a mà: la posa el pre-commit (`scripts/data-textos-legals.mjs`) cada cop que el text entra en un commit, i si falta, el commit es rebutja.

## Camps del titular

`{{titular.nom}}` i `{{titular.email}}` no s'escriuen mai aquí, perquè el repositori és públic: vénen de `TITULAR_NOM` i `TITULAR_EMAIL` del `.env` de l'arrel. Els compose els passen al frontend: en local, en arrencar el contenidor (`docker compose up -d frontend` si canvien); al servidor, en compilar (cal tornar a construir la imatge `web`). Són obligatoris: si falten, el text els marca com a pendents.

Els textos no porten NIF ni domicili, per no exposar dades personals: mentre el lloc no tingui cap ingrés, la llei no els exigeix (el RGPD en té prou amb el nom i un contacte, i la LSSI només s'aplica amb activitat econòmica). Abans del primer ingrés, també si és indirecte (anuncis, patrocinis, merchandising), caldrà afegir-los a l'avís legal: els propis, els d'una oficina virtual (domicili) o els d'una societat.

## Marcadors

`[[PENDENT: …]]` assenyala el que encara s'ha de resoldre. La pàgina el ressalta en groc i mostra un avís d'esborrany. No es pot publicar cap text que en tingui cap.

## Quan s'han de canviar

Abans de posar en marxa qualsevol funció que tracti dades noves: classificacions dels jocs, aportacions de llocs, merchandising o anuncis. Si canvien les condicions d'ús, també se n'ha d'apujar la versió, perquè els comptes les tornin a acceptar.
