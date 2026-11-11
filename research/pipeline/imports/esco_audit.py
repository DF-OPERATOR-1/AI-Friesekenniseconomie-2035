"""Alleen-lezen inventaris van de lokale ESCO- en CompetentNL-bronnen."""
import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_ESCO = ROOT / 'data/raw/esco/v1.2.1/nl'


def read_table(path, required=()):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream)
        if not set(required) <= set(reader.fieldnames or []):
            raise ValueError(f'Verplichte ESCO-kolommen ontbreken: {path.name}')
        rows = list(reader)
        if any(None in r for r in rows):
            raise ValueError(f'Extra velden in {path.name}')
        if path.name == 'skillsHierarchy_nl.csv':
            # De geleverde export laat niet-toepasselijke laatste niveaucodes weg.
            # Alleen ontbrekende eindvelden leeg representeren; geen hiërarchie invullen.
            rows = [{k: '' if v is None else v for k,v in r.items()} for r in rows]
        elif any(any(v is None for v in r.values()) for r in rows):
            raise ValueError(f'Onjuiste rijlengte in {path.name}')
        return reader.fieldnames, rows


def inspect_duplicates(rows, key='conceptUri'):
    groups = defaultdict(list)
    for row in rows:
        groups[row[key]].append(row)
    duplicates = []
    for uri, entries in groups.items():
        if len(entries) < 2:
            continue
        differing = [k for k in entries[0] if len({r[k] for r in entries}) > 1]
        duplicates.append(dict(uri=uri, rows=len(entries), differing_fields=differing,
                               semantic_conflict=bool(set(differing)-{'modifiedDate'})))
    return {uri:entries[0] for uri,entries in groups.items()}, duplicates


def trace_unit_groups(start, parents, isco_codes):
    """Controleer expliciete hiërarchie; leid geen code af uit een ESCO-codeprefix."""
    reached, cyclic = set(), False
    stack = [(start, frozenset())]
    while stack:
        node, trail = stack.pop()
        if node in trail:
            cyclic = True
            continue
        if node in isco_codes:
            code = isco_codes[node]
            if len(code) == 4:
                reached.add(code)
            continue
        for parent in parents.get(node, set()):
            stack.append((parent, trail | {node}))
    return reached, cyclic


def audit_esco(folder, competentnl=None):
    folder = Path(folder)
    manifests, tables = {}, {}
    for path in sorted(folder.glob('*.csv')):
        headers, rows = read_table(path)
        with path.open(encoding='utf-8-sig', newline='') as stream:
            raw_reader = csv.reader(stream); next(raw_reader)
            widths = Counter(len(row) for row in raw_reader)
        manifests[path.name] = dict(rows=len(rows), columns=headers, row_widths=dict(widths),
                                    sha256=hashlib.sha256(path.read_bytes()).hexdigest())
        tables[path.name] = rows
    required = {'occupations_nl.csv', 'skills_nl.csv', 'ISCOGroups_nl.csv',
                'occupationSkillRelations_nl.csv', 'broaderRelationsOccPillar_nl.csv'}
    if required - tables.keys():
        raise FileNotFoundError(f'ESCO-bronnen ontbreken: {sorted(required-tables.keys())}')
    for name, columns in {
        'occupations_nl.csv': ['conceptUri','preferredLabel','iscoGroup','description','naceCode'],
        'skills_nl.csv': ['conceptUri','preferredLabel','skillType','reuseLevel'],
        'ISCOGroups_nl.csv': ['conceptUri','code'],
        'occupationSkillRelations_nl.csv': ['occupationUri','skillUri','relationType','skillType'],
        'broaderRelationsOccPillar_nl.csv': ['conceptUri','broaderUri'],
    }.items():
        if not set(columns) <= set(manifests[name]['columns']):
            raise ValueError(f'Onverwacht schema: {name}')
    occupations, occupation_duplicates = inspect_duplicates(tables['occupations_nl.csv'])
    skills, skill_duplicates = inspect_duplicates(tables['skills_nl.csv'])
    groups, group_duplicates = inspect_duplicates(tables['ISCOGroups_nl.csv'])
    isco_codes = {uri:r['code'] for uri,r in groups.items()}
    parents = defaultdict(set)
    for r in tables['broaderRelationsOccPillar_nl.csv']:
        parents[r['conceptUri']].add(r['broaderUri'])
    hierarchy_mismatches, cycles = [], []
    for uri, row in occupations.items():
        reached, cyclic = trace_unit_groups(uri, parents, isco_codes)
        if reached != {row['iscoGroup']}:
            hierarchy_mismatches.append(dict(uri=uri, direct_code=row['iscoGroup'], hierarchy_codes=sorted(reached)))
        if cyclic:
            cycles.append(uri)
    relations = tables['occupationSkillRelations_nl.csv']
    nace_uris = {u.strip() for r in occupations.values() for u in re.split(r'[,\n]+',r['naceCode']) if u.strip()}
    namespaces = {u.rsplit('/', 1)[0] for u in nace_uris}
    report = dict(
        source_directory=str(folder), file_count=len(manifests), files=manifests,
        occupations=dict(raw_rows=len(tables['occupations_nl.csv']), unique_uris=len(occupations),
            duplicate_entries=occupation_duplicates, filled_columns={k:sum(bool(r.get(k,'')) for r in occupations.values())
                for k in ('description','definition','altLabels','regulatedProfessionNote','naceCode')},
            isco_code_lengths=dict(Counter(len(r['iscoGroup']) for r in occupations.values())),
            regulation_notes=dict(Counter(r.get('regulatedProfessionNote','') for r in occupations.values())),
            nace_namespaces=sorted(namespaces)),
        skills=dict(raw_rows=len(tables['skills_nl.csv']), unique_uris=len(skills), duplicate_entries=skill_duplicates,
            filled_columns={k:sum(bool(r.get(k,'')) for r in skills.values()) for k in ('description','definition','altLabels')},
            types=dict(Counter(r['skillType'] for r in skills.values())),
            reuse_levels=dict(Counter(r['reuseLevel'] for r in skills.values())),
            unknown_type_uris=sorted(u for u,r in skills.items() if not r['skillType'])),
        isco=dict(groups=len(groups), descriptions_available=sum(bool(r.get('description','')) for r in groups.values()), code_lengths=dict(Counter(len(r['code']) for r in groups.values())),
                  duplicate_entries=group_duplicates, hierarchy_mismatches=hierarchy_mismatches, cycles=cycles),
        occupation_skills=dict(rows=len(relations), relation_types=dict(Counter(r['relationType'] for r in relations)),
            duplicate_edges=len(relations)-len({(r['occupationUri'],r['skillUri'],r['relationType']) for r in relations}),
            unknown_occupation_uris=sorted({r['occupationUri'] for r in relations}-occupations.keys()),
            unknown_skill_uris=sorted({r['skillUri'] for r in relations}-skills.keys()),
            unspecified_skill_type_edges=sum(not r['skillType'] for r in relations)),
        note='Alleen-lezen audit; geen officiële CompetentNL–ESCO-relatie uit gelijke namen of gedeelde ISCO afleiden.')
    if competentnl is not None:
        normalize_uri = lambda u:u.replace('https://','http://').rstrip('/')
        occupation_uris = {normalize_uri(u) for u in occupations}
        skill_uris = {normalize_uri(u) for u in skills}
        cnl = {}
        known_features, course_features = set(), set()
        for path in sorted(Path(competentnl).glob('*.csv')):
            with path.open(encoding='utf-8-sig', newline='') as stream:
                reader = csv.DictReader(stream, delimiter=';'); rows = list(reader)
                headers = reader.fieldnames or []
            fields = [k for k in headers if k.endswith('uri') or k in ('opleiding','hat_essentieel','hat_belangrijk')]
            references = {r[k] for r in rows for k in fields if r[k]}
            normalized = {normalize_uri(u) for u in references}
            cnl[path.name] = dict(rows=len(rows), columns=headers,
                sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                exact_esco_occupation_uris=len(references & occupations.keys()),
                exact_esco_skill_uris=len(references & skills.keys()),
                normalized_esco_occupation_uris=len(normalized & occupation_uris),
                normalized_esco_skill_uris=len(normalized & skill_uris))
            if path.name == 'mbo.csv':
                cnl[path.name]['unique_course_codes'] = len({r['code'] for r in rows})
                cnl[path.name]['date_or_cohort_fields'] = [k for k in headers if any(s in k for s in ('datum','jaar','cohort'))]
                course_features = {r[k] for r in rows for k in ('hat_essentieel','hat_belangrijk') if r[k]}
            if path.name in ('beroepen_vaardigheden.csv','beroepen_kennisgebieden.csv'):
                known_features.update(r['item_uri'] for r in rows if r['item_uri'])
        report['competentnl'] = cnl
        report['course_feature_references'] = dict(total_unique=len(course_features),
            resolvable_in_cnl=len(course_features & known_features),
            unresolved=len(course_features-known_features),
            unresolved_genid=sum('/.well-known/genid/' in u for u in course_features-known_features))
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--esco-dir', type=Path, default=DEFAULT_ESCO)
    parser.add_argument('--competentnl-dir', type=Path, default=ROOT/'data/raw/competentnl')
    args = parser.parse_args()
    print(json.dumps(audit_esco(args.esco_dir,args.competentnl_dir), ensure_ascii=False, indent=2))
