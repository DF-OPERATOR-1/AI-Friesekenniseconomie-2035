# DUO: onderwijs in Friesland

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

## Uitvoeren

Na installatie volgens de hoofd-README:

```bash
python research/onderwijs/onderwijs.py
```

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

Iedere geselecteerde broncel met een aantal wordt één uitvoerrij.
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

Laatst gecontroleerd: 28 oktober 2026.
