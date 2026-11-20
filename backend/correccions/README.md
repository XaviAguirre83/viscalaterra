# correccions

Excepcions nostres sobre dades que es generen automàticament. El que hi ha aquí
**sobreviu a les regeneracions**: els scripts ho apliquen al damunt del que ve de
la font, cada vegada.

## emblemes.json

Correccions dels escuts i banderes. `enriqueix` regenera
`frontend/public/data/territoris-enriquiment.json` sencer des de Wikidata i
`baixa-emblemes` el reescriu amb les còpies locals; tots dos apliquen aquest
fitxer (codi a `backend/src/scripts/correccions-emblemes.ts`).

Per aplicar un canvi d'aquest fitxer n'hi ha prou amb:

```bash
npm --prefix backend run baixa-emblemes
```

(Amb `--credits` les correccions no s'apliquen: aquell mode només refà crèdits.)

### Format

```json
{
  "municipis": { "08113": { "bandera": { "amaga": true, "motiu": "…" } } },
  "comarques": { "bages": { "escut": { "commons": "File:….svg", "motiu": "…" } } },
  "provincies": {}
}
```

La clau del territori és la mateixa que al JSON d'enriquiment: municipis, les 5
primeres xifres del codi; comarques, el nom en minúscules, sense accents ni
article inicial (`"val d'aran"`, `"pla de l'estany"`); províncies, el codi.

Cada correcció porta un `motiu` (obligatori: és la memòria de la decisió) i
**una** d'aquestes tres coses:

| Camp      | Què fa                                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `commons` | Fa servir aquest fitxer de Wikimedia Commons (`"File:Nom.svg"`). Es baixa i s'acredita com qualsevol altre.                                                                                            |
| `amaga`   | `true`: no es mostra cap imatge, encara que Wikidata en doni una.                                                                                                                                      |
| `propi`   | Fa servir una imatge nostra, `"/emblemes-propis/nom.svg"`, que ha d'existir a `frontend/public/emblemes-propis/` (a git). Demana `credit` (`autor`, `llicencia`, `pagina`, `modificat`) amb llicència. |

Si el fitxer té un error (clau mal escrita, falta el motiu, la imatge pròpia no
existeix), l'script s'atura i diu on: una correcció mai queda sense efecte en
silenci. L'única cosa que no es pot comprovar és la clau del territori: una
clau que no existeix al JSON **crea** una entrada nova (així és com hi entra la
Val d'Aran, que a Wikidata no és una comarca), i l'script ho deixa escrit a la
sortida.
