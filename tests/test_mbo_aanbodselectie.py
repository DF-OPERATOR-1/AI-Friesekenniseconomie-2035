import copy
import csv
from pathlib import Path
import unittest
from research.pipeline.imports.mbo_aanbodselectie import select_mbo_courses
from research.pipeline.imports.opleidingen import build_mbo_courses

ROOT = Path(__file__).resolve().parents[1]


class AanbodselectieTests(unittest.TestCase):
    def test_shared_qualification_does_not_admit_outdoor_course(self):
        # b0606 was te breed: groen en buitensport mogen geen locatiebewijs delen.
        course = dict(code='25844', years={'2025':dict(
            names=['Allround coördinator instructeur buitensport'], levels=['4'],
            pathways=['BOLVT'], institutions=['Aeres (V) MBO (25GV)'],
            qualifications=[dict(code='b0606', name='Opzichter/uitvoerder groene ruimte')])})
        selected, audit = select_mbo_courses(ROOT, [course])
        self.assertEqual(selected, [])
        self.assertFalse(audit['institution_year_decisions'][0]['included'])
        green = next(c for c in self.selected if c['code']=='25617')
        self.assertTrue(any('(25GV)' in i for i in green['years']['2025']['institutions']))

    def setUp(self):
        self.original = build_mbo_courses(ROOT)['courses']
        self.selected, self.audit = select_mbo_courses(ROOT, self.original)

    def test_svo_only_two_requested_qualifications_not_entire_school(self):
        by_year = {}
        for course in self.selected:
            for year, data in course['years'].items():
                if any('(17WH)' in label for label in data['institutions']):
                    by_year.setdefault(year, set()).update(q['code'] for q in data['qualifications'])
        self.assertEqual(by_year['2025'], {'b0405', 'b0876'})
        self.assertTrue(all(qids <= {'b0405','b0876'} for qids in by_year.values()))

    def test_firda_preserved_even_when_svo_removed_from_same_course(self):
        original = copy.deepcopy(self.original)
        selected = {c['code']:c for c in self.selected}
        for course in original:
            for year, data in course['years'].items():
                for institution in data['institutions']:
                    if '(08PG)' in institution:
                        self.assertIn(institution, selected[course['code']]['years'][year]['institutions'])
        svo_kok = next(c for c in self.selected if c['code']=='25180')['years']['2025']
        self.assertTrue(any('(08PG)' in label for label in svo_kok['institutions']))
        self.assertFalse(any('(17WH)' in label for label in svo_kok['institutions']))
        self.assertEqual(original, self.original)

    def test_nova_no_dakdekker_and_aeres_no_hoefsmid(self):
        for course in self.selected:
            data = course['years'].get('2025', {})
            if course['code']=='25542':
                self.assertFalse(any('(25PX)' in i for i in data.get('institutions', [])))
            if course['code'] in ('25467','25913'):
                self.assertFalse(any('(25GV)' in i for i in data.get('institutions', [])))
        # De canonieke CSV is al gefilterd; opnieuw selecteren moet idempotent zijn.
        self.assertTrue(all(row['included'] for row in self.audit['institution_year_decisions']))

    def test_manual_mapping_uses_parent_rows_and_excludes_dronten(self):
        with (ROOT/'data/mappings/mbo_locaties/friese_aanbodselectie.csv').open(encoding='utf-8-sig') as stream:
            rows = list(csv.DictReader(stream,delimiter=';'))
        self.assertEqual(len(rows),67)
        self.assertNotIn('Dronten', {r['Plaats'] for r in rows})
        self.assertEqual({r['SBB_kwalificatie'] for r in rows if r['Instellingscode']=='17WH'}, {'b0405','b0876'})
        self.assertEqual(sum(bool(r['Naamcorrectie']) for r in rows),2)
