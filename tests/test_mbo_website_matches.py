import csv
import gzip
import json
from pathlib import Path
import tempfile
import unittest
from research.pipeline.imports.mbo_website_matches import build_mbo_matches


class MboWebsiteTests(unittest.TestCase):
    def test_allround_dakdekker_metaal_has_reviewed_occupations_for_both_codes(self):
        root = Path(__file__).resolve().parents[1]
        courses = {'courses': [dict(code=code, education_type='mbo', years={
            '2025': dict(names=['Allround dakdekker metaal'])}) for code in ['25542', '25869']]}
        data = build_mbo_matches(root, courses)
        for code in ['25542', '25869']:
            relations = [r for r in data['relations'] if r['code'] == code]
            self.assertEqual({r['occupation'] for r in relations}, {'Dakdekker', 'Voorman / voorvrouw dakdekker'})
            self.assertTrue(all(r['isco'] == '7121' for r in relations))
            self.assertTrue(all(r['score'] is None for r in relations))
            self.assertTrue(all('doorgroeimogelijkheid' in r['note'] for r in relations))
            self.assertTrue(all(r['evidence'][0]['url'].startswith('https://www.s-bb.nl/') for r in relations))

    def test_exact_codes_review_precedence_pending_and_group_only_baseline(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'data/processed').mkdir(parents=True)
            (root/'data/mappings').mkdir(parents=True)
            courses = {'courses': [dict(code=c, education_type='mbo', years={
                '2025': dict(names=['Opleiding '+c])}) for c in ['1','2','3','4']]}
            fields = ['Opleidingscode','Beroepsidentificatie','Mogelijk beroep','ISCO-code',
                      'Beoordeling','Bron beroep','Matchscore (geen kanspercentage)']
            with (root/'data/processed/mbo_beroep_matches.csv').open('w',newline='') as f:
                writer=csv.DictWriter(f,fieldnames=fields,delimiter=';');writer.writeheader()
                for c in ['1','2','3','4','999']:
                    writer.writerow(dict(zip(fields,[c,'esco:x','Beroep','9999','verwant beroep','ESCO','57,8'])))
            reviews={'2':dict(selected=[dict(uri='cnl:y',name='Beoordeeld beroep',isco='3221')],note='Onderbouwd',decision='ondersteund voorstel'),
                     '3':dict(selected=[],note='Kandidaten uitbreiden',decision='kandidaatset uitbreiden'),
                     '4':dict(selected=[],keep_baseline=True,note='Groep behouden',decision='bestaande CBS-koppeling behouden')}
            (root/'data/mappings/opleiding_beroep_proef_beoordelingen.json').write_text(json.dumps(dict(reviews=reviews)))
            (root/'data/processed/opleiding_beroep_proef.json.gz').write_bytes(gzip.compress(json.dumps(dict(results=[dict(code='4',baseline={'Huidig beroep':'Drukkers','Huidige ISCO':'7322'})])).encode()))
            data=build_mbo_matches(root,courses)
            self.assertEqual(len(data['relations']),3)
            by_code={r['code']:r for r in data['relations']}
            self.assertEqual(by_code['1']['score'],57.8)
            self.assertEqual(by_code['2']['occupation_uri'],'cnl:y')
            self.assertIsNone(by_code['2']['score'])
            self.assertEqual(by_code['4']['occupation_uri'],'')
            self.assertEqual(by_code['4']['isco'],'7322')
            self.assertNotIn('3',by_code)
            self.assertNotIn('999',by_code)
            self.assertEqual(data['pending']['3'],'Kandidaten uitbreiden')
            self.assertEqual(by_code['1']['years'],['2025'])
            self.assertEqual(len(data['metadata']['sources']),3)
