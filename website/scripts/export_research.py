"""Exporteer bestaande resultaten zonder scores opnieuw te berekenen."""
import csv
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / 'website/public/data/research'
TARGET.mkdir(parents=True, exist_ok=True)


def read_rows(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream, delimiter=';'))


def number(value):
    return float(value.replace(',', '.')) if value.strip() else None


exposure = ROOT / 'data/processed/ai_exposure/ISCO08_AIOE.csv'
complement = ROOT / 'data/processed/ai_complementarity/ISCO08_C_AIOE.csv'
lookup = {row['ISCO_08_code']: row for row in read_rows(complement)}
rows = []
for row in read_rows(exposure):
    code = row['ISCO_08_code']
    other = lookup.get(code, {})
    rows.append({'code': code, 'occupation': row['ISCO_08_beroep_NL'],
                 **{key: number(row[source]) for key, source in [('exposure', 'AIOE_score'), ('language', 'AIOE_LM_score'), ('image', 'AIOE_IG_score')]},
                 **{key: number(other.get(source, '')) for key, source in [('raw', 'AIOE_raw'), ('complementarity', 'Complementary_score'), ('adjusted', 'C_AIOE_score')]}})
assert len(rows) == len({row['code'] for row in rows})
files = [exposure, complement, ROOT / 'data/processed/ai_complementarity/ISCO08_Complementary.csv',
         *[ROOT / 'data/processed/onderwijs' / f'{kind}_{level}_friesland.csv'
           for kind in ('studenten', 'afgestudeerden') for level in ('mbo', 'hbo', 'wo')]]
manifest = []
for path in files:
    shutil.copy2(path, TARGET / path.name)
    manifest.append({'path': str(path.relative_to(ROOT)), 'file': path.name,
                    'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
(TARGET / 'occupations.json').write_text(json.dumps(
    {'description': 'Bestaande onderzoeksuitvoer; geen regionale werkgelegenheidsweging. Complementariteit en C-AIOE zijn door DataFryslân zelf berekend aan de hand van de methode van Pizzinelli et al. (2023).', 'rows': rows, 'sources': manifest}, ensure_ascii=False, indent=2) + '\n')
print(
    f'{len(rows)} beroepsgroepen geëxporteerd; {sum(r["complementarity"] is not None for r in rows)} met complementariteit.')
