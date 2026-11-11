import unittest
from research.pipeline.imports.opleiding_beroep_ml import select_cases, token_chunks, evaluate_controls, apply_source_reviews


class Tokenizer:
    def encode(self, text, **kwargs):
        return text.split()

    def decode(self, ids, **kwargs):
        return ' '.join(ids)


class PilotTests(unittest.TestCase):
    def test_selects_uncertain_cases_and_keeps_controls_when_limited(self):
        rows = [dict(Opleidingscode=c, Beoordeling=status) for c, status in
                [('90001', 'Onzeker voorstel'), ('90002', 'Onzeker voorstel'), ('25208', 'CBS-naamvariant')]]
        selected, _, uncertain = select_cases(rows, {c: {} for c in ['90001','90002','25208']}, limit=1)
        self.assertEqual(selected, ['25208', '90001'])
        self.assertEqual(uncertain, {'90001', '90002'})

    def test_long_descriptions_are_chunked_without_losing_the_end(self):
        body = ' '.join(f'woord{i}' for i in range(250))
        chunks = token_chunks(Tokenizer(), 'Beroep', body, body_tokens=72)
        self.assertEqual(len(chunks), 4)
        self.assertIn('woord249', chunks[-1])
        recovered = ' '.join(c.split('\n', 1)[1] for c in chunks)
        self.assertEqual(recovered, body)

    def test_metrics_distinguish_correct_first_and_third_candidate(self):
        result = dict(code='25208', baseline={'Huidige ISCO': '7322'},
                      embedding_top=[{'isco':'7322'}], candidates=[{'isco':'1111'}, {'isco':'7322'}])
        counts = evaluate_controls([result])
        self.assertEqual(counts['baseline_top1'], 1)
        self.assertEqual(counts['embeddings_top1'], 1)
        self.assertEqual(counts['reranker_top1'], 0)
        self.assertEqual(counts['reranker_top3'], 1)

    def test_source_review_cannot_invent_candidate_or_change_isco(self):
        import copy
        report = dict(source_hashes={'bron':'hash'}, models={'model':'revision'}, results=[
            dict(code='1', candidate_pool=[dict(uri='u', name='Beroep', isco='8322')])])
        artifact = dict(source_hashes={'bron':'hash'}, models={'model':'revision'}, method='Assistent, geen onafhankelijke toets',
                        reviews={'1':dict(selected=[dict(uri='u',name='Beroep',isco='8322')])})
        valid = copy.deepcopy(report)
        apply_source_reviews(valid, artifact)
        self.assertEqual(valid['assistant_review_count'], 1)
        artifact['reviews']['1']['selected'][0]['isco'] = '1120'
        with self.assertRaisesRegex(ValueError, 'buiten bronset'):
            apply_source_reviews(copy.deepcopy(report), artifact)

    def test_review_from_another_source_version_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'andere proef'):
            apply_source_reviews(dict(source_hashes={'a':'1'},models={}),
                                 dict(source_hashes={'a':'2'},models={}))
