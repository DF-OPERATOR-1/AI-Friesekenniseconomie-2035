# Data

- `raw/`: oorspronkelijke bronnen, lokaal bewaard en uitgesloten van nieuwe commits.
- `processed/`: website-invoer en onderzoeksresultaten; zie de [bewaarwijzer](processed/README.md). Controleverslagen staan in `processed/controles/`.
- `schemas/`: beroepsdatamodel en voorbeeld zonder fictieve cijfers.
- `mappings/`: classificatiekoppelingen en expliciet gemarkeerde controlebestanden.
- `published/`: register van toegestane downloads.

De [handmatige mbo-locatiecontrole](mappings/mbo_locaties/README.md) bevat
opleidingsaanbod uit KiesMBO en Firda, bronlinks en de beperkingen voor regionale
studenten- en afgestudeerdentellingen. Dit zijn geen gevalideerde CREBO-koppelingen.

Per bron dezelfde mapnaam in raw en processed: `ai_exposure`, `ai_complementarity`,
`onderwijs`. UWV staat onder `raw/uwv`; de genormaliseerde verwerking blijft lokaal.
De openbare websitebestanden staan onder `website/public/data/` en in de build onder `docs/data/`.

## Bronnen voor beroepsclassificatie en opleidingen

| Map | Inhoud |
|---|---|
| `raw/cbs/` | CBS ISCO-codelijsten en ISCO–BRC-schakelschema |
| `raw/cbs/archive/` | Eerdere bronvariant, uitsluitend voor herleidbaarheid |
| `raw/esco/v1.2.1/nl/` | Alle 18 originele Nederlandstalige ESCO-CSV-bestanden |
| `raw/competentnl/` | CompetentNL-beroepen, opleidingen en competentierelaties |
| `raw/crebo/` | CREBO-bronnen |
| `raw/onderwijs/` | DUO-studenten- en diplomabestanden |
| `mappings/` | Classificatiekoppelingen en experimentele opleidingsmatches |
| `processed/` | Afgeleide caches, controles en matchingresultaten |

CBS: `raw/cbs/codelijsten-isco-08.xls` is het nieuw aangeleverde bestand met de
CBS-relevantieopmerkingen in `ISCO-08 voorbeeldberoepen`. De Nederlandse
rekencodelijst staat apart als `raw/cbs/codelijsten-isco-08-nl.xls`, omdat het
nieuw aangeleverde bestand Engelse namen heeft in `ISCO-08 unit group`.
Imports gebruiken de Nederlandse variant; de relevantiecontrole de originele.
Beide hebben dezelfde 436 unitgroepcodes en dezelfde 4.704 indexregels.
Bronbestanden zijn niet inhoudelijk aangepast. `raw/` blijft lokaal en wordt
niet automatisch op de website gepubliceerd. ESCO-import en audit gebruiken
het nieuwe versie- en taalpad; de bestaande verwerkte cache blijft bruikbaar.

### Studiekeuzedatabase 26.6

`raw/studiekeuzedatabase/ho_alle_isco.csv` is de lokale bron voor hbo/wo–ISCO-koppelingen. De import `research.pipeline.imports.ho_isco` maakt een gecomprimeerde weergavesnapshot voor de websitebuild. Geen CSV-publicatie van deze koppelingen of van mbo–CompetentNL-beroepskoppelingen. Bron: Landelijk Centrum Studiekeuze, Studiekeuzedatabase 26.6.
