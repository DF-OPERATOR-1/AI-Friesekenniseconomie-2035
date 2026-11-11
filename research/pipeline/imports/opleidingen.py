"""Mbo-, hbo- en wo-opleidingen; geen afgeleide ISCO- of instroomkoppeling."""
import csv
import gzip
import hashlib
import json
from pathlib import Path

COHORTS = {
    2021: ('koppeltabel21-22.xlsx', 'crebo(opleidingscode)', 'beroep_id', 'beroep (kwalificatie)'),
    2022: ('20221020-koppeltabel-2022-2023 (met 3 crossovers).xlsx', 'opleidingscode (voorheen crebo)', 'beroep_id 22-23', 'beroep (kwalificatie)'),
    2023: ('20230403-koppeltabel-2023-2024.xlsx', 'opleidingscode (crebo)', 'beroep_id', 'beroep (kwalificatie)'),
    2024: ('20241016 crebokoppeltabel 2024-2025 met wijzigingenblad definitief.xlsx', 'opleidingscode (crebo)', 'beroep_id', 'beroep (kwalificatie)'),
    2025: ('20250107 mbo-opleidingskoppeltabel 2025-2026 met wijzigingenblad.xlsx', 'opleidingscode', 'beroep_id', 'beroep (kwalificatie)'),
}


def text(value):
    return '' if value is None else str(value).strip()


def qualifications(path, fields):
    from openpyxl import load_workbook
    book = load_workbook(path, read_only=True, data_only=True)
    try:
        sheet = next(s for s in book if 'koppeltabel' in s.title.casefold())
        rows = sheet.iter_rows(values_only=True)
        headers = [text(v) for v in next(rows)]
        indices = [headers.index(field) for field in fields]
        result = {}
        for row in rows:
            code, occupation, name = [text(row[i]) for i in indices]
            if not code:
                continue
            if code in result:
                raise ValueError(f'Dubbele opleidingscode in {path.name}: {code}')
            # b0000/b9999 zijn onbekende/niet-gespecificeerde beroepen.
            result[code] = [] if occupation in ('', 'b0000', 'b9999') else [dict(code=occupation, name=name)]
        return result
    finally:
        book.close()


def build_mbo_courses(root, refresh=False):
    root = Path(root)
    snapshot = root / 'data/processed/mbo_opleidingen.json.gz'
    source = root / 'data/processed/onderwijs/studenten_mbo_friesland.csv'
    if not refresh and snapshot.exists():
        saved = json.loads(gzip.decompress(snapshot.read_bytes()))
        if saved['student_source_sha256'] == hashlib.sha256(source.read_bytes()).hexdigest():
            return saved
        raise ValueError('Opleidingenbron gewijzigd; vernieuw met --refresh-sources en de oorspronkelijke CREBO-tabellen.')
    with source.open(encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.DictReader(stream, delimiter=';'))
    courses, sources = {}, []
    mappings = {}
    for year, (filename, *fields) in COHORTS.items():
        path = root / 'data/raw/crebo' / filename
        mappings[str(year)] = qualifications(path, fields)
        sources.append(dict(year=year, cohort=f'{year}-{year+1}', file=filename,
                            sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    for row in rows:
        code, year = row['Erkende opleiding code'], row['Jaar']
        if not code.isdigit() or year not in mappings:
            raise ValueError('Onbekende opleidingscode of verslagjaar')
        course = courses.setdefault(code, dict(code=code, years={}))
        group = course['years'].setdefault(year, dict(names=set(), levels=set(), pathways=set(), institutions=set()))
        group['names'].add(row['Erkende opleiding naam'])
        group['levels'].add(row['Niveau'])
        group['pathways'].add(row['Leerweg'])
        group['institutions'].add(f"{row['Instellingsnaam']} ({row['Instellingscode']})")
    for course in courses.values():
        for year, group in course['years'].items():
            for key in list(group):
                group[key] = sorted(group[key])
            group['qualifications'] = mappings[year].get(course['code'], [])
            group['mapping_status'] = ('gevonden' if group['qualifications'] else
                                       'niet gespecificeerd' if course['code'] in mappings[year] else 'code ontbreekt in koppeltabel')
    result = dict(courses=sorted(courses.values(), key=lambda c: c['code']), sources=sources,
                  student_source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                  note='SBB-kwalificaties via exacte opleidingscode en schooljaar; geen CompetentNL/ISCO-koppeling of beroepsinstroom.')
    snapshot.write_bytes(gzip.compress((json.dumps(result, ensure_ascii=False) + '\n').encode(), mtime=0))
    return result


def higher_courses(root, education_type):
    """Gebruik uitsluitend de Friese selectie; behoud opleidingen zonder beroepsrelatie."""
    source = Path(root) / f'data/processed/onderwijs/studenten_{education_type}_friesland.csv'
    with source.open(encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.DictReader(stream, delimiter=';'))
    from collections import defaultdict
    groups = defaultdict(list)
    for row in rows:
        if row['PROVINCIE'].strip().casefold() not in ('friesland', 'fryslân'):
            raise ValueError(f'Niet-Friese rij in {source.name}')
        value = row['Aantal']
        if value not in ('', '<5') and not value.isdigit():
            raise ValueError(f'Onbekende telling in {source.name}: {value!r}')
        key = tuple(row[k] for k in ('OPLEIDINGSCODE ACTUEEL', 'INSTELLINGSCODE ACTUEEL',
                    'GEMEENTENUMMER', 'TYPE HOGER ONDERWIJS', 'OPLEIDINGSVORM', 'Jaar'))
        groups[key].append(row)
    courses = {}
    for key, records in groups.items():
        if all(r['Aantal'].isdigit() and int(r['Aantal']) == 0 for r in records):
            continue
        code, _, _, _, _, year = key
        if not code.isdigit() or year not in {str(y) for y in range(2021, 2026)}:
            raise ValueError(f'Onbekende opleidingscode/jaar in {source.name}')
        course = courses.setdefault(code, dict(code=code, education_type=education_type, years={}))
        group = course['years'].setdefault(year, dict(names=set(), levels=set(), pathways=set(),
                institutions=set(), places=set(), qualifications=[],
                mapping_status='geen beroepskoppeling beschikbaar', source_file=source.name))
        for r in records:
            group['names'].add(r['OPLEIDINGSNAAM ACTUEEL'])
            group['levels'].add(r['TYPE HOGER ONDERWIJS'])
            group['pathways'].add(r['OPLEIDINGSVORM'])
            group['institutions'].add(f"{r['INSTELLINGSNAAM ACTUEEL']} ({r['INSTELLINGSCODE ACTUEEL']})")
            group['places'].add(r['GEMEENTENAAM'])
    for c in courses.values():
        for group in c['years'].values():
            for k, v in group.items():
                if isinstance(v, set):
                    group[k] = sorted(v)
    return sorted(courses.values(), key=lambda c: c['code'])


def build_courses(root, refresh=False):
    from .opleiding_families import load_code_families
    mbo = build_mbo_courses(root, refresh)
    from .mbo_aanbodselectie import select_mbo_courses
    selected, selection = select_mbo_courses(root, mbo['courses'])
    courses = [dict(c, education_type='mbo') for c in selected]
    for education_type in ('hbo', 'wo'):
        courses.extend(higher_courses(root, education_type))
    from .education_pathways import attach_pathways
    attach_pathways(root, courses)
    keys = [(c['education_type'], c['code']) for c in courses]
    if len(keys) != len(set(keys)):
        raise ValueError('Dubbele opleiding binnen onderwijssoort')
    return dict(mbo, courses=courses, offer_selection=selection, code_families=load_code_families(root),
                note='Mbo: bevestigd Fries aanbod voor SVO, Nova College en Aeres; Firda behouden. Aantallen blijven instellingsbreed. '
                     'Hbo/wo: DUO-provincie Friesland. Geen beroepsinstroom of afgeleide ISCO-koppeling.')
