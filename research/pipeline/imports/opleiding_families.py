"""Lees uitsluitend expliciet gecontroleerde oude/nieuwe opleidingscodes."""
import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path


def load_code_families(root):
    path = Path(root)/'data/mappings/mbo_codefamilies.json'
    if not path.exists():
        return []
    families = json.loads(path.read_text())['families']
    assigned = set()
    for family in families:
        if family['education_type'] != 'mbo' or not family.get('sources'):
            raise ValueError('Codefamilie mist mbo-bronverantwoording')
        for entry in family['codes']:
            code = entry['code']
            if not isinstance(code,str) or len(code)!=5 or not code.isdigit() or code in assigned:
                raise ValueError('Ongeldige of meervoudig gebruikte familiecode')
            assigned.add(code)
    return families + registry_code_families(Path(root), families, assigned)


def load_registry_rows(root, reference):
    """Lees de gecontroleerde openbare bronselectie; alleen oude verwijzingen vereisen de oorspronkelijke bron."""
    root = Path(root)
    snapshot = reference.get('registry_snapshot_file')
    path = root / (snapshot or reference['registry_file'])
    expected = reference['registry_snapshot_sha256'] if snapshot else reference['registry_sha256']
    if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        raise ValueError('CREBO-register wijkt af van de gecontroleerde bron')
    if snapshot:
        for name, source_hash in reference['registry_selection_sha256'].items():
            if hashlib.sha256((root / name).read_bytes()).hexdigest() != source_hash:
                raise ValueError('DUO-selectie gewijzigd; vernieuw de gecontroleerde CREBO-bronselectie')
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream, delimiter=';'))


def registry_code_families(root, verified, assigned):
    """Groepeer geselecteerde CREBO-codes via dezelfde officiële SBB-kwalificatie en niveau.

    Het bestaande gecontroleerde bronbestand en de vastgelegde hash zijn leidend.
    Diploma-only codes tellen mee zonder er nieuwe opleidingspagina's van te maken.
    """
    reference = next((f for f in verified if f.get('registry_file') and f.get('registry_sha256')), None)
    if reference is None:
        return []
    selected = set()
    for dataset in ('studenten', 'afgestudeerden'):
        with (root / f'data/processed/onderwijs/{dataset}_mbo_friesland.csv').open(encoding='utf-8-sig', newline='') as stream:
            selected.update(row['Erkende opleiding code'] for row in csv.DictReader(stream, delimiter=';'))
    groups = defaultdict(list)
    seen = set()
    for row in load_registry_rows(root, reference):
        code = row['Erkende opleidingscode']
        if code in seen:
            raise ValueError(f'Dubbele opleidingscode in CREBO-register: {code}')
        seen.add(code)
        qualification, level = row['Beroep code'], row['Niveau']
        if code not in selected or qualification in ('', 'b0000', 'b9999') or level not in ('1', '2', '3', '4'):
            continue
        groups[(qualification, level)].append(row)
    families = []
    for (qualification, level), rows in sorted(groups.items()):
        # Handmatig gecontroleerde families worden niet opnieuw toegewezen.
        if len(rows) < 2 or any(row['Erkende opleidingscode'] in assigned for row in rows):
            continue
        codes = [dict(code=row['Erkende opleidingscode'], name=row['Erkende opleiding naam'],
                      status='Broncode', start=row['Startdatum erkende opleiding'],
                      entry_until=row['Uiterste instroomdatum erkende opleiding'],
                      end=row['Einddatum erkende opleiding'])
                 for row in sorted(rows, key=lambda row: row['Erkende opleidingscode'])]
        families.append(dict(id=f'sbb-{qualification}-niveau-{level}', education_type='mbo',
                             name=rows[0]['Beroep naam'], qualification=qualification, level=level,
                             codes=codes, sources=[reference['sources'][1]],
                             registry_file=reference['registry_file'],
                             registry_sha256=reference['registry_sha256'],
                             method='Gelijke SBB-kwalificatiecode en gelijk niveau in het gecontroleerde CREBO-register; uitsluitend codes uit de bestaande DUO-selectie.'))
    return families


def refresh_registry_snapshot(root):
    """Vernieuw uitsluitend vanuit de oorspronkelijke bron met de vooraf gecontroleerde SHA-256."""
    root = Path(root)
    mapping_path = root / 'data/mappings/mbo_codefamilies.json'
    mapping = json.loads(mapping_path.read_text())
    reference = next(f for f in mapping['families'] if f.get('registry_file') and f.get('registry_sha256'))
    source = root / reference['registry_file']
    if hashlib.sha256(source.read_bytes()).hexdigest() != reference['registry_sha256']:
        raise ValueError('CREBO-register wijkt af van de gecontroleerde bron')
    selected = {entry['code'] for family in mapping['families'] for entry in family['codes']}
    selection = {}
    for kind in ('studenten', 'afgestudeerden'):
        name = f'data/processed/onderwijs/{kind}_mbo_friesland.csv'
        selection[name] = hashlib.sha256((root / name).read_bytes()).hexdigest()
        with (root / name).open(encoding='utf-8-sig', newline='') as stream:
            selected.update(row['Erkende opleiding code'] for row in csv.DictReader(stream, delimiter=';'))
    columns = ['Erkende opleidingscode', 'Erkende opleiding naam', 'Beroep code', 'Beroep naam',
               'Niveau', 'Startdatum erkende opleiding', 'Uiterste instroomdatum erkende opleiding',
               'Einddatum erkende opleiding']
    with source.open(encoding='utf-8-sig', newline='') as stream:
        rows = [{key: row[key] for key in columns} for row in csv.DictReader(stream, delimiter=';')
                if row['Erkende opleidingscode'] in selected]
    name = reference.get('registry_snapshot_file', 'data/mappings/crebo_codefamilies_bronselectie.csv')
    snapshot = root / name
    snapshot.parent.mkdir(parents=True, exist_ok=True)
    with snapshot.open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=columns, delimiter=';')
        writer.writeheader()
        writer.writerows(rows)
    reference.update(registry_snapshot_file=name,
                     registry_snapshot_sha256=hashlib.sha256(snapshot.read_bytes()).hexdigest(),
                     registry_selection_sha256=selection)
    mapping_path.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + '\n')
    return snapshot


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Vernieuw de gecontroleerde CREBO-selectie voor de websitebuild.')
    parser.add_argument('--refresh-registry-snapshot', action='store_true', required=True)
    parser.parse_args()
    print(refresh_registry_snapshot(Path(__file__).resolve().parents[3]))
