"""Lokale ML-proef naast de bestaande koppeltabel; overschrijft de basis niet."""
import argparse
from collections import defaultdict
import csv
import hashlib
import gzip
import importlib.metadata
import json
import os
from pathlib import Path
import time

from .opleiding_beroep import ROOT, read_rows, load_context, level_compatible, fallback_role_factor

EMBED_MODEL = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
EMBED_REVISION = 'e8f8c211226b894fcb81acc59f3b34ba3efd5f42'
RERANK_MODEL = 'cross-encoder/mmarco-mMiniLMv2-L12-H384-v1'
RERANK_REVISION = '1427fd652930e4ba29e8149678df786c240d8825'
# Vooraf vastgelegde bron-/inhoudscontroles, geen onafhankelijk gelabelde testset.
CONTROLS = {'25208': ['7322'], '25674': ['8322'], '25033': ['5151'],
            '25664': ['3214'], '25665': ['3214'], '25998': ['2512'],
            '27050': ['7121'], '27137': ['7512'], '25614': ['7512'],
            '25684': ['7531'], '25687': ['2163']}


def load_profiles(root):
    folder = root / 'data/raw/competentnl'
    courses = {}
    for r in read_rows(folder/'mbo.csv', ('code', 'naam', 'definitie', 'beschrijving')):
        c = courses.setdefault(r['code'], dict(code=r['code'], names=set(), definitions=set()))
        c['names'].add(r['naam'].strip())
        c['definitions'].update(r[k].strip() for k in ('definitie', 'beschrijving') if r[k].strip())
    for c in courses.values():
        c['name'] = ' / '.join(sorted(c.pop('names')))
        c['body'] = '\n'.join(sorted(c.pop('definitions')))
    occupations = {}
    for r in read_rows(folder/'beroepen_isco.csv', ('uri', 'naam', 'definitie', 'isco_code', 'isco_naam')):
        if len(r['isco_code']) != 4 or not r['isco_code'].isdigit():
            raise ValueError('Onjuiste ISCO-code in bron')
        if r['uri'] in occupations:
            raise ValueError('Dubbele beroeps-URI')
        occupations[r['uri']] = dict(uri=r['uri'], name=r['naam'], definition=r['definitie'],
                                    isco=r['isco_code'], isco_name=r['isco_naam'], tasks={})
    for r in read_rows(folder/'beroepen_taken.csv', ('uri', 'item_uri', 'item_naam', 'item_definitie', 'belang')):
        if r['uri'] not in occupations:
            raise ValueError('Onbekend beroep bij taak')
        if r['belang'] == 'essentieel':
            occupations[r['uri']]['tasks'][r['item_uri']] = dict(name=r['item_naam'], definition=r['item_definitie'])
    for o in occupations.values():
        o['tasks'] = sorted(o['tasks'].values(), key=lambda t: (t['name'], t['definition']))
        # Begrensde werkcontext voor retrieval; alle taken blijven beschikbaar voor beoordeling.
        o['body'] = o['definition'] + '\nEssentiële taken: ' + '; '.join(t['name'] for t in o['tasks'][:12])
    return courses, occupations


def select_cases(baseline, courses, limit=None):
    previous = {}
    uncertain = set()
    for r in baseline:
        previous.setdefault(r['Opleidingscode'], r)
        if r['Beoordeling'].startswith('Onzeker voorstel'):
            uncertain.add(r['Opleidingscode'])
    selected = sorted(uncertain)
    if limit is not None:
        selected = selected[:limit]
    selected = sorted(set(selected) | (CONTROLS.keys() & courses.keys()))
    if any(c not in courses for c in selected):
        raise ValueError('Geselecteerde opleiding heeft geen profiel')
    return selected, previous, uncertain


def token_chunks(tokenizer, title, body, body_tokens=72):
    """Alle beschrijvingstekst behouden via korte delen, in plaats van stil afkappen."""
    title_ids = tokenizer.encode(title, add_special_tokens=False)[:24]
    prefix = tokenizer.decode(title_ids, skip_special_tokens=True)
    body_ids = tokenizer.encode(body, add_special_tokens=False, verbose=False)
    chunks = [prefix + '\n' + tokenizer.decode(body_ids[i:i+body_tokens], skip_special_tokens=True)
              for i in range(0, len(body_ids), body_tokens)]
    return chunks or [prefix]


def encode_documents(model, docs, cache, revision, batch_size=32):
    import numpy as np
    fingerprint = hashlib.sha256(json.dumps(dict(docs=docs, revision=revision,
                body_tokens=72, title_tokens=24, title_weight=.2), ensure_ascii=False).encode()).hexdigest()
    path = cache / f'vectors-{fingerprint}.npz'
    if path.exists():
        with np.load(path, allow_pickle=False) as stored:
            vectors = stored['vectors']
        if len(vectors) != len(docs):
            raise ValueError('Onjuiste embeddingcache')
        print(f'Embeddingcache: {len(docs)} profielen', flush=True)
        return vectors
    texts, owners, weights = [], [], []
    for i, doc in enumerate(docs):
        texts.append(doc['name']); owners.append(i); weights.append(.2)
        chunks = token_chunks(model.tokenizer, doc['name'], doc['body'])
        for chunk in chunks:
            texts.append(chunk); owners.append(i); weights.append(.8/len(chunks))
    vectors = np.zeros((len(docs), model.get_embedding_dimension()), dtype='float32')
    last_update = 0
    for start in range(0, len(texts), batch_size):
        encoded = model.encode(texts[start:start+batch_size], batch_size=batch_size,
                               normalize_embeddings=True, show_progress_bar=False, convert_to_numpy=True)
        for j, value in enumerate(encoded, start=start):
            vectors[owners[j]] += weights[j] * value
        if time.monotonic() - last_update > 20 or start+batch_size >= len(texts):
            print(f'Embeddingdelen: {min(start+batch_size,len(texts))}/{len(texts)}', flush=True)
            last_update = time.monotonic()
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    vectors /= np.maximum(norms, 1e-12)
    if not np.isfinite(vectors).all():
        raise ValueError('Niet-eindige embeddings')
    np.savez_compressed(path, vectors=vectors)
    return vectors


def evaluate_controls(results):
    checked = [r for r in results if r['code'] in CONTROLS]
    counts = dict(controles=len(checked), baseline_top1=0, embeddings_top1=0,
                  reranker_top1=0, reranker_top3=0, role_checked_top1=0, embeddings_top3=0, embeddings_top5=0)
    for r in checked:
        expected = CONTROLS[r['code']]
        counts['baseline_top1'] += r['baseline']['Huidige ISCO'] in expected
        counts['embeddings_top1'] += r['embedding_top'][0]['isco'] in expected
        counts['embeddings_top3'] += any(c['isco'] in expected for c in r['embedding_top'][:3])
        counts['embeddings_top5'] += any(c['isco'] in expected for c in r['embedding_top'][:5])
        counts['reranker_top1'] += r['candidates'][0]['isco'] in expected
        counts['reranker_top3'] += any(c['isco'] in expected for c in r['candidates'][:3])
        checked_roles = r.get('role_checked_top', [])
        counts['role_checked_top1'] += bool(checked_roles) and checked_roles[0]['isco'] in expected
    return counts


def prepare_models(cache):
    """Download uitsluitend vastgelegde openbare modelrevisies naar de proefcache."""
    os.environ['HF_HOME'] = str(cache)
    os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
    from huggingface_hub import snapshot_download
    cache.mkdir(parents=True, exist_ok=True)
    lock = {}
    for name, revision in ((EMBED_MODEL, EMBED_REVISION), (RERANK_MODEL, RERANK_REVISION)):
        print(f'Model ophalen: {name} ({revision})', flush=True)
        path = snapshot_download(name, revision=revision,
            allow_patterns=['*.json', '*.safetensors', '*.txt', '*.model'],
            ignore_patterns=['onnx/*', 'openvino/*'])
        lock[name] = dict(revision=revision, path=path)
    (cache/'revisions.json').write_text(json.dumps(lock, indent=2)+'\n')


def run_pilot(root=ROOT, cache=Path('/tmp/isco-ml-models'), top_k=20, limit=None, device='cpu'):
    os.environ.setdefault('HF_HOME', str(cache))
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['TOKENIZERS_PARALLELISM'] = 'false'
    import numpy as np
    import torch
    from sentence_transformers import SentenceTransformer, CrossEncoder
    torch.set_num_threads(4)
    torch.manual_seed(0)
    root, cache = Path(root), Path(cache)
    cache.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    baseline_path = root/'data/processed/opleiding_beroep.csv'
    baseline_hash = hashlib.sha256(baseline_path.read_bytes()).hexdigest()
    baseline = list(read_rows(baseline_path, ('Opleidingscode', 'Mogelijk passend beroep', 'ISCO-code', 'Beoordeling')))
    courses, occupations = load_profiles(root)
    selected, previous, uncertain = select_cases(baseline, courses, limit)
    context, levels, context_hashes = load_context(root)
    lock = json.loads((cache/'revisions.json').read_text())
    for model, revision in ((EMBED_MODEL, EMBED_REVISION), (RERANK_MODEL, RERANK_REVISION)):
        if lock[model]['revision'] != revision:
            raise ValueError('Modelrevisie wijkt af; gebruik de vastgelegde revisie')
    print(f'Proef: {len(selected)} opleidingen, {len(occupations)} mogelijke beroepen, top-{top_k}', flush=True)
    encoder = SentenceTransformer(lock[EMBED_MODEL]['path'], local_files_only=True,
                                  trust_remote_code=False, device=device, model_kwargs={'use_safetensors': True})
    encoder.max_seq_length = 128
    keys = sorted(occupations)
    corpus = [occupations[u] for u in keys]
    occupation_vectors = encode_documents(encoder, corpus, cache, EMBED_REVISION)
    course_vectors = encode_documents(encoder, [courses[c] for c in selected], cache, EMBED_REVISION)
    similarities = course_vectors @ occupation_vectors.T
    del encoder
    print('Embeddings gereed; cross-encoder laden', flush=True)
    reranker = CrossEncoder(lock[RERANK_MODEL]['path'], local_files_only=True, trust_remote_code=False,
                           device=device, max_length=384, activation_fn=torch.nn.Identity(),
                           model_kwargs={'use_safetensors': True})
    results = []
    for i, code in enumerate(selected):
        course = courses[code]
        retrieved = sorted(range(len(keys)), key=lambda j: (-float(similarities[i,j]), keys[j]))[:top_k]
        embedding_top = [dict(uri=keys[j], name=corpus[j]['name'], isco=corpus[j]['isco'],
                              cosine=float(similarities[i,j])) for j in retrieved[:5]]
        # Bewaar de oude kandidaat als vergelijkingsmogelijkheid zonder de pure retrievalscore te veranderen.
        existing = [j for j,u in enumerate(keys) if occupations[u]['name'] == previous[code]['Mogelijk passend beroep']
                    and occupations[u]['isco'] == previous[code]['ISCO-code']]
        candidates = list(dict.fromkeys(retrieved + existing))
        # Tokenbudget expliciet begrenzen per zijde; titels blijven vooraan staan.
        def bounded(text, budget):
            ids = reranker.tokenizer.encode(text, add_special_tokens=False)[:budget]
            return reranker.tokenizer.decode(ids, skip_special_tokens=True)
        query = bounded('Opleiding: ' + course['name'] + '. ' + course['body'], 150)
        pairs, passages = [], []
        for j in candidates:
            o = corpus[j]
            passage = bounded('Beroep: ' + o['name'] + '. ' + o['definition'] + '\nEssentiële taken: ' +
                '; '.join(t['name'] + ': ' + t['definition'] for t in o['tasks'][:6]), 225)
            passages.append(passage); pairs.append((query, passage))
        scores = np.asarray(reranker.predict(pairs, batch_size=8, show_progress_bar=False,
                                              activation_fn=torch.nn.Identity(), convert_to_numpy=True)).reshape(-1)
        if not np.isfinite(scores).all():
            raise ValueError('Niet-eindige rerankscore')
        order = sorted(range(len(candidates)), key=lambda j: (-float(scores[j]), keys[candidates[j]]))
        ranked = []
        for pos in order[:5]:
            j = candidates[pos]; o = corpus[j]
            compatible = level_compatible(context.get(code, {}).get('level'), levels.get(o['isco'], 0))
            ranked.append(dict(uri=o['uri'], name=o['name'], isco=o['isco'], isco_name=o['isco_name'],
                cosine=float(similarities[i,j]), reranker_logit=float(scores[pos]),
                level_check='binnen voorkeursgrens' if compatible else 'niveau/context controleren',
                definition=o['definition'], essential_tasks=o['tasks'][:6], reranker_passage=passages[pos]))
        candidate_pool = [dict(uri=corpus[candidates[pos]]['uri'], name=corpus[candidates[pos]]['name'],
            isco=corpus[candidates[pos]]['isco'], reranker_logit=float(scores[pos]),
            role_factor=fallback_role_factor(course['name'], corpus[candidates[pos]])) for pos in order]
        role_checked = [c for c in candidate_pool if c['role_factor'] > 0]
        results.append(dict(code=code, name=course['name'], course_definition=course['body'],
            reranker_query=query, uncertain_baseline=code in uncertain,
            baseline={'Huidig beroep':previous[code]['Mogelijk passend beroep'], 'Huidige ISCO':previous[code]['ISCO-code']},
            embedding_top=embedding_top, candidates=ranked,
            candidate_pool=candidate_pool, role_checked_top=role_checked[:5],
            source_control=CONTROLS.get(code), status='ML-proef; inhoudelijk beoordelen; geen kanspercentage'))
        print(f"Herordenen {i+1}/{len(selected)}: {code} {course['name']} → {ranked[0]['name']} ({ranked[0]['isco']})", flush=True)
    source_hashes = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in [
        root/'data/raw/competentnl/mbo.csv', root/'data/raw/competentnl/beroepen_isco.csv',
        root/'data/raw/competentnl/beroepen_taken.csv', baseline_path]}
    if source_hashes[str(baseline_path.relative_to(root))] != baseline_hash:
        raise ValueError('Baseline gewijzigd tijdens proef')
    report = dict(method='Meertalige embeddings → top-k + oude kandidaat → cross-encoder; geen generatieve LLM-API',
        scope=dict(uncertain_total=len(uncertain), uncertain_tested=sum(r['uncertain_baseline'] for r in results),
                   tested=len(results), top_k=top_k, limit=limit),
        models={EMBED_MODEL: EMBED_REVISION, RERANK_MODEL: RERANK_REVISION},
        packages={p:importlib.metadata.version(p) for p in ['sentence-transformers','torch','transformers','numpy','openpyxl','xlrd']},
        device=device, seconds=round(time.monotonic()-started, 2),
        controls=evaluate_controls(results),
        note='Broncontroles zijn geen onafhankelijke testset. Cosinus en logits zijn geen kanspercentages. Baseline is niet vervangen.',
        source_hashes=dict(source_hashes, **context_hashes), results=results)
    export_report(report, root)
    print(json.dumps(dict(scope=report['scope'], controls=report['controls'], seconds=report['seconds']), ensure_ascii=False), flush=True)
    return report


def apply_source_reviews(report, artifact):
    if artifact['source_hashes'] != report['source_hashes'] or artifact['models'] != report['models']:
        raise ValueError('Bronbeoordelingen horen bij een andere proef-/bronversie')
    count = 0
    for case in report['results']:
        review = artifact['reviews'].get(case['code'])
        if review is None:
            continue
        pool = {c['uri']:c for c in case['candidate_pool']}
        for selected in review['selected']:
            candidate = pool.get(selected['uri'])
            if not candidate or candidate['isco'] != selected['isco'] or candidate['name'] != selected['name']:
                raise ValueError(f"Beoordeelde kandidaat buiten bronset: {case['code']}")
        case['assistant_review'] = review
        count += 1
    report['assistant_review_count'] = count
    report['assistant_review_note'] = artifact['method']


def export_report(report, root=ROOT):
    root = Path(root)
    for name, sha in report['source_hashes'].items():
        if hashlib.sha256((root/name).read_bytes()).hexdigest() != sha:
            raise ValueError(f'Proefbron is gewijzigd: {name}')
    review_path = root/'data/mappings/opleiding_beroep_proef_beoordelingen.json'
    if review_path.exists():
        apply_source_reviews(report, json.loads(review_path.read_text()))
    report['controls'] = evaluate_controls(report['results'])
    target = root/'data/processed/opleiding_beroep_proef.json.gz'
    target.write_bytes(gzip.compress((json.dumps(report, ensure_ascii=False, indent=2)+'\n').encode(), mtime=0))
    fields = ['Opleidingscode','Mbo-opleiding','Huidig beroep','Huidige ISCO','ML-voorstel','ML-ISCO',
              'Assistent-voorstel','Assistent-ISCO','Beoordeling','Toelichting']
    with (root/'data/processed/opleiding_beroep_proef.csv').open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=fields, delimiter=';'); writer.writeheader()
        for case in report['results']:
            best = case['candidates'][0]
            review = case.get('assistant_review', {})
            if review.get('keep_baseline'):
                name, code = case['baseline']['Huidig beroep'], case['baseline']['Huidige ISCO']
            else:
                name = ' / '.join(c['name'] for c in review.get('selected', []))
                code = ' / '.join(dict.fromkeys(c['isco'] for c in review.get('selected', [])))
            values = [case['code'],case['name'],case['baseline']['Huidig beroep'],case['baseline']['Huidige ISCO'],
                      best['name'],best['isco'],name,code,
                      review.get('decision', 'ML-proef; nog niet broninhoudelijk beoordeeld'),review.get('note', '')]
            writer.writerow(dict(zip(fields, values)))
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-dir', type=Path, default=Path('/tmp/isco-ml-models'))
    parser.add_argument('--top-k', type=int, default=20)
    parser.add_argument('--limit', type=int)
    parser.add_argument('--device', default='cpu')
    parser.add_argument('--download-models', action='store_true')
    parser.add_argument('--review-existing', action='store_true')
    args = parser.parse_args()
    if args.top_k < 1 or args.limit is not None and args.limit < 1:
        parser.error('top-k en limit moeten positief zijn')
    if args.review_existing:
        export_report(json.loads(gzip.decompress((ROOT/'data/processed/opleiding_beroep_proef.json.gz').read_bytes())))
        raise SystemExit(0)
    if args.download_models:
        prepare_models(args.cache_dir)
    run_pilot(cache=args.cache_dir, top_k=args.top_k, limit=args.limit, device=args.device)
