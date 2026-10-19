# ISCO-08 → AIOE

Koppel Nederlandse beroepsgroepen via de officiële ISCO–SOC-crosswalk aan drie AI-blootstellingsscores.

Aanvullende databeschrijving voor AIOE en complementariteit: [Wereldbank-replicatiecatalogus](https://reproducibility.worldbank.org/index.php/catalog/403).

## Uitvoeren

Na installatie volgens de [hoofd-README](../README.md):

```bash
python 1_isco_aioe/isco_aioe.py
```

Het script leest de bronnen, controleert ze, koppelt de codes, valideert de gemiddelden en schrijft een CSV en een Excelbestand. Controle-uitkomsten verschijnen in de console.

Het maakt ook `processed/ISCO08_AIOE_mapping.html`: een interactieve beroepenkaart met leesbare Nederlandse beroepsnamen en scorebalken. Open dit bestand in je browser; internet of een server is niet nodig. Zoek op beroep of code, filter op ISCO-hoofdgroep en wissel tussen algemene AI, taalmodellen en beeldgeneratie. Ontbrekende scores staan expliciet vermeld. De schaal blijft per scoretype vast bij filteren. Elke rij is een beroepsgroep, zonder weging naar aantallen werkenden.

Alleen de visualisatie opnieuw maken vanuit de bestaande CSV:

```bash
python 1_isco_aioe/visualiseer.py
```

## Bronnen

Plaats deze bestanden in `1_isco_aioe/raw/`. Gebruik op GitHub **Download raw file** en behoud de bestandsnamen.

| Bestand | Inhoud | Bron |
|---|---|---|
| `raw/codelijsten-isco-08.xls` | 436 ISCO-unitgroups met Nederlandse groepsnamen | [CBS](https://www.cbs.nl/nl-nl/onze-diensten/methoden/classificaties/onderwijs-en-beroepen/beroepenclassificatie--isco-en-sbc--/international-standard-classification-of-occupations--isco--/codelijsten-isco-08) |
| `raw/ISCO_SOC_Crosswalk.xls` | BLS-crosswalk; augustus 2012, bijgewerkt juni 2015 | [BLS](https://www.bls.gov/soc/ISCO_SOC_Crosswalk.xls) |
| `raw/AIOE_DataAppendix.xlsx` | Oorspronkelijke AIOE-meting, Appendix A: 774 SOC-codes met scores | [AIOE](https://github.com/AIOE-Data/AIOE/blob/main/AIOE_DataAppendix.xlsx) |
| `raw/Taxonomy2010_AppA.xls` | Officiële O*NET-SOC 2010-taxonomie voor versievalidatie | [O*NET](https://www.onetcenter.org/dl_files/Taxonomy2010_AppA.xls) |
| `raw/Language Modeling AIOE and AIIE.xlsx` | Generatieve taalmodelblootstelling: sheet `LM AIOE`, kolom `Language Modeling AIOE` | [AIOE: taalmodellen](https://github.com/AIOE-Data/AIOE/blob/main/Language%20Modeling%20AIOE%20and%20AIIE.xlsx) |
| `raw/Image Generation AIOE and AIIE.xlsx` | Blootstelling aan beeldgeneratie: sheet `IG AIOE`, kolom `Image Generation AIOE` | [AIOE: beeldgeneratie](https://github.com/AIOE-Data/AIOE/blob/main/Image%20Generation%20AIOE%20and%20AIIE.xlsx) |

## Uitvoer

`processed/ISCO08_AIOE.csv` en `processed/ISCO08_AIOE.xlsx` bevatten dezelfde vijf kolommen, met één rij per unieke ISCO-groep. Open het `.xlsx`-bestand direct in Excel; de beroepscodes zijn tekst en de scores getallen.

| Kolom | Inhoud |
|---|---|
| `ISCO_08_code` | Viercijferige beroepscode |
| `ISCO_08_beroep_NL` | Nederlandse groepsnaam |
| `AIOE_score` | Algemene AI-blootstelling (2021) |
| `AIOE_LM_score` | Blootstelling aan taalmodellen |
| `AIOE_IG_score` | Blootstelling aan beeldgeneratie |

CSV-instellingen: puntkomma, decimale komma en UTF-8 met BOM. Lees `ISCO_08_code` als tekst; lege scores blijven ontbrekende waarden.

## Methode

Per ISCO-groep wordt het ongewogen gemiddelde van beschikbare unieke SOC-scores berekend. Alleen officiële viercijferige relaties tellen mee. Het zijn afgeleide blootstellingsscores, geen kansen op baanverlies.
