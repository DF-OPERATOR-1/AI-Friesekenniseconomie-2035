# Handmatige controle mbo-aanbod en locaties

Deze inventarisatie is op **9 november 2026 opgeslagen**, op basis van de door
de gebruiker aangeleverde controle van KiesMBO en Firda. De datum waarop de
gebruiker de websites controleerde en het geldige schooljaar zijn niet opgegeven.
`Vastgelegd_op` is dus geen bewijs van aanbod in 2025 of een ander onderwijsjaar.

## Bestanden en betekenis

- [opleidingsaanbod_handmatig.csv](opleidingsaanbod_handmatig.csv): instelling,
  plaats, opleidingsnaam, onderliggende vermelding, bronlink en bronregelnummers.
  Er zijn **84 unieke instelling–plaats–opleidingsnamen**, verdeeld over 102 rijen.
  Meerdere rijen voor dezelfde opleiding bewaren de ingesprongen vermeldingen uit
  de aangeleverde tekst. Dit zijn geen 102 zelfstandig bevestigde opleidingen.
- [locaties_handmatig.csv](locaties_handmatig.csv): tien locatievermeldingen;
  negen noemen een plaats, één beschrijft uitsluitend Firda in Fryslân.
- [instellingsnotities.csv](instellingsnotities.csv): onder andere de instructie
  om Firda-opleidingen te behouden vanwege aanbod binnen én buiten Fryslân.
- [bronnen.json](bronnen.json): bronlinks, vastleggingsdatum en SHA-256 van de
  oorspronkelijke tekst en de gebruikte DUO-locatiebestanden.

De CSV's gebruiken puntkomma's en UTF-8 met BOM, zodat ze in Excel te openen zijn.
De oorspronkelijke tekst staat lokaal, ongewijzigd, onder
`data/raw/onderwijs/handmatige_locatiecontrole/inventarisatie_2026-11-09.txt`.
De raw-map wordt niet automatisch meegecommit.

| Instelling | Plaats | Unieke opleidingsnamen |
| --- | --- | ---: |
| ROC Nova College | Harlingen | 7 |
| SVO | Leeuwarden | 2 |
| Aeres | Leeuwarden | 31 |
| Aeres | Heerenveen | 8 |
| Aeres | Buitenpost | 11 |
| Aeres | Sneek | 8 |
| Aeres | Dronten | 17 |

Voor Firda zijn geen individuele opleidingen aangeleverd; die zijn niet ingevuld.
Emmeloord, Urk en Dronten zijn als Flevoland vastgelegd.

De gebruiker heeft op 9 november 2026 nader bevestigd dat de genoemde opleidingen
op Friese locaties voor Nova College, SVO en Aeres de **gecontroleerde Friese
aanbodselectie** vormen. Overige opleidingen van die instellingen vallen buiten
deze selectie. Voor Firda geldt de uitzondering: alle bestaande opleidingen
behouden. De vermelding van Dronten is achtergrondinformatie over aanbod buiten
Fryslân, geen onderdeel van de Friese selectie. Een opleiding die zowel op een
genoemde Friese locatie als daarbuiten voorkomt, blijft in de Friese aanbodselectie.
Deze gebruikersbevestiging is geen officiële CREBO- of historische jaarvalidatie.

## Bronvermelding

Bron: **KiesMBO, opleidingsaanbod per schoollocatie**, handmatig geïnventariseerd
door de gebruiker en gestructureerd door DataFryslân. De specifieke pagina staat
bij iedere rij in `Bron_URL`. Firda-locaties: **Firda, Locaties**,
<https://www.firda.nl/locaties>. Vastgelegd op 9 november 2026; controledatum en
schooljaar van de handmatige waarneming onbekend.

Dit is geen officiële KiesMBO–CREBO-koppeltabel. Bronvermelding verleent op zichzelf
geen hergebruiklicentie; de toepasselijke bronlicenties zijn niet vastgesteld.
Oorspronkelijke spelling en ingesprongen vermeldingen zijn behouden. CREBO,
schooljaar en handmatige controledatum blijven leeg zolang die niet zijn bevestigd.
Instellingscodes komen uit de bestaande DUO-bestanden; een adres alleen is geen
betrouwbare sleutel (verschillende instellingen kunnen hetzelfde adres gebruiken).

## Wat levert dit op voor de aantallen?

Expliciete uitsluitingen staan in [uitsluitingen.csv](uitsluitingen.csv). Deze
hebben voorrang op gedeelde SBB-kwalificaties: bij Aeres zijn buitensportcodes
25844 en 26000 uitgesloten, omdat de opleiding niet in de bevestigde Friese lijst
staat en de bron Nijkerk noemt. Opzichter/uitvoerder groene ruimte blijft behouden.

**Update:** de bevestigde selectie wordt nu op de website toegepast, per instelling
en via exacte SBB-kwalificaties. Zie [friese_aanbodselectie.csv](friese_aanbodselectie.csv)
en de [uitwerking en beperkingen](../../../research/onderwijs/MBO_FRIESE_AANBODSELECTIE.md).
De oorspronkelijke handmatige CSV blijft zonder ingevulde CREBO-codes; de
gecontroleerde SBB-aansluiting staat afzonderlijk vastgelegd.

De lijst helpt om te beoordelen **welk aanbod op een Friese locatie voorkomt**.
De huidige DUO-bestanden met studenten en afgestudeerden bevatten echter geen
sleutel opleiding × daadwerkelijke onderwijslocatie. De plaats van de instelling
is geen campusverdeling. Een opleiding die binnen én buiten Fryslân voorkomt,
kan hiermee niet naar rato worden verdeeld. Alleen buiten Fryslân genoemde
opleidingen vallen volgens de gebruikersbevestiging buiten de Friese
aanbodselectie (met de Firda-uitzondering). De aansluiting is inmiddels via exacte
SBB-kwalificaties vastgesteld. Het geldige jaar van de campusinventarisatie is
onbekend: de toepassing op historische cijfers bewijst geen historisch campusaanbod.
De aantallen van behouden opleidingen die ook
buiten Fryslân worden gegeven, blijven instellingsbrede aantallen.

Voor exacte aantallen per opleiding zijn tellingen nodig per instelling × CREBO
× onderwijslocatie × jaar, met passende leerweg en teldefinitie, afzonderlijk voor
studenten en afgestudeerden. Deze inventarisatie bevat die tellingen niet.
De **oorspronkelijke tellingen en inhoudelijke beroepskoppelingen zijn niet gewijzigd**.
De websitefilters en getoonde instellingen volgen nu wel de bevestigde aanbodselectie.
De afgeleide mbo-CSV's zijn inmiddels eveneens gefilterd; zie de
[plaatsnamencontrole en telbeperkingen](../../../research/onderwijs/MBO_CSV_SELECTIE.md).

De afzonderlijke DUO-locatiebestanden geven wel hoofdinschrijvingen per locatie:
bruikbaar voor een regionaal beeld op locatie-/instellingsniveau, niet voor een
verdeling per opleiding of voor afgestudeerden. Zie de
[analyse, controles en herhaalbare verwerking](../../../research/onderwijs/MBO_LOCATIECONTROLE.md).
