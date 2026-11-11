"""Nederlandse ESCO-beroepsinhoud voor ontbrekende CompetentNL-groepen."""
from collections import defaultdict
import gzip
import hashlib
import json
from pathlib import Path

from .esco_audit import read_table, inspect_duplicates, trace_unit_groups

VERSION = '1.2.1'
LANGUAGE = 'nl'
SERVICE_ATTRIBUTION = 'This service uses the ESCO classification of the European Commission.'
PUBLICATION_ATTRIBUTION = 'This publication uses the ESCO classification of the European Commission.'
SOURCE_FOLDER = 'data/raw/esco/v1.2.1/nl'
SOURCE_FILES = ('occupations_nl.csv', 'skills_nl.csv', 'occupationSkillRelations_nl.csv',
                'ISCOGroups_nl.csv', 'broaderRelationsOccPillar_nl.csv')


def canonical(rows):
    unique, duplicates = inspect_duplicates(rows)
    if any(r['semantic_conflict'] for r in duplicates):
        raise ValueError('Inhoudelijk conflicterende ESCO-records voor dezelfde URI')
    return unique


def import_esco(root, needed_codes, refresh=False):
    """Sla alleen de benodigde aanvulling op; behoud bronlabels en officiële codes."""
    root = Path(root)
    needed = set(needed_codes)
    if any(len(c) != 4 or not c.isdigit() for c in needed):
        raise ValueError('ESCO-aanvulling vereist viercijferige ISCO-codes')
    snapshot = root/'data/processed/esco_aanvulling.json.gz'
    folder = root/SOURCE_FOLDER
    if snapshot.exists() and not refresh:
        saved = json.loads(gzip.decompress(snapshot.read_bytes()))
        missing = needed & set(saved['metadata']['available_isco_codes']) - set(saved['content'])
        if not missing:
            return saved
        if not folder.exists():
            raise ValueError('ESCO-cache dekt de benodigde codes niet; ververs met de ESCO-bronnen')
    tables, hashes = {}, {}
    for name in SOURCE_FILES:
        path = folder/name
        if not path.exists():
            raise FileNotFoundError(f'ESCO-bron ontbreekt: {path}; gebruik de verwerkte cache of lever de bronmap aan')
        _, tables[name] = read_table(path)
        hashes[name] = hashlib.sha256(path.read_bytes()).hexdigest()
    occupations = canonical(tables['occupations_nl.csv'])
    skills = canonical(tables['skills_nl.csv'])
    groups = canonical(tables['ISCOGroups_nl.csv'])
    group_codes = {uri:r['code'] for uri,r in groups.items()}
    labels = {r['code']:r['preferredLabel'] for r in groups.values() if len(r['code']) == 4}
    parents = defaultdict(set)
    for r in tables['broaderRelationsOccPillar_nl.csv']:
        parents[r['conceptUri']].add(r['broaderUri'])
    for uri, r in occupations.items():
        code = r['iscoGroup']
        reached, cyclic = trace_unit_groups(uri, parents, group_codes)
        if code not in labels or reached != {code} or cyclic:
            raise ValueError(f'Inconsistente officiële ESCO–ISCO-relatie: {uri}')
    selected = {u:r for u,r in occupations.items() if r['iscoGroup'] in needed}
    members = {}
    for uri, r in selected.items():
        members[uri] = dict(uri=uri, name=r['preferredLabel'], description=r['description'],
            tasks=[], skills=[], knowledge_areas=[], other_competencies=[], source='ESCO',
            source_version=VERSION, language=LANGUAGE, isco_code=r['iscoGroup'])
    seen_relations = {}
    for r in tables['occupationSkillRelations_nl.csv']:
        if r['occupationUri'] not in occupations or r['skillUri'] not in skills:
            raise ValueError('ESCO-relatie verwijst naar ontbrekend beroep of ontbrekende competentie')
        if r['relationType'] not in ('essential','optional'):
            raise ValueError('Onbekend ESCO-relatietype')
        pair = (r['occupationUri'],r['skillUri'])
        if pair in seen_relations:
            if seen_relations[pair] != r['relationType']:
                raise ValueError('Conflicterend belang voor dezelfde ESCO-competentierelatie')
            continue
        seen_relations[pair] = r['relationType']
        if r['occupationUri'] not in members:
            continue
        skill = skills[r['skillUri']]
        field = {'knowledge':'knowledge_areas','skill/competence':'skills'}.get(skill['skillType'],'other_competencies')
        members[r['occupationUri']][field].append(dict(uri=skill['conceptUri'], name=skill['preferredLabel'],
            importance='essentieel' if r['relationType']=='essential' else 'optioneel',
            description=skill['description'], code='', reuse_level=skill['reuseLevel']))
    grouped = defaultdict(list)
    for member in members.values():
        for kind in ('skills','knowledge_areas','other_competencies'):
            member[kind].sort(key=lambda x:(x['name'].casefold(),x['uri']))
        grouped[member['isco_code']].append(member)
    content = {}
    for code, entries in grouped.items():
        entries.sort(key=lambda x:(x['name'].casefold(),x['uri']))
        content[code] = dict(title=labels[code],
            description='\n\n'.join(f"{m['name']}: {m['description']}" for m in entries), tasks=[],
            skills=sorted({x['name'] for m in entries for x in m['skills']}),
            knowledge_areas=sorted({x['name'] for m in entries for x in m['knowledge_areas']}),
            member_count=len(entries), occupation_names=sorted({m['name'] for m in entries}),
            source='ESCO', source_version=VERSION, language=LANGUAGE)
    result = dict(content=content, members=dict(grouped), metadata=dict(version=VERSION, language=LANGUAGE,
        service_attribution=SERVICE_ATTRIBUTION, publication_attribution=PUBLICATION_ATTRIBUTION,
        available_isco_codes=sorted({r['iscoGroup'] for r in occupations.values()}),
        source_hashes=hashes, source_unique_occupations=len(occupations), source_unique_skills=len(skills),
        adaptation='Nederlandse selectie voor ontbrekende groepen; dubbele URI’s met alleen datumverschil ontdubbeld; '
                   'beroepsinhoud per officiële ISCO-code gegroepeerd. Geen officiële ISCO-groepsdefinities of afzonderlijke taken toegevoegd.'))
    snapshot.parent.mkdir(parents=True, exist_ok=True)
    snapshot.write_bytes(gzip.compress((json.dumps(result,ensure_ascii=False)+'\n').encode(),mtime=0))
    return result


def supplement_content(content, members, esco):
    """Behoud iedere bestaande CompetentNL-groep; geen broninhoud stil vermengen."""
    combined, combined_members = dict(content), dict(members)
    for code, details in esco['content'].items():
        if code not in combined:
            combined[code] = details
            combined_members[code] = esco['members'][code]
    return combined, combined_members
