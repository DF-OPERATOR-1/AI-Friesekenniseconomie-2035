# Methodiek: mbo-opleidingen koppelen aan mogelijke ISCO-beroepen

Vastgelegd op 6 november 2026. Dit document beschrijft de uitgevoerde
verwerking, de ML-proef en de voorgestelde werkwijze voor verdere beoordeling.
De operationele parameters en bronhashes staan ook in de
[mapping-README](../../data/mappings/README.md). Implementatie en resultaten
zijn leidend bij het opnieuw uitvoeren; een toekomstige wijziging van methode,
bron of model moet herkenbaar als nieuwe berekening worden vastgelegd.

## 1. Doel, eenheid en afbakening

Het doel is per mbo-opleiding één of meer **mogelijke beroepsroutes** naar
viercijferige ISCO-08-beroepsgroepen te vinden. Een opleiding kan meerdere
beroepen ondersteunen. Een ISCO-groep kan meerdere opleidingen en
opleidingsniveaus omvatten. De koppeling meet niet welk beroep studenten
werkelijk gaan uitoefenen en is geen prognose van arbeidsmarktinstroom.

De eenheden blijven gescheiden:

- **Opleiding:** de opleidingscode en opleidings-URI uit `mbo.csv`.
- **Specifiek beroep:** de CompetentNL-beroeps-URI, naam, definitie en taken.
- **Beroepsgroep:** de aangeleverde viercijferige ISCO-code van dat beroep.
- **Beroepsniveau:** een aanvullende complexiteitsindeling; geen aantal
  cijfers in de code en niet dezelfde schaal als mbo-/NLQF-niveau.

Er wordt niet afgekapt naar twee- of driecijferige ISCO-codes en er is geen
terugval naar BRC als einduitkomst. De bestaande CBS-ISCO–BRC-tabel levert
alleen het ISCO-beroepsniveau voor een aanvullende controle.

### Friesland en studentenaantallen

De 438 aangeleverde mbo-profielen zijn niet automatisch 438 opleidingen op
Friese locaties. Van de 396 geselecteerde mbo-codes met studenten in 2025
hebben 188 een exact overeenkomende profielcode; 208 missen nog zo'n profiel.
De cijfers betreffen verschillende populaties en mogen niet verwisseld worden.

Voor mbo zijn de DUO-opleidingscijfers geselecteerd op vier volledige
instellingen met Friese locaties, inclusief buiten-Friese locaties. De
gebruikte openbare bestanden bevatten wel locatietotalen en wel
instellingsaantallen per opleiding, maar niet hun gezamenlijke verdeling
opleiding × fysieke locatie × jaar. Ook het aanbod van elke opleiding op
een Friese locatie is niet bewezen. Zie de [onderwijs-README](README.md).

Studentenaantallen blijven bij de opleiding. Zij worden niet verdeeld,
vermenigvuldigd of opgeteld over gekoppelde beroepen. Een meervoudige
beroepskoppeling maakt geen extra studenten.

Hbo/wo staan wel in de opleidingstab via DUO-provincie Friesland, maar zijn
niet onderdeel van deze mbo-ML-proef: overeenkomstige opleidingsprofielen
ontbreken in de gebruikte matchingbronset.

## 2. Bronnen en sleutels

| Bron | Benutte inhoud | Sleutel / aandachtspunt |
|---|---|---|
| `data/raw/competentnl/mbo.csv` | Naam, definitie, beschrijving, kenmerkverwijzingen | `code` en `opleiding`; herhaalde exportregels |
| `beroepen_isco.csv` in dezelfde map | Specifieke beroepsnaam, definitie, ISCO | `uri`; viercijferige ISCO blijft tekst |
| `beroepen_taken.csv` | Taaknaam, taakdefinitie, belang | Beroeps-URI en taak-URI |
| `beroepen_vaardigheden.csv`, `beroepen_kennisgebieden.csv` | Benoemde kenmerken, URI en belang | Exacte `item_uri` voor kenmerkenoverlap |
| [CREBO-koppeltabellen](../../data/raw/crebo/README.md) | Niveau, subgroep, dossier, ISCED-richting | Exacte opleidingscode; schooljaar expliciet bewaren |
| `codelijsten-isco-08-nl.xls` onder `data/raw/cbs/` | Nederlandse CBS-index en unitgroepsnamen | Broncode toetsen aan de 436 unitgroepen |
| `data/mappings/isco2008_brc2014.csv` | ISCO-code en beroepsniveau | Geen BRC-toewijzing in de uitvoer |
| DUO-studentenselectie | Aanwezigheid van een code in de selectie | Alleen scopecontrole, geen bewijs van beroepsuitstroom |

De lokale bronnen blijven ongewijzigd. Downloadpagina's, aanleverstatus en
SHA-256-hashes zijn gedocumenteerd in de bron- en mapping-README's.
Een hash identificeert de gebruikte inhoud; hij bewijst niet dat de bron
inhoudelijk volledig of foutloos is. Bij de gebruikersaanlevering ontbreken
nog een oorspronkelijke CompetentNL-exportquery en een release-/cohortdatum.

## 3. Voorbewerking en gegevenskwaliteit

1. Lees codes als tekst; behoud voorloopnullen.
2. Controleer verplichte kolommen, rijlengtes, unieke beroeps-URI's en
   viercijferige ISCO-codes. Stop bij onverwachte bronstructuren.
3. Bundel herhaalde mbo-exportregels per opleidingscode. Bewaar verschillende
   namen en opleidings-URI's en dedupliceer kenmerken en beschrijvingen.
4. `definitie` en `beschrijving` zijn in deze export bij alle 438 opleidingen
   gelijk; dezelfde tekst wordt niet dubbel gewogen.
5. Bundel beroepstaken per beroep. In de ML-proef tellen de essentiële taken
   mee; in de oudere tekstmethode wegen essentiële taken twee keer zo zwaar
   als optionele taken.
6. De 247 onopgeloste genid-verwijzingen worden niet geraden of als benoemde
   vaardigheden behandeld. Er zijn wel 126 rechtstreeks gedeelde
   vaardigheids-URI's en 261 kennisgebied-URI's.
7. Normaliseer hoofdletters, accenten en leestekens uitsluitend voor
   vergelijking. Bewaar de oorspronkelijke bronlabels voor herleidbaarheid.

De Engelse definitie/voorbeelden bij ISCO `8322` in de lokale CBS-werkmap
beschrijven glas- en keramiekoperators en conflicteren met de Nederlandse
index. Daarom worden die Engelse velden niet gebruikt. Broninhoud wordt
niet als foutloos verondersteld omdat zij in een classificatiebestand staat.

## 4. Bestaande methode: referentie voor de proef

De referentietabel is `data/processed/opleiding_beroep.csv`.
De verwerking staat in `research/pipeline/imports/opleiding_beroep.py`.

- Nederlandse CBS-indexnamen en groepsnamen ondersteunen naamkandidaten.
  Enkelvoud/meervoud en enkele eenvoudige opleidingsmodificaties worden
  herkenbaar als naamvarianten behandeld.
- Andere kandidaten vereisen vakinhoudelijke aansluiting, met controle van
  naam, definitie, taken, CREBO-vakrichting en een conservatieve niveauregel.
- De score combineert naam (30%), definitie (30%), taken (30%) en
  kenmerkoverlap (10%). De tekstvergelijking is lexicaal: TF-IDF/cosinus,
  geen begrip van betekenis of verantwoordelijkheden.
- Op verzoek zijn alle 438 profielen met voorstellen gevuld. Waar de
  strengere selectie niets oplevert, staat één extra onzeker voorstel.
  Daar gelden andere gewichten: 5% naam, 45% definitie, 40% taken en 10%
  kenmerken. De kolom `Beoordeling` maakt dit zichtbaar.

De conservatieve directe-routegrenzen zijn mbo 1 → ISCO-niveau 1;
mbo 2/3 → ISCO-niveau 1–2; mbo 4 → ISCO-niveau 1–3. Dit is een
implementatiekeuze, geen officiële conversie van de schalen. Een passende
naamroute kan buiten zo'n grens vallen en blijft dan te controleren.
De regel mag niet worden uitgelegd als een verbod op beroepen of loopbanen.

Een volledig ingevulde tabel is geen gevalideerde tabel. Ook de niet als
extra onzeker gemarkeerde regels kunnen fouten bevatten. De bestaande
methode is de vergelijkingsbasis, niet de waarheid waarmee ML wordt getraind.

## 5. Uitgevoerde ML-proef

### 5.1 Selectie vooraf

De proef omvat alle 75 extra onzekere opleidingen plus zes aanvullende
controlevoorbeelden: 81 opleidingen. Elf van deze gevallen hebben een
vooraf vastgelegde verwachte ISCO-code uit bekende bronnen of inhoudelijke
controle. De aantallen overlappen: de elf controles komen niet allemaal
boven op de 75. De code bevat de exacte selectie en controlecodes.

Deze elf gevallen zijn geen aselecte steekproef of onafhankelijke,
deskundig gelabelde testset. Zij dienen als bron-/saniteitscontroles.
De zestien latere assistentbeoordelingen zijn evenmin een onafhankelijke
benchmark en mogen niet als modelnauwkeurigheid worden gerapporteerd.

### 5.2 Semantisch kandidaten zoeken

Model: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, revisie
`e8f8c211226b894fcb81acc59f3b34ba3efd5f42`.

- Vergelijk iedere geselecteerde opleiding met alle 3.294 specifieke beroepen.
- Opleidingstekst: naam en ontdubbelde definitie/beschrijving.
- Beroepstekst: naam, definitie en maximaal twaalf essentiële taaknamen,
  alfabetisch gesorteerd. Dit is een reproduceerbare selectie, geen bewijs
  dat deze twaalf taken inhoudelijk de belangrijkste zijn.
- Een afzonderlijke naamembedding weegt 20%; het gemiddelde van de
  inhoudsdelen weegt 80%. Het eindresultaat wordt genormaliseerd.
- Deel lange inhoud op in stukken van 72 tokens met een titelprefix tot
  24 tokens, binnen de encoderlimiet van 128 tokens. Zo wordt ook het einde
  van de oorspronkelijke tekst verwerkt. Het middelen van delen kan wel
  specifieke details verdunnen.
- Haal twintig kandidaten op via cosinusovereenkomst. Bewaar de zuivere
  rangschikking apart. Gebruik geen procentconversie.
- Voeg voor het herordenen eventueel de oude kandidaat toe als die als
  hetzelfde specifieke CompetentNL-beroep bestaat. Dit verandert de zuivere
  embeddingrangschikking niet. Een oude CBS-groepsnaam is niet automatisch
  zo'n specifiek beroep.

### 5.3 Kandidaten herordenen

Model: `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1`, revisie
`1427fd652930e4ba29e8149678df786c240d8825`.

Dit model beoordeelt opleiding en beroep gezamenlijk. De opleidingsquery
is begrensd op 150 tokens; de beroepstekst op 225 tokens, met definitie en
maximaal zes essentiële taken. Het paar heeft een limiet van 384 tokens.
Anders dan bij de embeddingchunks kan hierdoor informatie uit de lange
beschrijving of latere taken ontbreken. De werkelijk aangeboden begrensde
teksten staan in het rapport voor controle.

Bewaar de ruwe logits als rangschikkingssignaal, niet als kanspercentage.
Het model is getraind voor passage-relevantie, niet specifiek voor deze
opleiding–beroepstaak. Een overeenkomstig onderwerp kan dus ten onrechte
zwaarder wegen dan het verschil tussen uitvoeren, leidinggeven en lesgeven.

De bestaande eenvoudige rolregels zijn daarnaast als aparte controle
berekend. Dat is geen nieuw getraind model en geen volledige beoordeling
van formele beroepseisen. De leesbare kolom `ML-voorstel` toont de ruwe
cross-encoderkeuze, zodat ook fouten zichtbaar blijven.

### 5.4 Brongebonden LLM-/assistentbeoordeling

Zestien doelbewust gekozen gevallen zijn in deze sessie door de assistent
naast de bronnen gelegd. Er is geen apart generatief LLM-API-proces op
alle 75 gevallen uitgevoerd. De brongebonden beoordeling is apart van de
ML-scores bewaard en is geen onafhankelijke menselijke expertvalidatie.

Het beoordelingsprotocol is:

1. Lees de volledige opleidingsbeschrijving, niet alleen de titel of score.
2. Vergelijk de werkzaamheden van de opleiding met de kandidaatdefinitie
   en essentiële taken. Selecteer alleen bestaande kandidaten met
   controleerbare beroeps-URI, naam en ISCO-code.
3. Onderscheid vakgebied, primaire werkzaamheden, mate van zelfstandigheid,
   operationele leiding, strategisch bestuur, onderwijs en onderzoek.
4. Maak onderscheid tussen een uitvoerende rol en bijvoorbeeld een
   bedrijfsleider of docent in hetzelfde vakgebied. Begeleiden van een
   stagiair maakt een functie niet automatisch een opleidersberoep.
5. Behandel het niveau als aanvullende context, niet als gelijkstelling van
   mbo 4 aan ISCO-niveau 4 of als automatisch uitsluitbewijs.
6. Leg kort vast welk bronbewijs ondersteunt en welke belangrijke
   tegenstrijdigheid of ontbrekende informatie overblijft.
7. Behoud meerdere mogelijke beroepen als het profiel daar aanleiding toe
   geeft. Als de passende functie ontbreekt, breid de kandidaatset uit in
   plaats van de minst slechte kandidaat goed te keuren.
8. Behoud een bestaande CBS-classificatie waar die al passend is; dat is
   geen nieuwe voorspelling. Drukker → `7322` is hiervan het uitgevoerde
   voorbeeld en de expliciete uitzondering op selectie uit de ML-kandidaatset.

De code controleert kandidaat-URI/naam/code en bron-/modelversie. Dit
controleert de herkomst, niet automatisch de inhoudelijke juistheid van
de beoordeling. De motivatie en auteur van de beoordeling blijven bewaard.

## 6. Geobserveerde resultaten en besluit

| Methode | Verwachte ISCO op plaats 1 | Verwachte ISCO in eerste 3 |
|---|---:|---:|
| Bestaande methode | 8 van 11 | Niet apart bepaald |
| Semantische embeddings | 7 van 11 | 11 van 11 |
| Ruwe cross-encoder | 6 van 11 | 8 van 11 |

De bestaande rolcontrole na de cross-encoder geeft 8 van 11 op plaats 1.
De groepen zijn het evaluatieniveau: een juiste groepscode betekent niet
dat de juiste specifieke functie of verantwoordelijkheid bovenaan staat.

Voorbeelden van bruikbare bronbeoordelingen zijn Fashion Designer →
Modeontwerper (`2163`), Assistant Fashion Tailor → veranderatelier (`7531`)
en Tandtechnicus → Tandtechnicus (`3214`). Marketing/communicatie en
facilitaire dienstverlening houden meerdere mogelijke rollen.
Werkvoorbereider houttechniek vraagt eerst uitbreiding van de kandidaatset.

**Besluit van deze proef:** embeddings zijn bruikbaar om kandidaten te
vinden; automatische eindtoewijzing door deze cross-encoder is niet
onderbouwd als verbetering. De oorspronkelijke koppeltabel is daarom niet
vervangen en de proefuitkomsten zijn niet gepubliceerd als bevestigde routes.

## 7. Betekenis van scores en beoordelingen

| Signaal | Wat het wel zegt | Wat het niet zegt |
|---|---|---|
| CBS-naamrelatie | Een beroepsnaam hoort volgens de bron bij een groep | Dat een opleiding officieel aan die groep gekoppeld is |
| Oude `Match (%)` | Gewogen lexicale tekst-/kenmerkenovereenkomst | Kans dat de koppeling juist is |
| Embeddingcosinus | Relatieve semantische overeenkomst binnen deze methode | Een gekalibreerde zekerheid of aandeel studenten |
| Cross-encoderlogit | Relatieve passage-relevantie voor de aangeboden teksten | Onderbouwde opleidingsgeschiktheid of loopbaankans |
| Assistentbeoordeling | Een expliciet onderbouwd voorstel op basis van passages | Onafhankelijke expertgoedkeuring of bewezen uitstroom |

Scores van verschillende methoden zijn niet onderling uitwisselbaar en
worden niet opgehoogd om een overtuigender percentage te tonen. Ontbrekende
modelscore bij een CBS-naamkoppeling betekent niet dat beroep of code ontbreekt.

## 8. Vervolgprotocol voor overname en validatie

Dit is de aanbevolen vervolgstap, **nog niet als onafhankelijke evaluatie
uitgevoerd**:

- Laat broninhoudelijk beoordelen of kerntaken, vakgebied en
  verantwoordelijkheden passen; leg reviewer, datum, bronversie, motivering
  en resterende onzekerheid vast.
- Houd bronondersteunde naamkoppelingen, afgeleide voorstellen en extra
  onzekere voorstellen herkenbaar gescheiden. Een model-toppositie alleen
  is geen reden om de status op te waarderen.
- Neem twijfelgevallen en meerdere mogelijke routes mee. Vul een beperkte
  gevalsbeoordeling niet aan met verzonnen zekerheid om een volledig bestand
  te krijgen.
- Maak een onafhankelijke beoordeelde evaluatieset die ook de moeilijke en
  brede opleidingen bevat. Gebruik de elf bekende controles niet als
  representatieve algemene nauwkeurigheidsschatting.
- Houd een aparte testset buiten modelkeuze, gewichtskeuze en eventuele
  training. Behandel verwante opleidingsversies samen om gegevenslekkage te
  beperken. Geen label uit een eigen oude modelvoorspelling als waarheid nemen.
- Rapporteer minimaal top-1 en top-3 op ISCO-groepsniveau, kandidaatdekking,
  het aandeel zonder voldoende onderbouwing en fouten in rol/niveau.
  Rapporteer zo mogelijk ook specifieke beroepsnamen en meervoudige routes.
- Kalibreer een betrouwbaarheidsscore pas met onafhankelijk beoordeelde
  gegevens en toets die apart. Vraag een LLM niet om zelf een kanspercentage
  te bedenken.
- Verwerk alleen daadwerkelijk beoordeelde verbeteringen in een volgende
  koppeltabel; leg de wijziging ten opzichte van de oude kandidaat vast.
  Bestaande bronbestanden en het uitgevoerde proefrapport blijven herleidbaar.

Softwaretests toetsen onder meer kolommen, viercijferige codes, bronidentiteit,
chunking, kandidaatbeperkingen en tellingen. Het slagen van softwaretests is
geen bewijs van voorspellende nauwkeurigheid.

## 9. Artefacten en opnieuw uitvoeren

| Bestand | Functie |
|---|---|
| `data/processed/opleiding_beroep.csv` | Ongewijzigde vergelijkingsbasis |
| `data/processed/opleiding_beroep_proef.csv` | Leesbaar oud/ML/assistent-overzicht voor 81 gevallen |
| `data/processed/opleiding_beroep_proef.json.gz` | Volledig rapport: modellen, versies, hashes, scores, passages en controles |
| `data/mappings/opleiding_beroep_proef_beoordelingen.json` | Zestien versiegebonden beoordelingen en motiveringen |
| `research/pipeline/imports/opleiding_beroep_ml.py` | Uitvoering van de lokale proef |
| `research/requirements-ml.txt` | Afzonderlijke, geteste ML-dependencies |

Voer uit vanaf de repositoryroot, met de lokale ruwe bestanden aanwezig:

```bash
python -m venv /tmp/isco-ml-venv
/tmp/isco-ml-venv/bin/python -m pip install -r research/requirements-ml.txt
/tmp/isco-ml-venv/bin/python -m research.pipeline.imports.opleiding_beroep_ml --download-models
```

De modelrevisies staan vast. De cache staat standaard in
`/tmp/isco-ml-models`; zij kan verdwijnen bij opruimen van tijdelijke bestanden.
`--download-models` herstelt die cache. De gewone onderzoeksomgeving hoeft
hiervoor niet te worden aangepast. Modelgewichten staan niet in de repository.
CPU wordt standaard gebruikt, met vier Torch-threads en seed 0. Kleine
numerieke verschillen op andere hardware zijn mogelijk.

Reeds berekende uitkomsten met bijbehorende beoordelingen opnieuw weergeven:

```bash
python -m research.pipeline.imports.opleiding_beroep_ml --review-existing
python -m unittest discover -s tests
```

Het script controleert bronhashes en modelrevisies. Bij gewijzigde bronnen,
modellen of kandidaatsets moeten beoordelingen opnieuw worden nagekeken.
Een kleinere `--limit`-/`--top-k`-run is niet automatisch verenigbaar met de
beoordelingen van deze volledige proef. De oude koppeltabel wordt niet door
het proefscript overschreven.

## 10. Methodologische bronverwijzingen

- [CBS: beroepenclassificatie en codelijsten](https://www.cbs.nl/nl-nl/onze-diensten/methoden/classificaties/onderwijs-en-beroepen/beroepenclassificatie--isco-en-sbc--).
- [ILO: ISCO-concepten en beroepsniveau](https://ilostat.ilo.org/methods/concepts-and-definitions/classification-occupation/).
- [SBB: erkende opleidingscodes en koppeltabel](https://www.s-bb.nl/onderwijs/erkende-opleidingscode/).
- [Sentence Transformers: zoeken en herordenen](https://www.sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html).
- [Embeddingmodel en modelkaart](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2).
- [Cross-encodermodel en modelkaart](https://huggingface.co/cross-encoder/mmarco-mMiniLMv2-L12-H384-v1).

Deze bronnen onderbouwen classificaties en gebruikte technieken. Zij
valideren niet automatisch de hier berekende opleiding–beroeprelaties.

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
