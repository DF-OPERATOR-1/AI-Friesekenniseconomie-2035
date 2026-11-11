# Mbo: totaal over leerwegen en weergave Extraneus

## Controle van de oorspronkelijke bestanden

Het gebruikte studentenbestand is
`data/raw/onderwijs/03.-studenten-per-instelling-plaats-sectorkamer-type-mbo-opleiding-niveau-geslacht-2021-2025.csv`.
De meetkolommen zijn uitsluitend `MAN2021`, `VROUW2021` tot en met
`MAN2025`, `VROUW2025`, uitgesplitst per instelling, opleidingscode, leerweg en
niveau. Er is geen aparte totaalkolom per opleiding of leerweg waarmee
onderdrukte geslachtsaantallen exact kunnen worden teruggevonden.

Het afgestudeerdenbestand heeft dezelfde soort indeling met `DIPMAN` en `DIPVROUW`.
Ook daarin staat geen afzonderlijk, onafgeschermd totaal voor dezelfde groep.
Andere DUO-bestanden geven wel bredere instellingstotalen, maar die zijn niet
zonder meer op een specifieke opleiding toe te passen.

## Bevestigde telwijze

[DUO, Mbo-studenten per instelling](https://duo.nl/open_onderwijsdata/middelbaar-beroepsonderwijs/aantal-studenten/aantal-studenten-mbo-per-instelling.jsp)
beschrijft de selectie als hoofdinschrijvingen, met per student één telling per
instelling op de peildatum. De onderscheiden categorieën omvatten bol, bbl en
examendeelname. Hierdoor mogen de bronrijen binnen één instelling en opleidingscode
worden opgeteld over leerwegen, mits iedere uitsplitsing uniek en compleet is.
De eerdere algemene blokkade op optellen tussen mbo-leerwegen was te streng.

[DUO, Gediplomeerde mbo-studenten](https://duo.nl/open_onderwijsdata/middelbaar-beroepsonderwijs/aantal-studenten/aantal-gediplomeerden-mbo.jsp)
beschrijft een hoofddiplomatelling per student per instelling. Dezelfde aanpak
wordt toegepast in de gedeelde grafiek voor afgestudeerden.

Bij meerdere instellingen is een totaalcijfer de som van deze institutionele
tellingen. Het is niet gegarandeerd een aantal unieke personen over alle
instellingen heen. Deze beperking staat direct bij de kerncijfers en grafieken.
De bestaande beperking dat de aantallen ook niet-Friese locaties kunnen omvatten,
blijft eveneens gelden. Voor hbo/wo wordt niet op basis van deze mbo-definitie
automatisch tussen instellingen of opleidingsvormen opgeteld.

## Rekenregels

Per geselecteerde mbo-opleidingscode en jaar:

1. Controleer unieke instelling × leerweg × niveau × geslacht-combinaties.
2. Vereis complete geslachtscategorieën binnen **iedere** deelgroep, niet alleen
   ergens in het jaar. Ontbrekende cellen of categorieën worden geen nul en ook
   geen veronderstelde `<5`.
3. Ondergrens = som van alle bekende aantallen over alle behouden deelgroepen.
4. Bovengrens = ondergrens + 4 voor iedere afgeschermde cel `<5`, volgens de
   gebruikersinstructie dat de mogelijke waarde 0 t/m 4 is.
5. Zonder afgeschermde cellen is het totaal exact; anders blijft de exacte
   `value` onbekend en worden alleen `lower` en `upper` getoond.

Dubbele bronrijen, onvolledige dimensies en niet-veilig optelbare getallen leveren
geen verzonnen totaal of bandbreedte op. De grafiekkeuze voor een deelgroep blijft
beschikbaar, zodat een exact leerwegtotaal naast een bandbreedte voor de gehele
gekozen opleidingscode kan worden bekeken. Onder één kaart kunnen meerdere
opleidingscodes staan; de cijfers blijven bij de gekozen code, overeenkomstig de
bestaande detailweergave. Er wordt niet stilzwijgend over die codes opgeteld.

## Gecontroleerd voorbeeld

(Junior) accountmanager, Firda, code 25132, DUO 2021:

| Categorie | Mannen | Vrouwen | Totaal |
| --- | ---: | ---: | ---: |
| BBL | 30 | <5 | 30–34 |
| BOL (voltijd) | 132 | 20 | 152 |
| Extraneus | <5 | 0 | 0–4 |
| Alle drie | | | **182–190** |

Er is geen exact getal zoals 186 geschat. De oorspronkelijke aantallen en
broncode `EX` blijven in de CSV's bewaard.

## Weergave

`educationPathways.ts` beheert de gedeelde labels voor kaarten, detailpagina's,
tabellen en grafiekkeuzes. `EX` wordt **Extraneus**; de samenvatting luidt
bijvoorbeeld **BBL / BOL (voltijd) / Extraneus**. De formulering betreft de
bronregistratie: Extraneus is inschrijving voor het examen en geen gewone
onderwijsleerweg. De brontoelichting verduidelijkt dit zonder een extra categorie
buiten de gevraagde samenvattingsregel te maken.

De bestaande volle lijn voor exacte jaarcijfers, gearceerde band met grenzen,
verticale intervalmarkeringen, tooltip en legenda worden hergebruikt. De
kerncijferkaart toont exacte volledige totalen of, bij afscherming, een expliciet
gelabelde bandbreedte. De tijdelijke blokkade op bandbreedtes bij invoering van
het jaarfilter is hersteld. Een interval wordt nooit als exact getal voorgesteld.
De grafiek en tooltip behouden eveneens de berekende bandbreedte. Er zijn geen nieuwe afhankelijkheden of bronmutaties.

## Validatie

Tests bewaken onder meer volledige mannen/vrouwenparen per deelgroep, optellen
over drie mbo-categorieën, twee afgeschermde cellen, het echte voorbeeld 182–190,
exacte totalen bij volledig bekende waarden en behoud van de HO-overlapcontrole.
Controle: `npm test` en `npm run build` in `website/`. Visuele browsercontrole is
niet uitgevoerd.

Controle op alle 1.800 in de gefilterde mbo-studentenbron aanwezige
opleiding–jaarcombinaties: 430 exacte totalen en 1.370 bandbreedtes; geen
aanwezige combinatie valt nog weg door de oude leerwegblokkade. De keuze voor
een deelgroep is gecontroleerd op BOL (voltijd), exact 152, en Extraneus, 0–4,
in het voorbeeld van 2021. Alle 65 websitetests en de productiebuild slagen.

## Bevestigde oude en vernieuwde codes samen (9 november 2026)

De expliciete broncontrole in `data/mappings/mbo_codefamilies.json` koppelt
93802, 25132 en 25877 aan Junior accountmanager (b0896). De ongewijzigde DUO-
registratie 2026–2027 staat in `data/raw/crebo/`; het mappingbestand bevat
bestandsnaam, SHA-256, controledatum en bronlinks. KiesMBO bevestigt de
vernieuwing 25132 naar 25877 per augustus 2023. DUO bevestigt de oudere 93802.
De pipeline publiceert deze beperkte lijst als `code_families` in opleidingen.json.
Gelijke namen alleen leiden nooit tot het optellen van codes.

De detailpagina telt de bronrijen van deze bevestigde codes bij elkaar. Code
blijft onderdeel van de unieke rij-identificatie, naast instelling, leerweg,
niveau en geslacht. De bestaande hoofdinschrijvings-/hoofddiplomatelwijze per
instelling en privacybandbreedtes blijven gelden. Meerdere instellingen blijven
op kerncijferniveau geblokkeerd als uniek personentotaal. De bestaande selectie
van Fries opleidingsaanbod blijft op de canonieke bron-CSV toegepast.

De hoofdweergave vermeldt de meegetelde codes zonder dubbele registratieblokken.
Oud/nieuw, uiterste instroom en bronlinks staan in het ingeklapte bronnenonderdeel.
Beroepskoppelingen blijven bij de geopende oorspronkelijke code; de uitbreiding
kopieert geen beroepsvoorspellingen naar een ander curriculum.

Een actieve code zonder bronrij in een jaar is onbekend, nooit nul. Voor het
gezamenlijke totaal wordt conservatief gecontroleerd of iedere code die volgens
de registratie op 1 oktober actief is daadwerkelijk bronrijen heeft. Ontbreekt
een code, dan volgt geen volledig totaal of eindige bandbreedte. Code-specifieke
deelreeksen en oorspronkelijke tabelwaarden blijven beschikbaar. Dit is een
beschikbaarheidscontrole, geen reconstructie van diploma-aantallen op 1 oktober.
Voor 25877 ontbreken afgestudeerdenrijen: vanaf 2023 wordt daardoor geen volledig
gezamenlijk afgestudeerdentotaal geclaimd.

Studentenbandbreedtes voor de drie codes: 2021 182–198; 2022 182–186;
2023 143–147; 2024 134–150; 2025 145–153. De tabel vermeldt de oorspronkelijke
code bij iedere mbo-rij. Regressietests controleren deze werkelijk beschikbare
bronwaarden, de ontbrekende afgestudeerden en het verbod op impliciet samenvoegen.

## Uitbreiding naar alle gegroepeerde mbo-opleidingen (9 november 2026)

Op verzoek geldt de gezamenlijke cijferweergave nu ook voor meerdere codes die
het bestaande overzicht onder dezelfde opleidingsnaam én hetzelfde mbo-niveau
groepeert. Dit vervangt voor de presentatie de eerdere beperking tot uitsluitend
expliciet geverifieerde codefamilies. De handmatig brongecontroleerde mapping blijft
wel apart behouden: alleen deze bevat een bevestigde oud/nieuw-relatie.

De helper `courseCountGroup` hergebruikt de overzichtsgroepen voor alle beschikbare
jaren en de expliciete codefamilies. Verbonden groepen vormen één consistente set,
onafhankelijk van de geopende code of het gekozen cijferjaar. Daardoor blijven
historische codes en naamswijzigingen die via een gedeelde code verbonden zijn in
dezelfde trend beschikbaar. Andere niveaus en onderwijssoorten blijven gescheiden;
hbo/wo behouden de bestaande presentatie per opleidingscode. De hoofdweergave
noemt alleen de meegetelde codes. De bronnen leggen uit dat de groepering geen
bewijs is dat de codes officieel voorgangers/opvolgers zijn. De oorspronkelijke
DUO-rijen, code-specifieke beroepskoppelingen en bestanden veranderen niet.

Zonder officiële looptijd gebruikt de volledigheidscontrole het eerste t/m laatste
jaar waarin een code in de ingelezen opleidingsgegevens voorkomt. Dit is uitsluitend
waargenomen brondekking, geen verzonnen geldigheidsdatum. Binnen die periode wordt
een ontbrekende code in studenten- of diplomabron niet als nul meegerekend: er is
dan geen volledig totaal. Buiten de waargenomen periode wordt geen ontbrekend
aantal gereconstrueerd. Officiële datums uit de gecontroleerde codefamilie krijgen
voorrang. De instellings- en privacycontroles blijven behouden. De tabel blijft de
oorspronkelijke code en afgeschermde waarde per rij tonen.

Tests controleren meerdere codes met overlappende dimensies, intervaloptelling,
ontbrekende bronrijen, verschillende niveaus, hbo-afzondering en consistente
historische groepen vanuit iedere code.

## Eenvoudige grafiekbediening (10 november 2026)

`simpleTrendOptions` scheidt de grafiekbediening van de gedetailleerde bronreeksen.
Een betrouwbare opleidingstrend wordt standaard zonder keuzelijst getoond. Dit
vereist een exact totaal of correct berekende bandbreedte in elk jaar waarin de
opleiding bronrijen heeft, met hoogstens één instelling per jaar. Bij ontbrekende
jaren, broncode-dekking of mogelijke overlap wordt ‘Hele opleiding’ niet aangeboden.
De grafiek geeft dan een melding en biedt alleen deelgroepen die minimaal één
onderbouwd jaarpunt hebben: instelling en leerweg, of bij hoger onderwijs de
bestaande gescheiden instelling/plaats/opleidingsvorm/diplomacategorie. Incomplete
jaren blijven onderbroken; er wordt niets geschat. Zijn er geen betrouwbare
deelgroepen, dan verwijst de melding naar de uitgebreide cijfers.

Deelgroepen combineren de onderliggende opleidingscodes en geslachten, met dezelfde
volledigheids-, overlap- en privacycontroles. Er staan geen opleidingscodes of
losse geslachtscategorieën in de bediening. De twee grafieken houden afzonderlijke
selecties omdat studenten- en diplomabron verschillende beschikbare jaren en
bronuitsplitsingen kunnen bevatten. Een bestaand totaal naast afzonderlijke
mannen/vrouwenrijen wordt niet opgeteld: de reeksen worden als mogelijke overlap
geblokkeerd. De oorspronkelijke tabeluitsplitsingen, centrale jaarselectie en
kerncijferberekeningen blijven behouden. Het geselecteerde jaar filtert de
trendreeksen niet; deze behouden alle beschikbare jaren en lege jaarpunten.

### Totalen per beschikbaar jaar, ook voor afgestudeerden

De aanvankelijke grafiekkeuze vereiste ten onrechte een betrouwbaar totaal in
ieder waargenomen jaar voordat ‘Hele opleiding’ beschikbaar kwam. Dit is aangepast:
zodra minstens één jaar een onderbouwd totaal of interval heeft, toont de grafiek
de opleidingstotalen voor die jaren. Onvolledige of ontbrekende jaren blijven
onderbroken en krijgen geen verzonnen waarde. Dezelfde regel geldt voor studenten
en afgestudeerden. `educationChartTrend` bewaakt per jaar ook de bestaande beperking
op een uniek personentotaal over meerdere instellingen; een betrouwbaar ander jaar
heft deze beperking niet op. De broncode-dekking, privacyregels en kerncijfers
veranderen niet. Regressietests omvatten exacte diplomatotalen, afgeschermde waarden,
ontbrekende geslachtscategorieën en een later jaar met instellingsoverlap.

## Consistente kaarten en trends, inclusief hoger onderwijs (10 november 2026)

Bij Integrale Veiligheidskunde (39268) blokkeerde de oorspronkelijke HO-controle
iedere combinatie van voltijd en deeltijd als mogelijke overlap. Dit was te streng
voor de gebruikte studenten- en diplomabestanden: zij tellen hoofdinschrijvingen
en hoofddiploma’s. De uitsplitsingen van één opleiding binnen één diplomatype
mogen worden samengenomen. Verschillende diplomatypes worden nog steeds niet
opgeteld. De controle op meerdere instellingen blijft behouden.

Bronnen en controle op de telwijze:
- DUO, Studenten hbo: https://www.duo.nl/open_onderwijsdata/hoger-onderwijs/aantal-studenten/studenten-hbo.jsp
- DUO, Studenten wo: https://duo.nl/open_onderwijsdata/hoger-onderwijs/aantal-studenten/studenten-wo.jsp
- DUO, Afgestudeerden hbo: https://duo.nl/open_onderwijsdata/hoger-onderwijs/aantal-studenten/afgestudeerden-hbo.jsp
- DUO, Afgestudeerden wo: https://duo.nl/open_onderwijsdata/hoger-onderwijs/aantal-studenten/afgestudeerden-wo.jsp

Kaarten gebruiken nu exact dezelfde `educationChartTrend`-functie als de grafiek,
inclusief dezelfde voorwaarden voor ontbrekende categorieën, codeperioden,
instellingsoverlap, duplicaten en privacy-intervallen. De tabellen behouden alle
bronrijen en zijn geen bewijs dat een totaal volledig is. Een beschikbare
uitsplitsing kan immers naast een ontbrekende categorie staan.

De categorie ‘geslacht onbekend’ wordt alleen vereist als die binnen dezelfde
bronuitsplitsing van de geselecteerde opleiding voorkomt (over de beschikbare
jaren). Een onbekende categorie bij een andere opleiding of andere deelgroep
maakt een compleet mannen/vrouwentotaal niet onterecht onvolledig. Man en vrouw
blijven altijd vereist; ontbrekende rijen worden niet als nul behandeld.

Regressie op echte brongegevens voor 39268: studenten 2024 = 591, studenten
2025 = 575, afgestudeerden 2024 = 114–122 (twee afgeschermde waarden). Zowel kaarten
als grafieken controleren deze getallen. Voor 2025 ontbreken diplomagegevens in
het gebruikte bestand: er verschijnt nu een expliciete beschikbaarheidsmelding,
zonder stilzwijgend terug te vallen op 2024. Dezelfde functie geldt voor alle
mbo-, hbo- en wo-opleidingen; controles betreffen ook gescheiden diplomatypes en
‘onbekend’ bij een andere opleiding.
