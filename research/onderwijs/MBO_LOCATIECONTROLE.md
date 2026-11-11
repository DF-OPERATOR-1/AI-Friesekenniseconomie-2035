# Mbo: handmatige locatiecontrole

**Vervolg uitgevoerd:** de [Friese aanbodselectie](MBO_FRIESE_AANBODSELECTIE.md)
is inmiddels via exacte SBB-kwalificaties aangesloten op de website. De
onderstaande locatiecontrole blijft de oorspronkelijke inventarisatie en
verkennende vergelijking; broncijfers worden niet regionaal herverdeeld.

De [inventarisatie en bronvermelding](../../data/mappings/mbo_locaties/README.md)
bewaren de aangeleverde gegevens zonder ontbrekende opleidingen of codes in te
vullen. Dit is een aanvullende onderzoeksbron; geen vervanging van DUO.

## Reproduceren

Vanuit de repository, met Python en alleen de standaardbibliotheek:

```sh
python -m research.onderwijs.locatiecontrole \
  --input data/raw/onderwijs/handmatige_locatiecontrole/inventarisatie_2026-11-09.txt \
  --vastgelegd-op 2026-11-09
python -m unittest discover -s tests
```

Benodigd: de oorspronkelijke tekst, bestaande DUO-studentenexport,
`data/raw/onderwijs/sources.json` en de DUO-locatiebestanden 2021–2025.
De bestaande `data/processed/mbo_opleidingen.json.gz` levert, indien aanwezig,
aanvullende SBB-namen voor naamvergelijking. De bronbestanden blijven ongewijzigd.

## Werkwijze en afgeleide bestanden

1. Lees instellingen, plaatskoppen, hoofdbullets en ingesprongen vermeldingen.
   Bewaar bronregelnummers, spelling en URL's, ook als de URL na de lijst staat.
2. Schrijf de CSV's onder `data/mappings/mbo_locaties/`. Ingesprongen namen
   zijn uitsluitend onderliggende vermeldingen, geen bewezen aliassen of CREBO's.
3. Vergelijk alleen hoofdnamen met de bestaande 2025 DUO-opleidingsnamen en
   SBB-beroepsnamen 2025–2026, binnen dezelfde instellingscode. Normaliseer
   hoofdletters, diakritische tekens, interpunctie en witruimte; gebruik geen
   fuzzy match. Dit levert voor 66 van de 84 namen één of meer codevoorstellen.
   Een naamovereenkomst bevestigt geen codegeldigheid, campus of historisch aanbod.
4. Lees DUO-locatiebestanden met de verschillende jaarschema's. Bewaar codes,
   oorspronkelijke instellingsnamen, afgeschermde aantallen en bronlinks.
   Herhaalde locatiecodes worden gemarkeerd en niet stilzwijgend ontdubbeld.

Uitvoer onder `data/processed/onderwijs/locatiecontrole/`:

- `naamkoppeling_voorstellen_2025.csv`: één regel per unieke handmatige hoofdnaam
  per instelling en plaats; mogelijke codes zijn **controlevoorstellen**.
- `duo_locaties_2021_2025.csv`: 375 bronregels voor de vier instellingen,
  inclusief locaties buiten Fryslân en de aanduiding of de plaats in de lijst staat.
- `duo_regio_sommen_2021_2025.csv`: som van numerieke hoofdinschrijvingen op
  bronlocaties met DUO-arbeidsmarktregio Friesland, plus aantallen afgeschermde,
  onbekende en herhaalde bronlocaties. Dit is geen provincie- of opleidingstelling.

De gebruikte bestanden 2021–2023 hebben geen arbeidsmarktregio. Daarom blijven
de regionale sommen voor die jaren leeg; ontbrekende regio wordt geen nul.
Er is geen historische geografie bij geschat. Bij herhaalde locatiecodes wordt
geen som gepubliceerd. `<5` blijft afgeschermd; het wordt niet vervangen door
een schatting. `Volledige_som_gepubliceerde_locaties` betekent alleen dat alle
gepubliceerde, als Friesland gelabelde bronregels numeriek optelbaar zijn.
Locaties met onbekend gebied vallen daarbuiten. De eenheid is hoofdinschrijvingen,
geen bewezen telling van unieke personen of afgestudeerden. Gebruik de sommen
dus niet als regionale totalen per opleiding en verdeel ze niet naar rato over CREBO's.

## Aanvullende broncontrole bij vastlegging

Deze bevindingen zijn signalen voor vervolgreview, geen aanvullingen op de lijst.
Webaanbod kan veranderen; een paginatelling bewijst geen historisch aanbod.

- [Nova Harlingen](https://www.kiesmbo.nl/scholen/roc-nova-college/nova-scheepvaart-harlingen)
  toont tien opleidingen tegenover zeven hoofdnamen in de inventarisatie.
  De drie extra zijn BBL: Kapitein binnenvaart, Matroos binnenvaart en Schipper
  binnenvaart. Mogelijk is de handmatige selectie bewust op BOL gericht; de
  bedoelde leerwegafbakening is niet opgegeven. Niet automatisch toegevoegd.
- [SVO Leeuwarden](https://www.kiesmbo.nl/scholen/svo-vakopleider-food/jansoniusstraat-2a-leeuwarden)
  toont twee opleidingen, overeenkomstig de inventarisatie.
- [Aeres Leeuwarden](https://www.kiesmbo.nl/scholen/aeres-mbo/aeres-mbo-leeuwarden)
  toont 32 opleidingen tegenover 31 aangeleverde hoofdnamen. De tellingen voor
  Heerenveen, Buitenpost, Sneek en Dronten komen overeen met respectievelijk
  8, 11, 8 en 17. De afzonderlijke pagina-URL's staan in het bronmanifest.
- Firda's opgegeven locatiepagina was tijdens deze controle niet uitleesbaar.
  Het officiële [Firda-jaardocument 2025, overige gegevens](https://jaardocumenten.firda.nl/geintegreerd-jaardocument-2025/overige-gegevens-2)
  vermeldt wel locaties in Emmeloord en Urk. Dit bevestigt geen verdeling van
  individuele opleidingen of aantallen.
- DUO 2025 bevat bij Aeres naast Dronten ook niet-Friese locaties in Almere,
  Barneveld, Ede, Emmeloord, Nijkerk en Velp. Bij Nova en SVO zijn eveneens
  meerdere niet-Friese locaties aanwezig. De handmatige lijst is daarom geen
  complete landelijke locatie-inventarisatie. De latere gebruikersbevestiging
  bepaalt wel de Friese aanbodselectie voor Nova, SVO en Aeres: alleen genoemde
  opleidingen op Friese locaties. Firda blijft uitgezonderd; Dronten valt erbuiten.

De directe DUO-downloadlinks staan per observatie in `Bron_URL` en komen uit
`data/raw/onderwijs/sources.json`. Bronchecksums staan in het nieuwe bronmanifest.

## Vervolg zonder schijnnauwkeurigheid

De gebruiker heeft de Friese aanbodselectie bevestigd. Bevestig voor toepassing
op DUO nog per bronregel de CREBO-code, leerweg en het geldige schooljaar.
Houd daarbij oude en nieuwe CREBO-codes gescheiden.
Een gevalideerde aanbodlijst kan daarna een beter regionaal aanbodsoverzicht
opleveren. Voor gedeeld aanbod blijft een aanvullende telling per campus nodig,
ook voor afgestudeerden. De huidige website blijft de bestaande beperkingen volgen.
