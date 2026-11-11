# Friese mbo-aanbodselectie voor de website

**Vervolg:** dezelfde selectie wordt inmiddels ook op de canonieke mbo-CSV's
en downloads toegepast. Zie [CSV-filtering en plaatsnamencontrole](MBO_CSV_SELECTIE.md).

## Aanleiding en afbakening

De gebruiker heeft bevestigd dat zijn handmatige inventarisatie het gewenste
Friese aanbod van SVO, ROC Nova College en Aeres afbakent. Die inventarisatie
was opgeslagen, maar werd nog niet toegepast op de website. De volledige
instellingsselectie liet daardoor ook opleidingen van niet-Friese locaties zien.

De website past deze bevestigde selectie nu toe **per instelling en opleiding**.
Firda blijft volledig behouden. Dronten en de ingesprongen vermeldingen onder
opleidingen worden niet als afzonderlijk Fries aanbod meegenomen. Een opleiding
blijft bestaan als die bij Firda wordt gegeven, ook wanneer dezelfde opleiding
bij SVO, Nova of Aeres wordt uitgesloten. Hbo en wo veranderen niet.

## Exacte aansluiting op SBB

De [Friese aanbodselectie](../../data/mappings/mbo_locaties/friese_aanbodselectie.csv)
bevat 67 locatie–opleidingsvermeldingen met de primaire namen uit de handmatige
inventarisatie. Iedere naam is gekoppeld aan precies één SBB-kwalificatie-id uit
het bestaande bestand `251126 mbo-opleidingskoppeltabel 2026-27 met wijzigingenblad.xlsx`.
Dit lost ook naamwijzigingen op: Medewerker foodservice is b0405, net als de oudere
DUO-naam Medewerker fastservice (25178). **Allround** medewerker foodservice heeft
een ander id en wordt bij SVO niet meegenomen. Vakbekwaam medewerker vers is b0876.

Voor twee Nova-namen zijn expliciete transcriptiecorrecties vastgelegd: `officie`
naar `officier` en `Maritien` naar `Maritiem`. Er is geen fuzzy matching of
naamafleiding toegepast; de oorspronkelijke invoer blijft ongewijzigd.
De vastgelegde CSV heeft een bronlink per regel en de bronchecksums staan in
`friese_aanbodselectie_bronnen.json`. Referentie van de kwalificatienaam is
schooljaar 2026–2027; dit bevestigt geen campusaanbod in een eerder onderwijsjaar.

Voor iedere opleiding en ieder gegevensjaar vergelijkt de website-export de
SBB-kwalificatie uit de bestaande jaargebonden koppeltabel met de toegestane
kwalificaties voor die instelling. Onbekende kwalificaties worden bij de drie
beperkte instellingen niet op naam alsnog toegelaten. Alleen bestaande DUO-rijen
blijven over: aanbod zonder studentregistratie wordt niet met fictieve aantallen
of opleiding-jaarcombinaties toegevoegd.

De instellingsnamen, opleidingsnamen, niveaus en leerwegen worden opnieuw uit de
behouden bronrijen samengesteld. De volledige ongewijzigde mbo-snapshot blijft
beschikbaar; de website-export bevat een afgeleide selectie en een audit van alle
instelling–opleiding–jaarbeslissingen in `offer_selection`.

## Cijfers en historische jaren

Deze toepassing is een **selectie op bevestigd huidig aanbod**, ook als de
bezoeker historische cijfers bekijkt. Ze bewijst niet op welke campus studenten
in die jaren onderwijs volgden. De gebruikerscontrole heeft geen opgegeven geldig
schooljaar. Deze beperking staat op de detailpagina onder de bronnen.

Studenten en afgestudeerden worden in de websiteweergave beperkt tot dezelfde
instellingen per opleiding en jaar. Zowel kaarten, kerncijfers, trendlijnen als
tabellen volgen dus de selectie. Bij een gegevensjaar zonder ondersteunde
instellingsselectie wordt geen instelling verondersteld. Andere opleidingen in het
bestand blijven intern beschikbaar om de bestaande controle op bronjaren en
ontbrekende geslachtscategorieën te behouden. Er is geen nieuwe somregel of
schatting geïntroduceerd. De oorspronkelijke DUO-bronbestanden blijven ongewijzigd;
de afgeleide CSV's en downloads worden inmiddels wel op het aanbod gefilterd.
Afgeschermde waarden blijven afgeschermd.

Aantallen van behouden instellingen kunnen nog steeds ook niet-Friese locaties
omvatten, wanneer dezelfde opleiding op meerdere plaatsen wordt gegeven. De
selectie levert daarom geen exacte Friese studenten- of afgestudeerdentelling op.
De nieuwe aanbodfilter verandert geen inhoudelijke opleiding–beroepvoorspellingen:
alleen relaties voor nog zichtbare opleidingen worden in de website-export opgenomen.

## Controles en reproduceerbaarheid

Voor 2025 blijven bij SVO twee codes over: 25178 (Medewerker fastservice) en 25703
(Vakbekwaam medewerker vers). Bij Nova blijven twee codes met studentregistraties
over; bij Aeres 52 codes. Meerdere codes kunnen dezelfde kwalificatie beschrijven.
De website bevat na deze selectie 342 mbo-codes voor 2025, tegenover 396 daarvoor.
Zoeken op de huidige naam foodservice vindt ook de oudere DUO-benaming. Bronnen
op de detailpagina tonen de naam uit de huidige selectie en de KiesMBO-pagina's.

```sh
python -m research.onderwijs.selectie_aanbod
python -m research.pipeline.imports.build_atlas
python -m unittest discover -s tests
cd website
npm test
npm run build
```

Het eerste commando vereist het lokale SBB-werkboek en openpyxl. Gewone
websitebuilds gebruiken de vastgelegde selectie-CSV en hebben dit werkboek niet
nodig. Tests bewaken onder meer de twee SVO-kwalificaties, de Firda-uitzondering,
het uitsluiten van Nova-dakdekkers en Aeres-hoefsmeden, het scheiden van
instellingstellingen en het behoud van bronwaarden. De productiebuild controleert
ook dat opleiding–beroep-links naar bestaande geselecteerde opleidingen wijzen.
