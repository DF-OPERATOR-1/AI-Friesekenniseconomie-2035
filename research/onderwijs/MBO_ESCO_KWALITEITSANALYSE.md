# Oorzaakanalyse en verbeterplan MBO–ESCO–ISCO

This publication uses the ESCO classification of the European Commission.

## Analyse vóór wijziging van matchingcode — 6 november 2026

De huidige scores en configuratie zijn als nulmeting bewaard onder
`research/diagnostics/mbo_esco_quality_baseline/`. De oorspronkelijke toepassing,
bronbestanden en opleidings-/studentenlogica worden behouden.

1. **Officiële classificatie:** de pipeline controleert alle ESCO–ISCO-relaties
   tegen de hiërarchie. De gerapporteerde fouten zijn geen verwisseling van codes.
   ESCO ‘dierenartsassistent’ hoort officieel bij 4226 en beschrijft receptie en
   administratie. Paraveterinaire klinische ondersteuning wordt daarmee verward.
   ESCO ‘rigging supervisor’ hoort bij 7215 en beschrijft takeloperaties.
2. **Naamgewicht:** naam en beschrijving hebben elk 0,26 gewicht; taken 0,35 is
   onbekend en wordt uit de noemer verwijderd. Naam/beschrijving dragen daardoor
   elk 40% bij, vaardigheden circa 15,4% en kennis slechts 4,6%. Algemene rol- en
   contextwoorden overheersen inhoudelijke beroepsvereisten. Leidinggeven zonder
   hetzelfde vakgebied wordt niet herkend als conflict.
3. **CompetentNL-gebruik:** opleidingsvaardigheden en kennis worden daadwerkelijk
   via `hat_essentieel`/`hat_belangrijk` en URI’s gelezen. De deelscores staan in
   de uitvoer. Taken staan altijd op onbekend: de opleidingsexport bevat geen
   afzonderlijke taakrelatie. Beschrijvingen bevatten wél concrete werkzaamheden.
   CNL-kenmerken missen vaak een definitie; die worden vergeleken met uitgebreide
   ESCO-competentieteksten. Dat is geen evenwichtige veldvergelijking.
4. **Competentiedekking:** beide richtingen zijn berekend, maar semantische
   nabijheid van algemene labels bewijst geen specialistische beheersing.
   De gedeeltelijke TNO-mapping betreft algemene ESCO-vaardigheden zonder directe
   beroepsrelaties in deze export. Deze maakt de foutieve beroepsmatches niet juist.
5. **Kandidaatselectie:** 20 embeddingplaatsen en 5 naamplaatsen. De lexicale
   vergelijking van volledige teksten is wel berekend als model A, maar levert
   geen afzonderlijke plaatsen voor de inhoudelijke rangschikking. Daardoor kunnen
   passende technische/logistieke beroepen ontbreken of laag staan.
6. **Niveau:** de huidige maximale ISCO-vaardigheidsniveaus per mbo-niveau zijn
   een ontwikkelheuristiek, geen officiële schaalconversie. Ze blokkeren bijvoorbeeld
   verpleegkundige ESCO-rollen op niveau 4 en laten lager geschoolde ondersteunende
   functies toe. Formele beroepsvereisten worden alleen opgeslagen, niet beoordeeld.
7. **Reranking:** dezelfde cross-encoder geeft hoge logits aan rigging supervisor
   én logistieke beroepen, en rond 10,8 aan zowel keukenmontage als keukenhulp.
   De sigmoid raakt verzadigd. Een hoge rerankscore is geen beroepskwalificatiebewijs.
   De gewone CSV exporteert bovendien C, niet D: de tweede fase stuurt de hoofdselectie
   nog niet aan.
8. **Ontbrekende verpleegkundige:** nul ESCO-beroepen onder 3221 in de lokale
   ESCO-versie. CompetentNL bevat ‘Verpleegkundige’, ‘Schoolverpleegkundige’ en
   ‘Begeleider terminale zorg’ met 3221. ESCO-2221 mag niet worden omgecodeerd.
   Een afzonderlijke CompetentNL-route is nodig om deze catalogusleemte te dekken.

## Concreet verbeterplan vóór implementatie

- Behoud de nulmeting en vergelijk exact dezelfde opleidingscodes en dezelfde
  expliciete positieve/negatieve ontwikkelcontroles.
- Breid retrieval uit tot een configureerbare pool met embeddings, volledige
  lexicale teksten, beroepsnamen zonder algemene rolwoorden en beroepscompetenties.
  Bewaar de herkomst van kandidaten en evalueer de zoekdekking afzonderlijk.
- Vergelijk competentielabels met labels wanneer definities ontbreken; leg beide
  dekkingsrichtingen, specialistische vereisten en ontbrekende broninformatie vast.
- Voeg werkzaambewijs uit de originele opleidingsbeschrijving toe, met letterlijke
  bronpassages. Dit is een afgeleide tekstproxy, geen officiële opleiding–taakrelatie.
  Houd de ontbrekende formele taakrelatie expliciet apart en tel gecorreleerd bewijs
  niet op als onafhankelijke officiële bevestiging.
- Verminder naamgewicht; verhoog inhoudelijk werk- en competentiebewijs. Voeg
  transparante, configureerbare controles toe voor domeinconflicten, ondersteunende
  deeltaken versus hoofdfuncties en ontbrekend kwalificatiebewijs. Geen blacklist
  van de vijf opleidingscodes of de foutieve ISCO-codes in het model.
- Gebruik niveau als signalering, niet als fictieve rechtstreekse omzetting tussen
  mbo en ISCO. Een lage functiezwaarte bewijst evenmin dat de opleiding daar primair
  voor opleidt. Formele toegang blijft onbekend zonder bronbewijs.
- Gebruik de cross-encoder als tweede rangschikking binnen inhoudelijke controles.
  Sla de ruwe score en beperkte invloed op; een reranker mag een domeinconflict
  of onbewezen kwalificatie niet overrulen.
- Voeg alleen voor niet door ESCO gedekte ISCO-groepen een duidelijk gemarkeerde
  CNL-beroepsroute toe. Behoud de officiële CNL–ISCO-code en verzin geen ESCO-URI.
- Exporteer gecombineerde voorstellen apart; bestaande ESCO-bestanden blijven
  uitsluitend ESCO-relaties bevatten. Onzekere kandidaten blijven reviewbaar.
- Rapporteer precision, recall, F1 en Recall@10 over de expliciet beoordeelde
  regressieparen. Niet-beoordeelde kandidaten zijn geen negatieve voorbeelden.
  Maak duidelijk dat dit een ontwikkelcontrole is, geen volledige of onafhankelijke
  validatie. De onafhankelijke evaluatiematen blijven onbekend bij lege goldset.

## Implementatie en volledige uitvoering

De analyse hierboven is vóór de wijziging van matchingcode vastgelegd. De nieuwe
laag staat in `research/pipeline/imports/mbo_esco_quality.py`, met afzonderlijke
configuratie `research/pipeline/config/mbo_esco_quality.json`. De oude nulmeting
is behouden. Uitgevoerd: **438 opleidingen, 3.039 ESCO-beroepen plus 7 expliciet
CompetentNL-beroepen voor ontbrekende ISCO-groepen, 60 kandidaten per opleiding**.
Dezelfde lokale MiniLM-embedding en dezelfde vastgelegde cross-encoderrevisie
zijn gebruikt als in de nulmeting; er is geen nieuw model als bewezen beter
gepresenteerd.

### Wat is veranderd

- Kandidaatpool van 25 naar 60: afzonderlijke plaatsen voor semantische beschrijving,
  lexicale volledige tekst, inhoudelijke beroepsnamen en kennisgebiedretrieval.
  Algemene rolwoorden zoals supervisor, technicus, medewerker en mbo dragen niet
  bij aan de lexicale naamzoekvraag. ‘Keuken’ wordt niet blind verwijderd: het
  verschil tussen montage en voedselbereiding wordt inhoudelijk gecontroleerd.
- Naamgewicht 12%, beschrijving 23%, werkpassages 25%, vaardigheden 25%, kennis 15%.
  Alleen beschikbare velden tellen mee. Werkpassages zijn **beschrijvingsproxy’s**,
  geen nieuwe officiële opleidingstaakrelaties. De beschrijvings- en werkcomponent
  zijn gecorreleerd en vormen samen tekstbewijs, geen twee onafhankelijke bronnen.
- De aanwezige opleidingskenmerken omvatten 126 unieke vaardigheden en 261 unieke
  kennisgebieden. Geen daarvan heeft in deze export een ingevulde definitie.
  Daarom worden hun labels met ESCO-labels vergeleken, in plaats van korte CNL-labels
  met lange ESCO-definities. Directe identifiers en de beperkte bronmapping blijven
  apart herkenbaar. Beide dekkingsrichtingen en niet-aangetoonde essentiële
  competenties blijven beschikbaar.
- CNL-beroepstaken worden daadwerkelijk gebruikt bij de zeven CNL-kandidaten.
  Voor ESCO is werkbewijs uit de beroepsbeschrijving afgeleid. De overige CNL-taken
  worden niet als opleidingstaken gepresenteerd zonder een opleidingstaakrelatie.
- Transparante regels signaleren mogelijke domeinconflicten, een ondersteunende
  deeltaak in plaats van het hoofdberoep, een andere verantwoordelijkheid en
  ontbrekend kwalificatiebewijs. Voorbeelden zijn keukenmontage versus afwassen,
  logistiek versus takelwerk en klinische dierzorg versus receptie. De regels
  gebruiken tekstpassages en configureerbare activiteiten, geen blacklist van
  de genoemde opleidings- of ISCO-codes. De regels dekken niet elk beroepsdomein.
- Een ontbrekend trefwoord geldt niet als ontbrekende vaardigheid. Werkbewijs
  krijgt bij afwezigheid van een herkenbare activiteit geen automatische nul.
  Wel expliciete tegenstrijdige activiteiten leiden tot een onzekere classificatie.
- Mbo-niveau en ISCO-vaardigheidsniveau blijven broncontext; er is geen rechtstreekse
  schaalconversie meer die bijvoorbeeld alle ISCO-niveau-4-rollen blokkeert.
  Genoemde bachelor-/masterkwalificaties, onafhankelijke medische rollen,
  specialisaties of leidinggevende verantwoordelijkheden zonder opleidingsbewijs
  krijgen expliciete reviewvlaggen. Dit is geen juridisch oordeel over toegang.
- De cross-encoder beoordeelt de kandidaten in een tweede fase. Zijn ruwe logit en
  rangsignaal blijven opgeslagen. Een begrensde correctie van maximaal ±0,04
  voorkomt dat een verzadigde sigmoid als kans of als zelfstandig bewijs fungeert.
  De bronparen gebruiken maximaal 110 woorden per kant; de volledige bronpassages
  blijven in het bewijs. Er kan ook tokenafkapping optreden bij de modellimiet.
  Domeinconflicten en kwalificatievlaggen worden nooit door de reranker opgeheven.
- Voorstelgrens 0,56 en onzekerheidsgrens 0,38 zijn experimenteel. Een sterk
  ondersteunde werkroute kan vanaf 0,46 een voorstel opleveren, alleen bij volledige
  herkenbare activiteitendekking, beschrijvingssimilarity ≥0,72 en werkbewijs ≥0,78,
  zonder conflict of kwalificatievlag. Deze ontwikkelregels zijn niet gekalibreerd.
- Onderbouwde voorstellen worden eerst gerangschikt, vervolgens onbeoordeelde en
  onzekere kandidaten; conflicten blijven zichtbaar onderaan. Het aantal voorstellen
  is variabel en een opleiding mag zonder voldoende bewijs nul voorstellen hebben.

### De gemelde gevallen

| Opleiding | Resultaat |
|---|---|
| Logistiek supervisor | 7215 niet geselecteerd; o.a. logistiek/distributie onder 1324 voorgesteld |
| Allround keukenmonteur | 9412 niet geselecteerd; keukenmonteur onder 7115 voorgesteld |
| Dierenartsassistent paraveterinair | 4226 niet geselecteerd; veterinair technicus onder 3240 voorgesteld |
| Middenkaderfunctionaris GWW | 9312 niet geselecteerd; technicus civiele bouwkunde onder 3112 voorgesteld |
| Mbo-Verpleegkundige | 3221 voorgesteld via de officiële CNL-beroepsrelatie; geen ESCO-code omgeschreven |

Dit zijn niet noodzakelijk de enige voorgestelde beroepen. Alle opleiding–beroep-
relaties blijven voorspeld en vereisen menselijke controle. De officiële ESCO- of
CNL–ISCO-relatie maakt de voorspelde opleidingsrelatie niet officieel.

### Vergelijking: ontwikkelcontroles, geen onafhankelijke nauwkeurigheid

De regressieset `data/mappings/mbo_esco_regressie.json` bevat tien opleidingen,
elf expliciete positieve opleiding–ISCO-paren en expliciete negatieve paren.
De gevallen en regels zijn gebruikt bij ontwikkeling. Positieve lijsten zijn
niet volledig; niet-beoordeelde voorspellingen zijn niet als negatief geteld.
De onderstaande precision is dus **uitsluitend precision op beoordeelde paren**.
Deze cijfers mogen niet als algemene modelnauwkeurigheid worden gebruikt.

| Aanpak | Precision op beoordeelde paren | Recall positieve controleparen | F1 | Recall@10 eindrangschikking |
|---|---:|---:|---:|---:|
| Bestaand | 25.0% | 18.2% | 21.1% | 85.0% |
| Nieuw vóór reranking | 100.0% | 54.5% | 70.6% | 95.0% |
| Nieuw na reranking | 100.0% | 90.9% | 95.2% | 95.0% |
| Nieuw, alleen ESCO | 100.0% | 81.8% | 90.0% | 85.0% |

Recall@10 neemt eerst de tien beroepskandidaten en kijkt dan naar hun ISCO-codes;
er wordt niet vóór het afkappen gededupliceerd. De JSON rapporteert daarnaast
ruwe retrieval-Recall@10 en de dekking van de gehele kandidatenpool. Precision,
recall en F1 zijn micro over de expliciete paren; Recall@10 is macro per opleiding.

De nulmeting heeft 2 bekende positieve treffers, 6 bekende foutpositieve treffers
en 9 ontbrekende positieve controleparen. De nieuwe aanpak heeft 10 positieve
treffers, nul bekende foutpositieve treffers en één ontbrekend positief controlepaar.
Daarnaast zijn er **12 geselecteerde, onbeoordeelde paren** binnen deze tien
opleidingen. Die zijn niet bewezen juist en kunnen nog fouten bevatten.

Het overblijvende positieve controlepaar is GWW → 4322. De huidige kandidatenpool
bevat daarvoor geen passende specifieke ESCO-kandidaat; de bredere civieltechnische
route 3112 is wel aanwezig. De CNL-aanvulling dekt nu alleen ISCO-groepen zonder
ESCO-beroepen, niet iedere ontbrekende specifieke functie binnen een al gedekte
groep. Dit blijft een inhoudelijk review- en uitbreidingspunt.

De winst bij 3221 is mede een catalogusuitbreiding. Daarom staat ook een vergelijking
zonder CNL-kandidaten in de tabel. De beperkte cross-encodercorrectie verbetert de
selectie op deze ontwikkelgevallen, maar bewijst geen algemene verbetering.
Een onafhankelijke menselijke testset ontbreekt; onafhankelijke precision, recall,
F1 en Recall@10 blijven daarom onbekend in de rapportage.

### Uitvoer en reproduceerbaarheid

- `data/processed/mbo_beroep_matches.csv`: actuele voorstellen, met bron beroep en bronidentifier.
- `data/processed/mbo_beroep_kandidaten.csv`: alle 26.280 kandidaten, inclusief onzekere en niet-geselecteerde kandidaten.
- `data/processed/mbo_isco_matches.csv`: samengevoegde ISCO-voorstellen uit beide bronroutes, zonder score-optelling.
- `data/processed/mbo_esco_quality.json.gz`: volledige nieuwe scores, bronpassages, deelcomponenten, conflicten en herkomst.
- `data/processed/controles/mbo_esco_kwaliteit_vergelijking.json`: vergelijking, ablaties en uitslagen per controleopleiding.

De bestaande ESCO-only-CSV’s blijven uitsluitend ESCO-identifiers bevatten. De
bewaarde oude `mbo_esco_matches.json.gz` is de oorspronkelijke modeluitvoer;
de actuele kwaliteitsuitvoer staat apart als `mbo_esco_quality.json.gz`.
De bestaande `--export-only` kiest de actuele kwaliteitsuitvoer zodra die aanwezig is.
De website, DUO-selecties en studentenaantallen zijn niet herbouwd als nieuwe
applicatie en worden niet toegewezen aan deze voorspelde beroepen.

Volledige run in de bestaande optionele ML-omgeving:

```sh
/tmp/isco-ml-venv/bin/python -m research.pipeline.imports.mbo_esco_quality
```

Alleen de ontwikkelgevallen testen zonder de primaire exports te overschrijven:

```sh
/tmp/isco-ml-venv/bin/python -m research.pipeline.imports.mbo_esco_quality --cases-only
```

De lokale modelbestanden en revisies worden uit `/tmp/isco-ml-models/revisions.json`
gelezen, zoals in de eerdere proef. Geen externe LLM wordt aangeroepen. De normale
websitebuild heeft deze modellen niet nodig. De modelbestanden moeten voor een
andere machine of na opruimen van `/tmp` opnieuw lokaal worden klaargezet.

Validatie: 83 Python-tests, 33 websitetests, TypeScript/productiebuild en Pages-
controle geslaagd. Daarnaast is de volledige uitvoer gecontroleerd op viercijferige
bronrelaties, 438 unieke opleidingen, 60 kandidaten per opleiding, afwezigheid van
de vier gemelde foutieve groepen in de selectie, aanwezigheid van 3221 via CNL,
bronzuivere ESCO-bestanden en unieke ISCO-regels per opleiding.
