"""Studiekeuzedatabase 26.6: landelijke beroepskoppelingen, uitsluitend voor weergave."""
import csv
import gzip
import json
from pathlib import Path


def load_ho_courses(root):
    root = Path(root)
    source = root / 'data/raw/studiekeuzedatabase/ho_alle_isco.csv'
    snapshot = root / 'data/processed/ho_isco_landelijk.json.gz'
    if not source.exists():
        if not snapshot.exists():
            raise FileNotFoundError('Landelijke Studiekeuzedatabase-bron en weergavesnapshot ontbreken')
        return json.loads(gzip.decompress(snapshot.read_bytes()))
    grouped = {}
    with source.open(encoding='utf-8-sig', newline='') as stream:
        for row in csv.DictReader(stream, delimiter=';'):
            code = row['iscoCode'].strip()
            if not code:
                continue
            code = code.zfill(4)
            education_type = row['soortHo'].lower()
            if not (len(code) == 4 and code.isdigit()) or row['matchtype'] not in ('DIRECT', 'KANDIDAAT') or education_type not in ('hbo', 'wo'):
                raise ValueError('Onbekende ISCO-code, onderwijssoort of koppelingstype')
            key = (education_type, row['opleidingCode'])
            course = grouped.setdefault(key, dict(code=key[1], education_type=education_type, names=set(), occupations={}))
            course['names'].add(row['opleidingNaam'].strip())
            item = dict(code=code, name=row['iscoNaam'], kind=row['matchtype'], degree=row['graad'].lower())
            course['occupations'][(code, item['kind'], item['degree'])] = item
    result = [dict(code=c['code'], education_type=c['education_type'], name=' / '.join(sorted(c['names'])),
                   occupations=sorted(c['occupations'].values(), key=lambda o: (o['kind'], o['code'], o['degree'])))
              for _, c in sorted(grouped.items())]
    snapshot.parent.mkdir(parents=True, exist_ok=True)
    snapshot.write_bytes(gzip.compress(json.dumps(result, ensure_ascii=False).encode(), mtime=0))
    return result


def attach_ho_occupations(root, courses, national=None):
    national = load_ho_courses(root) if national is None else national
    grouped = {(c['education_type'], c['code']): c['occupations'] for c in national}
    for course in courses['courses']:
        if course['education_type'] in ('hbo', 'wo'):
            course['occupations'] = grouped.get((course['education_type'], course['code']), [])


def national_ho_display(courses, national):
    """Landelijke namen/koppelingen, met alleen bestaande Friese detailroutes."""
    local = {(c['education_type'], c['code']): c for c in courses['courses']}
    return dict(courses=[dict(c, years={year: dict(levels=data['levels'])
                for year, data in local.get((c['education_type'], c['code']), {}).get('years', {}).items()})
                for c in national])
