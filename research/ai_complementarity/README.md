# Eigen reconstructie van Pizzinelli-complementariteit en C-AIOE

Deze module reconstrueert de beschreven methode uit openbare brondata,
**zonder het auteursbestand aan te vragen en zonder een eigen min-maxschaal
voor AIOE**. Het is een eigen reconstructie, geen originele auteurslevering
of numeriek bewezen exacte reproductie van IMF Working Paper 23/216.

## In gewone taal

We onderzoeken welke kenmerken van een beroep menselijke inbreng belangrijk maken,
zoals persoonlijk contact, verantwoordelijkheid en zelfstandig beslissen. Daarvoor
gebruiken we de IMF-methode van Pizzinelli en medeauteurs en openbare O*NET-data.

1. We lezen de werkkenmerken en opleidings- en ervaringseisen uit O*NET 24.3.
2. We maken de schalen vergelijkbaar en berekenen zes onderdelen die even zwaar meetellen.
3. We combineren die onderdelen tot een complementariteitsscore tussen 0 en 1.
4. We koppelen de Amerikaanse beroepen aan de Nederlandse ISCO-groepen.
5. We vergelijken onze uitkomsten met de publicatie en bewaren de verschillen.

Een hogere score betekent meer kenmerken die menselijke inbreng belangrijk maken,
geen gemeten kans dat AI een werknemer helpt of vervangt. De cijfers zijn een eigen
reconstructie en komen nog niet volledig overeen met de oorspronkelijke studie.
Hieronder staan de precieze rekenregels, controles en gebruikte bronbestanden.

## Uitvoeren

Met de bestaande projectomgeving, vanuit de projectmap:

```bash
python research/ai_complementarity/complementary.py
python research/ai_complementarity/c_aioe.py
```

Alle invoerbestanden zijn aanwezig. `c_aioe.py` gebruikt ook
`data/raw/ai_exposure/AIOE_DataAppendix.xlsx` als vergelijkingsbron. De bestaande
AIOE-uitvoer wordt niet aangepast. Beide scripts gebruiken `# %%`-stappen.

## Reconstructie theta

`complementary.py` gebruikt de openbare O*NET-archiefversie **24.3, mei 2020**.
Deze versie gebruikt O*NET-SOC 2010, zodat geen SOC-2018-versiekoppeling nodig
is. Het IMF-paper specificeert de precieze gebruikte databaseversie niet
voldoende om deze keuze als dezelfde auteursversie te bevestigen.

Werkcontextgemiddelden (`Scale ID = CX`) liggen in de download op 1–5.
Volgens de O*NET-schaaldefinitie worden ze naar 0–100 omgerekend:

```text
context_100 = (context_raw − 1) / 4 × 100
```

Dit is de omzetting van de vaste meetschaal, geen min-maxtransformatie op
basis van het laagste en hoogste beroep in de dataset.

| Component | O*NET-elementen |
|---|---|
| Communicatie | Face-to-Face Discussions (`4.C.1.a.2.l`), Public Speaking (`4.C.1.a.2.c`) |
| Verantwoordelijkheid | Outcomes and Results (`4.C.1.c.2`), Others' Health and Safety (`4.C.1.c.1`) |
| Fysieke omstandigheden | Outdoors, Exposed to Weather (`4.C.2.a.1.c`), Physical Proximity (`4.C.2.a.3`) |
| Kritieke beslissingen | Consequence of Error (`4.C.3.a.1`), Freedom to Make Decisions (`4.C.3.a.4`), Frequency of Decision Making (`4.C.3.a.2.b`) |
| Niet-routinematig | Omgekeerde Degree of Automation (`4.C.3.b.2`), Structured versus Unstructured Work (`4.C.3.b.8`) |
| Vaardigheden | Job Zone × 20 |

Eerst het ongewogen gemiddelde per component, daarna het gemiddelde van de
zes componenten, gedeeld door 100. Automation wordt op de 0–100-schaal
omgekeerd met `100 − waarde`. Structured versus Unstructured Work wordt niet
omgekeerd: hogere waarden betekenen meer vrijheid/ongestructureerd werk.

Per detailberoep zijn alle 11 werkcontexten en de Job Zone vereist. Er wordt
niet stilzwijgend met minder componenten gerekend. Daarna worden beschikbare
detailberoepen ongewogen gemiddeld naar hun zesposities SOC-2010-code.
Bij ontbrekende detailberoepen kan dit een gedeeltelijk gedekt SOC-gemiddelde
opleveren. Het paper geeft deze ontbrekende-waardenregels en de precieze
aggregatievolgorde niet volledig; dit zijn expliciete implementatiekeuzes.

## Reconstructie ongestandaardiseerde AIOE

`c_aioe.py` gebruikt de openbare inputbestanden en de constructiecode van
Felten, Raj en Seamans. De 52 ability-exposures worden berekend uit de
MTurk-matrix en de tien application-indicatoren (`binary_all`).

```text
ability_weight = (importance / 5) × (level / 7)
AIOE_raw = som(ability_weight × ability_exposure) / som(ability_weight)
```

Eerst worden de teller en noemer per detailberoep bepaald; daarna worden
beide afzonderlijk naar SOC gemiddeld en wordt hun verhouding genomen.
De originele Stata-code laat bij `duplicates drop` de velden `cognitive`,
`sensory`, `cognitive_scalar` en `sensory_scalar` staan. Daardoor blijven
per detailberoep verschillende aantallen rijen over, die in `egen mean`
impliciet als gewichten werken. De reconstructie neemt deze multipliciteit
over en gebruikt 32-bit-tussenresultaten zoals Stata's `gen`/`egen`.
Het zijn geen nieuw gekozen arbeidsmarktgewichten. Zonder deze stap bedroeg
de grootste afwijking van de gepubliceerde z-scores 0,037926; met deze
stap daalt die tot 0,000003433. De 774 beroepen uit de
gepubliceerde Appendix A bepalen de vergelijkings- en referentiepopulatie.
Deze scores liggen op de oorspronkelijke positieve blootstellingsschaal,
niet op de gestandaardiseerde z-schaal uit `research/ai_exposure`.

## C-AIOE en ISCO

De formule uit Pizzinelli et al. wordt **per SOC-beroep** toegepast:

```text
C_AIOE_score = AIOE_raw × (1 − (theta − theta_min))
```

`theta_min` wordt bepaald onder de 774 gepubliceerde AIOE-beroepen, voor
zover theta beschikbaar is. Het paper rapporteert circa 0,31; onze
reconstructie komt op 0,342708. De paperwaarde wordt niet geforceerd ingevuld.
Pas na deze correctie worden de scores via de BLS-crosswalk ongewogen naar
ISCO-08 gemiddeld. Unieke ISCO–SOC-relaties tellen eenmaal mee; eindspaties
in codes worden verwijderd. Alleen viercijferige ISCO-relaties worden gebruikt.

Omdat theta afzonderlijk voor meer SOC-beroepen beschikbaar kan zijn, kan
`ISCO08_Complementary` een iets ander theta-gemiddelde bevatten dan het
C-AIOE-bestand, dat de 774 AIOE-beroepen als referentie gebruikt.

## Controles en beperkingen

De actuele reconstructie geeft **422 van 436 ISCO-groepen** een theta en
een C-AIOE; 14 blijven leeg. Ontbrekende scores worden niet als nul ingevuld
of met gemiddelden van andere beroepsgroepen vervangen.

Vergelijking met gepubliceerde resultaten:

| Controle | Onze reconstructie | Publicatie |
|---|---|---|
| Correlatie herbouwde AIOE met Appendix A | 0,999999999999908 | Referentie: Appendix A |
| Grootste afwijking na z-standaardisatie | 0,000003433 | Resterend verschil op float32-precisieniveau |
| Laagste theta onder AIOE-beroepen | 0,342708, SOC 41-9012 | Circa 0,31, Hand Cutters and Trimmers, SOC 51-9031 |
| Theta Hand Cutters and Trimmers | 0,348403 | Circa 0,31 en het minimum |

De z-standaardisatie wordt alleen voor de AIOE-controle gebruikt, niet
voor C-AIOE. Het AIOE-verschil is grotendeels verklaard door de impliciete
Stata-rijweging; het resterende verschil is zeer klein. Het theta-verschil
is nog niet eenduidig verklaard. Bronversie, selectie, ontbrekende waarden
en aggregatiekeuzes kunnen daarbij een rol spelen; zonder auteurscode/data
kunnen we de exacte theta-oorzaak niet definitief aanwijzen.
**Gebruik de resultaten dus als transparante reconstructie volgens de
beschreven methode, niet als originele Pizzinelli-scores.**

Een score is geen percentage banenverlies of voorspelling voor 2035.
Amerikaanse beroepsinhoud wordt verondersteld bruikbaar te zijn als
benadering voor Nederlandse ISCO-groepen. Er zijn geen Nederlandse
werkgelegenheidsgewichten of scenario's voor junior/mid/senior toegepast.

## Diagnose van het resterende theta-verschil

De formule en de 1–5 → 0–100-schaal zijn opnieuw gecontroleerd tegen het
paper en de O*NET-schaaldefinitie. Het paper noemt Job Zone × 20; deze stap
is behouden. Er is geen extra schaalcorrectie toegevoegd om het minimum
kunstmatig op 0,31 te krijgen.

Als gevoeligheidscontrole is ook het omkeren van beide routinevariabelen
onderzocht. Dan wordt Hand Cutters and Trimmers wel het laagste beroep
(theta circa 0,330), maar de correlatie van de routinecomponent met AIOE
wordt ongeveer −0,439. Het paper rapporteert juist +0,245; onze huidige
keuze, alleen Automation omkeren, geeft ongeveer +0,248. Beide variabelen
omkeren is dus geen onderbouwde oplossing, ook al komt het minimum dichterbij.

Andere broncorrelaties wijken ook af: communicatie–AIOE is bij ons circa
0,524 versus 0,502 in het paper; kritieke beslissingen–AIOE circa 0,006
versus −0,026. Dit laat zien dat het niet alleen om één theta-minimum of
om afronden op twee decimalen gaat. De oorzaak is hiermee afgebakend,
maar niet definitief vastgesteld. De theta-reconstructie blijft daarom
als zodanig gelabeld.

## Uitvoer

Alle tabellen staan als CSV en Excel in `data/processed/ai_complementarity/`:

| Tabel | Inhoud |
|---|---|
| `SOC2010_Complementary` | Theta en de zes componenten per SOC-2010-beroep |
| `ISCO08_Complementary` | Dezelfde maten met Nederlandse ISCO-08-groepsnamen |
| `SOC2010_C_AIOE` | Herbouwde AIOE, gepubliceerde AIOE ter controle, theta, componenten en C-AIOE |
| `ISCO08_C_AIOE` | Nederlandse beroepsgroepen met `AIOE_raw`, `Complementary_score` en `C_AIOE_score` |

CSV: puntkomma, decimale komma, UTF-8 met BOM. Codes zijn tekst, scores
getallen. Componenten liggen op 0–100; theta op 0–1; AIOE en C-AIOE zijn
blootstellingsindices. Codeprefixen zijn geen wegingsfactor.

## Bronnen in raw

- [O*NET 24.3, volledige originele tekstdownload](https://www.onetcenter.org/dl_files/database/db_24_3_text.zip): `Work Context.txt`, `Job Zones.txt`, `Scales Reference.txt` zijn ongewijzigd uit deze ZIP gehaald.
- [O*NET-archief en versiedata](https://www.onetcenter.org/db_releases.html).
- [O*NET: schaaltransformatie](https://www.onetonline.org/help/online/scales#score).
- [O*NET-licentie en attributie](https://www.onetcenter.org/license_db.html): bron U.S. Department of Labor/Employment and Training Administration, O*NET Database 24.3; gebruikt onder CC BY 4.0.
- [Felten abilities_2020.dta](https://github.com/AIOE-Data/AIOE/blob/main/Input/abilities_2020.dta).
- [Felten mturk_mapping_matrix.dta](https://github.com/AIOE-Data/AIOE/blob/main/Input/mturk_mapping_matrix.dta).
- [Felten application_list.dta](https://github.com/AIOE-Data/AIOE/blob/main/Input/application_list.dta).
- [Felten occ_title_2020.dta](https://github.com/AIOE-Data/AIOE/blob/main/Input/occ_title_2020.dta).
- [Felten-constructiecode](https://github.com/AIOE-Data/AIOE/blob/main/Input/AIOE%2C%20AIIE%2C%20and%20AIGE%20Construction.do): lokaal bewaard als `AIOE Construction.do`; het script leest hieruit de cognitive/sensory-indeling om de oorspronkelijke rijmultipliciteit te reproduceren. De Stata-code wordt niet uitgevoerd.
- [Gepubliceerde AIOE Appendix A](https://github.com/AIOE-Data/AIOE/blob/main/AIOE_DataAppendix.xlsx): bestaande download in `data/raw/ai_exposure/`.
- [BLS ISCO-08 → SOC 2010](https://www.bls.gov/soc/ISCO_SOC_Crosswalk.xls).
- [CBS ISCO-08-beroepsnamen](https://www.cbs.nl/nl-nl/onze-diensten/methoden/classificaties/onderwijs-en-beroepen/beroepenclassificatie--isco-en-sbc--/international-standard-classification-of-occupations--isco--/codelijsten-isco-08).
- [Pizzinelli et al., IMF WP/23/216, paragrafen 2.1–2.4](https://www.imf.org/-/media/files/publications/wp/2023/english/wpiea2023216-print-pdf.pdf).

Downloads en reconstructie gecontroleerd op 28 oktober 2026.
De nog aanwezige AI Work Index-JSON en SOC-2018-crosswalk zijn oude
referentiebestanden en worden niet gebruikt. Resultaten in
`data/processed/ai_complementarity/legacy_variant/` horen bij de eerdere min-maxvariant,
niet bij deze reconstructie. Er is geen auteursbestand aangevraagd.

## Literatuurverwijzingen (APA 7)

Felten, E., Raj, M., & Seamans, R. (2021). Occupational, industry, and geographic exposure to artificial intelligence: A novel dataset and its potential uses. *Strategic Management Journal, 42*(12), 2195–2217. https://doi.org/10.1002/smj.3286

Felten, E. W., Raj, M., & Seamans, R. (2023). *Occupational heterogeneity in exposure to generative AI* [Working paper]. SSRN. https://doi.org/10.2139/ssrn.4414065

Pizzinelli, C., Panton, A., Tavares, M. M., Cazzaniga, M., & Li, L. (2023). *Labor market exposure to AI: Cross-country differences and distributional implications* (IMF Working Paper No. 23/216). International Monetary Fund. https://doi.org/10.5089/9798400254802.001

U.S. Department of Labor, Employment and Training Administration. (2020). *O∗NET database* (Version 24.3) [Dataset]. https://www.onetcenter.org/dl_files/database/db_24_3_text.zip

De algemene AIOE-score verwijst naar Felten et al. (2021); de taalmodel- en
beeldgeneratievarianten naar Felten et al. (2023). Complementariteit en C-AIOE
zijn eigen reconstructies van DataFryslân volgens Pizzinelli et al. (2023),
met O*NET 24.3 (2020). Publicatiejaren zijn geen actuele meetjaren voor Fryslân.
