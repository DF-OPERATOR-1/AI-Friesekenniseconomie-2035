# AI Index Fryslân

AI Index Fryslân laat zien hoe beroepen zich verhouden tot AI. De website combineert
AI-blootstelling en complementariteit met beroepsomschrijvingen, taken, vaardigheden en kennisgebieden.
Daarnaast onderzoeken we de regionale arbeidsmarkt en het onderwijs in Fryslân.

Er zijn **436 ISCO-08-beroepsgroepen**, waarvan **422 met AI-scores**. Ontbrekende
gegevens worden als ontbrekend getoond, nooit als nul.

## Website lokaal bekijken

Gebruik Node.js 22, npm en Python 3.12 of nieuwer. Voer vanuit de hoofdmap uit:

```bash
npm --prefix website ci
npm --prefix website run dev
```

Open de URL die Vite toont, met het pad `/AI-Friesekenniseconomie-2035/`.
Tijdens `dev` worden wijzigingen in de websitecode, teksten, stijlen en openbare
vormgevingsbestanden automatisch op de achtergrond naar `docs/` gebouwd. Wacht op
`[docs] Bijgewerkt` voordat je commit en pusht. Snelle wijzigingen worden gebundeld;
een ongeldige tussenversie overschrijft de laatste geslaagde publicatie niet.

De benodigde websitegegevens worden automatisch opgebouwd. Lokale ruwe
bronbestanden zijn hiervoor niet nodig.

## Bouwen en klaarzetten voor publicatie

```bash
npm --prefix website run build
```

De build controleert de code en de toegestane websitebestanden en werkt daarna
automatisch de publicatiemap `docs/` bij. Verouderde data en assets worden
verwijderd. Dit commando publiceert niets online. Commit en push ook de wijzigingen
onder `docs/`, zodat de branchpublicatie dezelfde CSS, JavaScript en gegevens gebruikt
als de actuele lokale build.

Voor GitHub Pages blijft de bestaande instelling met de gewenste branch en
`/docs` als publicatiemap gelden. Er is ook een handmatig te starten
[deploymentworkflow](.github/workflows/deploy-pages.yml).

## Welke bestanden zijn nodig?

| Map                            | Functie                                                        |
| ------------------------------ | -------------------------------------------------------------- |
| `website/src/`                 | Pagina’s, componenten, iconen en vormgeving.                   |
| `data/processed/`              | Verwerkte gegevens waarmee de website wordt gebouwd.           |
| `data/mappings/`               | De gebruikte beroepskoppelingen.                               |
| `data/published/`              | Register dat bepaalt welke gegevens mogen worden gepubliceerd. |
| `docs/assets/` en `docs/data/` | Bestanden die de gepubliceerde website daadwerkelijk gebruikt. |
| `research/` en `tests/`        | Dataverwerking, onderzoekscode en controles.                   |

**De JSON-bestanden onder `docs/data/` zijn nodig.** De website laadt hieruit de
beroepsprofielen, taken, vaardigheden, kennisgebieden, grafieken en broninformatie. De
`.json.gz`-bestanden onder `data/processed/` zijn gecomprimeerde invoer voor de build.

`website/public/data/` is een automatisch gegenereerde werkkopie en staat buiten
Git. Ook ruwe bronnen, lokale onderzoeksdossiers, caches en projectplannen staan
in `.gitignore`. Ze blijven lokaal bewaard.

Zie [publicatie en build-input](data/published/README.md) voor de volledige indeling.

## Beschikbare gegevens

- **AI-scores:** bestaande exposure-scores en zelf berekende complementariteit
  volgens de methode van Pizzinelli et al. De website verandert deze scores niet.
- **Beroepsinhoud:** CompetentNL-omschrijvingen, taken, vaardigheden en kennisgebieden per
  geselecteerd beroep. Kennisgebieden volgen later.
- **Onderwijs:** zes DUO-bestanden over studenten en afgestudeerden in mbo, hbo en
  wo. Deze zijn nog niet gekoppeld aan beroepsgroepen.
- **Regionale arbeidsmarkt:** UWV-brongegevens zijn lokaal beschikbaar. De
  vacaturecijfers zijn nog niet gekoppeld aan ISCO-08. Microdata voor werkenden,
  leeftijdsopbouw en uitstroom wordt later toegevoegd.

De AI-scores beschrijven beroepskenmerken en zijn geen meting van AI-gebruik in
Fryslân. De website bevat geen gevalideerde voorspellingen van personeelstekorten
per beroep. Bronvermeldingen en toelichting staan op de website bij
**Methodologie** en **Bronnen & open data**.

## Controles uitvoeren

Bouw eerst de website, zodat de gegenereerde gegevens beschikbaar zijn. Voer daarna uit:

```bash
python3 website/scripts/check_repository.py
python3 -m unittest discover -s tests
npm --prefix website test
npm --prefix website run format:check
```

## Lokale bronnen opnieuw verwerken

Alleen voor het verversen van de aangeleverde bronbestanden zijn de lokale data en
extra Python-packages nodig:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
npm --prefix website run data:refresh
npm --prefix website run build
python3 website/scripts/publish_pages.py
```

Op Windows activeer je de omgeving met `.venv\Scripts\activate`.
`data:refresh` importeert de lokale CompetentNL-, CBS- en UWV-bronnen opnieuw.
Voor de afzonderlijke AI- en onderwijsanalyses: zie de [onderzoeksmodules](research/README.md).

## Meer informatie

- [Website ontwikkelen](website/README.md)
- [Data-indeling](data/README.md)
- [Publicatie en build-input](data/published/README.md)
