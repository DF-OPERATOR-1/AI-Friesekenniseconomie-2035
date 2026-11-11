"""Filter DUO-uitvoer op bevestigd aanbod, nooit op het administratieve instellingsadres."""
import csv
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def allowed_keys(root=ROOT):
    folder = Path(root)/'data/mappings/mbo_locaties'
    with (folder/'uitsluitingen.csv').open(encoding='utf-8-sig', newline='') as stream:
        excluded = {(r['Instellingscode'], r['Opleidingscode']) for r in csv.DictReader(stream, delimiter=';')}
    path = folder/'friese_opleidingscodes_per_jaar.csv'
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return {(r['Instellingscode'], r['Opleidingscode'], r['Jaar']) for r in csv.DictReader(stream, delimiter=';')
                if (r['Instellingscode'], r['Opleidingscode']) not in excluded}


def filter_rows(rows, root=ROOT):
    allowed = allowed_keys(root)
    return [r for r in rows if r['Instellingscode'] == '08PG' or
            (r['Instellingscode'], r['Erkende opleiding code'], r['Jaar']) in allowed]


def filter_table(table, root=ROOT):
    headers = table[0]
    rows = [dict(zip(headers, values)) for values in table[1:]]
    retained = filter_rows(rows, root)
    return [headers] + [[r[k] for k in headers] for r in retained]


def verify_exports(root=ROOT):
    root = Path(root)
    result = {}
    for kind in ('studenten', 'afgestudeerden'):
        filename = f'{kind}_mbo_friesland.csv'
        base = root/'data/processed/onderwijs'
        with (base/'instellingsselectie'/filename).open(encoding='utf-8-sig', newline='') as stream:
            original = list(csv.DictReader(stream, delimiter=';'))
        with (base/filename).open(encoding='utf-8-sig', newline='') as stream:
            selected = list(csv.DictReader(stream, delimiter=';'))
        if selected != filter_rows(original, root):
            raise ValueError(f'Export is geen ongewijzigde selectie van bronrijen: {filename}')
        counts = defaultdict(Counter)
        for r in selected:
            counts[r['Instellingscode']][r['Plaatsnaam instelling']] += 1
        result[filename] = dict(original_rows=len(original), selected_rows=len(selected),
            removed_rows=len(original)-len(selected), places_by_institution={k:dict(v) for k,v in counts.items()},
            all_rows_match_offer_policy=True, source_cells_unchanged=True,
            only_frisian_institution_addresses=all(r['Plaatsnaam instelling'].strip().upper()=='LEEUWARDEN' for r in selected),
            sha256=hashlib.sha256((base/filename).read_bytes()).hexdigest())
    report = dict(note='Plaatsnaam instelling is het administratieve adres in de DUO-bron, geen opleidingslocatie. Houten, Ede en Haarlem blijven terecht behouden bij geselecteerd Fries aanbod. Geen exacte telling per Friese campus.',
        selection='data/mappings/mbo_locaties/friese_opleidingscodes_per_jaar.csv', files=result)
    target=root/'data/processed/onderwijs/locatiecontrole/mbo_exportselectie_controle.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    return report


if __name__ == '__main__':
    print(json.dumps(verify_exports(), ensure_ascii=False, indent=2))
