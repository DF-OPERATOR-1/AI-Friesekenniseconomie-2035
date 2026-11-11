# Verwerkte onderzoeksdata

Deze map bevat zowel website-invoer als onderzoeksresultaten. Alleen bestanden die in `data/published/publication_manifest.json` zijn toegestaan, gaan mee naar de website. Opleidings-/beroepskoppelingen zijn uitsluitend voor websiteweergave; geen CSV-downloads.

| Bestanden/map | Functie | Bewaren? |
|---|---|---|
| `ai_exposure/`, `ai_complementarity/` | Berekende AI-scores | Ja, website-invoer |
| `onderwijs/` | DUO-selecties en controles van de selectie | Ja, cijfers en herleidbaarheid |
| `competentnl_*.json.gz`, `esco_aanvulling.json.gz` | Verwerkte beroepsinhoud | Ja, build zonder ruwe bronbestanden |
| `mbo_opleidingen.json.gz`, `ho_isco_landelijk.json.gz` | Opleidings- en beroepsgegevens voor de websitebuild | Ja |
| `mbo_beroep_matches.csv`, `opleiding_beroep_proef.json.gz` | Beroepsmatches en beoordeelde proefresultaten voor websiteweergave | Ja |
| `opleiding_beroep.csv`, `opleiding_beroep_proef.csv` | Berekende kandidaten en leesbare proefvergelijking | Bewaren voor onderzoek; geen handmatige mappings |
| Overige `mbo_esco_*`, `mbo_isco_*`, `mbo_beroep_kandidaten.csv` | Modelresultaten, kandidaten en afgeleide onderzoekstabellen | Bewaren voor vervolgonderzoek; niet allemaal nodig voor de website |
| `controles/` | Evaluaties, reviewvoorstellen en bron-/koppelcontroles | Bewaren voor verantwoording; CBS-relevantiecontrole is ook build-invoer |
| `models/` | Lokale embeddings en reranker-cache | Opnieuw berekenbaar; verwijderen kost rekentijd bij een volgende modelrun |
| `uwv_brc_plus.json` | Lokale verwerkte UWV-bron | Bewaren zolang herimport ongewenst is |

De zes `*.normalized.json`-kopieën van DUO-data zijn verwijderd. De build leest en valideert de bestaande CSV’s rechtstreeks en schrijft deze ongebruikte duplicaten niet meer weg.

Gzip-snapshots en modelresultaten zijn geen losse wegwerpcaches: ze maken builds of vervolgonderzoek mogelijk zonder bronherimport of een volledige modelrun. Verversen van brongegevens: `npm --prefix website run data:refresh` (vereist de lokale bronnen en onderzoeksrequirements).

`ho_isco_landelijk.json.gz` vervangt de oude Friese `ho_isco_weergave.json.gz`-snapshot. Deze bewaart alle landelijke HO–ISCO-koppelingen voor de beroepspagina’s. De opleidingspagina’s en hun DUO-cijfers blijven beperkt tot de bestaande Friese selectie.
