"""Canonieke UWV-import. CLI: python -m research.pipeline.imports.uwv INPUT OUTPUT.
Maak een expliciete bronkolomvertaling vóór deze import; geen kolommen raden.
"""
import json
import sys
from pathlib import Path
from .common import code, year, count, rows


def import_uwv(path, valid_codes=None):
    result, seen = [], set()
    for row in rows(path):
        isco = code(row['isco_code'], 4)
        if valid_codes is not None and isco not in valid_codes:
            raise ValueError('Onbekende ISCO-code')
        y, q = year(row['year']), int(row['quarter'])
        if q not in (1, 2, 3, 4) or not row['geography'].strip() or not row['source'].strip():
            raise ValueError('Kwartaal, regio of bron ontbreekt')
        key = (isco, y, q, row['geography'])
        if key in seen:
            raise ValueError('Dubbele kwartaalwaarneming')
        seen.add(key)
        result.append(dict(isco_code=isco, year=y, quarter=q, value=count(row['vacancies']),
                           raw_value=row['vacancies'], geography=row['geography'], source=row['source'],
                           classification='ISCO-08', status='observed'))
    return result


if __name__ == '__main__':
    output = Path(sys.argv[2])
    if output.exists():
        raise SystemExit('Uitvoer bestaat al; kies een nieuw pad')
    output.write_text(json.dumps(import_uwv(
        sys.argv[1]), ensure_ascii=False, indent=2)+'\n')
