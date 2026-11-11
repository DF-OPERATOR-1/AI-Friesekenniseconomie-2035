"""Experimentele, verklaarbare MBO–ESCO–ISCO-pipeline; behoudt bestaande koppelingen."""
import argparse
from collections import Counter, defaultdict
import csv
import gzip
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import time

from .esco import SOURCE_FOLDER, SOURCE_FILES, VERSION, PUBLICATION_ATTRIBUTION, canonical
from .esco_audit import read_table, trace_unit_groups
from .opleiding_beroep import ROOT, FILES, read_rows, load_context, TextComparison, level_compatible, name_key, fallback_role_factor

FIELDS = ('name', 'description', 'tasks', 'skills', 'knowledge')


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load_data(root):
    """Alleen bronrelaties; geen voorspeld beroep gebruiken om opleidingstaken te vullen."""
    root = Path(root)
    folder = root/'data/raw/competentnl'
    features, hashes = {}, {}
    for filename, kind in [('beroepen_vaardigheden.csv', 'skills'), ('beroepen_kennisgebieden.csv', 'knowledge')]:
        for r in read_rows(folder/filename, ('item_uri', 'item_naam', 'item_definitie')):
            feature = dict(uri=r['item_uri'], name=r['item_naam'], description=r['item_definitie'], kind=kind, code=r.get('item_code',''))
            old = features.get(feature['uri'])
            if old and old['kind'] != kind:
                raise ValueError('CompetentNL-kenmerk heeft conflicterend type')
            features[feature['uri']] = feature
    from .cnl_esco_mappings import bind_skill_bridge
    _,raw_esco_skills=read_table(root/SOURCE_FOLDER/'skills_nl.csv')
    bridge=bind_skill_bridge(root, features, canonical(raw_esco_skills))
    for relative in ('data/mappings/competentnl_esco_vaardigheden_tno.csv','data/raw/competentnl/mappings/competentNL-2025-vaardigheden-bijl1.pdf'):
        if (root/relative).exists():
            hashes[relative]=digest(root/relative)
    courses = {}
    for r in read_rows(folder/'mbo.csv', ('opleiding', 'code', 'naam', 'definitie', 'beschrijving', 'hat_essentieel', 'hat_belangrijk')):
        c = courses.setdefault(r['code'], dict(code=r['code'], uris=set(), names=set(), descriptions=set(),
                    skills={}, knowledge={}, tasks=None, unresolved=set(), requirements=set()))
        c['uris'].add(r['opleiding']); c['names'].add(r['naam'])
        c['descriptions'].update(r[k].strip() for k in ('definitie', 'beschrijving') if r[k].strip())
        for key in ('beroepsvereiste', 'bijzonder_vereiste', 'taalvoorschrift'):
            if r.get(key) not in ('', 'false', None):
                c['requirements'].add(f'{key}: {r[key]}')
        for key, importance in [('hat_essentieel', 'essential'), ('hat_belangrijk', 'important')]:
            uri = r[key].strip()
            if not uri:
                continue
            if uri not in features:
                c['unresolved'].add(uri)
                continue
            f = dict(features[uri], importance=importance)
            previous = c[f['kind']].get(uri)
            if not previous or importance == 'essential':
                c[f['kind']][uri] = f
    context, isco_levels, context_hashes = load_context(root)
    hashes.update(context_hashes)
    for c in courses.values():
        for field in ('skills', 'knowledge'):
            c[field] = sorted(c[field].values(), key=lambda f:f['uri'])
        for field in ('uris', 'names', 'unresolved', 'requirements'):
            c[field] = sorted(c[field])
        c['name'] = ' / '.join(c['names'])
        c['description'] = '\n'.join(sorted(c.pop('descriptions')))
        c['context'] = context.get(c['code'], {})
    tables = {}
    for name in SOURCE_FILES:
        p = root/SOURCE_FOLDER/name
        _, tables[name] = read_table(p)
        hashes[str(p.relative_to(root))] = digest(p)
    jobs = canonical(tables['occupations_nl.csv'])
    skills = canonical(tables['skills_nl.csv'])
    groups = canonical(tables['ISCOGroups_nl.csv'])
    group_codes = {u:r['code'] for u,r in groups.items()}
    labels = {r['code']:r['preferredLabel'] for r in groups.values()}
    parents = defaultdict(set)
    for r in tables['broaderRelationsOccPillar_nl.csv']:
        parents[r['conceptUri']].add(r['broaderUri'])
    occupations = {}
    for uri, r in jobs.items():
        reached, cyclic = trace_unit_groups(uri, parents, group_codes)
        if cyclic or reached != {r['iscoGroup']} or len(r['iscoGroup']) != 4:
            raise ValueError('Ongeldige officiële ESCO–ISCO-relatie')
        occupations[uri] = dict(uri=uri, name=r['preferredLabel'], aliases=r['altLabels'],
            description=r['description'], isco=r['iscoGroup'], isco_name=labels[r['iscoGroup']],
            isco_level=isco_levels.get(r['iscoGroup']), tasks=None, skills=[], knowledge=[],
            untyped=[], regulated_note=r['regulatedProfessionNote'], esco_version=VERSION)
    frequency = Counter()
    seen = {}
    for r in tables['occupationSkillRelations_nl.csv']:
        uri, feature_uri = r['occupationUri'], r['skillUri']
        if uri not in occupations or feature_uri not in skills or r['relationType'] not in ('essential','optional'):
            raise ValueError('Ongeldige ESCO-competentierelatie')
        pair = (uri, feature_uri)
        if pair in seen:
            if seen[pair] != r['relationType']:
                raise ValueError('Conflicterend ESCO-relatietype')
            continue
        seen[pair] = r['relationType']
        rskill = skills[feature_uri]
        kind = {'knowledge':'knowledge', 'skill/competence':'skills'}.get(rskill['skillType'], 'untyped')
        occupations[uri][kind].append(dict(uri=feature_uri, name=rskill['preferredLabel'],
            description=rskill['description'], importance=r['relationType'], reuse_level=rskill['reuseLevel']))
        frequency[feature_uri] += 1
    for filename in FILES:
        hashes[f'data/raw/competentnl/{filename}'] = digest(folder/filename)
    # URI-overlap is audited, but no mapping is invented from similar labels.
    cnl_uris = set(features)
    esco_uris = set(skills)
    normalize = lambda u:u.replace('http://', 'https://', 1)
    crosswalk_overlap = {normalize(u) for u in cnl_uris} & {normalize(u) for u in esco_uris}
    return sorted(courses.values(), key=lambda c:c['code']), sorted(occupations.values(), key=lambda o:o['uri']), dict(
        hashes=hashes, competence_frequency=dict(frequency), official_cnl_esco_competence_overlap=len(crosswalk_overlap),
        unique_unresolved_course_references=len({u for c in courses.values() for u in c['unresolved']}),
        supplemental_mapping=bridge,
        note='Geen officiële opleiding–ESCO-crosswalk ingelezen. De bruikbare TNO-vaardigheidsmapping is actief als gerichte, gedeeltelijke brononderbouwing. Nul identieke competentie-URI’s betekent niet dat crosswalkrelaties ontbreken. Voorspellingen zijn geen officiële opleidingsrelaties.')


def combine(scores, weights):
    active = {k:w for k,w in weights.items() if scores.get(k) is not None and w > 0}
    total = sum(active.values())
    score = sum(scores[k]*w for k,w in active.items())/total if total else None
    return score, {k:w/total for k,w in active.items()}, total/sum(weights.values())


def classify(score, thresholds, role_evidence=True, compatible=None, coverage=None):
    if score is None or score < thresholds['uncertain']:
        return 'geen match'
    if not role_evidence or compatible is False:
        return 'onzeker'
    if score >= thresholds['direct'] and compatible is True and coverage is not None and coverage >= .75:
        return 'directe beroepsmatch'
    return 'verwant beroep' if score >= thresholds['related'] else 'onzeker'


def aggregate_isco(candidates):
    groups = {}
    for c in candidates:
        g = groups.setdefault(c['isco'], dict(isco=c['isco'], name=c['isco_name'], score=c['score'], occupations=[]))
        if c['uri'] not in g['occupations']:
            g['occupations'].append(c['uri'])
        g['score'] = max(g['score'], c['score'])
    return sorted(groups.values(), key=lambda g:(-g['score'], g['isco']))


class Encoder:
    """Veldteksten en individuele competenties; tokenchunks zonder stil tekstverlies."""
    def __init__(self, model_name, revision, cache, local_path=None, batch_size=32, chunk_tokens=80, device='cpu'):
        import torch
        from sentence_transformers import SentenceTransformer
        os.environ['TOKENIZERS_PARALLELISM'] = 'false'
        torch.set_num_threads(4); torch.manual_seed(0)
        self.model = SentenceTransformer(str(local_path or model_name), revision=None if local_path else revision,
            local_files_only=True, trust_remote_code=False, device=device, model_kwargs={'use_safetensors':True})
        self.model_name, self.revision = model_name, revision
        self.cache = Path(cache); self.cache.mkdir(parents=True, exist_ok=True)
        self.batch_size = batch_size
        self.chunk_tokens = min(chunk_tokens, self.model.max_seq_length - 8)

    def encode(self, texts):
        import numpy as np
        texts = sorted(set(t for t in texts if t.strip()))
        meta = dict(model=self.model_name, revision=self.revision, texts=texts, chunk_tokens=self.chunk_tokens,
                    prefix='query/passsage' if 'e5' in self.model_name.lower() else '')
        # E5 query/passage differences need separate query/document representations.
        if 'e5' in self.model_name.lower():
            raise ValueError('E5 vereist aparte query/passage-encoders; kies BGE-M3 of de MiniLM-vergelijkingsbasis')
        key = hashlib.sha256(json.dumps(meta,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
        path = self.cache/f'{key}.npz'
        if path.exists():
            with np.load(path,allow_pickle=False) as data:
                vectors = data['vectors']
        else:
            chunks, owners = [], []
            for i, text in enumerate(texts):
                ids = self.model.tokenizer.encode(text, add_special_tokens=False, verbose=False)
                for start in range(0,len(ids),self.chunk_tokens):
                    chunks.append(self.model.tokenizer.decode(ids[start:start+self.chunk_tokens],skip_special_tokens=True)); owners.append(i)
            vectors = np.zeros((len(texts), self.model.get_embedding_dimension()),dtype='float32')
            counts = np.zeros(len(texts),dtype='float32')
            last = 0
            for start in range(0,len(chunks),self.batch_size):
                batch = self.model.encode(chunks[start:start+self.batch_size],normalize_embeddings=True,
                    convert_to_numpy=True,show_progress_bar=False,batch_size=self.batch_size)
                for j,v in enumerate(batch,start=start):
                    vectors[owners[j]] += v; counts[owners[j]] += 1
                if time.monotonic()-last > 20:
                    print(f'Embeddingdelen {min(start+self.batch_size,len(chunks))}/{len(chunks)}',flush=True);last=time.monotonic()
            vectors /= np.maximum(counts[:,None],1)
            vectors /= np.maximum(np.linalg.norm(vectors,axis=1,keepdims=True),1e-12)
            if not np.isfinite(vectors).all():
                raise ValueError('Niet-eindige embeddings')
            np.savez_compressed(path,vectors=vectors)
        if vectors.shape != (len(texts), self.model.get_embedding_dimension()) or not np.isfinite(vectors).all():
            raise ValueError('Ongeldige embeddingcache')
        self.vectors = dict(zip(texts,vectors))
        self.cache_hash = key
        return self.vectors


def feature_text(feature):
    return feature['name'] + ('\n'+feature['description'] if feature.get('description') else '')


def field_text(profile, kind):
    if kind in ('name','description'):
        return profile[kind]
    return '\n'.join(feature_text(f) for f in (profile.get(kind) or []))


def cosine(left, right, vectors):
    if not left.strip() or not right.strip():
        return None
    return max(0., min(1.,float(vectors[left] @ vectors[right])))


def competence_coverage(course, occupation, vectors, frequency, total_jobs, config):
    """Beide richtingen met IDF/reuse-weging; ontbrekende velden blijven onbekend."""
    import numpy as np
    if not course or not occupation:
        return dict(occupation_to_course=None,course_to_occupation=None,weighted_score=None,specificity=None,evidence=[],not_demonstrated=[],mapping_evidence=[])
    left = np.stack([vectors[feature_text(f)] for f in course])
    right = np.stack([vectors[feature_text(f)] for f in occupation])
    similarities = np.clip(right @ left.T,0,1)
    threshold = config['competence_evidence_threshold']
    weights = []
    evidence, missing, mapping_evidence = [], [], []
    mapped_pairs={}
    for i,f in enumerate(occupation):
        for j,g in enumerate(course):
            for mapping in g.get('esco_mappings',[]):
                if mapping['uri'] == f['uri'] and mapping['direction']=='cnl_to_esco':
                    value=config.get('mapping_scores',{}).get(mapping['relation'], .6 if mapping['relation']=='broadMatch' else .85)
                    similarities[i,j]=value
                    mapped_pairs[i,j]=mapping
                    mapping_evidence.append(dict(required_uri=f['uri'],course_uri=g['uri'],relation=mapping['relation'],direction=mapping['direction'],source_url=mapping['source_url'],source_page=mapping['source_page'],evidence_score=value,partial_support=True))
        identity_indices = [j for j,g in enumerate(course) if f['uri'].replace('http://','https://') == g['uri'].replace('http://','https://')]
        if identity_indices:
            similarities[i,identity_indices[0]] = 1.
        j = int(similarities[i].argmax()); value = float(similarities[i,j])
        identity = j in identity_indices
        reuse = config['generic_weights'].get(f.get('reuse_level',''),.25)
        weight = (1+math.log((1+total_jobs)/(1+frequency.get(f['uri'],0)))) * reuse
        weights.append(weight * (1 if f['importance']=='essential' else .5))
        record = dict(required_uri=f['uri'], required_name=f['name'], course_uri=course[j]['uri'],
            course_name=course[j]['name'], similarity=round(value,5), method='official_identifier' if identity else 'source_'+mapped_pairs[i,j]['relation'] if (i,j) in mapped_pairs else 'semantic_prediction')
        if value >= threshold:
            evidence.append(record)
        elif f['importance']=='essential':
            missing.append(dict(uri=f['uri'],name=f['name'],reason='Niet aangetoond in de gebruikte opleidingsbron',best_similarity=round(value,5)))
    forward = float(np.average(similarities.max(axis=0)))
    reverse = float(np.average(similarities.max(axis=1),weights=weights))
    specificity = sum(config['generic_weights'].get(f.get('reuse_level',''),.25) for f in occupation)/len(occupation)
    return dict(occupation_to_course=reverse,course_to_occupation=forward,specificity=specificity,weighted_score=reverse*specificity,evidence=evidence,not_demonstrated=missing,mapping_evidence=mapping_evidence,
                multiple_requirements_per_course_feature=len(set(similarities.argmax(axis=1).tolist())) < len(occupation))


def evaluate(rankings, labels, k=5):
    """Complete menselijke referenties; onbeoordeeld is nooit automatisch negatief."""
    complete = [r for r in labels if r.get('complete') is True and r.get('reviewer_type') == 'human'
                and r['code'] in rankings]
    if not complete:
        return dict(status='onvoldoende gevalideerde gegevens', evaluated_courses=0,
                    precision=None, recall=None, f1=None, recall_at_10=None, precision_at_k=None)
    tp = fp = fn = 0
    recalls10, precisionsk, macro = [], [], []
    for r in complete:
        expected = set(r['positive_esco_uris'])
        predicted = set(rankings[r['code']].get('selected', []))
        ordered = list(dict.fromkeys(rankings[r['code']]['ranked']))
        hit, false, missed = len(predicted & expected), len(predicted-expected), len(expected-predicted)
        tp += hit; fp += false; fn += missed
        precision = hit/(hit+false) if hit+false else 0.
        recall = hit/(hit+missed) if hit+missed else 0.
        macro.append((precision, recall, 2*precision*recall/(precision+recall) if precision+recall else 0.))
        if expected:
            recalls10.append(len(set(ordered[:10]) & expected)/len(expected))
        precisionsk.append(len(set(ordered[:k]) & expected)/k)
    precision = tp/(tp+fp) if tp+fp else 0.
    recall = tp/(tp+fn) if tp+fn else 0.
    return dict(status='alleen complete menselijke referenties', evaluated_courses=len(complete),
        precision=precision, recall=recall, f1=2*precision*recall/(precision+recall) if precision+recall else 0.,
        macro=dict(zip(('precision','recall','f1'),[sum(row[i] for row in macro)/len(macro) for i in range(3)])),
        recall_at_10=sum(recalls10)/len(recalls10) if recalls10 else None,
        precision_at_k=sum(precisionsk)/len(precisionsk), k=k)


def evaluate_models(rankings, labels, courses, jobs):
    known = {o['uri']:o for o in jobs}
    if len({r['code'] for r in labels}) != len(labels):
        raise ValueError('Dubbele opleiding in referenties')
    for r in labels:
        positive, negative = set(r['positive_esco_uris']), set(r.get('negative_esco_uris', []))
        if positive & negative or not (positive | negative) <= set(known):
            raise ValueError('Onbekende of tegenstrijdige ESCO-referenties')
    report = {}
    for method, predictions in rankings.items():
        base = evaluate(predictions, labels)
        strata = dict(mbo_level=defaultdict(set), sector=defaultdict(set), occupational_group=defaultdict(set))
        for c in courses:
            strata['mbo_level'][str(c['context'].get('level', 'onbekend'))].add(c['code'])
            strata['sector'][c['context'].get('sector', 'onbekend')].add(c['code'])
        for r in labels:
            for uri in r['positive_esco_uris']:
                strata['occupational_group'][known[uri]['isco']].add(r['code'])
        base['strata'] = {dimension:{group:evaluate({k:v for k,v in predictions.items() if k in codes}, labels)
                         for group,codes in groups.items()} for dimension,groups in strata.items()}
        # Aggregate and deduplicate rankings and references before scoring ISCO.
        isco_predictions = {}
        for code,p in predictions.items():
            isco_predictions[code] = {key:list(dict.fromkeys(known[uri]['isco'] for uri in uris)) for key,uris in p.items()}
        isco_labels = [dict(r,positive_esco_uris=list({known[u]['isco'] for u in r['positive_esco_uris']})) for r in labels]
        base['isco'] = evaluate(isco_predictions, isco_labels)
        report[method] = base
    return report


def run(root, config_path, cache, model=None, revision=None, local_path=None, limit=None, rerank=False, device='cpu', reranker_lock=Path('/tmp/isco-ml-models/revisions.json')):
    import numpy as np
    root, cache = Path(root),Path(cache)
    config=json.loads(Path(config_path).read_text())
    model=model or config['model']
    if set(config['weights']) != set(FIELDS) or any(w < 0 for w in config['weights'].values()) or sum(config['weights'].values()) <= 0:
        raise ValueError('Ongeldige componentgewichten')
    if not 0 <= config['thresholds']['uncertain'] < config['thresholds']['related'] < config['thresholds']['direct'] <= 1:
        raise ValueError('Ongeldige matchdrempels')
    if config['top_k'] < 10 or (limit is not None and limit < 1):
        raise ValueError('Ongeldige kandidatenlimiet')
    if not revision:
        raise ValueError('Leg een expliciete modelrevisie vast met --revision')
    courses,jobs,meta=load_data(root)
    if limit:
        courses=courses[:limit]
    print(f'{len(courses)} opleidingen; {len(jobs)} ESCO-beroepen; model {model}',flush=True)
    encoder=Encoder(model,revision,cache,local_path,config['batch_size'],config['chunk_tokens'],device)
    texts=[]
    for profile in courses+jobs:
        texts.extend(field_text(profile,f) for f in ('name','description'))
        texts.extend(feature_text(f) for kind in ('skills','knowledge') for f in profile[kind])
    vectors=encoder.encode(texts)
    metadata=dict(config=config,source=meta,model=model,revision=revision,esco_version=VERSION,language='nl',
        libraries={name:importlib.metadata.version(name) for name in ('sentence-transformers','transformers','torch','numpy')},
        previous_matching_sha256=digest(root/'data/processed/opleiding_beroep.csv'),
        task_evidence='Niet beschikbaar in de opleidingsbron en de gebruikte ESCO-export',
        embedding_cache_hash=encoder.cache_hash,method_version='mbo-esco-3',scores_are_probabilities=False,
        llm_validation='niet uitgevoerd',supervised_learning='niet getraind; menselijke labels ontbreken')
    lexical=TextComparison([c['name']+' '+c['description'] for c in courses],
                          [o['name']+' '+o['aliases']+' '+o['description'] for o in jobs])
    exact_aliases=defaultdict(set)
    for j,o in enumerate(jobs):
        for alias in [o['name']]+o['aliases'].splitlines():
            if alias.strip():
                exact_aliases[name_key(alias)].add(j)
    name_comparison=TextComparison([c['name'] for c in courses], [o['name'] for o in jobs], characters=True)
    from .opleiding_beroep_ml import RERANK_MODEL, RERANK_REVISION
    reranker=None
    rerank_cache_path=cache/'rerank_scores.json'
    rerank_cache=json.loads(rerank_cache_path.read_text()) if rerank_cache_path.exists() else {}
    if rerank:
        from sentence_transformers import CrossEncoder
        lock=json.loads(Path(reranker_lock).read_text())
        if lock[RERANK_MODEL]['revision']!=RERANK_REVISION:
            raise ValueError('Rerankerrevisie wijkt af')
        reranker=CrossEncoder(lock[RERANK_MODEL]['path'],local_files_only=True,trust_remote_code=False,device=device,
                            model_kwargs={'use_safetensors':True})
        metadata['reranker']=dict(model=RERANK_MODEL,revision=RERANK_REVISION)
    job_names=np.stack([vectors[o['name']] for o in jobs])
    job_descriptions=np.stack([vectors[o['description']] for o in jobs])
    results=[]; rankings={m:{} for m in 'ABCD'}
    for ix,c in enumerate(courses):
        names=job_names@vectors[c['name']]
        descriptions=job_descriptions@vectors[c['description']] if c['description'] else names
        retrieval=.35*names+.65*descriptions
        embedding_indices=sorted(range(len(jobs)),key=lambda j:(-float(retrieval[j]),jobs[j]['uri']))[:config['top_k']]
        lexical_names=name_comparison.scores(ix)
        exact_names=set().union(*(exact_aliases.get(name_key(n),set()) for n in c['names']))
        for j in exact_names:
            lexical_names[j]=100.
        lexical_indices=sorted(range(len(jobs)),key=lambda j:(-lexical_names.get(j,0),jobs[j]['uri']))
        slots=config.get('retrieval_lexical_slots',0)
        indices=list(dict.fromkeys(embedding_indices[:config['top_k']-slots]+lexical_indices[:slots]+embedding_indices))[:config['top_k']]
        a=lexical.scores(ix)
        a_top=sorted(range(len(jobs)),key=lambda j:(-a.get(j,0),jobs[j]['uri']))[:config['top_k']]
        rankings['A'][c['code']]=dict(ranked=[jobs[j]['uri'] for j in a_top],selected=[jobs[j]['uri'] for j in a_top if a.get(j,0)/100 >= config['thresholds']['related']])
        rankings['B'][c['code']]=dict(ranked=[jobs[j]['uri'] for j in embedding_indices],selected=[jobs[j]['uri'] for j in embedding_indices if retrieval[j] >= config['thresholds']['related']])
        candidates=[]
        for j in indices:
            o=jobs[j]
            cover={kind:competence_coverage(c[kind],o[kind],vectors,meta['competence_frequency'],len(jobs),config) for kind in ('skills','knowledge')}
            name_semantic=max(0.,float(names[j]))
            name_lexical=lexical_names.get(j,0)/100
            mix=config.get('name_semantic_weight',1.)
            scores=dict(name=mix*name_semantic+(1-mix)*name_lexical,description=max(0.,float(descriptions[j])) if c['description'] else None,
                        tasks=None, skills=cover['skills']['weighted_score'],knowledge=cover['knowledge']['weighted_score'])
            score,active,evidence_share=combine(scores,config['weights'])
            unadjusted_score=score
            role_factor=fallback_role_factor(c['name'],o) if config.get('role_check') else 1.
            score *= role_factor
            mbo_level=c['context'].get('level')
            compatible=level_compatible(mbo_level,o['isco_level']) if mbo_level and o['isco_level'] else None
            role_evidence=max(scores['name'], scores['description'] or 0)>=config['minimum_role_evidence']
            minimum_coverage=min([cover[k]['occupation_to_course'] for k in ('skills','knowledge') if cover[k]['occupation_to_course'] is not None],default=None)
            state=classify(score,config['thresholds'],role_evidence,compatible,minimum_coverage)
            candidates.append(dict(uri=o['uri'],name=o['name'],isco=o['isco'],isco_name=o['isco_name'],
                name_evidence=dict(semantic=name_semantic,lexical=name_lexical,exact_source_alias=j in exact_names),
                unadjusted_score=unadjusted_score,role_factor=role_factor,
                score=round(score,5),retrieval_score=round(float(retrieval[j]),5),components=scores,
                active_weights=active,available_weight_share=evidence_share,coverage=cover,
                missing_components=[f for f in FIELDS if scores[f] is None],
                level_check=dict(mbo_level=mbo_level,isco_skill_level=o['isco_level'],compatible_heuristic=compatible,
                    note='Conservatieve signalering; mbo-niveau en ISCO-vaardigheidsniveau zijn verschillende schalen.'),
                access_requirements=dict(status='niet vastgesteld',esco_note_uri=o['regulated_note'],course_source_flags=c['requirements']),
                classification=state,validation_status='menselijke controle nodig',
                mbo_esco_relation='predicted',esco_isco_relation='official',method='C',
                explanation='Voorspelde opleidingsrelatie; officiële ESCO–ISCO-code. Ontbrekende componenten zijn niet als nul meegerekend. De score is geen kanspercentage.'))
        candidates.sort(key=lambda r:(-r['score'],r['uri']))
        rankings['C'][c['code']]=dict(ranked=[r['uri'] for r in candidates],selected=[r['uri'] for r in candidates if r['classification'] in ('directe beroepsmatch','verwant beroep')])
        if reranker:
            # Bronkandidaten blijven vast; logit en sigmoid worden beide als modelscore opgeslagen.
            pairs=[(c['name']+'\n'+c['description'],o['name']+'\n'+o['description']) for o in [jobs[j] for j in indices]]
            keys=[hashlib.sha256(json.dumps(dict(model=RERANK_MODEL,revision=RERANK_REVISION,pair=p),ensure_ascii=False,sort_keys=True).encode()).hexdigest() for p in pairs]
            missing=[i for i,k in enumerate(keys) if k not in rerank_cache]
            if missing:
                logits=reranker.predict([pairs[i] for i in missing],batch_size=config['batch_size'],show_progress_bar=False,activation_fn=__import__('torch').nn.Identity())
                for i,v in zip(missing,logits):
                    rerank_cache[keys[i]]=float(v)
                rerank_cache_path.write_text(json.dumps(rerank_cache)+'\n')
            by_uri={jobs[j]['uri']:rerank_cache[k] for j,k in zip(indices,keys)}
            for r in candidates:
                logit=by_uri[r['uri']]; value=1/(1+math.exp(-max(-50,min(50,logit))))
                r['reranker_logit']=logit;r['reranker_score']=value
                r['d_score']=(1-config['rerank_weight'])*r['score']+config['rerank_weight']*value
            d=sorted(candidates,key=lambda r:(-r['d_score'],r['uri']))
            rankings['D'][c['code']]=dict(ranked=[r['uri'] for r in d],selected=rankings['C'][c['code']]['selected'])
        results.append(dict(code=c['code'],name=c['name'],uris=c['uris'],context=c['context'],
            unresolved_references=c['unresolved'],linked_competencies=[dict(cnl_uri=f['uri'],cnl_name=f['name'],**m) for f in c['skills'] for m in f.get('esco_mappings',[])],candidates=candidates,isco=aggregate_isco(candidates)))
        if ix%20==0:
            print(f'Matching {ix+1}/{len(courses)}',flush=True)
    labels_path=root/'data/mappings/mbo_esco_validatie.json'
    labels=json.loads(labels_path.read_text())['labels'] if labels_path.exists() else []
    evaluation=evaluate_models(rankings,labels,courses,jobs)
    if not rerank:
        evaluation['D']=dict(status='niet uitgevoerd')
    evaluation['E']=dict(status='niet uitgevoerd; optionele LLM-validatie nog niet ingeschakeld')
    metadata['evaluation']=evaluation
    metadata['config_sha256']=digest(config_path)
    metadata['pipeline_sha256']={str(p.relative_to(ROOT)):digest(p) for p in (Path(__file__), ROOT/'research/pipeline/imports/opleiding_beroep.py',ROOT/'research/pipeline/imports/esco.py',ROOT/'research/pipeline/imports/esco_audit.py',ROOT/'research/pipeline/imports/cnl_esco_mappings.py')}
    metadata['evaluation_label_sha256']=digest(labels_path) if labels_path.exists() else None
    run_id=hashlib.sha256(json.dumps(metadata,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    metadata['run_id']=run_id
    result=dict(metadata=metadata,courses=results,rankings=rankings)
    target=root/'data/processed';target.mkdir(parents=True,exist_ok=True)
    (target/'controles').mkdir(parents=True,exist_ok=True)
    (target/'mbo_esco_matches.json.gz').write_bytes(gzip.compress((json.dumps(result,ensure_ascii=False)+'\n').encode(),mtime=0))
    (target/'controles/mbo_esco_evaluatie.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    export_tables(result, target)
    print(f'Opgeslagen: {len(results)} opleidingen; {run_id}',flush=True)
    return result


def proposed_candidates(candidates):
    """Variabel aantal; een kandidatenlijst is geen lijst bevestigde beroepen."""
    return [r for r in candidates if r['classification'] in ('directe beroepsmatch','verwant beroep')]


def isco_proposals(candidates):
    proposals=proposed_candidates(candidates)
    for r in proposals:
        if len(r['isco'])!=4 or not r['isco'].isdigit() or r.get('esco_isco_relation')!='official':
            raise ValueError('ISCO-export vereist een officiële viercijferige ESCO–ISCO-relatie')
    groups=aggregate_isco(proposals)
    by_uri={r['uri']:r for r in proposals}
    for g in groups:
        g['occupation_names']=[by_uri[u]['name'] for u in g['occupations']]
        g['status']='Voorspelde opleidingsrelatie; menselijke controle nodig'
    return groups


def export_tables(result, target):
    target=Path(target)
    (target/'controles').mkdir(parents=True,exist_ok=True)
    headers=['Opleidingscode','Opleiding','Mogelijk beroep','ISCO-code','ISCO-beroepsgroep','Matchscore (geen kanspercentage)','Beoordeling','ESCO-identificatie']
    def write(filename, choose):
        with (target/filename).open('w',newline='',encoding='utf-8-sig') as handle:
            writer=csv.writer(handle,delimiter=';');writer.writerow(headers)
            for c in result['courses']:
                for r in choose(c['candidates']):
                    writer.writerow([c['code'],c['name'],r['name'],r['isco'],r['isco_name'],f"{100*r['score']:.1f}".replace('.',','),r['classification'],r['uri']])
    write('mbo_esco_matches.csv',proposed_candidates)
    write('mbo_esco_kandidaten.csv',lambda rows:rows)
    with (target/'mbo_isco_via_esco.csv').open('w',newline='',encoding='utf-8-sig') as handle:
        writer=csv.writer(handle,delimiter=';')
        writer.writerow(['Opleidingscode','Opleiding','ISCO-code','ISCO-beroepsgroep','Onderbouwende ESCO-beroepen','Matchscore (geen kanspercentage)','Beoordeling'])
        for c in result['courses']:
            for g in isco_proposals(c['candidates']):
                writer.writerow([c['code'],c['name'],g['isco'],g['name'],' | '.join(g['occupation_names']),f"{100*g['score']:.1f}".replace('.',','),g['status']])
    with (target/'mbo_esco_opleidingen.csv').open('w',newline='',encoding='utf-8-sig') as handle:
        writer=csv.writer(handle,delimiter=';')
        writer.writerow(['Opleidingscode','Opleiding','Aantal voorstellen','Aantal onzekere kandidaten','Beoordeling'])
        for c in result['courses']:
            count=len(proposed_candidates(c['candidates']))
            uncertain=sum(r['classification']=='onzeker' for r in c['candidates'])
            writer.writerow([c['code'],c['name'],count,uncertain,'Voorstellen vereisen controle' if count else 'Onvoldoende onderbouwing voor een voorstel; betekent niet dat er geen passende beroepen zijn'])
    with (target/'mbo_esco_competenties.csv').open('w',newline='',encoding='utf-8-sig') as stream:
        writer=csv.writer(stream,delimiter=';')
        writer.writerow(['Opleidingscode','Opleiding','CompetentNL-vaardigheid','ESCO-vaardigheid','Relatietype','CompetentNL-URI','ESCO-URI','Bronpagina'])
        for c in result['courses']:
            for m in c.get('linked_competencies',[]):
                writer.writerow([c['code'],c['name'],m['cnl_name'],m['name'],m['relation'],m['cnl_uri'],m['uri'],m['source_page']])
    review=dict(note='Alleen onafhankelijke menselijke beoordelingen worden referenties. Dit zijn alle beoordeelde bronkandidaten, geen vaste top vijf en geen complete positieve lijst.',
        labels=[dict(code=c['code'],reviewer_type='unreviewed',complete=False,positive_esco_uris=[],negative_esco_uris=[],
            candidate_esco_uris=[r['uri'] for r in c['candidates']]) for c in result['courses']])
    (target/'controles/mbo_esco_reviewvoorstel.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n')


def export_existing(root=ROOT):
    target=Path(root)/'data/processed'
    quality=target/'mbo_esco_quality.json.gz'
    if quality.exists():
        from .mbo_esco_quality import export
        export(json.loads(gzip.decompress(quality.read_bytes())),root)
        print('Actuele kwaliteitsuitvoer geëxporteerd, inclusief afzonderlijke bronroutes.')
        return
    result=json.loads(gzip.decompress((target/'mbo_esco_matches.json.gz').read_bytes()))
    export_tables(result,target)
    print('Variabele voorstellen, volledige kandidaten en opleidingsoverzicht geëxporteerd.')


def refresh_evaluation(root=ROOT):
    """Herbeoordeel bestaande vectorscores met labels; geen model opnieuw laden."""
    root = Path(root)
    target = root/'data/processed'
    (target/'controles').mkdir(parents=True,exist_ok=True)
    path = target/'mbo_esco_matches.json.gz'
    result = json.loads(gzip.decompress(path.read_bytes()))
    courses, jobs, source = load_data(root)
    if source['hashes'] != result['metadata']['source']['hashes']:
        raise ValueError('Bronnen gewijzigd; voer de matching opnieuw uit')
    context = {c['code']:c['context'] for c in courses}
    config = result['metadata']['config']
    for c in result['courses']:
        c['context'] = context[c['code']]
        if c['code'] in result['rankings']['D']:
            selected = []
            for r in c['candidates']:
                components = r['components']
                coverage = min([r['coverage'][k]['occupation_to_course'] for k in ('skills','knowledge')
                                if r['coverage'][k]['occupation_to_course'] is not None], default=None)
                r['d_classification'] = classify(r['d_score'], config['thresholds'],
                    max(components['name'], components['description'] or 0) >= config['minimum_role_evidence'],
                    r['level_check']['compatible_heuristic'], coverage)
                if r['d_classification'] in ('directe beroepsmatch','verwant beroep'):
                    selected.append(r['uri'])
            result['rankings']['D'][c['code']]['selected'] = selected
    labels_path = root/'data/mappings/mbo_esco_validatie.json'
    labels = json.loads(labels_path.read_text())['labels'] if labels_path.exists() else []
    metadata = result['metadata']
    metadata['evaluation'] = evaluate_models(result['rankings'], labels, courses, jobs)
    if not result['rankings']['D']:
        metadata['evaluation']['D'] = dict(status='niet uitgevoerd')
    metadata['evaluation']['E'] = dict(status='niet uitgevoerd; optionele LLM-validatie nog niet ingeschakeld')
    metadata['evaluation_label_sha256'] = digest(labels_path) if labels_path.exists() else None
    metadata['previous_matching_sha256'] = digest(root/'data/processed/opleiding_beroep.csv')
    metadata['libraries'] = {name:importlib.metadata.version(name) for name in ('sentence-transformers','transformers','torch','numpy')}
    metadata['task_evidence'] = 'Niet beschikbaar in de opleidingsbron en de gebruikte ESCO-export'
    metadata['publication_attribution'] = PUBLICATION_ATTRIBUTION
    metadata['adaptation'] = 'Nederlandse ESCO-bronprofielen worden geselecteerd en gegroepeerd per officiële ISCO-code; opleidingsrelaties worden experimenteel voorspeld.'
    metadata.pop('run_id',None)
    metadata['run_id'] = hashlib.sha256(json.dumps(metadata,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    path.write_bytes(gzip.compress((json.dumps(result,ensure_ascii=False)+'\n').encode(),mtime=0))
    (target/'controles/mbo_esco_evaluatie.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
    print('Evaluatie bijgewerkt; bestaande embeddings en C-scores behouden.',flush=True)
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,default=ROOT)
    p.add_argument('--config',type=Path,default=ROOT/'research/pipeline/config/mbo_esco.json')
    p.add_argument('--cache',type=Path,default=ROOT/'data/processed/models/mbo_esco')
    p.add_argument('--export-only',action='store_true');p.add_argument('--evaluate-only',action='store_true');p.add_argument('--model');p.add_argument('--revision');p.add_argument('--local-model',type=Path)
    p.add_argument('--reranker-lock',type=Path,default=Path('/tmp/isco-ml-models/revisions.json'));p.add_argument('--limit',type=int);p.add_argument('--rerank',action='store_true');p.add_argument('--device',default='cpu')
    args=p.parse_args()
    if args.export_only:
        export_existing(args.root)
    elif args.evaluate_only:
        refresh_evaluation(args.root)
    else:
        run(args.root,args.config,args.cache,args.model,args.revision,args.local_model,args.limit,args.rerank,args.device,args.reranker_lock)
        refresh_evaluation(args.root)
