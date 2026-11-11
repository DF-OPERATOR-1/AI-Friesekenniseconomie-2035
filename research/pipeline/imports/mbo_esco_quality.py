"""Hybride kwaliteitslaag naast de bewaarde nulmeting; geen officiële MBO–beroeprelaties."""
import argparse
from collections import Counter,defaultdict
import csv
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import time

from . import mbo_esco as base
from .opleiding_beroep import ROOT,TextComparison,GENERIC_ROLES,normalize_text,name_key,read_rows
from .opleiding_beroep_ml import EMBED_MODEL,EMBED_REVISION,RERANK_MODEL,RERANK_REVISION


def activities(text, config):
    text=normalize_text(text)
    result={key:[term for term in terms if normalize_text(term) in text]
            for key,terms in config['activities'].items()}
    contexts={'civil_design':['bouw','infra','civiel','construct','wegen'], 'manual_construction':['grond','bouw','wegen','spoor','civiel'], 'clinical_veterinary':['veter','dieren','paravet'], 'food_service':['voedsel','keuken','maaltijd','gebak','bakker','boulanger','brood','deeg']}
    for key,terms in contexts.items():
        if not any(t in text for t in terms):result[key]=[]
    return result


def work_spans(text):
    return [s.strip() for s in re.split(r'(?<=[.!?;])\s+|\n+',text) if len(s.split())>=4]


def content_text(text):
    return ' '.join(w for w in re.findall(r'[a-z0-9]+',normalize_text(text)) if w not in GENERIC_ROLES | {'supervisor','supervisors','technician','mbo'})


def checks(course, job, config):
    source=activities(course['name']+' '+course['description']+' '+course['context'].get('direction','')+' '+course['context'].get('sector',''),config)
    target=activities(job['name']+' '+job['description'],config)
    source_primary=activities(course['name']+' '+course['context'].get('sector',''),config)
    target_primary=activities(job['name'],config)
    conflicts=[]
    for a,b in config['conflicts']:
        if (len(source[a])>=2 or source_primary[a]) and (len(target[b])>=2 or target_primary[b]) and not target[a]:
            conflicts.append(dict(type='domain_conflict',source_activity=a,target_activity=b,
                source_evidence=source[a],target_evidence=target[b]))
    if len(source['clinical_veterinary'])>=2 and target['reception'] and not target['clinical_veterinary']:
        conflicts.append(dict(type='secondary_task',reason='Receptiewerk dekt de klinische paraveterinaire hoofdfunctie niet',source_evidence=source['clinical_veterinary'],target_evidence=target['reception']))
    if len(source['civil_design'])>=3 and target['manual_construction'] and len(target['civil_design'])<2:
        conflicts.append(dict(type='responsibility_conflict',reason='Ontwerp/werkvoorbereiding versus uitvoerend handwerk',source_evidence=source['civil_design'],target_evidence=target['manual_construction']))
    if len(source['nursing'])>=2 and any(t in normalize_text(job['name']) for t in ['verpleeghulp','zorghulp']):
        conflicts.append(dict(type='secondary_task',reason='Ondersteunende zorg dekt de verpleegkundige hoofdfunctie niet',source_evidence=source['nursing'],target_evidence=[job['name']]))
    qualifications=[]
    title=normalize_text(job['name'])
    for kind,terms in config['qualifications'].items():
        found=[t for t in terms if re.search(r'\b'+re.escape(t)+(r'\b' if kind=='independent_medical' else ''),title) and t not in normalize_text(course['name'])]
        if found:
            qualifications.append(dict(type=kind,required_role=found,status='Niet aangetoond in opleidingsbron; aanvullende kwalificatie controleren'))
    leadership=['manager','leidinggevend','supervisor','hoofd ','bedrijfsleider']
    source_work=normalize_text(course['name']+' '+course['description'])
    if any(t in title for t in leadership) and not any(t in source_work for t in leadership+['stuurt','leiding','aansturen']):
        qualifications.append(dict(type='responsibility_scope',status='Leidinggevende rol niet aangetoond in de opleidingsbeschrijving'))
    degree_terms=[t for t in ['bachelor','master','universitair'] if re.search(r'\b'+t+r'\b',title)]
    if degree_terms and not all(t in normalize_text(course['name']+' '+course['description']) for t in degree_terms):
        qualifications.append(dict(type='education_requirement',source_terms=degree_terms,status='Genoemd opleidingsvereiste niet aangetoond in de MBO-bron'))
    active=[k for k,v in target.items() if v and k not in ('veterinary','human_clinical')]
    if target.get('roofing'):active=['roofing']
    if target.get('printing'):active=['printing']
    if target['clinical_veterinary']:active=['clinical_veterinary']
    if target['civil_design'] and not target['manual_construction']:active=[k for k in active if k!='installation']
    shared=[k for k in active if source[k]]
    return dict(conflicts=conflicts,qualification_review=qualifications,source_activities=source,target_activities=target,
                activity_coverage=len(shared)/len(active) if active else None)


def fallback_jobs(root, jobs):
    """Alleen classificatiegaten: behoud de bestaande officiële CNL–ISCO-code."""
    covered={o['isco'] for o in jobs}
    folder=Path(root)/'data/raw/competentnl'
    fallback={}
    for r in read_rows(folder/'beroepen_isco.csv',('uri','naam','definitie','isco_code','isco_naam')):
        if r['isco_code'] not in covered:
            fallback[r['uri']]=dict(uri=r['uri'],name=r['naam'],description=r['definitie'],aliases='',
                isco=r['isco_code'],isco_name=r['isco_naam'],isco_level=None,source='CompetentNL',tasks=[],skills=[],knowledge=[],regulated_note='')
    for filename,kind in [('beroepen_taken.csv','tasks'),('beroepen_vaardigheden.csv','skills'),('beroepen_kennisgebieden.csv','knowledge')]:
        seen=set()
        for r in read_rows(folder/filename,('uri','item_uri','item_naam','item_definitie','belang')):
            if r['uri'] not in fallback or not r['item_uri'].strip() or not (r['item_naam']+' '+r['item_definitie']).strip() or (r['uri'],r['item_uri']) in seen:
                continue
            seen.add((r['uri'],r['item_uri']))
            fallback[r['uri']][kind].append(dict(uri=r['item_uri'],name=r['item_naam'],description=r['item_definitie'],
                importance='essential' if r['belang']=='essentieel' else 'optional',reuse_level='sector-specific' if kind=='knowledge' else 'cross-sector'))
    levels_path=Path(root)/'data/mappings/isco2008_brc2014.csv'
    if levels_path.exists():
        levels={r['ISCO2008unitgroup']:int(r['ISCO2008niveau']) for r in read_rows(levels_path,('ISCO2008unitgroup','ISCO2008niveau'))}
        for o in fallback.values():o['isco_level']=levels.get(o['isco'])
    return sorted(fallback.values(),key=lambda o:o['uri'])


def retrieval(course, jobs, vectors, lex, names_lex, ix, k, competency_vectors=None):
    import numpy as np
    query=vectors[course['description']] if course['description'] else vectors[course['name']]
    semantic=np.array([.2*float(vectors[course['name']]@vectors[o['name']])+.8*float(query@vectors[o['description']]) for o in jobs])
    competence=None
    if competency_vectors is not None:
        features=course['knowledge'] or course['skills']
        if features:
            q=np.mean([vectors[f['name']] if f['name'] in vectors else vectors[base.feature_text(f)] for f in features],axis=0)
            q=q/max(float(np.linalg.norm(q)),1e-12)
            competence=competency_vectors@q
    ls=lex.scores(ix);ns=names_lex.scores(ix)
    semantic_order=sorted(range(len(jobs)),key=lambda j:(-semantic[j],jobs[j]['uri']))
    lexical_order=sorted(range(len(jobs)),key=lambda j:(-ls.get(j,0),jobs[j]['uri']))
    name_order=sorted(range(len(jobs)),key=lambda j:(-ns.get(j,0),jobs[j]['uri']))
    # Balanced union: one saturated channel cannot consume the whole candidate pool.
    competence_order=sorted(range(len(jobs)),key=lambda j:(-float(competence[j]),jobs[j]['uri'])) if competence is not None else []
    channels=[('embeddings',semantic_order[:k//3]),('lexical_body',lexical_order[:k//3]),('lexical_name',name_order[:k//6]),('knowledge_retrieval',competence_order[:k//6])]
    pool=list(dict.fromkeys([j for _,order in channels for j in order]+semantic_order))[:k]
    origins={j:[label for label,order in channels if j in order] for j in pool}
    return pool,semantic,origins,ns


def work_score(course, job, vectors, rule):
    import numpy as np
    source=work_spans(course['description'])
    # CNL has official occupational tasks; ESCO only has description-derived work evidence.
    required=[base.feature_text(f) for f in job.get('tasks') or []] or work_spans(job['description'])
    if not source or not required:
        return None,[]
    matrix=np.clip(np.stack([vectors[s] for s in required]) @ np.stack([vectors[s] for s in source]).T,0,1)
    supporting=[]
    for i,span in enumerate(required):
        j=int(matrix[i].argmax())
        supporting.append(dict(occupation_passage=span,course_passage=source[j],similarity=float(matrix[i,j]),
            course_origin='description_proxy',occupation_origin='official_CNL_task' if job.get('tasks') else 'description_proxy'))
    semantic=float(matrix.max(axis=1).mean())
    activity=rule['activity_coverage']
    return semantic if activity is None or activity==0 else .5*semantic+.5*activity,supporting


def decide(score, rule, components, config):
    if rule['conflicts'] or rule['qualification_review']:
        return 'onzeker' if score>=config['uncertain_threshold'] else 'geen match'
    strong=config.get('strong_work',{})
    strong_work=bool(strong and rule.get('activity_coverage')==1 and score>=strong['min_score'] and (components.get('description') or 0)>=strong['min_description'] and (components.get('tasks') or 0)>=strong['min_work'])
    if (score>=config['threshold'] or strong_work) and components.get('tasks') is not None:
        return 'verwant beroep'
    return 'onzeker' if score>=config['uncertain_threshold'] else 'geen match'


def regression_metrics(cases, result, job_isco=None):
    """Alleen expliciet beoordeelde ISCO-paren; onbekend is niet negatief."""
    by_code={c['code']:c for c in result['courses']}
    tp=fp=fn=0;unassessed=0;retrieval=[];pool_recalls=[];retrieval_recalls=[];rows=[]
    for case in cases:
        c=by_code.get(case['code'])
        if not c:
            continue
        selected={r['isco'] for r in c['candidates'] if r['classification'] in ('verwant beroep','directe beroepsmatch')}
        ordered=[r['isco'] for r in c['candidates']]
        positives=set(case['positive_isco']);negatives=set(case['negative_isco'])
        a,b,d=len(selected&positives),len(selected&negatives),len(positives-selected)
        tp+=a;fp+=b;fn+=d
        unassessed+=len(selected-positives-negatives)
        retrieval.append(len(set(ordered[:10])&positives)/len(positives) if positives else 0.)
        pool_recalls.append(len(set(ordered)&positives)/len(positives) if positives else 0.)
        raw_order=sorted(c['candidates'],key=lambda r:r.get('retrieval_rank',10**6))
        raw_codes=[r['isco'] for r in raw_order[:10]]
        baseline_ids=result.get('rankings',{}).get('B',{}).get(case['code'],{}).get('ranked',[])
        if baseline_ids and job_isco:
            raw_codes=[job_isco[u] for u in baseline_ids[:10] if u in job_isco]
        retrieval_recalls.append(len(set(raw_codes)&positives)/len(positives) if positives else 0.)
        rows.append(dict(code=case['code'],positive_hits=sorted(selected&positives),false_positive_hits=sorted(selected&negatives),missing=sorted(positives-selected),top10=ordered[:10]))
    precision=tp/(tp+fp) if tp+fp else 0.
    recall=tp/(tp+fn) if tp+fn else 0.
    return dict(scope='Expliciete ontwikkelparen; geen volledige of onafhankelijke validatieset',
        n=len(rows),tp=tp,fp=fp,fn=fn,unassessed_selected_pairs=unassessed,assessed_selected_pairs=tp+fp,reference_lists_complete=False,precision_conditioned_on_judged_pairs=True,precision=precision,recall=recall,
        f1=2*precision*recall/(precision+recall) if precision+recall else 0.,
        recall_at_10=sum(retrieval)/len(retrieval) if retrieval else None,
        retrieval_recall_at_10=sum(retrieval_recalls)/len(retrieval_recalls) if retrieval_recalls else None,
        candidate_pool_recall=sum(pool_recalls)/len(pool_recalls) if pool_recalls else None,
        recall_at_10_definition='Macro recall van positieve ISCO-codes binnen de eerste tien beroepskandidaten na rangschikking; geen deduplicatie vóór afkappen.',cases=rows)


def export(result, root, target=None):
    root=Path(root);target=Path(target) if target else root/'data/processed'
    headers=['Opleidingscode','Opleiding','Mogelijk beroep','Bron beroep','ISCO-code','ISCO-beroepsgroep','Matchscore (geen kanspercentage)','Beoordeling','Beroepsidentificatie']
    for filename,choose in [('mbo_beroep_matches.csv',lambda c:base.proposed_candidates(c)),('mbo_beroep_kandidaten.csv',lambda c:c)]:
        with (target/filename).open('w',encoding='utf-8-sig',newline='') as stream:
            writer=csv.writer(stream,delimiter=';');writer.writerow(headers)
            for c in result['courses']:
                for r in choose(c['candidates']):
                    writer.writerow([c['code'],c['name'],r['name'],r['source'],r['isco'],r['isco_name'],f"{100*r['score']:.1f}".replace('.',','),r['classification'],r['uri']])
    with (target/'mbo_isco_matches.csv').open('w',encoding='utf-8-sig',newline='') as stream:
        w=csv.writer(stream,delimiter=';');w.writerow(['Opleidingscode','Opleiding','ISCO-code','ISCO-beroepsgroep','Onderbouwende beroepen','Bronnen','Matchscore (geen kanspercentage)','Beoordeling'])
        for c in result['courses']:
            selected=base.proposed_candidates(c['candidates']);by_uri={r['uri']:r for r in selected}
            for g in base.aggregate_isco(selected):
                w.writerow([c['code'],c['name'],g['isco'],g['name'],' | '.join(by_uri[u]['name'] for u in g['occupations']),' | '.join(sorted({by_uri[u]['source'] for u in g['occupations']})),f"{100*g['score']:.1f}".replace('.',','),'Voorspeld; menselijke controle nodig'])
    # Existing ESCO-only files never contain a CNL URI disguised as ESCO.
    esco_only=dict(result,courses=[dict(c,candidates=[r for r in c['candidates'] if r['source']=='ESCO']) for c in result['courses']])
    base.export_tables(esco_only,target)


def run(root=ROOT,cache=None,limit=None,rerank=True,cases_only=False):
    import numpy as np
    import torch
    from sentence_transformers import CrossEncoder
    root=Path(root);cache=Path(cache or root/'data/processed/models/mbo_esco')
    config_path=root/'research/pipeline/config/mbo_esco_quality.json'
    config=json.loads(config_path.read_text());old_config=json.loads((root/'research/pipeline/config/mbo_esco.json').read_text())
    baseline_path=root/'research/diagnostics/mbo_esco_quality_baseline/matches.json.gz'
    if not baseline_path.exists():
        baseline_path.parent.mkdir(parents=True,exist_ok=True)
        baseline_path.write_bytes((root/'data/processed/mbo_esco_matches.json.gz').read_bytes())
    baseline=json.loads(gzip.decompress(baseline_path.read_bytes()))
    courses,esco,meta=base.load_data(root)
    for o in esco:o['source']='ESCO'
    fallback=fallback_jobs(root,esco);jobs=esco+fallback
    for o in jobs:o['_work']=work_spans(o['description'])
    lock=json.loads(Path('/tmp/isco-ml-models/revisions.json').read_text())
    encoder=base.Encoder(EMBED_MODEL,EMBED_REVISION,cache,lock[EMBED_MODEL]['path'],32,80,'cpu')
    # Reuse the exact existing vector bundle, then encode only additional fields.
    old_texts=[]
    for p in courses+esco:
        old_texts.extend(p[f] for f in ('name','description'))
        old_texts.extend(base.feature_text(f) for kind in ('skills','knowledge') for f in p[kind])
    vectors=encoder.encode(old_texts);cache_hashes=[encoder.cache_hash]
    needed=[]
    for p in courses+jobs:
        needed.extend(p[f] for f in ('name','description'));needed.extend(work_spans(p['description']))
        for kind in ('skills','knowledge','tasks'):
            for f in p.get(kind) or []:needed.extend([f['name'],base.feature_text(f)])
    extra=[t for t in needed if t.strip() and t not in vectors]
    if extra:
        additional=encoder.encode(extra);cache_hashes.append(encoder.cache_hash);vectors.update(additional)
    # Labels compare with labels; available definitions remain independently recorded.
    label_vectors={base.feature_text(f):(vectors[f['name']] if f['name'] in vectors else vectors[base.feature_text(f)]) for p in courses+jobs for kind in ('skills','knowledge') for f in p[kind]}
    job_competency_vectors=[]
    for o in jobs:
        features=o['knowledge'] or o['skills']
        v=np.mean([label_vectors[base.feature_text(f)] for f in features],axis=0) if features else vectors[o['description']]
        job_competency_vectors.append(v/max(float(np.linalg.norm(v)),1e-12))
    job_competency_vectors=np.stack(job_competency_vectors)
    if cases_only:
        codes={r['code'] for r in json.loads((root/'data/mappings/mbo_esco_regressie.json').read_text())['cases']}
        courses=[c for c in courses if c['code'] in codes]
    if limit:courses=courses[:limit]
    lex=TextComparison([content_text(c['name']+' '+c['description']+' '+c['context'].get('direction','')) for c in courses],
        [content_text(o['name']+' '+o['aliases']+' '+o['description']) for o in jobs])
    lex_names=TextComparison([content_text(c['name']) for c in courses],[content_text(o['name']+' '+o['aliases']) for o in jobs],characters=True)
    reranker=CrossEncoder(lock[RERANK_MODEL]['path'],local_files_only=True,trust_remote_code=False,device='cpu',model_kwargs={'use_safetensors':True}) if rerank else None
    rerank_cache_path=cache/'quality-rerank.json'
    rerank_cache=json.loads(rerank_cache_path.read_text()) if rerank_cache_path.exists() else {}
    results=[]
    for ix,c in enumerate(courses):
        indices,semantic,origins,name_lex=retrieval(c,jobs,vectors,lex,lex_names,ix,config['candidate_k'],job_competency_vectors)
        candidates=[]
        for retrieval_rank,j in enumerate(indices,start=1):
            o=jobs[j];rule=checks(c,o,config)
            coverage={kind:base.competence_coverage(c[kind],o[kind],label_vectors,meta['competence_frequency'],len(jobs),old_config) for kind in ('skills','knowledge')}
            work,work_evidence=work_score(c,o,vectors,rule)
            components=dict(name=.5*max(0.,float(vectors[c['name']]@vectors[o['name']]))+.5*name_lex.get(j,0)/100,
                description=base.cosine(c['description'],o['description'],vectors),tasks=work,
                skills=coverage['skills']['weighted_score'],knowledge=coverage['knowledge']['weighted_score'])
            score,active,share=base.combine(components,config['weights'])
            candidate=dict(uri=o['uri'],name=o['name'],isco=o['isco'],isco_name=o['isco_name'],source=o['source'],retrieval_rank=retrieval_rank,
                score=score,base_score=score,components=components,coverage=coverage,work_evidence=work_evidence,
                formal_course_tasks_available=False,task_score_origin='description_proxy',checks=rule,retrieval_origins=origins[j],
                active_weights=active,available_weight_share=share,
                level_check=dict(mbo_level=c['context'].get('level'),isco_skill_level=o['isco_level'],status='Geen directe schaalconversie; alleen context'),
                access_requirements=dict(status='niet vastgesteld',review=rule['qualification_review'],source_note=o['regulated_note']),
                classification=decide(score,rule,components,config),validation_status='menselijke controle nodig',
                mbo_esco_relation='predicted' if o['source']=='ESCO' else None,
                esco_isco_relation='official' if o['source']=='ESCO' else None,
                cnl_isco_relation='official' if o['source']=='CompetentNL' else None,method='hybrid_quality')
            candidates.append(candidate)
        if reranker:
            # Concise field-aware pair; source spans above remain intact for review.
            pairs=[]
            for r in candidates:
                o=next(o for o in jobs if o['uri']==r['uri'])
                query=c['name']+'\n'+ ' '.join(c['description'].split()[:110])
                document=o['name']+'\n'+' '.join(o['description'].split()[:110])
                pairs.append((query,document))
            keys=[hashlib.sha256(json.dumps(dict(model=RERANK_MODEL,revision=RERANK_REVISION,pair=p,policy='110-words-per-side'),sort_keys=True).encode()).hexdigest() for p in pairs]
            missing=[i for i,k in enumerate(keys) if k not in rerank_cache]
            if missing:
                logits=reranker.predict([pairs[i] for i in missing],batch_size=32,show_progress_bar=False,activation_fn=torch.nn.Identity())
                for i,v in zip(missing,logits):rerank_cache[keys[i]]=float(v)
                rerank_cache_path.write_text(json.dumps(rerank_cache)+'\n')
            raw=np.array([rerank_cache[k] for k in keys])
            # Saturated relevance outputs are only a bounded tiebreaker, never evidence of competence.
            ranks=np.argsort(np.argsort(raw,kind='stable'),kind='stable')/max(1,len(raw)-1)
            for i,r in enumerate(candidates):
                r['reranker_logit']=float(raw[i]);r['reranker_rank_signal']=float(ranks[i])
                r['score']=r['base_score']+config['reranker_weight']*(float(ranks[i])-.5)
                r['classification']=decide(r['score'],r['checks'],r['components'],config)
        candidates.sort(key=lambda r:(bool(r['checks']['conflicts'] or r['checks']['qualification_review']),r['classification']!='verwant beroep',-r['score'],r['uri']))
        results.append(dict(code=c['code'],name=c['name'],context=c['context'],uris=c['uris'],unresolved_references=c['unresolved'],
            linked_competencies=[dict(cnl_uri=f['uri'],cnl_name=f['name'],**m) for f in c['skills'] for m in f.get('esco_mappings',[])],candidates=candidates))
        if ix%20==0:print(f'Kwaliteitsmatching {ix+1}/{len(courses)}',flush=True)
    cases=json.loads((root/'data/mappings/mbo_esco_regressie.json').read_text())['cases']
    comparison=dict(baseline=regression_metrics(cases,baseline,{o['uri']:o['isco'] for o in jobs}),improved=regression_metrics(cases,dict(courses=results),{o['uri']:o['isco'] for o in jobs}),
        independent_validation='Niet beschikbaar; de controles zijn gebruikt bij ontwikkeling. Geen algemene prestatieclaim.',
        independent_metrics=dict(precision=None,recall=None,f1=None,recall_at_10=None))
    before_rerank=[]
    esco_only=[]
    for c in results:
        candidates=[dict(r,score=r['base_score'],classification=decide(r['base_score'],r['checks'],r['components'],config)) for r in c['candidates']]
        candidates.sort(key=lambda r:(bool(r['checks']['conflicts'] or r['checks']['qualification_review']),r['classification']!='verwant beroep',-r['score'],r['uri']))
        before_rerank.append(dict(c,candidates=candidates))
        esco_only.append(dict(c,candidates=[r for r in c['candidates'] if r['source']=='ESCO']))
    comparison['hybrid_before_reranking']=regression_metrics(cases,dict(courses=before_rerank))
    comparison['improved_esco_only']=regression_metrics(cases,dict(courses=esco_only))
    comparison['catalogue']=dict(baseline_esco=len(esco),improved_esco=len(esco),additional_cnl=len(fallback),note='ISCO 3221 is alleen bereikbaar via de apart gemarkeerde CNL-route; deze recallwinst is mede catalogusuitbreiding.')
    metadata=dict(version=config['version'],config=config,source=meta,model=EMBED_MODEL,revision=EMBED_REVISION,
        reranker=dict(model=RERANK_MODEL,revision=RERANK_REVISION,enabled=rerank,word_limit_per_side=110),
        embedding_cache_hashes=cache_hashes,baseline_sha256=base.digest(baseline_path),
        pipeline_sha256=base.digest(__file__),config_sha256=base.digest(config_path),regression_sha256=base.digest(root/'data/mappings/mbo_esco_regressie.json'),
        scores_are_probabilities=False,esco_occupations=len(esco),cnl_fallback_occupations=len(fallback),evaluation=comparison,
        publication_attribution='This publication uses the ESCO classification of the European Commission.')
    result=dict(metadata=metadata,courses=results)
    target=root/'research/diagnostics/mbo_esco_quality_trial' if cases_only or limit else root/'data/processed'
    target.mkdir(parents=True,exist_ok=True)
    (target/'controles').mkdir(parents=True,exist_ok=True)
    (target/'mbo_esco_quality.json.gz').write_bytes(gzip.compress((json.dumps(result,ensure_ascii=False)+'\n').encode(),mtime=0))
    (target/'controles/mbo_esco_kwaliteit_vergelijking.json').write_text(json.dumps(comparison,ensure_ascii=False,indent=2)+'\n')
    export(result,root,target)
    print(f'Klaar: {len(results)} opleidingen, {len(jobs)} bronberoepen',flush=True)
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--limit',type=int);p.add_argument('--cases-only',action='store_true');p.add_argument('--no-rerank',action='store_true')
    a=p.parse_args();run(limit=a.limit,rerank=not a.no_rerank,cases_only=a.cases_only)
