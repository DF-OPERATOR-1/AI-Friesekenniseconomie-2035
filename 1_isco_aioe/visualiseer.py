"""Maak een zelfstandig te openen beroepenkaart van de geëxporteerde CSV."""
import csv
import json
from pathlib import Path


def maak_visualisatie():
    basis = Path(__file__).resolve().parent
    with (basis / 'processed/ISCO08_AIOE.csv').open(encoding='utf-8-sig') as bron:
        rijen = list(csv.DictReader(bron, delimiter=';'))
    for rij in rijen:
        for kolom in ('AIOE_score', 'AIOE_LM_score', 'AIOE_IG_score'):
            rij[kolom] = float(rij[kolom].replace(',', '.')) if rij[kolom] else None
    template = (basis / 'visualisatie/template.html').read_text(encoding='utf-8')
    data = json.dumps(rijen, ensure_ascii=False, allow_nan=False).replace('<', '\\u003c')
    uitvoer = basis / 'processed/ISCO08_AIOE_mapping.html'
    html = template.replace('__DATA__', data)
    uitvoer.write_text(html, encoding='utf-8')
    pages = basis.parent / 'docs/index.html'
    pages.parent.mkdir(parents=True, exist_ok=True)
    pages.write_text(html, encoding='utf-8')
    print(f'  Beroepenkaart: {uitvoer}')
    return uitvoer


if __name__ == '__main__':
    maak_visualisatie()
