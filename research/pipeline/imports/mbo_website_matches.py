"""Publiceer bestaande MBO-relaties in beide richtingen; train geen nieuw model."""
import csv
import gzip
import hashlib
import json
from pathlib import Path


def build_mbo_matches(root, courses):
    root = Path(root)
    source = root / 'data/processed/mbo_beroep_matches.csv'
    review_source = root / 'data/mappings/opleiding_beroep_proef_beoordelingen.json'
    if not source.exists() or not review_source.exists():
        raise FileNotFoundError('MBO-matches en proefbeoordelingen zijn nodig voor de website-export')
    reviews = json.loads(review_source.read_text())['reviews']
    with source.open(encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.DictReader(stream, delimiter=';'))
    by_code = {}
    for course in courses['courses']:
        if course['education_type'] == 'mbo':
            by_code[course['code']] = course
    trial_path = root / 'data/processed/opleiding_beroep_proef.json.gz'
    trials = {}
    if trial_path.exists():
        trials = {r['code']: r for r in json.loads(gzip.decompress(trial_path.read_bytes()))['results']}
    relations = []
    pending = {}
    for row in rows:
        code = row['Opleidingscode']
        # A source-bound review supersedes the predictions for this programme.
        if code in reviews or code not in by_code:
            continue
        if row['Beoordeling'] not in ('directe beroepsmatch', 'verwant beroep'):
            continue
        relations.append(dict(code=code, occupation_uri=row['Beroepsidentificatie'],
            occupation=row['Mogelijk beroep'].strip(), isco=row['ISCO-code'],
            status='Voorspeld · ' + row['Beoordeling'], source=row['Bron beroep'],
            score=float(row['Matchscore (geen kanspercentage)'].replace(',', '.')),
            note='Modelvoorstel; niet onafhankelijk gevalideerd.', method='mbo-esco-quality-1'))
    for code, review in reviews.items():
        if code not in by_code:
            continue
        selected = review.get('selected', [])
        if review.get('keep_baseline'):
            baseline = trials.get(code, {}).get('baseline', {})
            if baseline.get('Huidige ISCO'):
                selected = [dict(name=baseline['Huidig beroep'], isco=baseline['Huidige ISCO'], uri='')]
        for item in selected:
            relations.append(dict(code=code, occupation_uri=item.get('uri', ''),
                occupation=item['name'], isco=item['isco'],
                status='Assistentbeoordeling · ' + review['decision'],
                source='CBS' if review.get('keep_baseline') else 'CompetentNL', score=None,
                note=review['note'], evidence=review.get('evidence', []),
                method='Brongebonden assistentbeoordeling; niet onafhankelijk gevalideerd'))
        if not selected:
            pending[code] = review['note']
    unique = {}
    for relation in relations:
        if len(relation['isco']) != 4 or not relation['isco'].isdigit():
            raise ValueError('Geen viercijferige ISCO-code')
        course = by_code[relation['code']]
        year = max(course['years'])
        relation.update(course_name=' / '.join(course['years'][year]['names']),
                        years=sorted(course['years']))
        unique[(relation['code'], relation['occupation_uri'], relation['isco'], relation['occupation'])] = relation
    sources = [source, review_source] + ([trial_path] if trial_path.exists() else [])
    return dict(relations=list(unique.values()), pending=pending,
        metadata=dict(note='Onderzoeksvoorstellen, geen officiële opleiding–beroeprelaties of uitstroomcijfers. Koppelingen zijn niet per onderwijsjaar gevalideerd.',
            coverage=dict(source_rows=len(rows), website_mbo_courses=len(by_code),
                matched_website_courses=len({r['code'] for r in unique.values()}),
                published_relations=len(unique),
                source_codes_not_in_website=sorted({r['Opleidingscode'] for r in rows} - set(by_code)),
                reviewed_codes_not_in_website=sorted(set(reviews) - set(by_code))),
            sources={str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},
            review_policy='Assistentbeoordeling vervangt modelvoorstellen voor dezelfde opleidingscode; niet geselecteerde kandidaten worden niet gepubliceerd.'))
