"""Verklaarbare kandidaatmatches via gedeelde CompetentNL-kenmerken, geen ML-kansen."""
import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import json
import math
from pathlib import Path
import tempfile
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[3]
FILES = ('mbo.csv', 'beroepen_isco.csv', 'beroepen_taken.csv', 'beroepen_vaardigheden.csv', 'beroepen_kennisgebieden.csv')
WEIGHTS = dict(naam=0.30, definitie=0.30, taken=0.30, kenmerken=0.10)
FALLBACK_WEIGHTS = dict(naam=0.05, definitie=0.45, taken=0.40, kenmerken=0.10)


def read_rows(path, required):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.DictReader(stream, delimiter=';')
        if not set(required) <= set(reader.fieldnames or []):
            raise ValueError(f'Verplichte kolommen ontbreken: {path}')
        for row in reader:
            if None in row or any(v is None for v in row.values()):
                raise ValueError(f'Onjuiste rijlengte: {path}')
            yield row


def overlap(left, right, idf):
    """IDF-gewogen Jaccard: identieke sets=100, geen overlap=0."""
    union = left | right
    if not union:
        return 0.0
    return 100 * sum(idf[u] for u in sorted(left & right)) / sum(idf[u] for u in sorted(union))


# Stopwoorden dragen geen onderscheidende beroepsinhoud.
STOPWORDS = set('de het een en of van voor met in op aan bij als om te tot uit door naar over onder tussen ook is zijn wordt worden heeft hebben kan kunnen hij zij ze haar hem hun dit dat deze die er zich niet wel dan maar meer onder andere zoals werkt werk werkzaamheden medewerker allround algemeen algemene zelfstandig werkend eerste assistant designer technician engineering business support'.split())


def normalize_text(text):
    text = unicodedata.normalize('NFKD', text.casefold())
    return ''.join(c for c in text if not unicodedata.combining(c))


def terms(text, characters=False):
    words = re.findall(r'[a-z][a-z0-9]{2,}', normalize_text(text))
    if characters:
        return Counter('c:' + word[i:i+n] for word in words if word not in STOPWORDS
                       for n in (3, 4, 5) for i in range(len(word)-n+1))
    words = [word for word in words if word not in STOPWORDS]
    return Counter(['w:' + word for word in words] +
                   ['b:' + a + ' ' + b for a, b in zip(words, words[1:])])


# Functierollen zijn op zichzelf geen bewijs van een passend vakgebied.
GENERIC_ROLES = STOPWORDS | set('meewerkend meewerkende leidinggevend leidinggevende leidinggevenden manager managers management directeur directeuren medewerker medewerkers assistent assistenten eerste tweede zelfstandig zelfstandige vakbekwaam vakbekwame uitvoerend uitvoerende allround specialist specialisten gespecialiseerd gespecialiseerde technicus technici technisch technische expert niveau professional professionals junior senior ondernemer ondernemers bedrijf bedrijven bedrijfsleider bedrijfsleiders voorman voorvrouw coordinator leiding hoofd hoofden teamleider teamleiders begeleider begeleiders uitvoerder uitvoerders praktijk praktijkopleider operationeel operationele vakman vakvrouw algemeen algemene onderhoud beheer dienst diensten dienstverlening team teams'.split())


def domain_words(text):
    return {w for w in re.findall(r'[a-z][a-z0-9]{2,}', normalize_text(text)) if w not in GENERIC_ROLES}


def domain_anchors(title, vocabulary):
    """Herken vaktermen, ook binnen Nederlandse samenstellingen."""
    anchors = set()
    for word in domain_words(title):
        matches = {word[start:end] for start in range(len(word))
                   for end in range(start + 5, len(word) + 1) if word[start:end] in vocabulary}
        if word in vocabulary:
            matches.add(word)
        anchors.update(matches)
    return anchors


def exact_specific_name(course_names, occupation_name):
    def normalized(value):
        return ' '.join(re.findall(r'[a-z0-9]+', normalize_text(value)))
    return bool(domain_words(occupation_name)) and normalized(occupation_name) in {
        normalized(name) for name in course_names}


def domain_evidence(anchors, occupation):
    # Vakgebied moet in zowel de beroepsnaam als in werkzaamheden voorkomen.
    # Vermelding van een omgeving in een lange tekst is op zichzelf onvoldoende.
    name = occupation.get('_name_text')
    if name is None:
        name = normalize_text(occupation['name'])
    supported = [anchor for anchor in anchors if anchor in name]
    if not supported:
        return False
    work = occupation.get('_work_text')
    if work is None:
        work = normalize_text(occupation['definition'] + ' ' + ' '.join(sorted(occupation['tasks'])))
    return any(anchor in work for anchor in supported)


class TextComparison:
    """TF-IDF/cosinus op woorden en woordparen; geen extern model of API."""
    def __init__(self, course_texts, occupation_texts, characters=False):
        documents = [terms(t, characters) for t in course_texts + occupation_texts]
        df = Counter(t for doc in documents for t in doc)
        idf = {t: 1 + math.log((1 + len(documents)) / (1 + count)) for t, count in df.items()}
        vectors = []
        for doc in documents:
            vector = {t: (1 + math.log(count)) * idf[t] * (0.35 if t.startswith('b:') else 1)
                      for t, count in doc.items()}
            norm = math.sqrt(sum(v*v for v in vector.values()))
            vectors.append({t: v/norm for t, v in vector.items()} if norm else {})
        self.course_vectors = vectors[:len(course_texts)]
        self.index = defaultdict(list)
        for i, vector in enumerate(vectors[len(course_texts):]):
            for t, value in vector.items():
                self.index[t].append((i, value))

    def scores(self, course_index):
        scores = defaultdict(float)
        for term, value in self.course_vectors[course_index].items():
            for i, other in self.index.get(term, []):
                scores[i] += value * other
        return {i: 100 * min(1.0, max(0.0, value)) for i, value in scores.items()}


# Conservatieve selectie van directe mbo-routes, geen gelijkstelling van schalen.
MAX_ISCO_LEVEL = {1: 1, 2: 2, 3: 2, 4: 3}


def level_compatible(mbo_level, isco_level):
    return mbo_level in MAX_ISCO_LEVEL and 1 <= isco_level <= MAX_ISCO_LEVEL[mbo_level]


def weighted_task_score(essential, optional, has_essential, has_optional):
    denominator = 2 * bool(has_essential) + bool(has_optional)
    return (2 * essential * bool(has_essential) + optional * bool(has_optional)) / denominator if denominator else 0


def load_context(root):
    from openpyxl import load_workbook
    from .opleidingen import COHORTS
    folder = root / 'data/raw/crebo'
    latest = '251126 mbo-opleidingskoppeltabel 2026-27 met wijzigingenblad.xlsx'
    paths = [(folder / latest, '2026-2027'), (folder / COHORTS[2025][0], '2025-2026')]
    context, hashes = {}, {}
    for path, cohort in paths:
        if not path.exists():
            continue
        hashes[str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()
        book = load_workbook(path, read_only=True, data_only=True)
        try:
            sheet = next(s for s in book if 'koppeltabel' in s.title.casefold())
            rows = sheet.iter_rows(values_only=True)
            headers = [str(v).strip() if v is not None else '' for v in next(rows)]
            required = ('opleidingscode', 'niveau beroep', 'subgroep', 'beroepsopleiding (dossier)', 'omschrijving ISCED-F2013')
            indices = [headers.index(k) for k in required]
            seen = set()
            for row in rows:
                code, level, subgroup, dossier, field = [str(row[i]).strip() if row[i] is not None else '' for i in indices]
                if not code:
                    continue
                if code in seen:
                    raise ValueError(f'Dubbele contextcode in {path.name}: {code}')
                seen.add(code)
                if level in ('1', '2', '3', '4'):
                    context.setdefault(code, dict(level=int(level), direction=' '.join(sorted({subgroup, dossier, field})), cohort=cohort, sector=subgroup, dossier=dossier, isced_field=field))
        finally:
            book.close()
    if not hashes:
        raise FileNotFoundError('CREBO-context ontbreekt: lever koppeltabel 2025-2026 of 2026-2027 aan')
    path = root / 'data/mappings/isco2008_brc2014.csv'
    levels = {}
    for row in read_rows(path, ('ISCO2008unitgroup', 'ISCO2008niveau')):
        code = row['ISCO2008unitgroup']
        if code in levels:
            raise ValueError('Dubbele ISCO-code in niveaucontrole')
        levels[code] = int(row['ISCO2008niveau'])
    hashes[str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()
    return context, levels, hashes


def name_key(value):
    return ' '.join(re.findall(r'[a-z0-9]+', normalize_text(value)))


def name_keys(value):
    """Transparante naamvarianten; geen vertaalde of gegenereerde beroepen."""
    key = name_key(value)
    words = key.split()
    modifiers = {'allround', 'eerste', 'zelfstandig', 'werkend', 'vakbekwaam', 'gespecialiseerd', 'basis'}
    while len(words) > 1 and words[0] in modifiers:
        words = words[1:]
    singular = [w[:-1] if len(w) > 3 and w.endswith('s') and not w.endswith('ss') else w for w in words]
    return {key, ' '.join(words), ' '.join(singular)}


def fallback_role_factor(course_title, occupation):
    """Voorkom evidente rolwissels in de onzekere aanvullende voorstellen."""
    title, name = normalize_text(course_title), normalize_text(occupation['name'])
    teaching = ('docent', 'leraar', 'hoogleraar', 'universitair', 'wetenschappelijk onderzoeker')
    if any(t in name for t in teaching) and not any(t in title for t in ('docent', 'leraar', 'instructeur', 'opleider')):
        return 0
    if occupation['isco'].startswith('0') and not any(t in title for t in ('militair', 'defensie', 'krijgsmacht')):
        return 0
    if occupation['isco'].startswith(('111', '112')):
        return 0
    leadership = ('manager', 'directeur', 'hoofd ', 'leidinggevend', 'bedrijfsleider', 'voorman', 'voorvrouw')
    course_leadership = leadership + ('coordinator', 'ondernemer', 'uitvoerder', 'beheerder', 'vakexpert')
    if any(t in name for t in leadership) and not any(t in title for t in course_leadership):
        return 0.6
    return 1


def load_cbs_index(root):
    import xlrd
    path = root / 'data/raw/cbs/codelijsten-isco-08-nl.xls'
    book = xlrd.open_workbook(path)
    unit_sheet = book.sheet_by_name('ISCO-08 unit group')
    labels = {str(unit_sheet.cell_value(i, 0)).strip(): str(unit_sheet.cell_value(i, 1)).strip()
              for i in range(1, unit_sheet.nrows)}
    if any(len(code) != 4 or not code.isdigit() for code in labels):
        raise ValueError('Niet-viercijferige code in CBS-unitgroepen')
    sheet = book.sheet_by_name('ISCO-08 index')
    if sheet.row_values(0) != ['Voorbeeldberoepen_CBS', 'code ISCO-08 unitgroup']:
        raise ValueError('Onverwacht CBS-indexschema')
    index = defaultdict(set)
    for i in range(1, sheet.nrows):
        name, code = (str(v).strip() for v in sheet.row_values(i))
        if not name or code not in labels:
            raise ValueError('Onbekende CBS-indexcode of lege voorbeeldnaam')
        for key in name_keys(name):
            index[key].add((name, code, labels[code]))
    for code, label in labels.items():
        for key in name_keys(label):
            index[key].add((label, code, label))
    return dict(index), {str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest()}


def build_matches(root=ROOT, top=5):
    if top < 1:
        raise ValueError('top moet positief zijn')
    root = Path(root)
    folder = root / 'data/raw/competentnl'
    context, isco_levels, context_hashes = load_context(root)
    cbs_index, cbs_hashes = load_cbs_index(root)
    context_hashes.update(cbs_hashes)
    occupations = {}
    for row in read_rows(folder / 'beroepen_isco.csv', ('uri', 'naam', 'definitie', 'isco_code', 'isco_naam')):
        if not (len(row['isco_code']) == 4 and row['isco_code'].isdigit()):
            raise ValueError('Ongeldige viercijferige ISCO-code')
        if row['uri'] in occupations:
            raise ValueError('Dubbele beroeps-URI')
        occupations[row['uri']] = dict(name=row['naam'], definition=row['definitie'], tasks=set(), essential_tasks=set(), optional_tasks=set(), isco=row['isco_code'], isco_name=row['isco_naam'])
    for row in read_rows(folder / 'beroepen_taken.csv', ('uri', 'item_uri', 'item_naam', 'item_definitie', 'belang')):
        if row['uri'] not in occupations:
            raise ValueError('Taak bij onbekende beroeps-URI')
        task = ' '.join((row['item_naam'].strip(), row['item_definitie'].strip())).strip()
        if row['belang'] not in ('essentieel', 'optioneel'):
            raise ValueError('Onbekende belangwaarde bij beroepstaak')
        if task:
            occupation = occupations[row['uri']]
            occupation['tasks'].add(task)
            occupation['essential_tasks' if row['belang'] == 'essentieel' else 'optional_tasks'].add(task)
    features, labels, kinds = defaultdict(set), {}, {}
    for filename, kind in [('beroepen_vaardigheden.csv', 'vaardigheid'),
                           ('beroepen_kennisgebieden.csv', 'kennisgebied')]:
        for row in read_rows(folder / filename, ('uri', 'item_uri', 'item_naam', 'belang')):
            if row['uri'] not in occupations:
                raise ValueError('Kenmerk bij onbekende beroeps-URI')
            uri = row['item_uri']
            if not uri:
                raise ValueError('Lege kenmerk-URI')
            features[row['uri']].add(uri)
            labels[uri] = row['item_naam']
            kinds[uri] = kind
    # Frequentie per uniek beroepsprofiel, niet per exportregel.
    frequencies = Counter(u for fs in features.values() for u in fs)
    idf = {u: 1 + math.log((1 + len(occupations)) / (1 + n)) for u, n in frequencies.items()}
    courses = {}
    for row in read_rows(folder / 'mbo.csv', ('code', 'opleiding', 'naam', 'definitie', 'beschrijving', 'hat_essentieel', 'hat_belangrijk')):
        c = courses.setdefault(row['code'], dict(names=set(), uris=set(), all_features=set(), descriptions=set()))
        if not row['code'].isdigit():
            raise ValueError('Ongeldige opleidingscode')
        c['names'].add(row['naam'].strip()); c['uris'].add(row['opleiding'])
        c['descriptions'].update(row[k].strip() for k in ('definitie', 'beschrijving') if row[k].strip())
        c['all_features'].update(row[k] for k in ('hat_essentieel', 'hat_belangrijk') if row[k])
    active = set()
    with (root / 'data/processed/onderwijs/studenten_mbo_friesland.csv').open(encoding='utf-8-sig') as stream:
        for row in csv.DictReader(stream, delimiter=';'):
            if row['Jaar'] == '2025':
                active.add(row['Erkende opleiding code'])
    course_keys = sorted(courses)
    occupation_keys = sorted(occupations)
    course_names = [' '.join(sorted(courses[c]['names'])) for c in course_keys]
    course_definitions = [' '.join(sorted(courses[c]['descriptions'])) for c in course_keys]
    name_model = TextComparison(course_names, [occupations[u]['name'] for u in occupation_keys])
    name_parts = TextComparison(course_names, [occupations[u]['name'] for u in occupation_keys], characters=True)
    definitions = TextComparison(course_definitions, [occupations[u]['definition'] for u in occupation_keys])
    # Er zijn geen aparte opleidingstaken: vergelijk de bestaande opleidingsbeschrijving
    # met de werkelijk aangeleverde beroepstaken, zonder opleidingstaken te verzinnen.
    tasks = TextComparison(course_definitions, [' '.join(sorted(occupations[u]['essential_tasks'])) for u in occupation_keys])
    optional_tasks = TextComparison(course_definitions, [' '.join(sorted(occupations[u]['optional_tasks'])) for u in occupation_keys])
    for occupation in occupations.values():
        occupation['_name_text'] = normalize_text(occupation['name'])
        occupation['_work_text'] = normalize_text(occupation['definition'] + ' ' + ' '.join(sorted(occupation['tasks'])))
    domain_vocabulary = set().union(*(domain_words(o['name'] + ' ' + o['definition']) for o in occupations.values()))
    results = []
    without_domain = 0
    unmatched_reasons = Counter()
    exact_matches = 0
    cbs_course_count = 0
    for course_index, code in enumerate(course_keys):
        course = courses[code]
        course_context = context.get(code, {})
        title_anchors = domain_anchors(course_names[course_index], domain_vocabulary)
        direction_anchors = domain_anchors(course_context.get('direction', ''), domain_vocabulary)
        anchors = title_anchors or direction_anchors
        without_domain += not bool(anchors)
        # Onuitgewerkte genid-verwijzingen blijven in de dekkingsrapportage.
        comparable = course['all_features'] & idf.keys()
        unresolved = course['all_features'] - idf.keys()
        name_scores, part_scores = name_model.scores(course_index), name_parts.scores(course_index)
        definition_scores, task_scores = definitions.scores(course_index), tasks.scores(course_index)
        optional_task_scores = optional_tasks.scores(course_index)
        components, ranking, direct_names = {}, [], set()
        fallback_pool, fallback_uris = [], set()
        stage_counts = Counter()
        for index, uri in enumerate(occupation_keys):
            occupation = occupations[uri]
            exact = (exact_specific_name(course['names'], occupation['name'])
                     and definition_scores.get(index, 0) > 0
                     and task_scores.get(index, 0) > 0)
            title_ok = domain_evidence(anchors, occupation)
            direction_ok = domain_evidence(direction_anchors, occupation)
            domain_ok = exact or (title_ok and direction_ok)
            text_parts = dict(naam=(name_scores.get(index, 0) + part_scores.get(index, 0)) / 2,
                definitie=definition_scores.get(index, 0),
                taken=weighted_task_score(task_scores.get(index, 0), optional_task_scores.get(index, 0),
                    occupation['essential_tasks'], occupation['optional_tasks']))
            text_score = sum(FALLBACK_WEIGHTS[k] * text_parts[k] for k in text_parts)
            role_factor = fallback_role_factor(course_names[course_index], occupation)
            if text_score > 0 and role_factor > 0:
                fallback_pool.append((int(title_ok) + int(direction_ok), role_factor,
                    text_score, uri, text_parts))
            if domain_ok:
                stage_counts['domain_before_level'] += 1
            if not level_compatible(course_context.get('level'), isco_levels.get(occupation['isco'], 0)):
                continue
            stage_counts['level'] += 1
            if not domain_ok:
                continue
            stage_counts['domain'] += 1
            if exact:
                direct_names.add(uri)
            components[uri] = dict(naam=(name_scores.get(index, 0) + part_scores.get(index, 0)) / 2,
                definitie=definition_scores.get(index, 0),
                taken=weighted_task_score(task_scores.get(index, 0), optional_task_scores.get(index, 0),
                    occupation['essential_tasks'], occupation['optional_tasks']),
                kenmerken=overlap(comparable, features.get(uri, set()), idf))
            content = components[uri]
            # Uitsluitend algemene kenmerken zijn geen voldoende kandidaatgrond meer.
            if any(content[k] > 0 for k in ('naam', 'definitie', 'taken')):
                ranking.append((sum(WEIGHTS[k] * content[k] for k in WEIGHTS), uri))
        # CBS-indexnamen zijn expliciete beroepsnaam→ISCO-relaties, geen
        # nieuwe scores voor opleidingsinhoud. Alleen exacte specifieke namen.
        cbs_candidates, cbs_supported, cbs_level_warnings = {}, set(), set()
        cbs_name_variants = set()
        for course_name in sorted(course['names']):
            if not domain_words(course_name):
                continue
            aliases = set().union(*(cbs_index.get(key, set()) for key in name_keys(course_name)))
            for alias, isco, label in sorted(aliases):
                compatible = level_compatible(course_context.get('level'), isco_levels.get(isco, 0))
                existing = [uri for _, uri in ranking if occupations[uri]['isco'] == isco
                            and name_key(occupations[uri]['name']) == name_key(alias)]
                if existing:
                    cbs_supported.update(existing)
                    supported_uris = existing
                else:
                    from urllib.parse import quote
                    uri = f'urn:cbs:isco08:index:{isco}:{quote(name_key(alias))}'
                    cbs_candidates[uri] = dict(name=alias, isco=isco, isco_name=label)
                    cbs_supported.add(uri)
                    supported_uris = [uri]
                if not compatible:
                    cbs_level_warnings.update(supported_uris)
                if name_key(course_name) != name_key(alias):
                    cbs_name_variants.update(supported_uris)
        cbs_course_count += bool(cbs_supported)
        ranked = sorted(ranking + [(None, uri) for uri in cbs_candidates],
                        key=lambda item: (item[1] not in cbs_supported, item[1] not in direct_names,
                                          -(item[0] or 0), item[1]))[:top]
        exact_matches += sum(uri in direct_names for _, uri in ranked)
        if not ranked:
            reason = ('context ontbreekt' if not course_context else
                      'geen kandidaat binnen niveaugrens' if not stage_counts['level'] else
                      'geen ondersteunde naam- of vakrichtingskoppeling' if not stage_counts['domain_before_level'] else
                      'vakinhoudelijke kandidaten buiten niveaugrens' if not stage_counts['domain'] else
                      'onvoldoende tekstuele aansluiting')
            unmatched_reasons[reason] += 1
            # Volledige kandidatenlijst op verzoek: alleen bestaande beroeps-URI’s,
            # één uitdrukkelijk onzeker voorstel waar de strengere regels niets opleveren.
            pool = sorted(fallback_pool, key=lambda item: (-item[2] * (1 + .15 * item[0]) * item[1], item[3]))[:30]
            reranked = []
            for domain_support, role_factor, text_score, uri, text_parts in pool:
                feature_score = overlap(comparable, features.get(uri, set()), idf)
                components[uri] = dict(text_parts, kenmerken=feature_score)
                score = text_score + FALLBACK_WEIGHTS['kenmerken'] * feature_score
                reranked.append((score * (1 + .15 * domain_support) * role_factor, score, uri))
            if reranked:
                chosen = sorted(reranked, key=lambda item: (-item[0], item[2]))[0]
                ranked = [(chosen[1], chosen[2])]
                fallback_uris.add(chosen[2])
        for rank, (score, uri) in enumerate(ranked or [(None, '')], start=1):
            occupation = occupations.get(uri, cbs_candidates.get(uri, {}))
            common = comparable & features.get(uri, set())
            names = lambda kind: ' | '.join(sorted({labels[u] for u in common if kinds[u] == kind}))
            results.append(dict(opleidingscode=code, opleidingsnaam=' | '.join(sorted(course['names'])),
                opleiding_uris=' | '.join(sorted(course['uris'])), geselecteerd_2025='ja' if code in active else 'nee',
                rang=rank if uri else '', beroeps_uri=uri, beroepsnaam=occupation.get('name', ''),
                isco_code=occupation.get('isco', ''), isco_naam=occupation.get('isco_name', ''),
                matchpercentage='' if score is None else round(score, 4),
                beoordeling=('Onzeker voorstel; vakrichting/niveau controleren' if uri in fallback_uris else
                             'CBS-naamkoppeling; niveau controleren' if uri in cbs_level_warnings else
                             'CBS-naamvariant; controleren' if uri in cbs_name_variants else
                             'CBS-naamkoppeling' if uri in cbs_supported else
                             'Naam en werkzaamheden sluiten aan' if uri in direct_names else
                             'Inhoudelijk voorstel' if uri else 'Onvoldoende informatie'),
                voorlopig_voorstel=uri in fallback_uris,
                herkomst='CBS-index en CompetentNL' if uri in cbs_supported and uri not in cbs_candidates else
                         'CBS-index (exacte beroepsnaam)' if uri in cbs_candidates else 'CompetentNL',
                status='naamkandidaat uit CBS-index; opleidingsrelatie niet gevalideerd' if uri in cbs_candidates else 'kandidaat; niet gevalideerd' if uri else 'onvoldoende vakinhoudelijke aansluiting',
                vaktermen=sorted(anchors),
                richtingstermen=sorted(direction_anchors),
                mbo_niveau=course_context.get('level'), isco_niveau=isco_levels.get(occupation.get('isco')),
                context_schooljaar=course_context.get('cohort'),
                exacte_naam_met_werkbewijs=uri in direct_names,
                deelscores={k: round(v, 4) for k, v in components.get(uri, {}).items()},
                gedeelde_vaardigheden=names('vaardigheid'), gedeelde_kennisgebieden=names('kennisgebied'),
                aantal_gedeeld=len(common), aantal_opleiding_vergelijkbaar=len(comparable),
                aantal_opleiding_onopgelost=len(unresolved), aantal_beroep_kenmerken=len(features.get(uri, set())),
                dekking_opleiding_pct=round(100 * len(comparable) / len(course['all_features']), 4) if course['all_features'] else 0,
                onopgeloste_uris=' | '.join(sorted(unresolved)),
                toelichting='Naam 30%, definitie 30%, beroepstaken tegenover opleidingsbeschrijving 30%, kenmerken 10%. Geen kans of officiële koppeling. '
                            'Alleen vergelijkbare kenmerken; geen cohort/datum in opleidingsbron. Niet historisch toepassen.'))
    if len({(r['opleidingscode'], r['beroeps_uri']) for r in results}) != len(results):
        raise ValueError('Dubbele kandidaatkoppelingen')
    if any(r['matchpercentage'] != '' and not 0 <= r['matchpercentage'] <= 100 for r in results):
        raise ValueError('Score buiten bereik')
    summary = dict(method='CBS-indexnaamkoppelingen plus TF-IDF/cosinus voor namen, definities en taken; IDF-Jaccard voor kenmerken. Geen gekalibreerde kans.',
        weights=WEIGHTS, fallback_weights=FALLBACK_WEIGHTS,
        courses_without_domain_anchors=without_domain,
        exact_name_matches_with_work_evidence=exact_matches,
        courses_with_exact_cbs_name=cbs_course_count, cbs_index_names=len(cbs_index),
        unmatched_reasons=dict(unmatched_reasons),
        courses_with_context=sum(c in context for c in courses),
        courses_without_context=sorted(c for c in courses if c not in context),
        level_policy=MAX_ISCO_LEVEL, context_source_sha256=context_hashes,
        courses_with_description=sum(bool(c['descriptions']) for c in courses.values()),
        occupations_with_tasks=sum(bool(o['tasks']) for o in occupations.values()),
        occupations=len(occupations), courses=len(courses), candidates=sum(bool(r['beroeps_uri']) for r in results),
        courses_with_candidates=len({r['opleidingscode'] for r in results if r['beroeps_uri']}),
        uncertain_fallback_courses=len({r['opleidingscode'] for r in results if r['voorlopig_voorstel']}),
        assessment_counts=dict(Counter(r['beoordeling'] for r in results)),
        active_2025=len(active), active_2025_with_profile=len(active & courses.keys()),
        active_2025_without_profile=sorted(active - courses.keys()),
        comparable_skills=len({u for c in courses.values() for u in c['all_features'] if kinds.get(u) == 'vaardigheid'}),
        comparable_knowledge=len({u for c in courses.values() for u in c['all_features'] if kinds.get(u) == 'kennisgebied'}),
        unresolved_uris=len({u for c in courses.values() for u in c['all_features'] if u not in idf}),
        source_sha256={name: hashlib.sha256((folder / name).read_bytes()).hexdigest() for name in FILES})
    return results, summary


def write_matches(root=ROOT, top=5):
    details, summary = build_matches(root, top)
    rows = [dict(zip(
        ['Opleidingscode', 'Mbo-opleiding', 'Mogelijk passend beroep',
         'ISCO-code', 'ISCO-beroepsgroep', 'Match (%)', 'Beoordeling'],
        [r['opleidingscode'], r['opleidingsnaam'].strip(), r['beroepsnaam'],
         r['isco_code'], r['isco_naam'],
         '' if r['matchpercentage'] == '' else f"{r['matchpercentage']:.1f}".replace('.', ','), r['beoordeling']]
    )) for r in details]
    target = Path(root) / 'data/processed/opleiding_beroep.csv'
    target.parent.mkdir(parents=True, exist_ok=True)
    # Valideer ook de CSV-serialisatie voordat de bestaande export wordt vervangen.
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8-sig', newline='', dir=target.parent, delete=False) as stream:
        tmp = Path(stream.name)
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]), delimiter=';')
        writer.writeheader(); writer.writerows(rows)
    try:
        restored = list(read_rows(tmp, rows[0]))
        expected = [{k: str(v) for k, v in row.items()} for row in rows]
        if restored != expected:
            raise ValueError('CSV-serialisatie wijkt af')
        tmp.replace(target)
    finally:
        tmp.unlink(missing_ok=True)
    return summary


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--top', type=int, default=5)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    summary = build_matches(top=args.top)[1] if args.check else write_matches(top=args.top)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
