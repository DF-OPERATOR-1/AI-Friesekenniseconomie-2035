# AI demografie

Koppel CBS-ISCO-08-beroepen aan scores voor algemene AI, taalmodellen en beeldgeneratie.

## Installatie en uitvoering

Open een terminal in de projectmap. Getest met Python 3.14.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python 1_isco_aioe/isco_aioe.py
```

Op Windows: gebruik `python` in plaats van `python3` en activeer met `.venv\Scripts\activate`.

## Bestanden

| Pad | Inhoud |
|---|---|
| `1_isco_aioe/isco_aioe.py` | Verwerking en controles |
| `1_isco_aioe/raw/` | Zes bronbestanden |
| `1_isco_aioe/processed/ISCO08_AIOE.csv` | Resultaat als Nederlandse CSV |
| `1_isco_aioe/processed/ISCO08_AIOE.xlsx` | Dezelfde vijf kolommen, direct te openen in Excel |
| `1_isco_aioe/processed/ISCO08_AIOE_mapping.html` | Interactieve beroepenkaart met zoekfunctie, filters en drie scoretypen; open in je browser |

[Bronlinks, uitvoerkolommen en methode](1_isco_aioe/README.md).

## GitHub Pages

Het script maakt ook `docs/index.html` aan en werkt dit bij bij elke uitvoering.
Upload dit bestand mee naar GitHub. Kies in **Settings → Pages** voor
**Deploy from a branch**, branch **main** en map **/docs**.
