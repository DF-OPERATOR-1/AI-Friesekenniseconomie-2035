"""Pas bevestigd Fries aanbod toe op de website, zonder DUO-broncijfers te wijzigen."""
import copy
import csv
import re
from pathlib import Path
from research.onderwijs.mbo_exportselectie import allowed_keys

RESTRICTED = {'17WH', '25PX', '25GV'}


def institution_code(label):
    match = re.search(r'\(([A-Z0-9]{4})\)$', label)
    if not match:
        raise ValueError(f'Instellingscode ontbreekt: {label}')
    return match[1]


def select_mbo_courses(root, courses):
    root = Path(root)
    selection = root/'data/mappings/mbo_locaties/friese_aanbodselectie.csv'
    allowed = allowed_keys(root)
    evidence = []
    with selection.open(encoding='utf-8-sig', newline='') as stream:
        for row in csv.DictReader(stream, delimiter=';'):
            evidence.append(row)
    source = root/'data/processed/onderwijs/studenten_mbo_friesland.csv'
    groups = {}
    with source.open(encoding='utf-8-sig', newline='') as stream:
        for row in csv.DictReader(stream, delimiter=';'):
            groups.setdefault((row['Erkende opleiding code'], row['Jaar']), []).append(row)
    selected = []
    audit = []
    for original in courses:
        course = copy.deepcopy(original)
        for year, data in list(course['years'].items()):
            qids = {q['code'] for q in data['qualifications']}
            institutions = []
            for label in data['institutions']:
                code = institution_code(label)
                keep = code == '08PG' or (code, course['code'], year) in allowed
                audit.append(dict(code=course['code'], year=year, institution=code, included=keep))
                if keep:
                    institutions.append(label)
            if not institutions:
                del course['years'][year]
                continue
            codes = {institution_code(label) for label in institutions}
            retained = [r for r in groups[(course['code'], year)] if r['Instellingscode'] in codes]
            data.update(institutions=institutions,
                names=sorted({r['Erkende opleiding naam'] for r in retained}),
                levels=sorted({r['Niveau'] for r in retained}),
                pathways=sorted({r['Leerweg'] for r in retained}))
            matched = [r for r in evidence if r['Instellingscode'] in codes and r['SBB_kwalificatie'] in qids]
            data['offer_names'] = sorted({r['SBB_naam'] for r in matched})
            data['offer_source_urls'] = sorted({r['Bron_URL'] for r in matched})
        if course['years']:
            selected.append(course)
    return selected, dict(policy='Huidige, door gebruiker bevestigde Friese aanbodselectie via exacte SBB-kwalificatie. Geen bewijs van historisch aanbod per onderwijslocatie. Firda ongewijzigd. Cijfers van behouden instellingen kunnen ook niet-Friese locaties omvatten.',
        source='data/mappings/mbo_locaties/friese_aanbodselectie.csv', institution_year_decisions=audit)
