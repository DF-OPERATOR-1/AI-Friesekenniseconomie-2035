"""Koppel aangeleverde CompetentNL-inhoud uitsluitend via URI en ISCO-code."""
from collections import defaultdict
import csv
import json
import gzip
from .common import code, rows


def import_content(root):
    folder = root / 'data/raw/competentnl'
    output = root / 'data/processed/competentnl_occupations.json.gz'
    inputs = [folder / name for name in ('beroepen_isco.csv', 'beroepen_taken.csv', 'beroepen_vaardigheden.csv')]
    if not all(path.is_file() for path in inputs):
        if any(path.is_file() for path in inputs):
            raise ValueError('Onvolledige CompetentNL-bronset; lever alle drie CSV-bestanden aan.')
        return json.loads(gzip.decompress(output.read_bytes()))
    groups = defaultdict(dict)
    by_uri = defaultdict(set)
    for row in rows(folder / 'beroepen_isco.csv'):
        isco = code(row['isco_code'], 4)
        groups[isco][row['uri']] = row
        by_uri[row['uri']].add(isco)
    items = {kind: defaultdict(set) for kind in ('tasks', 'skills')}
    member_items = {kind: defaultdict(dict) for kind in ('tasks', 'skills')}
    for kind, filename in [('tasks', 'beroepen_taken.csv'), ('skills', 'beroepen_vaardigheden.csv')]:
        for row in rows(folder / filename):
            if row['item_naam'].strip():
                item = dict(uri=row.get('item_uri', ''), name=row['item_naam'].strip(),
                    importance=row.get('belang', '').strip(), description=row.get('item_definitie', '').strip(),
                    code=row.get('item_code', ''))
                member_items[kind][row['uri']][(item['uri'], item['name'], item['importance'], item['description'])] = item
                for isco in by_uri[row['uri']]:
                    items[kind][isco].add(row['item_naam'].strip())
    result = {isco: {
        'title': next(iter(members.values()))['isco_naam'],
        'description': '\n\n'.join(f"{r['naam']}: {r['definitie']}" for r in members.values() if r['definitie'].strip()),
        'tasks': sorted(items['tasks'][isco]),
        'skills': sorted(items['skills'][isco]),
        'member_count': len(members),
        'occupation_names': sorted({r['naam'] for r in members.values()}),
    } for isco, members in groups.items()}
    member_content = {isco: [dict(uri=uri, name=r['naam'], description=r['definitie'],
        tasks=sorted(member_items['tasks'][uri].values(), key=lambda item: (item['name'], item['uri'])),
        skills=sorted(member_items['skills'][uri].values(), key=lambda item: (item['name'], item['uri'])))
        for uri, r in sorted(members.items(), key=lambda item: item[1]['naam'])] for isco, members in groups.items()}
    (root / 'data/processed/competentnl_members.json.gz').write_bytes(gzip.compress((json.dumps(member_content, ensure_ascii=False) + '\n').encode('utf-8'), mtime=0))
    output.write_bytes(gzip.compress((json.dumps(result, ensure_ascii=False) + '\n').encode('utf-8'), mtime=0))
    return result


def import_brc(root, prefer_processed=False):
    path = root / 'data/raw/cbs/Schakelschema ISCO2008-BRC2014.xls'
    output = root / 'data/mappings/isco2008_brc2014.csv'
    if not path.is_file() or (prefer_processed and output.is_file()):
        return {r['ISCO2008unitgroup']: {'code': r['BRC2014beroepsgroep'], 'title': r['BRC2014beroepsgroep_label']} for r in rows(output)}
    import xlrd
    sheet = xlrd.open_workbook(path).sheet_by_name('BRC 2014 variabelen')
    headers = sheet.row_values(0)
    records = [dict(zip(headers, sheet.row_values(i))) for i in range(1, sheet.nrows)]
    for row in records:
        code(row['ISCO2008unitgroup'], 4)
    output = root / 'data/mappings/isco2008_brc2014.csv'
    with output.open('w', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=headers, delimiter=';')
        writer.writeheader()
        writer.writerows(records)
    return {r['ISCO2008unitgroup']: {'code': r['BRC2014beroepsgroep'], 'title': r['BRC2014beroepsgroep_label']} for r in records}
