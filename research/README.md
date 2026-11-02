# Research

Onderzoekscode staat hier; brondata en resultaten staan centraal onder `data/`.

| Map                   | Inhoud                                                        |
| --------------------- | ------------------------------------------------------------- |
| `ai_exposure/`        | Bestaande ISCO–AIOE-berekening                                |
| `ai_complementarity/` | Reconstructie complementariteit en C-AIOE                     |
| `onderwijs/`          | DUO-bronselectie en omzetting                                 |
| `pipeline/`           | Imports, beroepsinhoud en publicatiecontroles voor de website |

Voer scripts uit vanuit de repositoryroot. `pipeline` gebruikt Python-modules:
`python3 -m research.pipeline.imports.build_atlas`.

## Methode en bronverantwoording

De lokale methodedocumentatie onder `docs/methodology/` blijft buiten Git.
De README per onderwerp begint met een korte werkwijze en verwijst naar de
gebruikte bronnen. Daaronder staan de exacte rekenregels en uitvoercommando’s.
