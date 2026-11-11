# Beroeps- en opleidingskoppelingen

## Welke bestanden horen hier?

Deze map bewaart bronkoppelingen en expliciete beoordelingen. Berekende kandidatenlijsten en modeluitvoer staan in `data/processed/`.

| Bestand/map | Waarom behouden? |
|---|---|
| `isco2008_brc2014.csv` | Classificatie en ISCO-beroepsniveaus voor matching |
| `competentnl_esco_vaardigheden_tno.csv` | Brongebonden vaardigheidskoppelingen |
| `mbo_codefamilies.json` | Gecontroleerde oude en nieuwe opleidingscodes voor trends |
| `mbo_esco_validatie.json`, `mbo_esco_regressie.json` | Referenties en ontwikkelcontroles; niet automatisch te reconstrueren uit modeluitvoer |
| `opleiding_beroep_proef_beoordelingen.json` | Expliciete bronbeoordelingen met onderbouwing |
| `mbo_locaties/` | Handmatige aanbodselecties, uitsluitingen en bronverantwoording |

De berekende `opleiding_beroep.csv` is verplaatst naar `data/processed/`. Controleverslagen staan gebundeld in `data/processed/controles/`.

Voor de achtergrond van de MBO–ESCO–ISCO-uitbreiding:
[architectuuranalyse, broninventaris en verbeterplan](../../research/onderwijs/ESCO_ANALYSE_EN_PLAN.md).
De beschreven bestaande matching en proef hieronder blijven afzonderlijk behouden.

Voor de samenhangende onderzoeksverantwoording en het beoordelingsprotocol:
[Methodiek opleiding → ISCO](../../research/onderwijs/METHODIEK_OPLEIDING_BEROEP.md).
Onderstaand staan de operationele details en de uitgevoerde proef.

## ISCO en BRC

`isco2008_brc2014.csv` bewaart de kolommen uit het lokale
[CBS-schakelschema ISCO 2008–BRC 2014](https://www.cbs.nl/nl-nl/onze-diensten/methoden/classificaties/onderwijs-en-beroepen/beroepenclassificatie--isco-en-sbc--).
De matching gebruikt hieruit alleen de viercijferige ISCO-code en het
ISCO-beroepsniveau. De uitvoer blijft ISCO; er is geen terugval naar BRC.
BRC 2014 is niet automatisch gelijk aan BRC Plus uit de UWV-bron.

CompetentNL-beroepsinhoud wordt via beroeps-URI en de aangeleverde ISCO-code
geïmporteerd door `research/pipeline/imports/occupation_content.py`.
De officiële classificatie van een beroep is iets anders dan een berekende
relatie tussen een opleiding en dat beroep.

## Mbo-opleiding naar mogelijke ISCO-beroepen

`data/processed/opleiding_beroep.csv` is een **volledige kandidatenlijst, geen gevalideerde
opleiding–ISCO-crosswalk**. Op verzoek krijgt ieder van de 438 aangeleverde
mbo-profielen minstens één voorstel. Alle beroepen en codes komen uit de
bronbestanden; de voorgestelde relatie met een opleiding is niet altijd
voldoende onderbouwd. De lijst bevat 1.537 regels; 75 opleidingen hebben
alleen een extra onzeker aanvullend voorstel. Alle overige relaties blijven
ook kandidaten totdat ze inhoudelijk zijn beoordeeld.

De leesbare kolommen zijn:

| Kolom | Betekenis |
|---|---|
| Opleidingscode | Code uit de aangeleverde mbo-profielen |
| Mbo-opleiding | Opleidingsnaam |
| Mogelijk passend beroep | Specifiek CompetentNL-beroep of CBS-index-/groepsnaam |
| ISCO-code | Viercijferige broncode, als tekst lezen |
| ISCO-beroepsgroep | Bijbehorend Nederlands bronlabel |
| Match (%) | Vergelijkingsscore, geen betrouwbaarheid of loopbaankans |
| Beoordeling | Herkomst/onderbouwing of waarschuwing dat controle nodig is |

De extra eenvoudige kolom `Beoordeling` voorkomt dat volledige invulling
wordt verward met zekerheid. `CBS-naamkoppeling` betekent dat een beroepsnaam
in de bron staat, niet dat de opleiding officieel aan die beroepsgroep is
gekoppeld. `CBS-naamvariant` omvat onder meer enkelvoud/meervoud en het
weglaten van eenvoudige opleidingsmodificaties. `niveau controleren` betekent
dat een bronondersteunde naam buiten de conservatieve directe-routegrens
valt. `Onzeker voorstel; vakrichting/niveau controleren` geeft de aanvullende
suggestie aan waarvoor de strengere selectie niets opleverde.

### Reproduceerbaar uitvoeren

Na installatie van de onderzoeksrequirements (inclusief `xlrd`):

```bash
python -m research.pipeline.imports.opleiding_beroep
python -m research.pipeline.imports.opleiding_beroep --check
python -m unittest discover -s tests
```

`--check` schrijft niets. De export wordt gevalideerd, tijdelijk geschreven,
teruggelezen en pas bij gelijkheid atomair vervangen. Bronbestanden blijven
ongewijzigd. De berekende relaties zijn niet automatisch als bevestigde
koppelingen naar de website gepubliceerd.

### Bronnen en volgorde

1. [CompetentNL-bronset](../raw/competentnl/README.md): `mbo.csv` met
   opleidingsnamen, definities, beschrijvingen en kenmerkverwijzingen;
   `beroepen_isco.csv`, `beroepen_taken.csv`, `beroepen_vaardigheden.csv` en
   `beroepen_kennisgebieden.csv` voor specifieke beroepen.
2. [CREBO-bronnen](../raw/crebo/README.md): `niveau beroep`, `subgroep`,
   `beroepsopleiding (dossier)` en `omschrijving ISCED-F2013`. Exacte codes
   worden gezocht in 2026–2027, met 2025–2026 als terugval. Voor 436 van de
   438 profielen is context aanwezig; `27139` en `27140` missen die context.
3. [CBS-codelijsten](https://www.cbs.nl/nl-nl/onze-diensten/methoden/classificaties/onderwijs-en-beroepen/beroepenclassificatie--isco-en-sbc--):
   `data/raw/ai_exposure/codelijsten-isco-08.xls`. De Nederlandse index heeft
   4.704 regels en 4.703 unieke genormaliseerde namen. Ook de 436 Nederlandse
   ISCO-unitgroepsnamen worden als ingang gebruikt. Iedere indexcode wordt
   gecontroleerd tegen de unitgroepen. Meervouds-s wordt als naamvariant
   verwijderd; voorvoegsels zoals ‘allround’, ‘eerste’, ‘zelfstandig werkend’
   of ‘gespecialiseerd’ kunnen als variant worden weggelaten. Ambigue
   namen behouden meerdere codes. Drukker → Drukkers → `7322` is zo hersteld.
4. Naamkandidaten uit CBS krijgen voorrang. Gelijknamige CompetentNL-relaties
   met dezelfde code worden samengevoegd. Een nieuwe CBS-naamkoppeling
   krijgt geen verzonnen modelscore; `Match (%)` blijft dan leeg terwijl
   beroep en ISCO-code wel zijn ingevuld. Taxichauffeur → `8322` wordt door
   zowel de CBS-index als CompetentNL ondersteund.
5. Voor de overige gewone kandidaten geldt vakgebiedbewijs in beroepsnaam
   én definitie/taken, plus ondersteuning door de CREBO-vakrichting en een
   conservatieve niveaucontrole. Een exacte specifieke naam met ondersteunende
   definitie en essentiële taken mag de letterlijke vakrichtingsfilter
   vervangen. Algemene rolwoorden zijn geen vakgebiedbewijs.
6. Als dat geen kandidaat oplevert, wordt één extra onzeker voorstel gekozen
   uit bestaande CompetentNL-beroepen met positieve tekstovereenkomst.
   Werkzaamheden wegen hier sterker dan naamgelijkenis. Vakgebiedbewijs
   levert een beperkte rangschikkingsbonus; het is geen absolute voorrang
   boven veel sterkere tekstuele inhoud. Ook niveaus buiten de directe-routegrens
   kunnen uitsluitend als te controleren voorstel terugkomen. Er wordt geen
   beroep toegewezen aan een profiel zonder enig tekstbewijs.

De niveaucontrole stelt mbo- en ISCO-niveaus niet gelijk. De conservatieve
voorkeursselectie is mbo 1 → ISCO-niveau 1; mbo 2/3 → ISCO-niveau 1–2;
mbo 4 → ISCO-niveau 1–3. Dit is onze heuristiek voor directe routes, geen
officiële conversietabel en geen verbod op latere loopbaanmogelijkheden.
Bronondersteunde naamkoppelingen buiten de grens blijven met een waarschuwing
zichtbaar. Zie de [ILO-definitie van beroepsniveau](https://ilostat.ilo.org/methods/concepts-and-definitions/classification-occupation/).

Bij de extra onzekere voorstellen worden evidente rolwissels begrensd:
geen docent-/onderzoekersberoep zonder onderwijsrol in de opleidingstitel,
geen militaire code voor een civiele opleiding, en geen ISCO 111/112 als
algemene aanvulling. Een leidinggevende beroepsnaam bij een niet-leidinggevende
opleiding krijgt een rangschikkingsnadeel. Dit blijft een beperkte heuristiek,
geen volledige analyse van verantwoordelijkheden of formele beroepseisen.

### Score en onzekerheid

| Component | Gewone kandidaat | Extra onzeker voorstel |
|---|---:|---:|
| Naam | 30% | 5% |
| Definitie/beschrijving | 30% | 45% |
| Beroepstaken tegenover opleidingsbeschrijving | 30% | 40% |
| Vaardigheden en kennisgebieden | 10% | 10% |

Teksten worden lokaal vergeleken met TF-IDF/cosinus op woorden en woordparen
(woordpaarfactor 0,35). De naamcomponent combineert woordovereenkomst en
tekenreeksen van 3–5 letters. Stopwoorden en algemene functietermen tellen
niet mee. Bij onzekere voorstellen vermindert de lagere naamweging bijvoorbeeld
het risico dat een vreemde opleidingsnaam door alleen lettergelijkenis aan
een ongerelateerd beroep wordt gekoppeld. Dit is geen semantisch taalmodel.

Essentiële beroepstaken wegen twee keer zo zwaar als optionele taken. Bij
slechts één beschikbare categorie wordt alleen die categorie gebruikt.
Opleidingstaken ontbreken als afzonderlijke kolommen: de bestaande
opleidingsbeschrijving wordt met echte beroepstaken vergeleken. Identieke
beschrijvingen en herhaalde exportrelaties worden ontdubbeld.

Kenmerken worden exact op URI vergeleken met IDF-gewogen Jaccard:
`100 × som(IDF gedeeld) / som(IDF unie)`, met
`IDF = 1 + ln((1 + aantal beroepen)/(1 + aantal beroepen met kenmerk))`.
Er zijn 126 gedeelde vaardigheids- en 261 kennisgebied-URI’s. De 247
onopgeloste genid-verwijzingen worden apart in de interne dekking bewaard,
niet als herkenbare kenmerken meegeteld.

De gewichten, naamvarianten en controles zijn implementatiekeuzes. Er is
geen onafhankelijk gelabelde evaluatieset of scorekalibratie. Een lage score
is niet hetzelfde als een lage kans; een topplaats is evenmin goedkeuring.
De procentkolom kan daarom niet worden gebruikt als zekerheidsschatting.
De volledige lijst maakt zichtbaar waar nog inhoudelijke beoordeling nodig
is; invulling van alle codes bewijst niet dat alle relaties juist zijn.

### Bronbeperkingen en geografische scope

De CBS-werkmap bevat bij `8322` een onjuiste Engelse omschrijving/voorbeelden
over glas- en keramiekoperators. Daarom gebruikt de matching alleen de
Nederlandse index en labels, niet die Engelse kolommen.

`mbo.csv` heeft geen cohort- of geldigheidsdatum. De profielen mogen niet
zonder controle historisch op 2021–2024 worden toegepast. Van de 396
DUO-geselecteerde mbo-opleidingen met studenten in 2025 hebben 188 een
exact gelijkende profielcode; 208 missen nog een profiel. De volledige
kandidatenlijst betreft de 438 aangeleverde profielen, niet automatisch alle
DUO-opleidingen in Friesland. Studentenaantallen worden niet over beroepen
verdeeld. De bekende mbo-geografische beperking blijft gelden: volledige
instellingen met Friese locaties omvatten ook locaties buiten Friesland.
Zie [onderwijsmethode en downloads](../../research/onderwijs/README.md).

## Opleidingstab: SBB, hbo en wo

`research/pipeline/imports/opleidingen.py` gebruikt exacte CREBO-codes en
schooljaar voor officiële SBB-kwalificatienamen, afzonderlijk van bovenstaande
onzekere ISCO-voorstellen. De snapshot `data/processed/mbo_opleidingen.json.gz`
bevat 575 historische kandidaatcodes. Voor 2025 toont de website 396 mbo-,
95 hbo- en 10 wo-opleidingen met geregistreerde deelname. Hbo en wo worden
strikt op DUO-provincie Friesland geselecteerd; zij krijgen geen verzonnen
SBB-relatie. Een gewijzigde mbo-selectie zonder vernieuwde snapshot stopt
de build. Vernieuwen: `python -m research.pipeline.imports.build_atlas --refresh-sources`.

Bronnen: [DUO mbo](https://duo.nl/open_onderwijsdata/middelbaar-beroepsonderwijs/aantal-studenten/aantal-studenten-mbo-per-instelling.jsp),
[DUO mbo-locaties](https://duo.nl/open_onderwijsdata/middelbaar-beroepsonderwijs/aantal-studenten/studenten-mbo-rio.jsp),
[SBB erkende opleidingscodes](https://www.s-bb.nl/onderwijs/erkende-opleidingscode/),
[SBB kwalificatieregister](https://kwalificatie-mijn.s-bb.nl/Lijsten),
[DUO erkende codes](https://duo.nl/open_onderwijsdata/middelbaar-beroepsonderwijs/erkende-opleidingen/erkende-opleidingscode-en-beroep.jsp),
[DUO hbo](https://duo.nl/open_onderwijsdata/hoger-onderwijs/aantal-studenten/studenten-hbo.jsp) en
[DUO wo](https://duo.nl/open_onderwijsdata/hoger-onderwijs/aantal-studenten/studenten-wo.jsp).

Hbo-/wo-opleidingsprofielen en hun beroepsrelaties ontbreken nog in deze
matchingbronset. Er worden geen vacaturecijfers of onderwijsinstroom naar
ISCO toegerekend. De onzekere voorstellen zijn niet als bevestigde
beroepsroutes op de website gepubliceerd.

## Bronversies van de berekening (6 november 2026)

De CSV-profielen zijn door de gebruiker aangeleverd; exportquery en release
zijn niet vastgelegd. De gebruikte inhoud is identificeerbaar via SHA-256:

| Bestand | SHA-256 |
|---|---|
| `data/raw/competentnl/mbo.csv` | `f568f4b651ea221c82df51097cf2cbd958bb65d8e61e4b7eb576e4e4c6bf3bed` |
| `data/raw/competentnl/beroepen_isco.csv` | `9f8e5dbb73e38f41d1e74e56c2b79e53de31beac58e64a179c020f3b1fe0fc59` |
| `data/raw/competentnl/beroepen_taken.csv` | `c374b43982c4d281f7bd1946a99792053f6ea8f5719b48e28bbf484f036eabfe` |
| `data/raw/competentnl/beroepen_vaardigheden.csv` | `8c257f9818970d107ba08cc555347d1a680ac7209bce40601604a62c16ad80fc` |
| `data/raw/competentnl/beroepen_kennisgebieden.csv` | `81c7de8c56f503f09846ef517badaee013e253102b34c4d4198c7e292cb7feb5` |
| `data/raw/crebo/251126 mbo-opleidingskoppeltabel 2026-27 met wijzigingenblad.xlsx` | `ad538563cacc8890c79a16cf9752a97350835bea634d06ac64ee754e64758d82` |
| `data/raw/crebo/20250107 mbo-opleidingskoppeltabel 2025-2026 met wijzigingenblad.xlsx` | `47d3bcfca67abf2d2597278ef1a4790ddac806d7085c28e6c9178abbe8445543` |
| `data/mappings/isco2008_brc2014.csv` | `d1cc97dcb84c9fd644bfc2bc43591caabd15a10ae9a26a62fba85cddc8d115d1` |
| `data/raw/ai_exposure/codelijsten-isco-08.xls` | `c346a2d4137fd4905927e1d08e0f0e91ef879dc79676a86183795439baca658f` |

## Uitgevoerde ML-proef — 6 november 2026

De proef staat naast de bestaande koppeltabel, die inhoudelijk en via SHA-256
ongewijzigd is gebleven. Alle 75 extra onzekere opleidingsprofielen zijn
getest, plus zes aanvullende controles: 81 opleidingen totaal.

### Methode en vastgelegde modellen

- Semantisch zoeken: [paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2),
  revisie `e8f8c211226b894fcb81acc59f3b34ba3efd5f42`.
- Herordenen: [mmarco-mMiniLMv2-L12-H384-v1](https://huggingface.co/cross-encoder/mmarco-mMiniLMv2-L12-H384-v1),
  revisie `1427fd652930e4ba29e8149678df786c240d8825`.
- De zoekindex bevat alle 3.294 specifieke CompetentNL-beroepen. De
  opleidingsbeschrijving wordt vergeleken met beroepsdefinitie en de eerste
  twaalf alfabetisch gesorteerde essentiële taaknamen. Naamgewicht in de
  documentembedding is 20%, inhoud 80%. Langere teksten worden verdeeld in
  stukken van 72 bodytokens, met een titelprefix tot 24 tokens; deze delen
  worden gewogen gemiddeld en genormaliseerd. Zo verdwijnt niet stilzwijgend
  het einde van een lange beschrijving bij de korte encoderlimiet (128 tokens).
- Per opleiding worden twintig semantische kandidaten opgehaald. De oude
  kandidaat wordt toegevoegd als die niet in de set staat en als specifiek
  CompetentNL-beroep teruggevonden wordt. De zuivere embeddingrangschikking
  wordt apart bewaard; die wordt niet door deze toevoeging opgehoogd.
- De cross-encoder gebruikt een query tot 150 tokens en een beroepstekst tot
  225 tokens (definitie plus maximaal zes essentiële taken), maximaal 384 tokens
  per paar. De begrensde teksten worden voor controle in het rapport bewaard.
- Er is geen procentconversie van cosinuswaarden of reranker-logits. Beide
  zijn rangschikkingssignalen, geen gekalibreerde kansen of beroepenpercentages.

### Resultaten op vooraf gekozen broncontroles

Er zijn elf bekende of inhoudelijk voor de proef vastgelegde controles;
zij overlappen deels met de onzekere gevallen. Dit zijn geen onafhankelijk
getrokken, door deskundigen gelabelde testgevallen.

| Methode | Verwachte ISCO-code op plaats 1 | Verwachte code in eerste 3 |
|---|---:|---:|
| Bestaande methode | 8/11 | Niet als onafhankelijke vergelijking bepaald |
| Meertalige embeddings | 7/11 | 11/11 |
| Cross-encoder | 6/11 | 8/11 |

De bestaande eenvoudige rolcontrole na de cross-encoder brengt de eerste
keuze naar 8/11. Het eindmodel is dus **niet aantoonbaar beter voor automatische
toewijzing**. De embeddingkandidaten zijn wel bruikbaar voor gerichte beoordeling.
Een passende ISCO-groep in de top drie bewijst nog niet dat de juiste specifieke
functie of verantwoordelijkheid bovenaan staat.

Voorbeelden van verbetering in het zoeken zijn Fashion Designer →
Modeontwerper (`2163`) en beide tandtechnische opleidingen → Tandtechnicus
(`3214`). De cross-encoder zet daarentegen soms een hoogleraar of docent
boven een uitvoerend beroep en kiest bij Taxichauffeur een bedrijfsleider.
Het model is getraind voor passage-relevantie, niet voor deze opleiding–
beroepstoewijzing. De bestaande CBS-koppelingen zijn daarom niet vervangen.

### Brongebonden LLM-beoordeling van zestien geselecteerde gevallen

De huidige assistent heeft zestien doelbewust gekozen gevallen naast de
bronbeschrijvingen gelegd. Dit is LLM-ondersteunde bronbeoordeling in deze
sessie, **geen afzonderlijk geautomatiseerd LLM-API-proces**, geen menselijke
expertbeoordeling en geen onafhankelijke testset. Er is geen API-sleutel
geconfigureerd en er zijn geen generatieve API-aanroepen uitgevoerd.
De gekozen gevallen mogen niet als representatieve nauwkeurigheidsmeting
voor alle 75 onzekere opleidingen worden gepresenteerd.

De beoordeling selecteert uitsluitend daadwerkelijk opgehaalde bronkandidaten,
met uitzondering van het expliciet behouden van de bestaande CBS-groep voor
Drukker. Kandidaat-URI, naam en ISCO-code worden gecontroleerd; een beoordeling
van een andere bron-/modelversie wordt geweigerd. De onderbouwingen staan in
`opleiding_beroep_proef_beoordelingen.json`.

Voorbeelden: Assistant Fashion Tailor → Medewerker kledingreparatiebedrijf /
veranderatelier (`7531`); Fashion Designer → Modeontwerper (`2163`);
Tandtechnicus → Tandtechnicus (`3214`), in plaats van een docent.
Marketing & Communication Specialist en facilitaire dienstverlening behouden
meerdere mogelijke rollen. Werkvoorbereider houttechniek krijgt geen geforceerde
beoordelingskeuze, omdat een passend geachte bronfunctie niet in de huidige
kandidaatset zat: die set moet eerst worden uitgebreid.
Deze beoordeling is een voorstel tot verbetering en nog geen algemeen
goedgekeurde opleidingsroute.

### Bestanden en opnieuw uitvoeren

- `data/processed/opleiding_beroep_proef.csv`: leesbare vergelijking van oud,
  ruwe ML-topkeuze en de zestien bronbeoordelingen. Bij andere gevallen staat
  dat zij nog niet broninhoudelijk zijn beoordeeld. De kolom `ML-voorstel`
  toont bewust ook de fouten van de ruwe cross-encoder.
- `data/processed/opleiding_beroep_proef.json.gz`: gecomprimeerd technisch
  rapport met kandidaten, ruwe scores, bronpassages, bronhashes, modellen,
  packageversies en controletellingen.
- `data/mappings/opleiding_beroep_proef_beoordelingen.json`: expliciete
  sessiebeoordelingen met bronversies en onderbouwingen.
- `research/pipeline/imports/opleiding_beroep_ml.py`: reproduceerbare proef;
  de oorspronkelijke koppeltabel wordt nooit overschreven.

Gebruik een aparte ML-omgeving; de gewone onderzoeksrequirements wijzigen niet:

```bash
python -m venv /tmp/isco-ml-venv
/tmp/isco-ml-venv/bin/python -m pip install -r research/requirements-ml.txt
/tmp/isco-ml-venv/bin/python -m research.pipeline.imports.opleiding_beroep_ml --download-models
```

De eerste uitvoering downloadt de vastgelegde modelrevisies naar de tijdelijke
cache, niet naar de repository. Latere runs hergebruiken bron- en modelgebonden
embeddings. Beoordelingen op bestaande modeluitkomsten opnieuw weergeven:

```bash
python -m research.pipeline.imports.opleiding_beroep_ml --review-existing
```

Na wijziging van bronnen of kandidaatsets moeten de sessiebeoordelingen opnieuw
worden gecontroleerd. Een kleinere `--limit`- of `--top-k`-proef is niet zonder
meer verenigbaar met de beoordelingen van de volledige proef. Modelresultaten
blijven experimenteel en zijn niet naar de website gepubliceerd.

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

## Menselijke referenties MBO–ESCO

`mbo_esco_validatie.json` is de referentiedataset voor de nieuwe hybride pipeline.
Momenteel zijn geen onafhankelijke, volledige menselijke ESCO-referenties beschikbaar.
De onbeoordeelde reviewlijst staat in `data/processed/controles/mbo_esco_reviewvoorstel.json`.
Vul per opleiding meerdere positieve ESCO-URI’s en expliciete negatieve URI’s in.
Markeer een lijst alleen volledig als alle passende beroepen zijn beoordeeld.
De bestaande ISCO-controles zijn geen officiële MBO–ESCO-relaties.
Zie `research/onderwijs/MBO_ESCO_UITVOERING.md` voor score- en evaluatiedefinities.

## Aanvullende CompetentNL–ESCO-vaardigheidsmapping

`competentnl_esco_vaardigheden_tno.csv` is een extractie van de mappingkolommen
uit TNO/CompetentNL bijlage 1, september 2025, pagina 20–26. Bron:
https://publications.tno.nl/publication/34645227/Jd08KjsX/competentNL-2025-vaardigheden-bijl1.pdf

De bijbehorende audit en bronhash staan in
`data/processed/controles/competentnl_esco_mapping_audit.json`. Relatietype en bronpagina
blijven behouden. Dit is een onvolledige aanvullende mapping; broadMatch en
closeMatch zijn geen exactMatch. De huidige modelrun gebruikt deze relaties
nog niet. Niet-aanwezige ESCO-URI’s worden expliciet gemarkeerd.

### Activering van de bruikbare subset

De gevalideerde subset is nu aangesloten op de opleidingsprofielen. Vijftien
relaties met gelijke code én gelijk bronlabel en een bestaande ESCO-URI worden
gebruikt; vier andere regels blijven apart. Actuele ketens staan in
`data/processed/mbo_esco_competenties.csv`, controle in
`data/processed/controles/mbo_esco_koppelcontrole.json`. Het betreft brede
vaardigheidskoppelingen, geen officiële opleiding–ESCO-beroepkoppelingen.
Geen van deze algemene doelvaardigheden komt rechtstreeks voor in de huidige
ESCO-beroepscompetentierelaties; daarom ontstaan hierdoor geen extra bewezen
beroepsmatches. De eerdere melding ‘nog niet actief’ beschrijft de broninventaris
vóór deze integratie.

## Actuele kwaliteitsverbetering

De oorzaakanalyse, het vooraf vastgelegde verbeterplan, de regressiecontroles en
de volledige vergelijking staan in
`research/onderwijs/MBO_ESCO_KWALITEITSANALYSE.md`.
De actuele gecombineerde uitvoer is `data/processed/mbo_beroep_matches.csv` en
`data/processed/mbo_isco_matches.csv`. De oorspronkelijke modeluitvoer is behouden;
ESCO- en CompetentNL-identifiers blijven onderscheiden. De ontwikkelcijfers zijn
geen onafhankelijke nauwkeurigheidsmeting.

`mbo_codefamilies.json` bevat uitsluitend expliciet brongecontroleerde oude en
vernieuwde CREBO-codes voor gezamenlijke opleidingstrends. Inclusief bronlinks,
geldigheidsdatums, controledatum en hash van de DUO-registratie in `data/raw/crebo`.
Gelijke opleidingsnamen zijn geen toestemming voor numeriek samenvoegen.
Zie `research/onderwijs/MBO_TOTALEN_EN_LEERWEGEN.md` voor de beschikbaarheidsregels.

### CREBO-bronselectie voor de GitHub-build

`crebo_codefamilies_bronselectie.csv` bevat alleen de acht gebruikte registervelden voor de opleidingscodes uit de bestaande DUO-selectie en de expliciet gecontroleerde codefamilies. De 542 bronregels zijn ongewijzigd overgenomen uit het openbare DUO-register dat in `mbo_codefamilies.json` wordt vermeld. Dit bestand is een bouwafhankelijkheid, geen extra download in Bronnen & open data.

`mbo_codefamilies.json` bewaart de oorspronkelijke bron-URL, bestandsnaam en SHA-256, plus de SHA-256 van deze selectie en beide gebruikte DUO-uitvoerbestanden. De gewone build leest de afgeleide selectie en heeft `data/raw/` niet nodig. Veranderde bronselecties of gewijzigde bestandsinhoud worden geweigerd totdat de selectie expliciet is vernieuwd.

Vernieuwen met de lokale, gecontroleerde oorspronkelijke bron:

```sh
python3 -m research.pipeline.imports.opleiding_families --refresh-registry-snapshot
```

Dit traint geen model, verandert geen DUO-aantallen en publiceert geen ruwe bronbestanden. Commit het selectiebestand en de bijgewerkte metadata samen. De oorspronkelijke ruwe bron blijft lokaal onder `data/raw/crebo/`.
