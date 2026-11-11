# Gefilterde mbo-CSV's en verificatie van plaatsnamen

De bevestigde handmatige aanbodselectie wordt nu ook toegepast op de canonieke
CSV's, de bijbehorende website-downloads en de mbo-tabbladen van DUO_Friesland.xlsx.
De oorspronkelijke DUO-downloads onder `data/raw/onderwijs/` blijven intact.

| Uitvoerbestand | Voor aanbodfilter | Na aanbodfilter |
| --- | ---: | ---: |
| studenten_mbo_friesland.csv | 9.970 rijen | 6.556 rijen |
| afgestudeerden_mbo_friesland.csv | 14.460 rijen | 9.686 rijen |

Dit zijn gegevensrijen per onder andere opleiding, geslacht en jaar, **geen
studenten- of afgestudeerdentotalen**. Er worden geen aantallen geschat,
opgeteld of over locaties verdeeld. De bestaande verwijdering van volledig lege
studentgroepen blijft behouden; de afstudeerexport behoudt ook oorspronkelijke
nulrijen voor toegestane codes.

## Waarom staan er nog niet-Friese plaatsen in?

De kolom `Plaatsnaam instelling` is een instellingskenmerk in de oorspronkelijke
DUO-telling. Het is geen plaatsaanduiding van de specifieke opleiding of campus.
Na de filtering komen deze combinaties nog voor in beide CSV's:

| Instelling | Plaatsnaam instelling in DUO |
| --- | --- |
| Firda (08PG) | LEEUWARDEN |
| SVO (17WH) | HOUTEN |
| Aeres (25GV) | EDE |
| ROC Nova College (25PX) | HAARLEM |

**De controle dat alle plaatsnamen binnen Fryslân liggen, slaagt dus niet.**
Dat is geen reden om Houten, Ede en Haarlem uit deze kolom te verwijderen of door
Friese plaatsnamen te vervangen: dan zouden de bronkenmerken veranderen, of zou
het bevestigde Friese aanbod van deze instellingen verdwijnen.

De correcte controle is: iedere behouden opleiding–instelling–jaarcombinatie
voldoet aan de bevestigde aanbodselectie, met behoud van Firda. Die controle
slaagt voor beide CSV's. De daadwerkelijke Friese aanbodlocaties staan in de
[handmatige locatie-inventarisatie](../../data/mappings/mbo_locaties/README.md),
niet in de DUO-plaatskolom. Daaruit volgt nog geen verdeling van aantallen per campus.

## Reproduceerbare selectie

`friese_opleidingscodes_per_jaar.csv` onder `data/mappings/mbo_locaties/` verbindt
de bevestigde SBB-kwalificaties met opleidingscodes per schooljaar 2021–2025 via de
officiële jaargebonden koppeltabellen. Deze tabel geldt voor studenten én
gegradueerden. Bij SVO zijn alleen b0405 en b0876 toegestaan; in de afstudeerbron
kunnen ook oudere of nieuwe codes voor diezelfde kwalificaties met nulcijfers
voorkomen. Zulke rijen worden niet ten onrechte als een derde opleiding beschouwd.

De handmatige aanbodcontrole heeft geen opgegeven geldigheidsjaar. Dit blijft
een huidige aanbodselectie toegepast op historische cijfers, geen bewijs van
historische campussen. Een instellingsbrede telling voor een behouden opleiding
kan nog steeds studenten van niet-Friese locaties omvatten.

De vier oorspronkelijke instellingsselecties vóór deze aanbodfilter worden
reproduceerbaar bewaard onder `data/processed/onderwijs/instellingsselectie/`.
De vroegere brede mbo-opleidingssnapshot staat daar eveneens lokaal als backup;
de actieve snapshot is opnieuw opgebouwd uit de gefilterde studenten-CSV.
De bestaande CSV-kolommen en alle cellen van behouden rijen blijven gelijk aan
DUO. Het controlerapport bevat rijenaantallen, plaatsverdelingen en checksums:
`data/processed/onderwijs/locatiecontrole/mbo_exportselectie_controle.json`.

```sh
# Alleen nodig bij een wijziging van de vastgelegde aanbod-/SBB-bronnen:
python -m research.onderwijs.selectie_aanbod
# Beide mbo-CSV's regenereren vanuit DUO:
python research/onderwijs/onderwijs.py --mbo-only
# Controleren zonder exports te wijzigen:
python research/onderwijs/onderwijs.py --check
# Uitgebreide broncel- en selectiecontrole vastleggen:
python -m research.onderwijs.mbo_exportselectie
```

De volledige verwerking `python research/onderwijs/onderwijs.py` verwerkt eveneens
beide selecties en vernieuwt ook Excel. De verwerking bouwt de opleidingssnapshot
automatisch opnieuw op met de oorspronkelijke SBB-koppeltabellen. De gewone websitebuild
vernieuwt daarna de afgeleide downloads en JSON-bestanden. Tests vergelijken beide
CSV's met de oorspronkelijke DUO-cellen en bewaken dat Firda behouden blijft,
afgeschermde waarden intact blijven en administratieve plaatsen niet als
campusfilter worden gebruikt.

## Correctie buitensport bij Aeres

De opleidingscodes 25844 en 26000 (Allround coördinator-instructeur buitensport)
zijn bij Aeres uitgesloten. Ze waren ten onrechte overgenomen via kwalificatie
b0606, die in de koppeltabel ook bij Opzichter/uitvoerder groene ruimte staat.
Een gedeelde kwalificatie is geen bewijs dat verschillende opleidingen op
hetzelfde Friese adres worden aangeboden. De handmatige inventarisatie bevat
uitsluitend de groene-ruimteopleiding op een Friese locatie.

De [Staatscourant 2024, 24249](https://zoek.officielebekendmakingen.nl/stcrt-2024-24249.html)
vermeldt beide buitensportcodes bij Aeres MBO Nijkerk, Luxoolseweg. Deze bron is
bewijs van die locatievermelding in 2024/25, geen volledige actuele
campusinventarisatie. De door de gebruiker bevestigde Friese selectie bevat deze
opleiding niet. De codes en bron staan afzonderlijk in
`data/mappings/mbo_locaties/uitsluitingen.csv`. Die uitsluitingen hebben voorrang
op de via SBB afgeleide toelating. De website gebruikt dezelfde instellingscode ×
opleidingscode × jaarcontrole als de CSV-export. De echte groene-ruimteopleiding
blijft behouden. Er zijn zes studentenrijen en vier afgestudeerdenrijen uit de
vorige selectie verwijderd; dit zijn geen aantallen personen. Bronwaarden en
raw-bestanden zijn niet veranderd. Regressietests controleren beide uitgesloten
codes en het behoud van de groene-ruimteopleiding.
