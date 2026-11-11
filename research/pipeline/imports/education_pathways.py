"""Leerwegen/opleidingsvormen uit beide DUO-bronnen, per code, jaar en selectie."""
import csv
from collections import defaultdict
from pathlib import Path


def attach_pathways(root, courses):
    root = Path(root)
    for education_type in ('mbo', 'hbo', 'wo'):
        observations = defaultdict(set)
        mbo = education_type == 'mbo'
        code_field = 'Erkende opleiding code' if mbo else 'OPLEIDINGSCODE ACTUEEL'
        institution_field = 'Instellingscode' if mbo else 'INSTELLINGSCODE ACTUEEL'
        pathway_field = 'Leerweg' if mbo else 'OPLEIDINGSVORM'
        for kind in ('studenten', 'afgestudeerden'):
            source = root / f'data/processed/onderwijs/{kind}_{education_type}_friesland.csv'
            groups = defaultdict(list)
            with source.open(encoding='utf-8-sig', newline='') as stream:
                for row in csv.DictReader(stream, delimiter=';'):
                    key = (row[code_field], row['Jaar'], row[institution_field],
                           '' if mbo else row['GEMEENTENAAM'], row[pathway_field])
                    groups[key].append(row['Aantal'].strip())
            for key, values in groups.items():
                # Alleen bewezen lege groepen vallen af; afgeschermd/onbekend blijft behouden.
                if all(value.isdigit() and int(value) == 0 for value in values):
                    continue
                observations[key].add(kind)
        by_course = defaultdict(list)
        for (code, year, institution, place, pathway), kinds in observations.items():
            by_course[(code, year)].append((institution, place, pathway, kinds))
        for course in courses:
            if course['education_type'] != education_type:
                continue
            for year, current in course['years'].items():
                institutions = {label.rsplit('(', 1)[-1].removesuffix(')') for label in current['institutions']}
                sources = defaultdict(set)
                for institution, place, pathway, kinds in by_course[(course['code'], year)]:
                    if institution in institutions and (mbo or place in current['places']):
                        sources[pathway].update(kinds)
                current['pathways'] = sorted(sources)
                current['pathway_sources'] = {pathway: sorted(kinds) for pathway, kinds in sorted(sources.items())}
