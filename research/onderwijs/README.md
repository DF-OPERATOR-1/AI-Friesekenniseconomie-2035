# DUO: onderwijs in Friesland

De [mbo-CSV-selectie en plaatsnamencontrole](MBO_CSV_SELECTIE.md) beschrijven de
actuele gefilterde exports: 6.556 studentenrijen en 9.686 afgestudeerdenrijen.
Houten, Ede en Haarlem blijven administratieve instellingsadressen in de bron;
de aanbodselectie bewijst geen exacte regionale telling of historisch campusaanbod.

De aanvullende [handmatige mbo-locatiecontrole](MBO_LOCATIECONTROLE.md) bewaart
het aangeleverde KiesMBO-/Firda-aanbod als CSV en vergelijkt dit met DUO-locaties.
De oorspronkelijke controle verandert de broncijfers niet. De aanvullende
[Friese aanbodselectie](MBO_FRIESE_AANBODSELECTIE.md) wordt inmiddels wel toegepast
op de website: SVO, Nova College en Aeres volgens de bevestigde lijst; Firda behouden.

## In gewone taal

We maken zes selecties van DUO-studenten en afgestudeerden: mbo, hbo en wo.
Voor hbo/wo kiezen we instellingen met provincie Friesland; voor mbo vier
instellingen met Friese onderwijslocaties. Die mbo-aantallen omvatten ook
locaties buiten Fryslân.

We zetten jaar- en geslachtskolommen onder elkaar en controleren iedere cel
tegen de oorspronkelijke bron. De aantallen veranderen niet. Kleine,
afgeschermde aantallen blijven afgeschermd. De bestanden geven geen instroom
per beroep: daarvoor ontbreekt een gevalideerde koppeling tussen opleiding en beroep.
De directe downloads en uitleg over de telwijze staan onder **Downloads** en
**Bronnen en telwijze**.

## ESCO-uitbreiding: analyse en verbeterplan

De [architectuuranalyse en het gefaseerde ESCO-plan](ESCO_ANALYSE_EN_PLAN.md)
inventariseren de nieuwe lokale ESCO-data, officiële relaties, ontbrekende
crosswalks en het ontwerp voor bidirectionele competentiematching. De bestaande
matching is hiervoor nog niet vervangen. De broninventaris is reproduceerbaar
met `python -m research.pipeline.imports.esco_audit`.

## Opleiding–beroepmethodiek

Het volledige [methodiek- en beoordelingsprotocol](METHODIEK_OPLEIDING_BEROEP.md)
beschrijft de bronnen, sleutels, voorbewerking, CBS-naamkoppelingen,
ML-kandidaatselectie, brongebonden assistentbeoordeling, validatie en beperkingen.
Daarin staan uitgevoerde stappen afzonderlijk van aanbevolen vervolgstappen.
Een mogelijke beroepsroute is geen gemeten studentenuitstroom.

## Uitvoeren

Na installatie volgens de hoofd-README:

```bash
python research/onderwijs/onderwijs.py
```

## Vastgesteld uitvoerformaat mbo-studenten

Op 6 november 2026 is gekozen voor de oorspronkelijke broncelindeling,
met behoud van de geografische beperking hieronder. Het bestand
`data/processed/onderwijs/studenten_mbo_friesland.csv` bevat deze 13 kolommen:

`Instellingscode`, `Instellingsnaam`, `Soort instelling`,
`Plaatsnaam instelling`, `Leerweg`, `Niveau`, `Erkende opleiding code`,
`Erkende opleiding naam`, `Sectorkamer naam`, `Hoofdgroep naam`,
`Geslacht`, `Jaar`, `Aantal`.

De instellingsselectie vóór de aanvullende aanbodfilter bevat 1.574 brede rijen
voor 575 unieke CREBO-codes. De actuele export is vervolgens beperkt volgens de
[bevestigde aanbodselectie](MBO_CSV_SELECTIE.md).
Per instelling × CREBO × leerweg × niveau × jaar worden combinaties waarvan
beide geslachten nul studenten hebben uit de uitvoer verwijderd. Als één
geslacht studenten heeft (inclusief `<5`), blijven beide geslachtsrijen
behouden. Onbekende aantallen worden niet als nul behandeld en blijven
behouden. Dit selecteert geregistreerde deelname op de peildatum; het is
geen bewijs van het volledige beschikbare opleidingsaanbod. Gebruik 2025
als hoofdjaar.
`Aantal` bewaart de oorspronkelijke tekst: `0` is exact nul, `<5` is
afgeschermd (1–4), leeg is onbekend en een positief getal is een bekende
telling. Er worden geen aantallen geïmputeerd of geaggregeerd.
De CREBO-koppeltabellen in `data/raw/crebo/` veranderen deze tellingen niet
en bevatten geen CREBO-locatieaantallen.

Alleen mbo-studenten controleren of opnieuw exporteren:

```bash
python research/onderwijs/onderwijs.py --check
python research/onderwijs/onderwijs.py --mbo-studenten-only
```

De gerichte verwerking controleert unieke instelling/CREBO/leerweg/niveau-
sleutels en vergelijkt alle uitgevoerde aantallen en bronkenmerken met de
bron vóór het CSV wordt vervangen. De export wordt tijdelijk geschreven,
teruggelezen en bij gelijkheid atomair vervangen. `--check` schrijft niets.
De DUO-bronnen en het bestaande bronmanifest blijven ongewijzigd.

## Afbakening mbo

**De mbo-bestanden bevatten Firda, Aeres, SVO en ROC Nova College: vier
instellingen met onderwijslocaties in Friesland. De aantallen per opleiding
betreffen de hele instelling en bevatten ook locaties buiten Friesland.
Het zijn geen uitsluitend Friese studentenaantallen.**

Deze keuze geldt voor zowel studenten als afgestudeerden. Ook Firda heeft
locaties buiten Friesland (Emmeloord en Urk). De plaatsnaam in de
opleidingsbestanden is de instellingsplaats, geen bewezen onderwijslocatie
van elke opleiding. De bestandsnamen met `friesland` verwijzen bij mbo dus
naar de selectie van instellingen met Friese locaties.

De selectie gebruikt instellingscodes: Firda `08PG`, Aeres `25GV`, SVO
`17WH`, ROC Nova College `25PX`. Alle oorspronkelijke rijen voor deze vier
codes blijven behouden, inclusief opleiding, sectorkamer, hoofdgroep,
niveau, leerweg en aantallen per geslacht voor 2021–2025. Jaar- en
geslachtskolommen worden omgezet naar rijen zoals hieronder beschreven.

## Uitvoer

Zes CSV-bestanden en `DUO_Friesland.xlsx` met dezelfde zes tabellen:

| CSV | Selectie en periode |
|---|---|
| `afgestudeerden_hbo_friesland.csv` | `PROVINCIE = Friesland`; 2020–2024 |
| `studenten_hbo_friesland.csv` | `01a`, `PROVINCIE = Friesland`; 2021–2025 |
| `afgestudeerden_wo_friesland.csv` | `PROVINCIE = Friesland`; 2020–2024 |
| `studenten_wo_friesland.csv` | `01b`, `PROVINCIE = Friesland`; 2021–2025 |
| `afgestudeerden_mbo_friesland.csv` | Oorspronkelijke opleidingsrijen van de vier instellingen; 2021–2025; inclusief locaties buiten Friesland |
| `studenten_mbo_friesland.csv` | Oorspronkelijke opleidingsrijen van de vier instellingen; 2021–2025; inclusief locaties buiten Friesland |

## Indeling: Geslacht, Jaar en Aantal

Alle zes tabellen bevatten dezelfde drie tellingkolommen:

| Kolom | Inhoud |
|---|---|
| `Geslacht` | `man` of `vrouw`, afkomstig uit de bronrij of mbo-kolomnaam |
| `Jaar` | Het oorspronkelijke verslagjaar uit de kolomnaam |
| `Aantal` | De oorspronkelijke celwaarde, inclusief `0` en `<5` |

Iedere behouden broncel met een aantal wordt één uitvoerrij. Bij mbo-studenten vervallen jaargroepen met uitsluitend nul studenten.
Bij HBO/WO worden de jaarkolommen onder elkaar gezet en wordt de bestaande
kolom `GESLACHT` als `Geslacht` weergegeven. Bij mbo worden bijvoorbeeld
`MAN2025` en `DIPVROUW2025` omgezet naar respectievelijk `man, 2025`
en `vrouw, 2025`. Het voorvoegsel `DIP` duidt op afgestudeerden; deze staan
al in een afzonderlijk bestand. Andere bronkenmerken blijven per rij behouden.

Dit verandert alleen de tabelindeling. Er worden geen aantallen opgeteld,
geschat, omgerekend of aan locaties toegewezen. Nullen en afgeschermde
waarden blijven behouden; er worden geen bandbreedtes berekend. 

`data/raw/onderwijs/` bevat de ongewijzigde downloads. De selecties in `data/processed/onderwijs/` zijn
opnieuw opgeslagen als CSV met puntkomma en UTF-8 met BOM. Excel bewaart
bronwaarden, `Jaar` en `Aantal` als tekst, zodat codes en afgeschermde aantallen behouden blijven. Lees codes ook bij CSV-import als tekst.

## HBO en WO

De geografische selectie gebruikt de oorspronkelijke provinciekolom.
HBO `01a` telt één hoofdinschrijving binnen het hele hoger onderwijs.
WO `01b` telt eenmaal per persoon per WO-type; een student kan in meerdere
typen meetellen. Tel deze bestanden niet zonder meer op als unieke personen.
Aangewezen instellingen zijn volgens DUO uitgesloten.
De WO-diplomabestandsnaam eindigt op 2025, maar de jaarkolommen lopen tot 2024.

## Bestanden en controles

Alle zes invoerbestanden voor de huidige verwerking staan in `data/raw/onderwijs/`.
De oorspronkelijke mbo-locatietellingen (2021–2025), het adressenbestand
van instellingen en andere referentiebronnen blijven daar ook bewaard.
`data/raw/onderwijs/sources.json` bevat voor elke bewaarde CSV de downloadlink en
SHA-256-vingerafdruk. Alle bronlinks staan hieronder in deze README.

Het script controleert kolommen en rijlengtes, de aanwezigheid van alle
vier mbo-instellingen, draait de omzetting naar rijen terug en vergelijkt iedere
broncel met het origineel. Ook worden CSV en Excel teruggelezen om
exportverschillen uit te sluiten.

## Downloads

De zes bestanden die `onderwijs.py` gebruikt:

| Gegevens | Download |
|---|---|
| HBO afgestudeerden | [05.-gediplomeerden-hbo-2024.csv](https://duo.nl/open_onderwijsdata/images/05.-gediplomeerden-hbo-2024.csv) |
| HBO studenten | [01a.-ingeschrevenen-hbo-2025.csv](https://duo.nl/open_onderwijsdata/images/01a.-ingeschrevenen-hbo-2025.csv) |
| WO afgestudeerden | [05.-gediplomeerden-wo-2025.csv](https://duo.nl/open_onderwijsdata/images/05.-gediplomeerden-wo-2025.csv) |
| WO studenten | [01b.-ingeschrevenen-wo-domein-wo-2025.csv](https://duo.nl/open_onderwijsdata/images/01b.-ingeschrevenen-wo-domein-wo-2025.csv) |
| MBO afgestudeerden | [gediplomeerden-per-instelling-plaats-sectorkamer-type-mbo-opleiding-niveau-geslacht-instromende-studenten-2021-2025.csv](https://duo.nl/open_onderwijsdata/images/gediplomeerden-per-instelling-plaats-sectorkamer-type-mbo-opleiding-niveau-geslacht-instromende-studenten-2021-2025.csv) |
| MBO studenten | [03.-studenten-per-instelling-plaats-sectorkamer-type-mbo-opleiding-niveau-geslacht-2021-2025.csv](https://duo.nl/open_onderwijsdata/images/03.-studenten-per-instelling-plaats-sectorkamer-type-mbo-opleiding-niveau-geslacht-2021-2025.csv) |

Aanvullende referentiebestanden die in `data/raw/onderwijs/` bewaard blijven:

- [01.-adressen-mbo-instellingen.csv](https://duo.nl/open_onderwijsdata/images/01.-adressen-mbo-instellingen.csv)
- [01.-studenten-per-instelling-bestuur-plaats-gemeente-provincie-type-mbo-2021-2025.csv](https://duo.nl/open_onderwijsdata/images/01.-studenten-per-instelling-bestuur-plaats-gemeente-provincie-type-mbo-2021-2025.csv)
- [01a.-ingeschrevenen-wo-2025.csv](https://duo.nl/open_onderwijsdata/images/01a.-ingeschrevenen-wo-2025.csv)
- [02.-onderwijslocaties-mbo-met-inschrijvingen-en-geografische-gegevens-per-1-oktober-2021.csv](https://duo.nl/open_onderwijsdata/images/02.-onderwijslocaties-mbo-met-inschrijvingen-en-geografische-gegevens-per-1-oktober-2021.csv)
- [02.-onderwijslocaties-mbo-met-inschrijvingen-en-geografische-gegevens-per-1-oktober-2022.csv](https://duo.nl/open_onderwijsdata/images/02.-onderwijslocaties-mbo-met-inschrijvingen-en-geografische-gegevens-per-1-oktober-2022.csv)
- [02.-onderwijslocaties-mbo-met-inschrijvingen-en-geografische-gegevens-per-1-oktober-2023.csv](https://duo.nl/open_onderwijsdata/images/02.-onderwijslocaties-mbo-met-inschrijvingen-en-geografische-gegevens-per-1-oktober-2023.csv)
- [02.-onderwijslocaties-mbo-met-inschrijvingen-en-geografische-gegevens-per-1-oktober-2024.csv](https://duo.nl/open_onderwijsdata/images/02.-onderwijslocaties-mbo-met-inschrijvingen-en-geografische-gegevens-per-1-oktober-2024.csv)
- [02.-onderwijslocaties-mbo-met-inschrijvingen-en-geografische-gegevens-per-1-oktober-2025.csv](https://duo.nl/open_onderwijsdata/images/02.-onderwijslocaties-mbo-met-inschrijvingen-en-geografische-gegevens-per-1-oktober-2025.csv)
- [studenten-per-sectorkamer-type-mbo-niveau-provincie-deelnemer-2021-2025.csv](https://duo.nl/open_onderwijsdata/images/studenten-per-sectorkamer-type-mbo-niveau-provincie-deelnemer-2021-2025.csv)

## Bronnen en telwijze

- [HBO-studenten](https://duo.nl/open_onderwijsdata/hoger-onderwijs/aantal-studenten/studenten-hbo.jsp)
- [HBO-afgestudeerden](https://duo.nl/open_onderwijsdata/hoger-onderwijs/aantal-studenten/afgestudeerden-hbo.jsp)
- [WO-afgestudeerden](https://duo.nl/open_onderwijsdata/hoger-onderwijs/aantal-studenten/afgestudeerden-wo.jsp)
- [WO-studenten](https://duo.nl/open_onderwijsdata/hoger-onderwijs/aantal-studenten/studenten-wo.jsp)
- [Mbo-studenten per instelling en opleiding](https://duo.nl/open_onderwijsdata/middelbaar-beroepsonderwijs/aantal-studenten/aantal-studenten-mbo-per-instelling.jsp)
- [Mbo-afgestudeerden per instelling en opleiding](https://duo.nl/open_onderwijsdata/middelbaar-beroepsonderwijs/aantal-studenten/aantal-gediplomeerden-mbo.jsp)
- [Mbo-locaties](https://duo.nl/open_onderwijsdata/middelbaar-beroepsonderwijs/aantal-studenten/studenten-mbo-rio.jsp)
- [Afgeschermde aantallen](https://duo.nl/open_onderwijsdata/statistische-beveiliging.jsp)

Laatst gecontroleerd: 6 november 2026.

## Opleidingstab: bronnen en mbo-uitzondering

De opleidingstab combineert de bovengenoemde DUO-studentenbestanden met
[SBB CREBO-koppeltabellen](https://www.s-bb.nl/onderwijs/erkende-opleidingscode/)
voor de mbo-kwalificatienamen. De exacte schooljaarbestanden staan beschreven
in [de CREBO-broninventaris](../../data/raw/crebo/README.md); de koppelstappen
staan in [de mappingverantwoording](../../data/mappings/README.md).
Hbo en wo gebruiken de oorspronkelijke provinciekolom Friesland en krijgen
geen beroepskoppeling op basis van uitsluitend de opleidingsnaam.

De gebruikte openbare mbo-locatiebestanden bevatten aantallen per locatie,
maar geen CREBO. De opleidingsbron bevat CREBO-aantallen per instelling,
maar geen onderwijslocatiecode. Daarom kunnen we **per opleiding en jaar
geen exact studentenaantal op Friese onderwijslocaties vaststellen**.
Regionale mbo-totalen ontbreken niet per definitie; de gezamenlijke
opleiding-locatieverdeling ontbreekt in de gebruikte bronnen.
De instellingsselectie blijft daarom de expliciete mbo-uitzondering en
omvat ook locaties buiten Friesland. Studentenaantallen worden niet
gepresenteerd als aantallen toekomstige beoefenaars van een beroep.

## ESCO-aanvulling voor ontbrekende beroepsinhoud

This publication uses the ESCO classification of the European Commission.

Bron: Europese Commissie, **ESCO v1.2.1, Nederlands (nl)**, lokaal aangeleverde CSV-export.
De website gebruikt de voorgeschreven toepassingsvermelding:
“This service uses the ESCO classification of the European Commission.”
Zie de [officiële ESCO-gebruiksvoorwaarden en bronvermelding](https://esco.ec.europa.eu/en/about-esco/faq?page=1).
ESCO-hergebruik valt onder Besluit 2011/833/EU; de CompetentNL-vermelding CC BY 4.0
wordt niet aan ESCO toegekend.

De adapter `research/pipeline/imports/esco.py` vult uitsluitend ISCO-groepen zonder
CompetentNL-beroepsinhoud aan: 33 extra groepen, samen 429 van de 436 groepen.
Bestaande CompetentNL-inhoud en AI-scores blijven behouden. De officiële viercijferige
ESCO–ISCO-relatie wordt gecontroleerd tegen de classificatiehiërarchie.
De Nederlandse beroepsnamen, beschrijvingen, vaardigheden en kennisgebieden zijn
broninhoud; essentieel/optioneel volgt de officiële competentierelaties.
ESCO levert in deze bestanden geen afzonderlijke takenlijst. Die wordt niet afgeleid
of verzonnen. De resterende zeven groepen (1113, 4414, 6310, 6320, 6330, 6340, 9624)
hebben in beide bronnen geen gekoppeld beroepsprofiel.

Bewerking: selectie van ontbrekende groepen, ontdubbeling van URI-records die alleen
in wijzigingsdatum verschillen en groepering van beroepen per officiële ISCO-code.
Dit zijn geen officiële ISCO-groepsdefinities en geen nieuwe MBO–beroepvoorspellingen.
De reproduceerbare cache `data/processed/esco_aanvulling.json.gz` bevat bronversie,
taal, SHA-256-bestandshashes en herkomst per beroep; hiermee werkt de build zonder
ruwe ESCO-bestanden. Verversen: `npm run data:refresh` vanuit `website/` (vereist ook
de overige ruwe projectbronnen). De bredere semantische MBO–ESCO-matching blijft een
apart verbeterplan.

## Nieuwe MBO–ESCO–ISCO-pipeline

De hybride uitbreiding staat in `research/pipeline/imports/mbo_esco.py`.
Zie [MBO_ESCO_UITVOERING.md](MBO_ESCO_UITVOERING.md) voor bronverwerking,
veldembeddings, directionele competentiedekking, gewichten, reranking,
referentiebeoordeling, uitvoerbestanden en reproduceerbare CLI-instructies.
Bestaande koppelingen en studentenaantallen blijven behouden. Nieuwe voorspellingen
zijn geen officiële opleidingsrelaties en vereisen menselijke controle.

## Actuele kwaliteitsverbetering

De oorzaakanalyse, het vooraf vastgelegde verbeterplan, de regressiecontroles en
de volledige vergelijking staan in
[MBO_ESCO_KWALITEITSANALYSE.md](MBO_ESCO_KWALITEITSANALYSE.md).
De actuele gecombineerde uitvoer is `data/processed/mbo_beroep_matches.csv` en
`data/processed/mbo_isco_matches.csv`. De oorspronkelijke modeluitvoer is behouden;
ESCO- en CompetentNL-identifiers blijven onderscheiden. De ontwikkelcijfers zijn
geen onafhankelijke nauwkeurigheidsmeting.
