# AI Index Fryslân — website

Nederlandstalige React/Vite/TypeScript-website voor onderzoek naar AI en de Friese arbeidsmarkt. Onder **Invloed van AI** in de hoofdnavigatie naast het logo staat een uitklapmenu met Perceptuele kaart (standaard) en AI-exposure per beroep (bestaande doorzoekbare grafiek). Het menu ondersteunt toetsenbordbediening, sluiten met Escape en buitenklik, en een mobiele weergave. Er staan geen dubbele tabs op de pagina. Bronnen en methode staan op hun eigen bestaande pagina’s. De overige pagina’s zijn Home, Beroepen, Toekomst 2035, Bronnen & open data en Methodologie.

Bestaande exposurelinks openen de exposureweergave. De oude gebruiksroute valt terug op de pagina Invloed van AI. De kaart behoudt haar eigen zoek- en filterselectie; deze staat los van de exposurefilters. Uitgebreide kaartuitleg is uitklapbaar. De assen, berekeningen, bronbestanden en downloads zijn behouden.

## Ontwikkelen en controleren

Gebruik Node.js 22.12 of nieuwer en npm. Vanuit `website/`:

```bash
npm ci
npm run dev
```

Open de door Vite getoonde URL (normaal http://localhost:5173).

```bash
npm run typecheck
npm run build
npm run preview
```

De productiebuild staat in `dist/`. Preview gebruikt normaal http://localhost:4173. Stop een server met Ctrl+C. Controleer visueel beide thema’s, mobiel menu, toetsenbordbediening, filters, gegevenstabel en downloads. Er is nog geen automatische browsertestsuite.

## Onderzoeksdata bijwerken

Vanuit de hoofdmap van de repository:

```bash
python3 website/scripts/export_research.py
```

Dit leest de bestaande CSV’s uit `data/processed/ai_exposure/`, `data/processed/ai_complementarity/` en `data/processed/onderwijs/`. Het script berekent geen nieuwe scores, bewaart ontbrekende waarden als `null` en beroepscodes als tekst, en exporteert JSON en ongewijzigde CSV-downloads naar `website/public/data/research/`. Het JSON-bestand bevat bronpaden en SHA-256-vingerafdrukken. Python gebruikt alleen de standaardbibliotheek.

De indicatorselector bevat alleen algemene AI, taalmodellen en beeldgeneratie. Complementariteit is een afzonderlijke dimensie in de perceptuele kaart. De vier kwadranten worden uitgelegd als relatieve posities op basis van de medianen, zonder ze als bewezen risicocategorieën te presenteren.

De verkenner toont alle beschikbare scores binnen de zoekselectie in een intern scrollbare grafiek, standaard van hoog naar laag, met een vaste asschaal per indicator. De perceptuele kaart heeft een scrollbare tabel; de exposureweergave gebruikt uitsluitend de doorzoekbare grafiek. Er zijn 436 beroepsgroepen; complementariteit en C-AIOE zijn voor 422 beschikbaar.

Algemene AI, taalmodel- en beeldgeneratieblootstelling zijn afgeleide AIOE-indices. Ongestandaardiseerde AIOE, complementariteit en C-AIOE zijn eigen reconstructies. Het resterende theta-verschil met Pizzinelli et al. is niet volledig verklaard. Scores zijn geen percentages banenverlies of prognoses voor 2035. Er zijn geen Friese werkgelegenheidsgewichten toegepast.

DUO-bestanden zijn afzonderlijke onderwijsselecties. Mbo omvat vier instellingen met Friese locaties, inclusief locaties buiten Fryslân. Hbo/wo zijn geselecteerd op de provinciekolom; wo-studenten worden per wo-type geteld. Afgeschermde waarden blijven intact. Er worden geen studententotalen geschat of onderwijsgegevens aan beroepsscores gekoppeld.

De pagina Methodologie beschrijft per onderwerp de uitgevoerde stappen en oorspronkelijke bronnen in gewone taal. De onderzoeks-README’s in `../research/ai_exposure/`, `../research/ai_complementarity/` en `../research/onderwijs/` bevatten de exacte rekenregels en downloads. De actuele grafieken zijn React-componenten op de pagina Invloed van AI.

## GitHub Pages via docs

Vanuit de hoofdmap:

```bash
python3 website/scripts/export_research.py
npm --prefix website run build
python3 website/scripts/publish_pages.py
```

Commit en push de gewijzigde websitebron en `docs/`. De bestaande Pages-instelling op de publicatiebranch en `/docs` kan blijven staan. `base` gebruikt het vaste repositorypad `/AI-Friesekenniseconomie-2035/`. De publicatiestap synchroniseert de build inclusief `.nojekyll` en verwijdert verouderde gegenereerde bestanden uit `docs/assets/` en `docs/data/`. Overige documentatie blijft behouden.

## Architectuur

- `src/components/`: navigatie, herbruikbare UI, beroepenverkenner en downloads.
- `src/content/nl.ts`: taalcode, navigatie en repositorylink.
- `src/hooks/useTheme.ts`: systeemvoorkeur en lokale themakeuze.
- `src/styles/global.css`: CSS-variabelen voor beide thema’s en responsieve stijlen.
- `scripts/export_research.py`: afzonderlijke export van onderzoeksuitvoer.
- `public/data/research/`: gegenereerde werkkopie van toegestane gegevens, uitgesloten van Git.

Recharts tekent de grafiek en wordt apart geladen. Poppins is lokaal gebundeld via Fontsource; de fontlicentie staat in dat pakket. Volvo Broad Regular en Arial MT Pro worden niet meegeleverd. Een script in `index.html` kiest het thema vóór de eerste weergave. Een expliciete keuze wordt opgeslagen als `ai-index-theme`; wis die browsersleutel om opnieuw de systeemvoorkeur te volgen.

De standaardtaal is `nl-NL`; getallen gebruiken Nederlandse notatie. `src/content/` biedt ruimte voor toekomstige taalmodules; de langere componentteksten moeten bij toevoeging van Fries of Engels eveneens worden verplaatst. Er vindt geen automatische vertaling plaats.

Nog open: regionale werkgelegenheidskoppelingen, definitieve organisatievermelding, code- en datalicenties en geschiktheid van een AI-gebruiksindicator. Een publieke repository vormt op zichzelf geen open-sourcelicentie.

## Navigatie zonder lange homepage

De hoofdnavigatie wisselt tussen afzonderlijke weergaven binnen dezelfde React-app. Alleen het gekozen onderdeel wordt getoond. URL-fragmenten (zoals `#verkenner`) maken directe links en de terug-/vooruitknoppen mogelijk zonder serverrouter. De actieve navigatielink heeft `aria-current="page"`. Bij wisselen gaat de weergave naar boven en krijgt de hoofdinhoud focus voor toetsenbord- en schermlezertoegang. Op mobiel blijft het inklapbare menu beschikbaar. Lange tabellen en methodeteksten kunnen binnen hun eigen onderdeel nog scrollen; de inhoud wordt niet afgesneden.

## Geïntegreerde perceptuele kaart en DataFryslân

De pagina Invloed van AI toont de interactieve perceptuele kaart als React/SVG-component (`src/components/PerceptualChart.tsx`), met Poppins en CSS-themavariabelen. De kaart gebruikt dezelfde 436 rijen als de zelfstandige kaart (422 met beide scores), dezelfde medianen en dezelfde vaste schaalberekening. Zoeken en filteren wijzigen de referentiepopulatie niet. De kaart bevat beroepsselectie voor toetsenbordbediening, exacte waarden in een uitklapbare tabel en een SVG-download met de actieve themakleuren en bronvermelding. Bij los gebruik van de SVG valt het font terug op Arial als Poppins niet is geïnstalleerd.

De uitleg van de kwadranten is ingeklapt om de homepage compact te houden. Op mobiel kan de kaart horizontaal worden verschoven. De ongebruikte zelfstandige websitekaart is verwijderd; de lokale onderzoekskaart blijft behouden. De bedrijfsnaam DataFryslân en het aangeleverde DF-logo worden in de navigatie en footer getoond.

## Officiële huisstijlbestanden

De aangeleverde SVG’s staan in `public/assets/brand/`: `df-logo.svg` is het officiële DF-logo en verschijnt ongewijzigd in navigatie en footer. `frl-dark.svg` is het decoratieve beeld voor lichte modus; `frl-light.svg` is het beeld voor donkere modus. Deze illustratie staat bij Over. De wissel volgt het actieve websitethema via CSS, ook wanneer dit afwijkt van de systeemvoorkeur. Het oorspronkelijke DF-logo wordt gebruikt in lichte modus; `df-logo-light.svg` is de aangeleverde lichte variant voor donkere modus. De logo-omslag volgt via CSS het actieve websitethema, zonder toegevoegde witte achtergrond. De twee witte achtergrondrechthoeken zijn uit beide DF-logo’s verwijderd voor transparantie. Alle overige SVG-elementen en logokleuren zijn behouden. Ook uit `frl-light.svg` (donkere modus) zijn uitsluitend de twee witte achtergrondrechthoeken verwijderd. De illustratie zelf en `frl-dark.svg` zijn verder ongewijzigd. De bestanden worden met de build automatisch naar `docs/assets/brand/` gekopieerd.

De vier achtergrondvlakken van de perceptuele kaart behouden in beide thema’s het oorspronkelijke palet: complementair potentieel `#f2f6f5`, productiviteitswinst `#eaf3f1`, beperkte directe impact `#f7f8f8` en substitutierisico `#faf5e9`. Labels binnen de vlakken blijven donker voor contrast; assen en omliggende bediening volgen het gekozen thema. De SVG-download neemt dezelfde kleuren over.

Het omhullende element van het FRL-huisstijlbeeld heeft eveneens een transparante achtergrond, zodat het beeld aansluit op de pagina-achtergrond.

De footer gebruikt in beide thema’s de aangeleverde BFY-combinatie `footer-logo-on-dark.svg`, met witte letters en geel op een vaste donkerblauwe achtergrond. Het logo behoudt zijn natuurlijke beeldverhouding. Het losse DF-logo blijft in de hoofdnavigatie staan.

De tab AI-exposure biedt sortering op score (hoog naar laag of laag naar hoog) en beroepscode. De tabel volgt dezelfde sortering; ontbrekende scores komen bij scoresortering onderaan. De uitleg maakt duidelijk dat hogere waarden meer overlap betekenen en dat negatieve scores geen negatieve blootstelling of percentages voorstellen.

De perceptuele kaart schaalt mee tot maximaal 1120 pixels inhoudsbreedte en blijft gecentreerd, met ruime buitenmarges op grote schermen. De eerdere hoogtebeperking van 49vh is vervallen; het SVG behoudt zijn verhoudingen. Op mobiel blijft horizontaal verschuiven beschikbaar om de labels leesbaar te houden.

De kaart gebruikt minimaal 48 px paginamarge op desktop (80 px op grote schermen), 24 px op kleinere schermen en 12 px op mobiel. Door de maximale breedte van 1120 px worden de marges op brede schermen groter. De interne SVG-layout wordt met ResizeObserver op schermpixels afgestemd: links 80 px, onder 100 px, labels 12–13 px, stippen 4 px (geselecteerd 7 px). Beide assen krijgen 5% extra bereik rond de volledige dataset (theta begrensd op 0–1). Medianen en bronwaarden blijven ongewijzigd.

De hoofdkaart is compacter (350–420 px hoog op basis van de breedte). Het detailvak ‘Ontdek een beroep’ staat op brede schermen rechts naast de kaart, met de kaart links. Op smallere schermen staat het detailvak boven de kaart. De toegankelijke vraag vormt de hoofdtitel; de indicatornamen staan in de ondertitel.

Korte opsommingen in de interface gebruiken `|` als scheidingsteken. De bronregel binnen de SVG heeft extra ruimte onder de horizontale as. Boven de kaart staat een korte leeswijzer; ‘mediaan’ wordt zichtbaar uitgelegd als de middelste score. Scores en wegingen zijn niet aangepast.

## Assets: één bron, gegenereerde builds

Logo’s en huisstijlbestanden staan uitsluitend als bron in `src/assets/brand/`.
React importeert ze; Vite verwerkt de benodigde bestanden automatisch naar `dist/assets/`.
`public/` bevat alleen bestanden die rechtstreeks worden gekopieerd, zoals data en `.nojekyll`.
`dist/` is een lokale, genegeerde build. `../docs/assets/` is de gegenereerde kopie voor GitHub Pages.
Pas logo’s alleen onder `src/assets/brand/` aan; bewerk de buildbestanden niet handmatig.

## Code leesbaar houden

TypeScript, React/TSX, CSS en HTML gebruiken Prettier met twee spaties inspringing
en een richtlijn van 88 tekens per regel. JSX-elementen en attributen worden
waar nodig over meerdere regels verdeeld.

```bash
npm --prefix website run format
npm --prefix website run format:check
```

PEP 8 geldt voor Python, niet voor TSX. De Python-code is met `autopep8`
geformatteerd, met 88 tekens als projectrichtlijn voor regellengte.
Formattering controleert opmaak; inhoudelijke kwaliteit blijft onderdeel van review en tests.

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

## Beroepsdetailpagina

De beroepsdetailpagina heeft drie hoofdsecties: AI-invloed, beroepsinhoud en
Regionale context. Bestaande AI-scores krijgen een visuele schaal (exposure:
bereik van de aanwezige scores; complementariteit: 0–1). De bestaande medianen
en kaartinterpretatie blijven leidend; de schaal introduceert geen categorieën.
De kaart toont Hoog/Laag ten opzichte van de bestaande medianen; de mediaan staat
ook als getal en markering op de schaal. Bron- en methode-informatie staat op de
bestaande bronnen- en methodologiepagina. De CompetentNL-bron staat eenmaal bij
de introductie van de beroepskeuze. De keuze van een specifiek beroep verandert
de omschrijving, taken en vaardigheden, niet de scores van de ISCO-groep.
Vaardigheden tonen maximaal zes items per categorie en kunnen worden uitgeklapt;
de oorspronkelijke volgorde binnen de categorie blijft behouden. De categorieën
staan onder elkaar, met de uitklapknop naast elke categorietitel. Binnen elke
categorie staan de vaardigheden in responsieve kolommen: eerst van boven naar
beneden, daarna in de volgende kolom rechts.

## Compacte methodologie

De bestaande methodologiepagina toont vier hoofdsecties met zichtbare kernuitleg:
Invloed van AI, Werkgelegenheid en demografie, Onderwijs en instroom en Samenhang
richting 2035. De volledige oorspronkelijke uitleg, formules, validatie en
bronvermeldingen staan in standaard ingeklapte native `details`-onderdelen.
Bestaande technische anker-ID’s en alle brononderdelen zijn behouden.

## Repositoryopschoning en bronverversing

`public/data` wordt automatisch opgebouwd bij `dev`, `data` en `build` en staat
buiten Git. De bestaande `/docs`-publicatie blijft behouden. Canonieke inputs voor
de beroepsinhoud staan gecomprimeerd onder `data/processed`. De gewone build
gebruikt geen ruwe bronnen; herimport gebeurt expliciet met `npm run data:refresh`.
Lees [wat op GitHub en de website komt](../data/published/README.md).

## Opleidingen: bronnen en regionale beperking

De tab Opleidingen toont mbo, hbo en wo voor 2021–2025, met 2025 als
hoofdjaar. De oorspronkelijke bronnen en selectie staan in de
[onderwijs-README](../research/onderwijs/README.md), de exacte koppelingen en
bronlinks in de [mapping-README](../data/mappings/README.md).
De jaarlijkse mbo-koppeltabellen zijn beschreven in de
[CREBO-broninventaris](../data/raw/crebo/README.md).

Hbo en wo zijn geselecteerd op provincie Friesland in DUO. Mbo is een
uitzondering: de geselecteerde instellingen hebben Friese locaties, maar
hun opleidingscijfers omvatten ook locaties buiten Friesland. De gebruikte
openbare bronnen geven geen gekoppelde CREBO × onderwijslocatie × jaar-
telling. Locatietotalen zijn wel beschikbaar; exacte Friese aantallen per
opleiding zijn daaruit niet af te leiden. Ook is niet ieder kandidaat-
opleidingsaanbod bewezen op een Friese locatie. De opleidingstab vermeldt
deze beperking in de introductie en onder ‘Wat vertelt deze koppeling?’.
Er worden geen studentenaantallen of arbeidsmarktinstroom aan beroepen
toegewezen. Beroepsrelaties naar CompetentNL/ISCO blijven onbevestigd totdat
een gevalideerde bronkoppeling beschikbaar is.

## Onderzoeksprotocol opleiding → ISCO

De [methodiek en het beoordelingsprotocol](../research/onderwijs/METHODIEK_OPLEIDING_BEROEP.md)
leggen de bronselectie, matching, ML-proef, assistentbeoordeling en validatie vast.
De ML-proef is onderzoeksuitvoer naast de bestaande koppeltabel; de uitkomsten
zijn niet als bevestigde beroepsroutes op de website gepubliceerd.

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

## CBS: niet relevant voor de Nederlandse arbeidsmarkt

De beroepspagina’s voor 1113, 4414, 6310, 6320, 6330, 6340 en 9624 tonen de
CBS-opmerking uit `ISCO-08 voorbeeldberoepen`, met een link naar de
[CBS-bronpagina](https://www.cbs.nl/nl-nl/onze-diensten/methoden/classificaties/onderwijs-en-beroepen/beroepenclassificatie--isco-en-sbc--).
De bronvermelding staat los van de herkomst van de AI-scores. Op deze zeven
pagina’s worden alleen beschikbare AI-scores getoond; de overige gegevens
worden expliciet als niet beschikbaar vermeld. De algemene secties voor
beroepsinhoud, opleidingen en regionale context worden hier niet getoond.
De codes en brontekst komen uit `data/processed/controles/isco_cbs_relevantie_validatie.json`.

De ESCO-toepassingsvermelding staat uitsluitend bij de beroepsinhoud op de
beroepspagina’s die ESCO gebruiken, niet in de algemene footer of op de homepage.

### Weergave ESCO en CompetentNL

Beide bronnen gebruiken dezelfde competentiekaarten voor vaardigheden en
kennisgebieden: categorie, aantal, maximaal zes zichtbare items per categorie,
een knop om meer te tonen en uitklapbare toelichtingen. Labels krijgen alleen
in de weergave een beginhoofdletter; de bronbestanden blijven ongewijzigd.
ESCO-taken worden als ‘Niet beschikbaar’ getoond. De Nederlandse bronregel
vermeldt Europese Commissie, ESCO v1.2.1 en Nederlandstalige classificatie.
De voorgeschreven Engelse standaardzin staat direct achter de Nederlandse bronregel in dezelfde kleine alinea,
zonder uitklapblok, bij dezelfde beroepsinhoud.

## Opleidingenoverzicht en detailpagina’s — 9 november 2026

Het overzicht toont twee volledig klikbare opleidingskaarten per rij, en één
onder 720 px. Kaarten bevatten alleen naam, onderwijssoort, eventueel mbo-niveau,
instellingsnamen zonder codes en ‘Bekijk opleiding’. Zoekvelden en filters
gebruiken dezelfde gegevens en zoeklogica als voorheen, inclusief zoeken op
bestaande codes en beroepsnamen. Filters en de getoonde hoeveelheid kaarten
blijven bewaard bij openen van een detailpagina en terugkeren naar het overzicht.

Een detail heeft een eigen hashroute: `#opleiding/mbo/25956/2025` (ook hbo/wo).
De route bevat onderwijssoort, code en gegevensjaar; ongeldige of ontbrekende
combinaties krijgen een duidelijke teruglink. De bestaande navigatie blijft actief.
SBB-beroepsnamen verschijnen alleen uit de bestaande schooljaarkoppeling.
Een SBB-beroepsnaam wordt expliciet onderscheiden van een ISCO-groep. Bij hbo/wo
wordt een beroepssectie alleen getoond wanneer de bron werkelijk relaties bevat;
experimentele ML-voorstellen zijn niet aan deze pagina toegevoegd.

`EducationCounts.tsx` leest de zes al gepubliceerde onderwijs-CSV’s pas bij de
opleidingsdetails. Weergave gebruikt exact opleidingscode en gegevensjaar en
behoudt alle bronuitsplitsingen; er worden geen totalen berekend en geen andere
gegevensjaren stilzwijgend gebruikt. Een nul blijft nul; `<5` verschijnt als
‘Minder dan 5’. Ontbrekende cijfers zijn herkenbaar. Tabellen blijven op mobiel
binnen hun eigen horizontaal scrollbare, met het toetsenbord bereikbare regio.

Codes, schooljaar, bronbestanden, bronlinks en geografische beperkingen staan in
‘Opleidingsgegevens en bronnen’. De algemene toelichting staat ingeklapt onder
‘Over deze gegevens’. De bronselecties, berekeningen, publicatierechten en
bestaande koppelingen zijn ongewijzigd. Er zijn geen dependencies toegevoegd.

Validatie: 39 websitetests en productiebuild inclusief TypeScript/Pages-controle.
De CSV-parser is bovendien vergeleken met Python csv voor alle 27.590 bronrijen:
alle velden en afgeschermde waarden zijn identiek. Geen visuele browsertest
uitgevoerd: in deze sessie is geen browser-/previewtool beschikbaar.

### Niveau, compacte kaarten en jaarontwikkeling

Het filter ‘Niveau’ werkt voor alle onderwijssoorten: mbo-niveaus 1–4 en de
graden die daadwerkelijk in de gekozen onderwijssoort/het jaar voorkomen
(Associate degree, Bachelor, Master). Ook de kaarten tonen deze graden.
‘Bekijk opleiding’ en de vaste minimumhoogte zijn verwijderd; de hele kaart
blijft een toetsenbordtoegankelijke link. Meerdere instellingen worden met &
gescheiden.

Op de detailpagina staan interactieve jaarlijnen voor studenten en afgestudeerden,
met een keuze voor de som van broncijfers of een specifieke uitsplitsing.
Volledig bekende, eenduidige jaarcijfers worden exact getoond.
Als een onderliggend aantal `<5` is, wordt nu een bandbreedte getoond volgens
de afgesproken regel 0 t/m 4 per afgeschermde categorie; er wordt geen exacte
middenwaarde geschat. Ontbrekende jaren blijven eveneens onbekend, nul blijft nul en dubbele
bronuitsplitsingen worden niet dubbel geteld. De lijn verbindt geen gaten.
Er wordt geen regressielijn of schatting gemaakt. Tabellen behouden hun
bronuitsplitsingen en ‘Minder dan 5’.

Het bijschrift verklaart de gearceerde band door aantallen `<5`.
De grafiek toont alle beschikbare bronjaren; de uitgebreide tabel bevat eveneens
alle beschikbare jaren. Ook één exact jaarpunt of één interval wordt getoond,
met de melding dat daaruit nog geen ontwikkeling kan worden afgeleid. Het eerdere
‘geen totalen’-beleid geldt nog voor de brontabel; de nieuwe grafiek maakt alleen
exacte sommen of expliciet begrensde intervallen voor de jaarweergave. Bronbestanden, selecties en koppelingen
zijn niet gewijzigd. Recharts wordt hergebruikt en pas geladen bij een grafiek,
zodat het overzicht en de homepage de grafiekbibliotheek niet vooraf laden.

Validatie: 44 websitetests en productiebuild geslaagd. Er is geen browsertool
beschikbaar; responsieve styling en interacties zijn niet visueel in een browser
getest.

### Actuele opleidingsdetailpagina: kerncijfers en ingeklapte details

De detailpagina volgt nu: opleiding/niveau/instellingen, ‘Wat kun je worden met
deze opleiding?’, ‘Studenten en afgestudeerden’, ‘Bekijk de uitgebreide cijfers’
en ‘Opleidingsgegevens en bronnen’. Bij de beroepsnaam staat een kleine
bronvermelding; SBB/ISCO-uitleg staat uitsluitend in de bronnen. Er zijn geen
beroepskoppelingen toegevoegd of als gegarandeerde uitkomst gepresenteerd.

Twee compacte kerncijferkaarten volgen samen het centrale filter ‘Cijfers voor’.
Er is geen afzonderlijke terugval op een ander bronjaar meer. Een ontbrekend
cijfer in het gekozen jaar wordt niet door een historisch cijfer vervangen.
De kernkaarten tonen exacte volledige totalen of een expliciet gelabelde
bandbreedte bij afscherming. Bij onvolledigheid of meerdere instellingen staat
‘Geen volledig totaal beschikbaar’.

De nieuwe pure helper `educationTrendData.ts` houdt presentatie en
volledigheidscontrole los van Recharts. Een exact totaalcijfer vereist exacte
waarden; een bandbreedte mag daarnaast afgeschermde waarden `<5` bevatten. Beide
vereisen unieke bronuitsplitsingen en alle benodigde geslachtscategorieën. Een in het
bronbestand voorkomende categorie ‘onbekend’ moet ook aanwezig zijn; ontbreken
wordt niet als nul geïnterpreteerd. Identificatie, niveau en leerweg/opleidingsvorm
moeten bekend zijn. Voor mbo is inmiddels bevestigd dat DUO per instelling één hoofdinschrijving
of hoofddiploma per persoon telt: de leerwegen worden daarom gecombineerd. Bij
meerdere instellingen is dit een registratietotaal, geen gegarandeerd aantal
unieke personen. De algemene overlapcontrole blijft van toepassing op hbo/wo.
Bij onvoldoende bewijs wordt geen exact totaal of bandbreedte geconstrueerd.

Grafieken staan standaard op ‘Totaal opleiding’, zonder automatische selectie
van mannen of vrouwen. Een ingeklapte keuze biedt deelgroepen, waaronder één
instelling/leerweg met complete geslachtscategorieën of één oorspronkelijke
bronreeks. Een actieve deelgroep wordt altijd benoemd. Kerncijfers blijven het
totaal van de opleiding aanduiden en worden niet ongemerkt door een deelgroep
vervangen. Bekende jaarpunten blijven gescheiden bij gaten. Voor één jaarcijfer
wordt geen ontwikkeling gesuggereerd; het afzonderlijke jaarpunt of interval blijft zichtbaar.

De grote tabellen staan standaard ingeklapt en volgen het centraal gekozen
cijferjaar. ‘Toon alle beschikbare jaren’ maakt de eerdere volledige weergave
beschikbaar, inclusief de aparte kolom ‘Gegevensjaar’. Instelling/plaats,
leerweg/opleidingsvorm, niveau, geslacht en oorspronkelijke aantallen blijven
beschikbaar. ‘Minder dan 5’ blijft herkenbaar. Bronnen, regionale selectie,
mogelijke overlap, ontbrekende waarden en SBB/ISCO zijn in een afzonderlijk
bronnenonderdeel te vinden. De routes en filters zijn behouden; geen originele
DUO-bestanden of bestaande opleiding–beroepkoppelingen zijn gewijzigd.

Validatie: 51 websitetests en productiebuild inclusief TypeScript en Pages-controle.
De totaallogica is daarnaast gecontroleerd op alle 6.570 opleiding-jaarcombinaties
uit de zes bestaande bestanden. Visuele browsercontrole is in deze omgeving niet
beschikbaar.

### Mbo-opleidingen en mogelijke beroepen

De website past nu de [bevestigde Friese aanbodselectie](../research/onderwijs/MBO_FRIESE_AANBODSELECTIE.md)
toe per instelling. Bij SVO blijven alleen Medewerker foodservice (in oudere DUO-
gegevens Medewerker fastservice) en Vakbekwaam medewerker vers over. Nova College
en Aeres volgen eveneens de handmatige lijst; Firda blijft behouden. De getoonde
onderwijscijfers volgen dezelfde instellingselectie, zonder broncijfers te wijzigen.

De bestaande matches en assistentbeoordelingen zijn nu in beide richtingen te
raadplegen, met behoud van SBB-gegevens en onderwijscijfers. De gedeelde component
`MboMatches.tsx` laadt `atlas/mbo_beroep_matches.json` bij het openen van details.
Zie [broncontrole, selectie en beperkingen](../research/onderwijs/MBO_WEBSITE_KOPPELINGEN.md).

### Unieke opleidingskaarten

Het overzicht groepeert mbo-registraties per gekozen jaar op dezelfde bronnaam
én hetzelfde niveau. Hoofdletters, diakritische tekens en interpunctie worden
bij de naamvergelijking genegeerd; er is geen fuzzy match. Eén kaart toont de
gezamenlijke instellingen. Het is uitsluitend een visuele groepering, geen bewijs
dat de onderliggende kwalificaties gelijk zijn. Ook registraties zonder volledige
SBB-koppeling blijven binnen de kaart afzonderlijk te openen. Verschillende namen,
niveaus en onderwijssoorten worden gescheiden gehouden. Hbo en wo blijven per
onderwijssoort en opleidingscode beschikbaar.

Voorbeeld: (Junior) accountmanager, codes 25132 en 93802, verschijnt in 2021 één
keer. In de detailweergave kunnen bezoekers tussen de onderliggende registraties
wisselen. Bestaande detailroutes en zoeken op iedere code blijven werken. De
cijfers, trendlijnen en beroepsvoorstellen blijven bij de gekozen code horen;
er wordt niet over codes opgeteld. DUO-CSV's en bronwaarden veranderen niet.

De groepering is een presentatiestap in `Education.tsx`, na de bestaande filters.
Tests bewaken het voorbeeld, de onderliggende routes, het behoud van gegevens,
gezamenlijke instellingen en het gescheiden houden van verschillende opleidingen.

### Leerwegen en opleidingsvormen

Kaarten, detailkoppen en de afzonderlijke registraties tonen nu de beschikbare
vormen in het gekozen gegevensjaar. Bij mbo worden BOLVT en BBL weergegeven als
BOL (voltijd) en BBL. EX wordt als Extraneus opgenomen in de samenvatting BBL / BOL (voltijd) / Extraneus.
De detailtoelichting verklaart de betekenis als exameninschrijving. Bij hbo en wo staan de bronwaarden voltijd, deeltijd en duaal leesbaar
vermeld als opleidingsvorm. Er worden geen vormen afgeleid uit een opleidingscode
of ingevuld als de bron niets vermeldt. Zoeken ondersteunt ook de vormnamen.

Verificatie: bij (Junior) accountmanager heeft code 25132 in DUO 2021 zowel BOLVT
als BBL, terwijl 93802 ook BBL bevat; beide hebben daarnaast examendeelnemers.
De code is dus geen aanduiding van de leerweg. SBB licht toe dat een erkende
opleidingscode de kwalificatie identificeert en door de jaren heen kan veranderen:
https://www.s-bb.nl/onderwijs/erkende-opleidingscode . DUO bewaart opleidingscode en
leerweg als afzonderlijke gegevens in de gebruikte export. De ruwe codes en
cijfers blijven ongewijzigd in de tabellen; samengevoegde kaarten tonen de unie
van beschikbare vormen zonder aantallen op te tellen of alle vormen aan iedere
instelling toe te schrijven. De detailtoelichting vermeldt de jaar- en
instellingsafhankelijkheid.


### Bandbreedtes door afscherming

Volgens de gebruikersinstructie wordt iedere categorie `<5` in de visualisatie
begrensd door 0 en 4. De ondergrens is de som van bekende aantallen; de bovengrens
is die som plus vier per afgeschermde categorie. `value` blijft `null` bij een
interval; er wordt nergens een gemiddelde of ander geschat exact totaal gemaakt.
`lower`, `upper` en `suppressedCategories` bewaren de grenzen en hun aanleiding.
Bij exacte totalen zijn beide grenzen gelijk aan `value`.

Voorbeelden: 12 + `<5` → 12–16; `<5` + `<5` → 0–8; 0 + `<5` → 0–4;
12 + 8 → exact 20. Een lege cel, ontbrekend geslacht, dubbele bronrij, mogelijke
overlap of onveilig groot getal levert geen berekende grenzen op. Voor hbo/wo blijft de controle op gescheiden instellingen en opleidingsvormen
gelden. Mbo combineert de leerwegen op basis van de bevestigde DUO-telwijze, met
controle van volledige geslachtscategorieën binnen elke deelgroep.
Er worden geen totalen over afzonderlijke opleidingscodes opgeteld. Dezelfde
rekenregel wordt gebruikt in de gedeelde studenten- en afgestudeerdengrafiek.

`EducationTrend.tsx` gebruikt een Recharts ComposedChart: een volle lijn met
punten voor exacte totalen, een gearceerde range-Area met gestreepte onder- en
bovengrens voor intervallen. Verticale intervalmarkeringen maken ook een los
interval zichtbaar. De tooltip en toegankelijke beschrijving geven een bereik,
geen middenwaarde. Een legenda en kort bijschrift verklaren het verschil. De
kerncijferkaart toont exacte volledige totalen of een als zodanig gelabelde
bandbreedte. Bandbreedtes zijn ook beschikbaar in de grafiek en tooltip. Ontbrekende
jaren blijven gaten in alle lijnen en de band. CSV's en de ruwe tabellen behouden
`<5`; dit is een weergaveregel, geen vervanging van bronwaarden.

Validatie: 63 websitetests en de productiebuild slagen, inclusief tests voor één
en twee afgeschermde categorieën, nul, ontbrekende gegevens, dubbelingen,
overlap, numerieke grenzen en de tooltip. Visuele browsercontrole is niet uitgevoerd.


De [broncontrole en rekenregels voor mbo-totalen](../research/onderwijs/MBO_TOTALEN_EN_LEERWEGEN.md)
leggen vast waarom de leerwegen nu samen mogen worden geteld, waarom in het
gebruikte detailbestand geen extra exact totaal beschikbaar is, en hoe een
bandbreedte voor de hele gekozen opleidingscode wordt berekend. EX wordt in alle
gebruikersweergaven als Extraneus getoond; de CSV-broncode blijft behouden.


### Centraal jaarfilter op de opleidingsdetailpagina

`EducationCounts.tsx` leidt de beschikbare jaren af uit de gezamenlijke studenten-
en afgestudeerdenrijen voor de geopende opleidingscode, na de bestaande
instellingsselectie. Een jaar met uitsluitend lege waarden komt niet in de lijst;
0 en `<5` zijn wel beschikbare broncijfers. Het meegenomen overzichtsjaar wordt
gebruikt als dat beschikbaar is, anders het meest recente gezamenlijke bronjaar.
Beide bronnen mogen verschillende jaren bevatten: in de huidige HO-exports zijn
afgestudeerden beschikbaar van 2020–2024 en studenten van 2021–2025. Selectie 2025
mag dus een ontbrekend afstudeercijfer opleveren, geen ongemerkte terugval naar 2024.

Er is één select met label **Cijfers voor**, rechts naast de sectiekop boven de
kerncijfers en op mobiel onder de kop. Kerncijfers en standaardtabellen delen
hetzelfde jaar. De kernkaarten tonen exacte volledige totalen of een duidelijk als bandbreedte
aangeduid bereik. Een interval wordt nooit als exact cijfer gepresenteerd. Bij meerdere
instellingen wordt evenmin een registratiesom als gegarandeerd uniek
studententotaal weergegeven. De bestaande bronwaarden en rekenhelpers voor de
grafieken zijn niet veranderd. Grafieken blijven alle jaren tonen met een
verticale markering van het gekozen jaar. De uitgebreide tabellen kunnen via één
checkbox weer alle bronjaren tonen; een jaarwisseling zet die keuze terug.

`Education.tsx` houdt het openingsjaar van de opleiding apart van het cijferjaar.
Bijvoorbeeld: `#opleiding/mbo/25132/2021?cijfers=2025`. Omschrijving, instellingen,
SBB-kwalificaties, beroepsvoorstellen en schooljaarverantwoording blijven bij 2021;
alleen de cijfers volgen 2025. Wisselen van het cijferjaar gebruikt
`history.replaceState`, zodat de pagina niet omhoog springt en er geen reeks
onnodige browsergeschiedenisstappen ontstaat. Bestaande detailroutes zonder query
blijven geldig. Ook links naar andere registraties nemen het cijferjaar mee.

Het overzicht gebruikt `#opleidingen?jaar=2024`. De teruglink en terugnavigatie
binnen Opleidingen bewaren het laatst gekozen cijferjaar indien het overzicht
dat jaar kent. Als bijvoorbeeld 2020 alleen in de afstudeerbron voorkomt, valt het
overzicht terug op zijn meest recente beschikbare jaar; er wordt geen
opleidingaanbod voor 2020 verzonnen. `App.tsx` herkent de bestaande pagina's ook
met deze queryparameters. De overige overzichtsfilters blijven in de bestaande
componentstate bewaard zolang de gebruiker binnen Opleidingen navigeert.

Tests dekken de echte gezamenlijke jaren, behouden jaar uit het overzicht,
default meest recente jaar, geen individuele jaarterugval, exacte kerncijfers,
jaarselectie van beide tabellen, de optionele volledige tabel, onveranderde
opleidingsgegevens, URL-parsing en herstel van een geldig overzichtsjaar. Een
visuele browsercontrole is niet uitgevoerd.


Herstel kernkaarten bij afscherming: het jaarfilter had de bestaande bandbreedtes
verborgen omdat alleen exacte totalen zichtbaar bleven. Nu verschijnt een
betrouwbaar interval opnieuw met ‘Bandbreedte door afgeschermde aantallen <5;
geen exact totaal’. Werkelijk ontbrekende gegevens en niet-eenduidige sommen over
instellingen blijven ‘Geen volledig totaal beschikbaar’. De jaarselectie en
berekeningen zijn ongewijzigd. Regressiecontrole met de echte bron voor Junior
accountmanager, code 25132: 2025 studenten 16–20, afgestudeerden 30–46; 2024
studenten 60–72, afgestudeerden 17–33; 2023 studenten exact 104.

### Vereenvoudigde opleidingsdetailpagina

De hoofdweergave heeft nu deze volgorde: opleiding/niveau/instellingen, één sectie
‘Welke beroepen sluiten aan bij deze opleiding?’, kerncijfers en grafieken,
‘Bekijk de uitgebreide cijfers’ en ‘Opleidingsgegevens en bronnen’. Beide laatste
onderdelen blijven standaard gesloten. Registraties met meerdere codes staan
binnen het bronnenonderdeel; links, brongegevens en het gekozen cijferjaar zijn
behouden. De profielkop gebruikt de instellingen van de daadwerkelijk gekozen code.
De cijfersectie noemt die code expliciet. Er worden geen cijfers of kwalificaties
van andere codes aan de gekozen registratie toegevoegd.

De beroepssectie toont beschikbare SBB-namen en, voor mbo, werkelijk aanwezige
voorgestelde koppelingen. Dubbele schrijfwijzen en namen die al als SBB-naam zijn
getoond, worden in de hoofdweergave niet herhaald. Meerdere onderliggende
ISCO-groepen bij dezelfde beroepsnaam behouden hun afzonderlijke links; er wordt
niet willekeurig één groep gekozen. Bij ontbreken van aanvullende relaties volgt
een korte melding. Laden en een laadfout worden niet als afwezigheid gepresenteerd.
Hbo en wo tonen uitsluitend de bestaande gekoppelde gegevens; er worden geen
nieuwe relaties voorspeld. `MboMatches.tsx` heeft hiervoor een compacte
opleidingsvariant en een bronnenvariant. De volledige relaties, beoordelingen,
modelscore, bewijslinks, bronvermeldingen en ESCO-dienstvermelding blijven onder
bronnen beschikbaar. De bestaande beroepspagina gebruikt de ongewijzigde
standaardvariant. Beide opleidingsvarianten delen de bestaande aanvraagcache.

De grafieken heten ‘Aantal studenten’ en ‘Aantal afgestudeerden’. Hun bijschriften
hebben geen gekleurde titelbalk; de grafiekpanelen hebben geen extra kaders.
Er is één gezamenlijke uitleg over afgeschermde en ontbrekende aantallen. De
volle lijn, gearceerde band, intervalmarkeringen, tooltip, jaarmarkering en
subtiele legenda blijven bestaan. De kernkaarten tonen een kort label
‘Bandbreedte’ bij een interval; de gezamenlijke uitleg licht dit toe. De
berekeningen in `educationTrendData.ts` en de bron-CSV's zijn niet gewijzigd.

Deelgroepselectie wordt gedeeld wanneer de volledige verzameling opties van
studenten en afgestudeerden exact overeenkomt (dezelfde bestaande dimensies en
categorieën, over alle beschikbare jaren). De standaard is ‘Totaal opleiding’.
De gedeelde selectie stuurt beide grafieken aan; de kerncijfers blijven het
totaal voor het gekozen cijferjaar. Bij afwijkende bronreeksen blijven alle
bestaande opties beschikbaar via afzonderlijke selecties; er wordt geen onjuiste
overeenkomst afgeleid en geen doorsnede gebruikt die opties weglaat. Een actieve
deelgroep blijft per grafiek benoemd. Lange tabellen behouden hun horizontale
scrollmogelijkheid en krijgen een beperkte hoogte met vaste kolomkoppen.

Validatie: 76 websitetests en de productiebuild slagen. Nieuwe controles bewaken
sectievolgorde, gesloten bronnen/registraties, unieke beroepsnamen zonder
verlies van groepslinks, lege koppelingen, gedeelde versus afzonderlijke
selecties, ongewijzigde bandbreedtes en het scheiden van opleidingscodes.
Visuele browsercontrole is niet uitgevoerd.


Update uitgebreide cijfers: de tabellen tonen voortaan direct alle beschikbare
bronjaren voor de gekozen opleidingscode. De checkbox ‘Toon alle beschikbare
jaren’ is verwijderd. Het centrale jaarfilter blijft de kerncijfers aansturen;
grafieken en tabellen behouden alle jaren. Het onderdeel blijft standaard
ingeklapt. Regressietests controleren bij wisseling tussen 2024 en 2025 dat beide
bronjaren in de tabellen blijven staan en de checkbox ontbreekt.

### Opleidingen op beroepspagina’s

Beroepspagina’s gebruiken `ho_isco_landelijk.json` met alle landelijke hbo-/wo-koppelingen uit het aangeleverde HO–ISCO-bestand (Studiekeuzedatabase 26.6). Opleidingen worden per onderwijssoort en opleidingscode ontdubbeld; directe koppelingen en afgeleide kandidaten blijven gescheiden. Alleen een bestaande Friese opleidingsdetailpagina met passend niveau krijgt een doorklik; overige landelijke opleidingen worden als naam getoond. De pagina Opleidingen en de DUO-cijfers blijven de Friese selectie in `opleidingen.json` gebruiken. De bron-snapshot is `data/processed/ho_isco_landelijk.json.gz`; een gewone build werkt daarmee ook zonder ruwe brondata. Mbo-koppelingen blijven afzonderlijke schattingen. Geen CSV-export van opleidings-/beroepskoppelingen.

### Leerwegen op opleidingskaarten en detailpagina’s

`research.pipeline.imports.education_pathways` bepaalt leerwegen en opleidingsvormen uit zowel de DUO-inschrijvingen als de diploma’s van hetzelfde gegevensjaar. Per opleiding blijven alleen de geselecteerde instellingen (en voor hbo/wo de geselecteerde gemeenten) behouden. Alleen bewezen lege broncombinaties vallen af; afgeschermde of onbekende aantallen blijven behouden. `pathway_sources` maakt zichtbaar of een vorm uit inschrijvingen, diploma’s of beide komt. Zo blijft Extraneus bij (Junior) accountmanager, code 25132, in 2025 zichtbaar vanuit de diplomabron. Dit is geen bewijs van actueel opleidingsaanbod.

Zoeken selecteert volledige kaartgroepen; het zoeken op een leerweg verwijdert de andere leerwegen binnen dezelfde opleidingsgroep niet. Detailkoppen tonen dezelfde leerwegen en instellingen als de bijbehorende kaart. De cijferreeksen blijven afkomstig uit hun afzonderlijke bronbestanden; diploma-aantallen worden niet bij inschrijvingen opgeteld.

DUO noemt de leerwegcode OVO ‘Overig onderwijs’: [Programma van Levering, aangeboden opleidingen v3.5](https://onderwijsdata.duo.nl/dataset/55a0c332-c35f-41f3-93fe-48cc32855854/resource/ff9eb636-bb3d-4f84-8ff6-4b5f3ef1a14d/download/pvl-aangebodenopleidingen-tbv-rio-csv-bestanden-generiek_specifiek-nfo-po-vo-vavo-mbo-ho-v3.5.pdf).

### Opleidingsdetails: kerncijfers en bronuitsplitsingen

De detailpagina behoudt de exacte naam uit het gekozen DUO-opleidingsjaar (inclusief B/M). Drie overzichtskaarten tonen unieke gekoppelde ISCO-groepen en cijfers voor het gekozen jaar. SBB-kwalificatienamen zonder ISCO-relatie tellen niet als beroepsgroep. Het beroepsgroepenpaneel toont aanvankelijk acht groepen, met zoeken, meer resultaten en ingeklapte code-/koppelinformatie. De onderliggende beroepsrelaties zijn ongewijzigd.

Kaarten, grafieken en tabellen gebruiken dezelfde bronselectie. Bij samengenomen mbo-codes wordt het instellingsfilter per code en jaar toegepast; de geëxporteerde DUO-selectie blijft leidend voor jaren waarvoor alleen diplomagegevens bestaan. De bestaande codegroepen, geldigheidscontroles en aggregatiebeperkingen blijven behouden. HO-bronsleutels bevatten ook de opleidingscode om rijen van verschillende opleidingen niet als identieke rijen te behandelen.

Een exact cijfer is alleen beschikbaar bij complete, verantwoord samen te nemen broncategorieën. Afgeschermde waarden krijgen de bestaande bandbreedte 0–4 per cel. Bij een onvolledige of mogelijk overlappende populatie verschijnt geen exact opleidingstotaal. Als de grafiek een deelgroep toont, wordt de gekozen deelgroep ook bij het kerncijfer vermeld. Grafieken houden alle beschikbare jaren; het jaar voor de kerncijfers beperkt de tijdreeks niet. Ontbrekende diploma’s in 2025 worden niet uit 2024 aangevuld.

De uitgebreide cijfers blijven standaard ingeklapt. De tabellen behouden alle bronkolommen en bronwaarden, met eigen filters, kolomsortering en pagina’s van tien rijen. Deze tabelfilters wijzigen de opleidingstotalen of grafiekkeuze niet. Afgeschermde en ontbrekende aantallen zijn afzonderlijke sorteercategorieën, geen geschatte exacte aantallen.

De bronsectie bevat beknopte metadata, koppeltabellen, locatiebronnen en downloadlinks voor toegestane DUO-selecties. De bestaande methodologiepagina is de verwijzing voor de volledige verantwoording. Beroepsdetailpagina’s en de centrale methodologie zijn niet aangepast bij deze herstructurering.

### Totalen op opleidingsdetailpagina’s

`educationTrendData.ts` berekent kaarten en grafieken uit dezelfde geselecteerde DUO-regels, afzonderlijk voor studenten en afgestudeerden. De opleidingscode bepaalt de selectie; alleen expliciet gecontroleerde codefamilies mogen meerdere codes combineren. De bestaande Friese en handmatige mbo-selectie blijft behouden. Per jaar worden instellingen, opleidingsvormen en geslachtsuitsplitsingen opgeteld. De som is een registratietotaal over instellingen en garandeert geen unieke personen.

De bronsleutel omvat code, instelling, leerweg/niveau (mbo) of gemeente/opleidingsvorm/diplomatype (ho), en geslacht. Dubbele sleutels, totalen naast detailcategorieën, ontbrekende dimensies en onverenigbare diplomatypes blokkeren een totaal. Exacte waarden worden opgeteld; iedere `<5`-cel verhoogt uitsluitend de bovengrens met vier. Een lege of ongeldige telcel blijft onbekend. De mbo-bron heeft man/vrouw-kolommen; beide zijn noodzakelijk. HO heeft geslacht in bronrijen: daar worden alleen categorieën verwacht die voor dezelfde bronuitsplitsing zijn waargenomen. Er worden geen ontbrekende HO-bronrijen aangemaakt. Een elders in de tijd aanwezige categorie die in een jaar ontbreekt, blijft een onvolledige uitsplitsing.

Kaarten gebruiken het gekozen cijferjaar zonder terugval naar een ander jaar. Grafieken beginnen altijd bij het totaal over alle geselecteerde instellingen en tonen alle bronjaren, met onderbrekingen bij ontbrekende cijfers. Tabellen hebben compacte kolommen, tabbladen, onafhankelijke filters en gedeelde compacte paginering met klikbare paginanummers. De schakelaar voor technische bronkolommen is vervallen. De ongewijzigde bronbestanden blijven beschikbaar via de DUO-downloadlinks. Bandbreedtes krijgen uitleg via informatieknoppen; verplichte bronvermeldingen staan compact bij de betreffende onderdelen.


Mbo-codefamilies worden aangevuld vanuit het bestaande, met SHA-256 gecontroleerde DUO/CREBO-register: dezelfde SBB-kwalificatiecode én hetzelfde niveau zijn vereist. Hiervoor worden uitsluitend codes uit de bestaande geselecteerde studenten- en diplomabestanden gebruikt. Ook een historische code die alleen diploma's heeft en geen studentenpagina telt mee. De mbo-tabellen tonen de opleidingscode per bronregel en bieden hierop een filter.

Een actieve CREBO-code betekent niet dat die code in ieder diploma- of studentenbestand moet voorkomen. Voor de volledigheidscontrole zijn alleen codes vereist die daadwerkelijk in de betreffende bronuitsplitsing voorkomen. Afwezigheid van een code in het gehele geselecteerde bestand blokkeert de som van de aanwezige regels niet; dit voegt geen fictieve nulregels toe. Een ontbrekende telcel, geslachtscategorie of jaarregel van een waargenomen code blijft wel onbekend. Voor Junior accountmanager leveren de bestaande Firda-diplomaregels (25132 en 93802) in 2025 een bandbreedte van 30–46 op; de studentregels (25132 en 25877) leveren 145–153 op.

### Toekomst 2035 — scenarioverkenner

`ScenarioExplorer.tsx` hergebruikt beroepszoekfuncties, de HO–ISCO-koppelingen binnen de Friese DUO-selectie en de bestaande DUO-selectie. Historische grafieken worden niet herhaald; de pagina verwijst hiervoor naar Opleidingen in Fryslân. Alleen beroepsgroepen met gekoppelde mbo-, hbo- of wo-opleidingen in deze selectie en beide AI-scores zijn te kiezen, ook bij de mobiliteitsaanname. Mbo-koppelingen komen uit dezelfde voorlopige CompetentNL-/ESCO-voorstellen als op de opleidingspagina’s. De bestaande `courseCountCodes`, `courseCountGroup`, `courseCountPeriods` en `selectEducationPopulation` bepalen de mbo-codefamilies en instellingsselectie. Oude en actuele codes worden als één opleiding meegenomen en hun DUO-aantallen worden met dezelfde volledigheidscontrole samengevoegd. De pagina laadt geen landelijk opleidingsbestand. Per opleiding staan studenten en afgestudeerden uit hetzelfde DUO-bronjaar naast elkaar: standaard het modelbasisjaar van de afgestudeerden. Ontbreekt dat studentenjaar, dan blijft het onbekend; er wordt geen ander jaar ingevuld. Alleen opleidingen met berekenbare diploma-aantallen leveren een prognose. Een compacte beroepskaart toont de AI-positie; Verken jouw scenario combineert onderwijs en arbeidsmarkt, met onderwijsuitkomsten en drie compacte arbeidsmarktvelden. Verdeling aanpassen opent één bewerkmodus met een tabel voor naam, niveau, afgestudeerden, studenten, beroepsaandeel en meetellen; op mobiel wordt dit een compacte lijst. Het zoekveld en de niveauselectie Alle/Mbo/Hbo/Wo worden uitsluitend op de zichtbare lijst toegepast, nooit op modelRows, toedeling of prognoses. Extra instellingen onderaan bevat algemene groei, Friese beschikbaarheid en één opleidingskeuze voor een eigen groeipercentage. De evenwichtsmarge en aanvullende AI-/mobiliteitsaannames staan buiten de compacte werkplek bij Geavanceerde modelinstellingen. Alle instellingen blijven in de bovenliggende component bewaard wanneer lijsten sluiten of filters veranderen. Ontbrekende of onvolledige prognoses blokkeren een volledige arbeidsmarktbalans; een gebruiker kan opleidingen expliciet uitsluiten. Afgeschermde aantallen blijven bandbreedtes.

De onafhankelijke rekenfuncties en vijf scenarioregels staan in `scenario2035.ts`. Iedere opleiding wordt eenmaal per onderwijssoort en DUO opleidingscode meegenomen. De gezamenlijke toedeling over alle gekoppelde ISCO-codes is maximaal 100%; expliciete toedelingen blijven bij wisselen tussen beroepen bewaard en het restant wordt gelijk verdeeld. Dit is een aanname, geen waargenomen beroepsuitstroom.

Een laatst waargenomen diplomajaar tussen 2021 en 2025 vormt de basis voor jaarlijkse samengestelde groei. De cumulatieve instroom omvat elf kalenderjaren, 2025–2035. Startpopulatie en uitstroom hebben hetzelfde tijdvak: begin 2025 tot en met eind 2035. Arbeidsaanbod = startpopulatie − uitstroom uit die populatie + potentiële onderwijsinstroom. De Friese beschikbaarheid en een eventueel AI-effect op de vraag zijn afzonderlijke gebruikersaannames. Overige migratie, zij-instroom en uitstroom van nieuwe instromers zijn niet gemodelleerd.

`ScenarioExplorer` accepteert optioneel `labourSources: LabourSources` uit `scenarioLabour.ts`: een record per ISCO-08-code met `stock` (begin 2025), `outflow` (uit de startpopulatie, cumulatief 2025–2035) en `demand` (eind 2035). Elke beschikbare observatie heeft `{ value, source, referenceYear, url? }`. Een toekomstige bronadapter kan dit record asynchroon aanleveren en actualiseren zonder UI-aanpassingen; momenteel is geen arbeidsmarktbron aangesloten en blijven de velden leeg. Waarden moeten aantallen professionals zijn voor hetzelfde beroep, tijdvak en geografische gebied als het scenario.

`resolveLabourValue` combineert bronobservaties met afzonderlijke gebruikersoverrides per ISCO-code en veld. Ook een expliciet leeggemaakt veld blijft onbekend; nul is een geldige waarde. Zonder bronwaarden toont de interface één label Testgegevens en blijven individuele bronstatusregels achterwege. Zodra bronwaarden beschikbaar zijn, staan bron, peiljaar en eventuele aanpassing bij het betreffende veld. Wis testinvoer verwijdert de drie arbeidsmarktoverrides voor het gekozen beroep en herstelt zo bronwaarden, of lege velden wanneer deze ontbreken. Herstel bronwaarde verwijdert alleen de betreffende override en gebruikt de meest recente bronwaarde. Brongegevens worden nooit gewijzigd. `LabourInputs` blijft de rekeninterface (`source: 'user' | 'data'`). Het bestaande AI-kwadrant gebruikt ongewijzigde kaartmedianen en levert nooit automatisch een banenverliespercentage. Scenario's 1–3 hebben prioriteit als hoofdscenario; 4 en 5 vereisen aanvullende aannames en kunnen ook aanvullend verschijnen. Zonder passende voorwaarden volgt een neutrale beschrijving. De aannames worden alleen binnen de geopende pagina bijgehouden en worden niet opgeslagen of gedeeld.

Controle: `npm test` bevat `tests/scenario2035.test.mjs` voor prognoses, DUO-basisjaren, toedelingsbudgetten, ontbrekende gegevens, bandbreedtes, evenwichtsgrenzen en de vijf scenario's.


Onderwijsinstroom gebruikt uitsluitend de laatste beschikbare DUO-afgestudeerden G(b), met het werkelijke bronjaar b: G(t) = G(b) × (1 + g)^(t − b), I(t) = G(t) × B × F. Studenten zijn aanvullende broninformatie en zitten niet in de formule. Groei g is standaard nul; ingevoerde percentages voor groei, beroepsaandeel B en Friese beschikbaarheid F worden in de berekening door 100 gedeeld. Per opleiding worden de elf jaren 2025–2035 berekend, daarna worden de meetellende opleidingen opgeteld. Bronjaar 2024 geeft elf groeistappen naar 2035; bronjaar 2025 geeft tien.

Alleen de presentatie rondt af: hele personen, bandbreedtes met ondergrens naar beneden en bovengrens naar boven; DUO-privacybanden blijven banden. Een positieve exacte jaarlijkse uitkomst onder één persoon verschijnt als minder dan 1 per jaar. Percentages verschijnen met maximaal één decimaal en een Nederlandse komma. De percentagevelden bewaren de ongeronde invoer en automatische aandelen in modelstate; focussen of verlaten van een veld schrijft geen afgeronde waarde terug. Tests dekken groei in beide richtingen, bronjaren, aggregatie, beroepsaandelen en presentatie zonder verlies van precisie.


Het resultaat wordt eenmaal getoond onder Jouw scenario voor 2035: de bestaande scenarionaam, een korte uitleg, arbeidsaanbod, benodigde werkenden en tekort/overschot of neutraal verschil, gevolgd door Wat kan helpen?. `scenarioResultCopy` en `scenarioBalanceDisplay` in `scenarioPresentation.ts` verzorgen alleen presentatie; de vijf scenario’s, prioriteit en vereiste aannames blijven in `selectScenarios` ongewijzigd. Tekorten worden positief weergegeven met omgekeerde en opnieuw geordende grenzen; onzekere balansen behouden het getekende verschil. Aanvullende scenario’s zijn beschikbaar via een compacte toelichting. Modelinstellingen staan bij de arbeidsmarktinvoer. Hoe is dit berekend? verwijst naar `#methodologie/methodologie-scenario`, waar de volledige eerdere rekenuitleg en bronverwijzingen behouden zijn.


Toekomst 2035 is gepositioneerd als Toekomstverkenning Fryslân, met de hoofdtitel Hoe ontwikkelt dit beroep zich richting 2035?. De pagina onderscheidt Brongegevens, Modelberekening en Aannames en testinvoer. Instroom vanuit opleidingen gebruikt nog dezelfde DUO-afgestudeerden en verdeelregels; Werkenden en uitstroom behoudt de drie arbeidsmarktvelden en de bronadapter. Arbeidsmarktbeeld 2035 combineert de bestaande balans en scenarioselectie met neutrale duiding onder Mogelijke gevolgen. Bronnen en berekening staat compact onder het resultaat; de volledige verantwoording blijft bij Methodologie. Er is geen extra jaarlijkse uitstroomfactor toegevoegd: de ingevoerde cumulatieve uitstroom uit de startpopulatie en de bestaande eindformule blijven leidend voor begin 2025 tot en met eind 2035.


De rekentool toont de cumulatieve instroom 2025–2035 als trend, via `cumulativeInflowSeries`: een ongeronde lopende som van de jaarlijkse modeluitkomsten. Studenten worden alleen weergegeven voor hetzelfde bronjaar als afgestudeerden (`educationCountsAtYear`). Het bronjaarfilter in het compacte, scrollbare opleidingenoverzicht wijzigt uitsluitend de getoonde broncijfers; de rekenbasis blijft de laatst beschikbare DUO-afgestudeerden per opleiding. Algemene groei en Friese beschikbaarheid staan bij de jaarlijkse instroom onder Hoe is dit berekend?. De interface bevat geen individuele groeipercentages, arbeidsmarktmodelinstellingen of losse Bronnen en berekening meer. De onderliggende scenariofuncties, vaste tolerantie en eindformule blijven behouden; uitgebreide methodologie blijft op de methodologiepagina beschikbaar.

### Bouwen vanuit een schone GitHub-checkout

De normale databouw gebruikt `data/mappings/crebo_codefamilies_bronselectie.csv` met de vastgelegde bron- en selectiehashes uit `mbo_codefamilies.json`. Daardoor is het lokale oorspronkelijke CREBO-bestand niet nodig op GitHub. De afgeleide codefamilies blijven gelijk aan de eerdere berekening vanuit het volledige register. Voor het expliciet verversen staat de opdracht in `data/mappings/README.md`.

Beide GitHub-workflows installeren `requirements-ci.txt`: alleen NumPy en openpyxl voor de offline bouw en fixturetests. Ze downloaden geen ML-modellen of oorspronkelijke brondata. De twee aanvullende vergelijkingen met de ruwe DUO-studenten- en diplomabron worden overgeslagen als die lokale bronnen ontbreken; de controles op de geselecteerde CSV’s, instellingsarchieven, privacywaarden en codefamilies blijven altijd actief.
