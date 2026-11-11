# Mbo–beroepkoppelingen op de website

De aantallen hieronder beschrijven de export vóór de aanvullende
[Friese aanbodselectie](MBO_FRIESE_AANBODSELECTIE.md). De website beperkt inmiddels
ook per instelling het aanbod voor SVO, Nova College en Aeres; beroepsrelaties
voor daardoor vervallen opleidingen worden niet meer op de website gepubliceerd.

## Bronnen en controle

De gebruiker vroeg om de bestaande proefbeoordelingen en mbo-beroepmatches in
beide richtingen te tonen. `mbo_beroep_matches.json` bestond nog niet als bron;
`data/processed/mbo_beroep_matches.csv` bevat de actuele modeluitvoer. De
websitebuild maakt hiervan nu `website/public/data/atlas/mbo_beroep_matches.json`,
met toevoeging van `data/mappings/opleiding_beroep_proef_beoordelingen.json`.
Dit JSON-bestand is een weergave-export; het traint geen model en wijzigt geen
bestaande bronkoppelingen, selecties, gewichten of cijfers.

De CSV bevat 567 voorspelde relaties. Het proefbestand bevat na de aanvulling 18 brongebonden
assistentbeoordelingen, geen onafhankelijke menselijke validatie. Beoordelingen
zijn evenmin statistische kansen of bewijs van directe toegang tot een beroep.

De aansluiting op de website gebeurt uitsluitend via dezelfde mbo-opleidingscode,
geen naamgelijkenis, code-opvolging of afgeleide SBB-relatie. Het huidige bestand
bevat 575 mbo-codes over alle jaren; 97 hebben één of meer publiceerbare relaties.
De export bevat 276 relaties: 268 ESCO-modelvoorstellen en acht geselecteerde
CompetentNL-relaties uit de assistentbeoordelingen. De overige codes krijgen geen
verzonnen koppeling. De dekking en niet-aangesloten broncodes staan in
`metadata.coverage`; dit is geen kwaliteitspercentage van het model.

Bij deze implementatie zijn alle 268 ESCO-identificaties en hun ISCO-codes
vergeleken met `data/raw/esco/v1.2.1/nl/occupations_nl.csv`. De vier
CompetentNL-relaties zijn vergeleken met `competentnl_members.json.gz`.
Er waren geen afwijkingen. Dat bevestigt de classificatierelatie van het
bronberoep, niet de inhoudelijke juistheid van de voorspelde opleidingsmatch.

## Selectieregels

- Publiceer bestaande modelvoorstellen met categorie `verwant beroep` of
  `directe beroepsmatch`. Voeg geen kandidaten uit de volledige zoeklijst toe.
- Een bestaande assistentbeoordeling vervangt modelvoorstellen voor dezelfde
  opleidingscode. Publiceer alleen expliciet geselecteerde beroepen. Als geen
  beroep is geselecteerd, toon de onzekerheid in plaats van oude voorspellingen.
- Bij `keep_baseline` komt de behouden groep uit
  `data/processed/opleiding_beroep_proef.json.gz`. Een groepskoppeling zonder
  beroepsidentificatie wordt niet aan specifieke beroepen in die groep toegekend.
- Meerdere beroepen zijn toegestaan. Dedupliceer op opleiding, beroepsidentificatie,
  ISCO en beroepsnaam; leg geen willekeurig maximum van vijf op.
- Bewaar bronchecksums, methode, status, score en onderbouwing. Een modelscore op
  100 is geen kanspercentage; geef assistentvoorstellen geen verzonnen score.

## Weergave

De kop bij beroepsgroepen en specifieke beroepen heet **Opleidingen die hierbij
kunnen aansluiten**, zodat hbo en wo later onder dezelfde kop kunnen worden
toegevoegd. De huidige relaties zijn uitsluitend mbo en worden als zodanig
gelabeld. Onder de onderbouwing staat een link naar de identificatie van het
specifieke bronberoep. Die bron ondersteunt de beroepsinhoud; de opleidingsmatch
blijft een onderzoeksvoorstel. De generieke kop voegt geen hbo-/wo-relaties toe.

Op mbo-details staat naast de officiële SBB-naam een afzonderlijk onderdeel met
mogelijke beroepen, status, onderbouwing en link naar de beroepsgroep. Hbo en wo
krijgen deze mbo-voorspellingen niet.

Op beroepsgroeppagina's staan mbo-opleidingen die aan die ISCO-groep zijn gekoppeld,
met het onderliggende beroep als toelichting en een link naar de opleiding.
Bij een gekozen specifiek beroep onder Werkzaamheden worden uitsluitend relaties
met exact dezelfde beroepsidentificatie getoond. Geen koppeling wordt over alle
beroepen binnen de groep verspreid. ESCO- en CompetentNL-identificaties worden
niet op grond van een vergelijkbare naam gelijkgesteld. Een groepslink selecteert
niet automatisch een specifiek beroep. De zeven CBS-groepen met beperkte gegevens
behouden hun bestaande uitzondering.

Een teruglink naar een opleiding gebruikt het geselecteerde jaar als dat
beschikbaar is, anders het meest recente beschikbare gegevensjaar. De matching
zelf is niet per jaar gevalideerd; dit wordt zichtbaar vermeld. Cijfers worden
niet over beroepen verdeeld en de handmatige locatiecontrole blijft afzonderlijk.

Bronnen staan bij de koppelingen: CompetentNL, CC BY 4.0 (bewerkt), Europese
Commissie, ESCO v1.2.1 (Nederlandstalige classificatie), en de Nederlandse
ESCO-dienstvermelding. De opleiding–beroepvoorspelling is een bewerking door
DataFryslân, geen officiële relatie van die bronhouders.

## Reproduceren en testen

```sh
python -m research.pipeline.imports.build_atlas
python -m unittest discover -s tests
cd website
npm test
npm run build
```

De exporter staat in `research/pipeline/imports/mbo_website_matches.py`; de gedeelde
weergave in `website/src/components/MboMatches.tsx`. Tests controleren exacte
sleutels, richting, voorrang van beoordelingen, onzekere gevallen, groepsrelaties,
scorebetekenis en geldige teruglinks. De Pages-controle controleert tevens dat
iedere gepubliceerde relatie een bestaande mbo-code en beroepsgroep heeft. Het
publicatieregister staat de gevraagde afgeleide JSON toe. Een visuele
browsercontrole is in deze omgeving niet uitgevoerd.


## Herstel: Allround dakdekker metaal

De codes 25542 en 25869 hadden geen modelvoorstel. In de aangeleverde
CompetentNL-profielen heet de actuele opleiding Allround monteur metalen daken
en gevels (27072); ook die had geen gepubliceerde match boven de modelgrens.
Er is daarom geen automatische kopie van een vergelijkbare opleidingsnaam gedaan.

Voor beide historische codes is een aanvullende brongebonden assistentbeoordeling
vastgelegd. De SBB-koppeltabellen verbinden beide aan b0952. Het
[SBB-certificaatsupplement voor 25542](https://www.s-bb.nl/media/jl3c3jmn/allround-dakdekker-metaal-25542-1617-nl-nov2016.pdf)
beschrijft uitvoerend dakwerk en coördinatie. De bestaande CompetentNL-definities
voor Dakdekker en Voorman / voorvrouw dakdekker noemen metalen dakbedekking.
Beide beroepsidentificaties hebben broncode ISCO 7121. De voormanfunctie staat
expliciet als doorgroeimogelijkheid vermeld: SBB noemt aanvullende opleiding of
cursussen. Dit is geen modelscore of onafhankelijk gevalideerde directe beroepsroute.
De bewijslink staat bij de voorgestelde koppelingen. Een regressietest bewaakt
beide opleidingscodes en beide specifieke beroepsidentificaties. Lege lijsten
worden niet meer als leeg lijstblok gerenderd.
