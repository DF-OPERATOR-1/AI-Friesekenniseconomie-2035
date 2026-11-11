# ISCO-08 → AIOE

Koppel Nederlandse beroepsgroepen via de officiële ISCO–SOC-crosswalk aan drie AI-blootstellingsscores.

## In gewone taal

We gebruiken de gepubliceerde AIOE-scores van Felten, Raj en Seamans om te
vergelijken hoe sterk beroepsvaardigheden overlappen met AI-capaciteiten.

1. We lezen de Nederlandse ISCO-beroepsgroepen en de drie afzonderlijke AI-scores in.
2. We koppelen de Amerikaanse beroepscodes via een officiële BLS-tabel aan ISCO.
3. Per ISCO-groep middelen we de beschikbare scores. Elk gekoppeld Amerikaans
   beroep telt even zwaar; aantallen werkenden worden niet als gewicht gebruikt.
4. We controleren de koppelingen en ontbrekende waarden en bewaren de uitkomsten.

Een hogere score betekent meer overlap met AI-capaciteiten, niet meer feitelijk
AI-gebruik of een grotere bewezen kans op banenverlies. Ontbrekende scores blijven leeg.
De gebruikte bestanden en oorspronkelijke auteursbronnen staan onder **Bronnen**.

Ter achtergrond: de [Wereldbank-replicatiecatalogus](https://reproducibility.worldbank.org/index.php/catalog/403)
beschrijft een afzonderlijke studie naar Amerikaanse vacatures. Dit is aanvullende
literatuur, geen rechtstreeks ingelezen bronbestand voor onze AIOE-berekening.

## Uitvoeren

Na installatie volgens de [hoofd-README](../../README.md):

```bash
python research/ai_exposure/exposure.py
```

Het script leest de bronnen, controleert ze, koppelt de codes, valideert de gemiddelden en schrijft een CSV en een Excelbestand. Controle-uitkomsten verschijnen in de console.

## Visualisaties op de website

De actuele grafieken staan in `website/src/components/ExposureChart.tsx` en
`website/src/components/PerceptualChart.tsx`. Ze gebruiken de bestaande scores en
bieden zoeken, filters, beroepsselectie en een SVG-download. Er worden geen
losse HTML-onderzoekskaarten meer gegenereerd.

Na wijzigingen in de onderzoeksuitvoer:

```bash
npm --prefix website run build
python3 website/scripts/publish_pages.py
```

Zie [website-instructies](../../website/README.md) voor de React-website en GitHub Pages.

## Bronnen

Plaats deze bestanden in `data/raw/ai_exposure/`. Gebruik op GitHub **Download raw file** en behoud de bestandsnamen.

| Bestand                                                     | Inhoud                                                                              | Bron                                                                                                                                                                                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/raw/cbs/codelijsten-isco-08-nl.xls`              | 436 ISCO-unitgroups met Nederlandse groepsnamen                                     | [CBS](https://www.cbs.nl/nl-nl/onze-diensten/methoden/classificaties/onderwijs-en-beroepen/beroepenclassificatie--isco-en-sbc--/international-standard-classification-of-occupations--isco--/codelijsten-isco-08) |
| `data/raw/ai_exposure/ISCO_SOC_Crosswalk.xls`               | BLS-crosswalk; augustus 2012, bijgewerkt juni 2015                                  | [BLS](https://www.bls.gov/soc/ISCO_SOC_Crosswalk.xls)                                                                                                                                                             |
| `data/raw/ai_exposure/AIOE_DataAppendix.xlsx`               | Oorspronkelijke AIOE-meting, Appendix A: 774 SOC-codes met scores                   | [AIOE](https://github.com/AIOE-Data/AIOE/blob/main/AIOE_DataAppendix.xlsx)                                                                                                                                        |
| `data/raw/ai_exposure/Taxonomy2010_AppA.xls`                | Officiële O*NET-SOC 2010-taxonomie voor versievalidatie                             | [O*NET](https://www.onetcenter.org/dl_files/Taxonomy2010_AppA.xls)                                                                                                                                                |
| `data/raw/ai_exposure/Language Modeling AIOE and AIIE.xlsx` | Generatieve taalmodelblootstelling: sheet `LM AIOE`, kolom `Language Modeling AIOE` | [AIOE: taalmodellen](https://github.com/AIOE-Data/AIOE/blob/main/Language%20Modeling%20AIOE%20and%20AIIE.xlsx)                                                                                                    |
| `data/raw/ai_exposure/Image Generation AIOE and AIIE.xlsx`  | Blootstelling aan beeldgeneratie: sheet `IG AIOE`, kolom `Image Generation AIOE`    | [AIOE: beeldgeneratie](https://github.com/AIOE-Data/AIOE/blob/main/Image%20Generation%20AIOE%20and%20AIIE.xlsx)                                                                                                   |

## Uitvoer

`data/processed/ai_exposure/ISCO08_AIOE.csv` en `data/processed/ai_exposure/ISCO08_AIOE.xlsx` bevatten dezelfde vijf kolommen, met één rij per unieke ISCO-groep. Open het `.xlsx`-bestand direct in Excel; de beroepscodes zijn tekst en de scores getallen.

| Kolom               | Inhoud                                                 |
| ------------------- | ------------------------------------------------------ |
| `ISCO_08_code`      | Viercijferige beroepscode                              |
| `ISCO_08_beroep_NL` | Nederlandse groepsnaam                                 |
| `AIOE_score`        | Algemene AI-blootstelling (2021)                       |
| `AIOE_LM_score`     | Blootstelling aan taalmodellen (Felten et al., 2023)   |
| `AIOE_IG_score`     | Blootstelling aan beeldgeneratie (Felten et al., 2023) |

CSV-instellingen: puntkomma, decimale komma en UTF-8 met BOM. Lees `ISCO_08_code` als tekst; lege scores blijven ontbrekende waarden.

## Methode

Per ISCO-groep wordt het ongewogen gemiddelde van beschikbare unieke SOC-scores berekend. Alleen officiële viercijferige relaties tellen mee. Het zijn afgeleide blootstellingsscores, geen kansen op baanverlies.

## Literatuurverwijzingen (APA 7)

Felten, E., Raj, M., & Seamans, R. (2021). Occupational, industry, and geographic exposure to artificial intelligence: A novel dataset and its potential uses. _Strategic Management Journal, 42_(12), 2195–2217. https://doi.org/10.1002/smj.3286

Felten, E. W., Raj, M., & Seamans, R. (2023). _Occupational heterogeneity in exposure to generative AI_ [Working paper]. SSRN. https://doi.org/10.2139/ssrn.4414065

Pizzinelli, C., Panton, A., Tavares, M. M., Cazzaniga, M., & Li, L. (2023). _Labor market exposure to AI: Cross-country differences and distributional implications_ (IMF Working Paper No. 23/216). International Monetary Fund. https://doi.org/10.5089/9798400254802.001

U.S. Department of Labor, Employment and Training Administration. (2020). _O∗NET database_ (Version 24.3) [Dataset]. https://www.onetcenter.org/dl_files/database/db_24_3_text.zip

De algemene AIOE-score verwijst naar Felten et al. (2021); de taalmodel- en
beeldgeneratievarianten naar Felten et al. (2023). Complementariteit en C-AIOE
zijn eigen reconstructies van DataFryslân volgens Pizzinelli et al. (2023),
met O*NET 24.3 (2020). Publicatiejaren zijn geen actuele meetjaren voor Fryslân.

### Exposurevariant in de perceptuele kaart

De kaart biedt algemene AI-exposure (Felten et al., 2021), taalmodel-exposure en
beeldgeneratie-exposure (Felten et al., 2023). Algemene AI behoudt de bestaande
herbouwde oorspronkelijke AIOE-schaal; de andere varianten gebruiken de al
beschikbare gepubliceerde gestandaardiseerde ISCO-scores. De complementariteit
blijft dezelfde gereconstrueerde maat. Er worden geen nieuwe exposure-scores
berekend, herschaald of gemiddeld tussen varianten.

Per variant worden de asschaal en medianen bepaald over alle beroepen met beide
beschikbare scores. Ze blijven daarna gelijk bij zoeken en hoofdgroepfilters.
De tabel, detailwaarden, aslabels, bronvermelding en SVG-download volgen de variant.
De oorspronkelijke publicaties staan in de literatuurlijst.
