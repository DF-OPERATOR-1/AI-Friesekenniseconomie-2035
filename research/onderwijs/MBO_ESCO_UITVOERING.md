# Uitvoering MBO → ESCO → ISCO-08

This publication uses the ESCO classification of the European Commission.

## Status en scope

De bestaande applicatie blijft behouden. De nieuwe onderzoekspipeline staat in
`research/pipeline/imports/mbo_esco.py`, met configuratie in
`research/pipeline/config/mbo_esco.json`. De bestaande CompetentNL-koppeltabel en
website worden niet automatisch door voorspellingen vervangen. De uitvoer is
bedoeld voor inhoudelijke controle. Een matchscore is **geen kanspercentage**.

De relaties zijn verschillend van aard:

- DUO → CREBO/SBB: bestaande code- en schooljaarrelaties, ongewijzigd.
- MBO → ESCO: nieuwe voorspellingen, standaard menselijke controle nodig.
- ESCO → ISCO: officiële relatie uit ESCO v1.2.1, Nederlands; gecontroleerd tegen de hiërarchie.

De huidige CompetentNL-opleidingsprofielen zijn geen historische jaarprofielen.
Daarom mogen hun voorspellingen niet zonder meer als bewijs voor hetzelfde
beroep bij elk eerder DUO-schooljaar worden behandeld. Studentenaantallen
worden niet verdeeld over beroepen. De instellingselectie blijft bovendien
locaties buiten Friesland omvatten.

## 1. Bronverwerking

Lees de vijf CompetentNL-exports en de CREBO-context. Voeg herhaalde rijen per
opleidingscode samen en behoud alle opleidings-URI’s. Vaardigheden en kennis
worden via hun identifiers in de opleidingsrelaties opgezocht in de bestaande
CompetentNL-tabellen. Onopgeloste verwijzingen blijven expliciet bewaard.
NLQF-URI’s worden niet geïnterpreteerd als numeriek niveau; de CREBO-context
levert het mbo-niveau. De beschikbare sectorcontext is de SBB-subgroep, geen NACE.

Lees de volledige ESCO-classificatie uit `data/raw/esco/v1.2.1/nl/`, niet alleen
de 33 groepen van de eerdere website-aanvulling. Ontdubbel URI’s wanneer alleen
de wijzigingsdatum verschilt; inhoudelijke conflicten stoppen de import.
Controleer verwijzingen, essentieel/optioneel en de officiële ISCO-hiërarchie.
Onbekende competentietypen blijven apart staan. Er is lokaal geen officiële
CompetentNL–ESCO-crosswalk gevonden. Semantische overeenkomsten worden daarom
niet als officiële competentierelaties gepresenteerd.

**Taken blijven onbekend**: de opleidingsexport en deze ESCO-export bevatten
geen afzonderlijk koppelbare taaklijsten. Beroepswerkzaamheden kunnen in de
beschrijvingen staan, maar worden niet als opleidingstaken overgenomen.

## 2. Embeddings en kandidaatselectie

De standaardconfiguratie noemt `BAAI/bge-m3`. Het model is vervangbaar via de CLI;
modelrevisie is verplicht. De eerste lokale run gebruikt de reeds beschikbare
`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, revisie
`e8f8c211226b894fcb81acc59f3b34ba3efd5f42`. BGE-M3 is hiermee nog niet getest
of als beter bewezen. E5 wordt geweigerd zolang aparte query/passage-prefixen
niet zijn geïmplementeerd.

Naam, beschrijving en individuele competenties krijgen afzonderlijke embeddings.
Lange teksten worden in tokenvensters verwerkt en genormaliseerd gemiddeld;
de informatie wordt niet stil afgekapt voor de embeddingstap. De windowgrootte
wordt begrensd door de daadwerkelijke maximale modellengte. Unieke teksten
worden in batches verwerkt. De cachefingerprint omvat alle tekst, het model,
de revisie en de windowgrootte. Vectoren en modellen blijven lokaal onder
`data/processed/models/` of in een expliciet opgegeven modelmap.

Voor embeddingretrieval telt de naam 35% en de beschrijving 65%. Model B
behoudt zijn embeddingtop 25. Model C reserveert vijf van de 25 kandidaatplaatsen
voor lexicale beroepsnaamovereenkomst, zodat sterke naamkandidaten niet door
een brede beschrijving verdwijnen. Exacte overeenkomsten met officiële
ESCO-alternatieve namen krijgen lexicale naamovereenkomst 1; dit maakt de
opleidingsrelatie nog niet officieel. Overige naamovereenkomst combineert
50% meertalige embeddings en 50% karakter-TF-IDF. Per opleiding worden
25 unieke ESCO-kandidaten geselecteerd. Dit zijn experimentele retrievalgewichten,
geen gekalibreerde inhoudelijke matchpercentages. Kandidaten buiten deze set
worden door model C/D niet beoordeeld; controleer daarom later Recall@10 en
retrievaldekking op complete menselijke referenties.

## 3. Competenties in beide richtingen

Vergelijk individuele vereisten van het ESCO-beroep met de beschikbare
opleidingscompetenties, en andersom. Een identieke identifier gaat vóór een
semantische buur. Bewaar per vereiste de beste ondersteuning, de beide URI’s,
de labels en de similarity. Een lage score bij een essentiële vereiste heet
‘niet aangetoond in de gebruikte opleidingsbron’, niet ‘student kan dit niet’.
Bij ontbrekende opleidingscompetenties is de dekking onbekend, niet nul.

Vereisten worden gewogen op omgekeerde beroepsfrequentie, essentieel/optioneel
en ESCO `reuseLevel`. Algemene competenties leveren minder bewijs: transversal
0,10; cross-sector 0,30; sector-specific 0,70; occupation-specific 1,00;
onbekend 0,25. De ruwe directionele dekking blijft beschikbaar. De bijdrage aan
de gecombineerde score wordt bovendien vermenigvuldigd met de gemiddelde
specificiteit, zodat uitsluitend algemene vaardigheden geen sterke component
opleveren door normalisatie. Dit is een experimentele keuze die nog validatie
nodig heeft. Meerdere vereisten kunnen dezelfde opleidingscompetentie kiezen;
dat wordt als waarschuwing in het bewijsrecord bewaard en niet als meerdere
onafhankelijke bewijzen geïnterpreteerd.

## 4. Gecombineerde score en menselijke controle

De oorspronkelijke beginwaarden (taken 35%, vaardigheden 25%, beschrijving
20%, kennis 15%, naam 5%) zijn bewaard in `mbo_esco_beginwaarden.json`.
De eerste proef gaf hiermee vrijwel uitsluitend geen match en slechte
rangschikking bij bekende beroepsnamen. De actuele **experimentele**
configuratie gebruikt taken 35%, naam 26%, beschrijving 26%, vaardigheden 10%
en kennis 3%. Zonder taken zijn de relatieve gewichten dus 40%, 40%, circa
15,4% en 4,6%. Dit geeft namen en beschrijvingen prioriteit, zoals gevraagd.
Deze aanpassing gebruikt bekende ontwikkelvoorbeelden en is geen onafhankelijke
validatie of bewijs dat de configuratie optimaal is.
Alleen beschikbare componenten tellen mee in de noemer. Bewaar de oorspronkelijke
en actieve gewichten, onbekende componenten en het beschikbare gewichtsaandeel.
Als taken ontbreken, ontbreekt dus minimaal 35% van de bedoelde bewijssoorten.

Configureerbare grenzen: direct 0,82; verwant 0,60; onzeker 0,40; daaronder geen
match. Een hoge score zonder voldoende naam-/beschrijvingsbewijs of bij een
niveauconflict blijft onzeker. Een directe match vereist daarnaast een bekend
verenigbaar niveau en ten minste 0,75 ruwe dekking van de beschikbare soorten
competenties. De reeds bestaande rolcontrole verlaagt daarnaast de gecombineerde score
met factor 0,60 als de beroepsnaam leidinggevende verantwoordelijkheid noemt
maar de opleidingsnaam daarvoor geen aanwijzing bevat. De ongewijzigde
componentscore en de toegepaste factor blijven beschikbaar. Ook deze regel
is een ontwikkelheuristiek, geen bewezen beroepsvereiste. Dezelfde bestaande
controle zet evidente docent-/onderzoeksrollen zonder opleidingsaanwijzing,
militaire rollen zonder defensieaanwijzing en ISCO-topbestuurders op nul.
Deze uitsluitingen blijven als kandidaat met hun factor zichtbaar.
Niveau is een conservatieve heuristiek, geen officiële gelijkstelling
van mbo-niveau en ISCO-vaardigheidsniveau. Alle voorstellen vereisen controle,
ook een kandidaat met de klasse ‘directe beroepsmatch’.

Toegang tot het beroep en eventuele aanvullende scholing/certificering zijn
niet automatisch vastgesteld. De ESCO-reguleringsverwijzing en de bronvlaggen
van de opleiding blijven beschikbaar voor controle; een niet-lege URI bewijst
niet dat het beroep gereglementeerd is.

ISCO-scores gebruiken het maximum per groep, met behoud van alle kandidaat-URI’s.
Extra zwakke kandidaten verhogen de groepsscore niet door optellen. Grotere
groepen hebben wel meer kans op een uitschieter; max-pooling heft die bias niet op.

## 5. Vergelijking en reranking

- A: lexicale TF-IDF-similarity over naam, officiële alternatieve namen en beschrijving, op hetzelfde ESCO-universum.
- B: meertalige embeddings zonder competentiedekking.
- C: embeddings met afzonderlijke vaardigheids- en kennisdekking.
- D: C met een optionele cross-encoder-rangschikking op dezelfde kandidaten.
- E: nog niet uitgevoerd; LLM-validatie is een vervolgfase, niet nodig om A–D te draaien.

De beschikbare reranker is `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1`, revisie
`1427fd652930e4ba29e8149678df786c240d8825`. Bewaar de ruwe logit, sigmoid-modelscore
en de experimentele combinatie (75% C, 25% reranker). Exacte invoerparen en
modelrevisie vormen ook de sleutel voor een afzonderlijke rerankcache, zodat
een gewichtsaanpassing geen herhaalde modelaanroep nodig heeft. De sigmoid is geen
statistisch gevalideerde matchkans. De cross-encoder gebruikt zijn eigen maximale
invoerlengte: lange paren kunnen in deze vergelijkingsstap worden afgekapt. De
volledige bron blijft beschikbaar voor review. Dit is een beperking van D,
niet van de gechunkte embeddingstap. De eerdere CompetentNL-proef liet al zien
dat reranking niet automatisch beter is; de nieuwe ESCO-proef bewijst dat evenmin.

Gebruik `data/mappings/mbo_esco_validatie.json` voor onafhankelijke menselijke
referenties. De gegenereerde reviewlijst bevat alleen onbeoordeelde kandidaten:
kopieer die niet als positieve gold labels. `complete=true` betekent dat de
positieve lijst voor die opleiding volledig is. Onbeoordeeld is geen negatief.
De bestaande elf ISCO-controles zijn geen complete ESCO-referenties.

De evaluator berekent precision, recall, F1 (micro en macro), Recall@10 en
Precision@k, op ESCO en na deduplicatie op ISCO. Daarnaast worden mbo-niveau,
SBB-subgroep en beroepsgroep afzonderlijk gerapporteerd, met aantallen.
Zonder complete menselijke referenties blijven de maten onbekend. Kleine strata
onderbouwen geen algemene prestatieclaims. Supervised learning en kalibratie
worden pas toegevoegd bij voldoende onafhankelijk gelabelde data.

## 6. Uitvoer en uitvoeren

- `data/processed/mbo_esco_matches.csv`: alle kandidaten die de experimentele matchcriteria halen, zonder minimum of maximum van vijf; de score is geen kanspercentage.
- `data/processed/mbo_esco_kandidaten.csv`: alle beoordeelde kandidaten, inclusief onzeker en geen match.
- `data/processed/mbo_esco_opleidingen.csv`: alle opleidingen met het variabele aantal voorstellen; nul betekent onvoldoende bewijs, niet dat er geen passende beroepen zijn.
- `data/processed/mbo_esco_matches.json.gz`: alle 25 kandidaten, directionele dekking, bewijs, niveaus, officiële/voorspelde herkomst en ISCO-aggregaties.
- `data/processed/controles/mbo_esco_evaluatie.json`: configuratie, bronhashes, modelgegevens en evaluatiestatus.
- `data/processed/controles/mbo_esco_reviewvoorstel.json`: kandidatenlijst om inhoudelijk te beoordelen.

Installeer alleen in een afzonderlijke omgeving de bestaande
`research/requirements-ml.txt`. De normale websitebuild laadt geen ML-modellen.
Voor de aanwezige lokale modelcache:

```sh
/tmp/isco-ml-venv/bin/python -m research.pipeline.imports.mbo_esco \
  --model sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2 \
  --revision e8f8c211226b894fcb81acc59f3b34ba3efd5f42 \
  --local-model /tmp/isco-ml-models/hub/models--sentence-transformers--paraphrase-multilingual-MiniLM-L12-v2/snapshots/e8f8c211226b894fcb81acc59f3b34ba3efd5f42 \
  --rerank --reranker-lock /tmp/isco-ml-models/revisions.json
```

Een eigen BGE-M3-installatie gebruikt `--model BAAI/bge-m3 --revision <commit>`
en `--local-model <lokaal-modelpad>`. Er worden geen modellen, bronprofielen of
reviewgegevens automatisch naar externe diensten verstuurd. `--limit` is alleen
voor technische proefruns; de volledige run verwerkt alle beschikbare profielen.
De nieuwe uitvoer vervangt de bestaande koppeltabellen niet en is nog niet als
bevestigde opleidingsrelatie op de website gepubliceerd.

Nieuwe menselijke referenties evalueren zonder de ML-inferentie te herhalen:

```sh
/tmp/isco-ml-venv/bin/python -m research.pipeline.imports.mbo_esco --evaluate-only
```

Dit controleert eerst de bronhashes. Bij gewijzigde bronnen is een volledige
nieuwe run vereist. De bestaande C-scores worden behouden; de evaluator werkt
referenties, strata, ISCO-maten en de afzonderlijke D-selectie bij. De reviewlijst
blijft een voorstel, geen automatisch trainingsbestand.

## Eerste volledige uitvoering — 6 november 2026

Verwerkt: 438 opleidingen, 3.039 mogelijke ESCO-beroepen, 25 kandidaten per
opleiding (10.950 beoordelingen), 2.190 leesbare CSV-rijen. Reranking is voor
alle 438 opleidingen uitgevoerd. De website en oorspronkelijke koppeltabel zijn
niet vervangen. Taken bleven overal onbekend.

De uiteindelijke C-klassen over alle kandidaten: {'onzeker': 7079, 'geen match': 3731, 'verwant beroep': 140}.
Alle voorstellen blijven onbeoordeeld; de klassen zijn experimenteel.
De elf bestaande ISCO-ontwikkelcontroles staan afzonderlijk in
`data/processed/controles/mbo_esco_ontwikkelcontroles.json`. Ze zijn bij ontwikkeling
gebruikt en vormen geen onafhankelijke prestatiemeting.

Voorbeelden: Taxichauffeur heeft 8322 bovenaan; Drukker heeft drukkerberoepen
binnen 7322 bovenaan. Meewerkend leidinggevende algemeen schoonmaakonderhoud
blijft onzeker: het hoogste voorstel is schoonmaker gebouwen (9112), en het
leidinggevende aspect is hiermee niet bewezen. Deze casus moet inhoudelijk
worden beoordeeld; algemene verbetering wordt niet geclaimd.

Precision, recall en F1 blijven onbekend zolang onafhankelijke complete
menselijke ESCO-referenties ontbreken. BGE-M3 en een externe LLM zijn in deze
run niet gebruikt. De 67 Python-tests en de bestaande websitebuild slagen.

## Correctie export en aanvullende koppellaag

De eerdere top-vijf-CSV was een presentatiekeuze, geen inhoudelijk aantal beroepen.
De actieve export heeft nu geen top-vijf-beperking en dwingt geen minimum af.
De huidige scores leveren 140 voorstellen voor 108 opleidingen; 330 opleidingen
hebben nog onvoldoende onderbouwing. Per opleiding zijn dit nu nul tot vier
voorstellen. Deze aantallen zijn geen waarheid over alle mogelijke beroepen.
De aparte kandidatenlijst bewaart alle 25 onderzochte kandidaten per opleiding;
ook deze retrievalgrens is technisch en kan relevante beroepen missen.

De aanvullende primaire bron is gevonden in de
[TNO/CompetentNL-vaardighedentaxonomie, bijlage 1, september 2025](https://publications.tno.nl/publication/34645227/Jd08KjsX/competentNL-2025-vaardigheden-bijl1.pdf).
Pagina 20–26 bevat ESCO Close Match en ESCO Broad Match. Verschillende URI’s
sluiten zulke koppelingen niet uit. De eerdere export bevat die mappingkolommen
niet. Het originele PDF-bestand staat nu in `data/raw/competentnl/mappings/`.
Een reproduceerbare extractie/audit staat in `cnl_esco_mappings.py`, een afgeleide
mapping in `data/mappings/competentnl_esco_vaardigheden_tno.csv` en de broncontrole
in `data/processed/controles/competentnl_esco_mapping_audit.json`.

Er zijn 36 bronrelaties uit de mappingtabel gelezen. Negentien konden op numerieke
code aan de lokale CompetentNL-vaardigheden worden verbonden; die zijn alle
broadMatch. Twee daarvan verwijzen naar een URI die niet in de ESCO-1.2.1-export
staat. Zeventien broncodes zijn niet in deze lokale vaardighedentabel gevonden.
Dit is geen volledige crosswalk. De bronversie en codes/labels moeten behouden
blijven; de relaties zijn nog niet als scorebewijs geactiveerd. broadMatch is
richtinggevoelig en geen exactMatch. Ook closeMatch is niet automatisch identiteit.
Een brede ESCO-vaardigheid bewijst niet alle specifiekere beroepsvereisten.

De aanvullende tabel betreft vaardigheden, niet automatisch kennisgebieden of
taken. `beroepen_taken.csv` bevat taken van beroepen; de huidige opleidingsexport
biedt geen afzonderlijke opleiding–taakrelatie. Beroepstaken mogen daarom niet
circulair aan een opleiding worden toegekend via haar voorspelde beroep.

Alleen exports opnieuw maken zonder modellen te laden:
`python -m research.pipeline.imports.mbo_esco --export-only`.
De oorspronkelijke modelrun en bron-/modelhashes blijven de herkomst van de
ongewijzigde scores beschrijven; de gewijzigde export beperkt of vult die scores
niet inhoudelijk aan. Voor PDF-herextractie is alleen de auditstap afhankelijk
van `pypdf`; de reguliere pipeline gebruikt het afgeleide bestand niet impliciet.

## Actuele koppeling opleiding → CompetentNL-vaardigheid → ESCO-vaardigheid

De aanvullende TNO-mapping is nu aangesloten in `load_data()` via
`bind_skill_bridge()`. Alleen regels met een bestaande CompetentNL-URI,
hetzelfde numerieke bronnummer, hetzelfde bronlabel en een bestaande ESCO-URI
worden toegelaten. Van de negentien codekoppelingen zijn er vijftien actief;
vier blijven in de controlelijst wegens een ander label of een ontbrekend
doel in ESCO 1.2.1. Bronlabel, relatie, richting, URL en paginanummer blijven
per koppeling bewaard. Gelijksoortige nieuwe labels worden niet stil als
identieke oude concepten behandeld.

Dit levert **1.240 opleidings-vaardigheidskoppelingen voor 407 van de 438
opleidingen** op. De afzonderlijke ketens staan in
`data/processed/mbo_esco_competenties.csv`; de controle staat in
`data/processed/controles/mbo_esco_koppelcontrole.json`. De bron-audit beschrijft de
extractie; de runmetadata en koppelcontrole beschrijven de actieve subset.

Alle actieve bronrelaties zijn broadMatch. De vergelijking gebruikt alleen
de opgegeven richting van CompetentNL naar het bredere ESCO-concept. Een exact
doelconcept in een beroepsvereiste kan daarmee gedeeltelijke onderbouwing
krijgen. De experimentele bewijsscore is 0,60 voor broadMatch en 0,85 voor
closeMatch; dit zijn configureerbare bewijsgewichten, geen kansen of formele
beheersingsniveaus. Identieke identifiers blijven onderscheiden van beide.
Bij een broadMatch blijft onvoldoende aangetoonde specifieke beheersing zichtbaar.

**Belangrijk resultaat:** de vijftien actieve doelen zijn algemene vaardigheden
zonder directe `occupationSkillRelations` in deze ESCO-export. De nieuwe keten
is dus echt beschikbaar op vaardigheidsniveau, maar geeft in de huidige run
nul extra rechtstreeks onderbouwde beroepsvereisten. Er is geen automatische
propagatie naar onderliggende specialistische vaardigheden of beroepen. Daarvoor
blijven bronbeschrijvingen, semantische vergelijking en inhoudelijke validatie
nodig. De beroepsscores veranderen hierdoor niet; meer verbanden in de data
bewijzen niet automatisch meer passende beroepen. Er is ook geen nieuwe
opleiding–taakrelatie verzonnen en de 247 onopgeloste bronverwijzingen zijn niet
met voorspellingen ingevuld.

Relatiebetekenis: [W3C SKOS, mapping properties](https://www.w3.org/TR/skos-reference/#mapping).
De oorspronkelijke TNO-bron en de afgeleide mapping blijven apart beschikbaar.

## Leesbare ISCO-uitvoer via ESCO-beroepen

`data/processed/mbo_isco_via_esco.csv` groepeert de huidige inhoudelijke
beroepsvoorstellen per opleiding en officiële viercijferige ISCO-code.
Dezelfde ISCO-groep komt per opleiding één keer voor; alle onderbouwende
ESCO-beroepsnamen blijven zichtbaar. De groepsscore is het maximum van de
onderliggende scores, geen som of kanspercentage. Een niet-officiële ESCO–ISCO
relatie wordt door deze export geweigerd.

De huidige uitvoer bevat 123 opleiding–ISCO-voorstellen voor 108 opleidingen.
De opleiding–beroepstap blijft voorspeld en vereist menselijke controle.
De officiële ESCO–ISCO-stap maakt de voorspelde opleidingsrelatie niet officieel.
De 407 opleidingen met een algemene ESCO-vaardigheidskoppeling hebben daarmee
niet automatisch een onderbouwde beroeps- of ISCO-match. Onzekere kandidaten
blijven beschikbaar in `mbo_esco_kandidaten.csv`; ze worden niet als voorstel
in deze ISCO-tabel opgenomen. Er zijn geen nieuwe matches of scores afgeleid
alleen omdat een brede vaardigheidsrelatie aanwezig is.

## Actuele kwaliteitsverbetering

De oorzaakanalyse, het vooraf vastgelegde verbeterplan, de regressiecontroles en
de volledige vergelijking staan in
[MBO_ESCO_KWALITEITSANALYSE.md](MBO_ESCO_KWALITEITSANALYSE.md).
De actuele gecombineerde uitvoer is `data/processed/mbo_beroep_matches.csv` en
`data/processed/mbo_isco_matches.csv`. De oorspronkelijke modeluitvoer is behouden;
ESCO- en CompetentNL-identifiers blijven onderscheiden. De ontwikkelcijfers zijn
geen onafhankelijke nauwkeurigheidsmeting.
