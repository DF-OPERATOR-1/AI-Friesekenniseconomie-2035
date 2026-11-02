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
