import csv
import unittest
from pathlib import Path
from research.pipeline.imports.opleidingen import build_courses, build_mbo_courses, higher_courses

ROOT = Path(__file__).resolve().parents[1]


class CourseTests(unittest.TestCase):
    def test_snapshot_preserves_active_crebos_without_student_counts(self):
        result = build_mbo_courses(ROOT)
        expected = set()
        with (ROOT / 'data/processed/onderwijs/studenten_mbo_friesland.csv').open(encoding='utf-8-sig') as f:
            for row in csv.DictReader(f, delimiter=';'):
                expected.add((row['Erkende opleiding code'], row['Jaar']))
        actual = {(c['code'], y) for c in result['courses'] for y in c['years']}
        self.assertEqual(actual, expected)
        self.assertEqual(len({c['code'] for c in result['courses']}), len(result['courses']))
        self.assertEqual(sum('2025' in c['years'] for c in result['courses']), 342)
        for c in result['courses']:
            for group in c['years'].values():
                self.assertNotIn('Aantal', group)
                self.assertNotIn('isco_code', group)
                self.assertTrue(group['institutions'])
                self.assertTrue(all(q['code'] not in ('b0000', 'b9999') for q in group['qualifications']))
        missing = next(c for c in result['courses'] if c['code'] == '27087')['years']['2025']
        self.assertEqual(missing['mapping_status'], 'code ontbreekt in koppeltabel')
        self.assertEqual(missing['qualifications'], [])

    def test_qualification_name_is_not_assigned_by_similarity(self):
        result = build_mbo_courses(ROOT)
        # Geen beroepskoppelingen naar CompetentNL op basis van naamvergelijking.
        for c in result['courses']:
            for group in c['years'].values():
                self.assertEqual(set(group), {'names', 'levels', 'pathways', 'institutions',
                                              'qualifications', 'mapping_status'})

    def test_higher_education_matches_friesland_and_active_years(self):
        for education_type in ('hbo', 'wo'):
            courses = higher_courses(ROOT, education_type)
            with (ROOT / f'data/processed/onderwijs/studenten_{education_type}_friesland.csv').open(encoding='utf-8-sig') as f:
                source = list(csv.DictReader(f, delimiter=';'))
            expected = {(r['OPLEIDINGSCODE ACTUEEL'], r['Jaar']) for r in source
                        if r['Aantal'] == '<5' or (r['Aantal'].isdigit() and int(r['Aantal']) > 0)}
            self.assertTrue(all(r['PROVINCIE'] == 'Friesland' for r in source))
            self.assertEqual({(c['code'], y) for c in courses for y in c['years']}, expected)
            for c in courses:
                self.assertEqual(c['education_type'], education_type)
                for group in c['years'].values():
                    self.assertTrue(group['places'])
                    self.assertEqual(group['qualifications'], [])
                    self.assertNotIn('Aantal', group)

    def test_non_friesland_higher_education_is_rejected(self):
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / 'data/processed/onderwijs'
            source.mkdir(parents=True)
            (source / 'studenten_hbo_friesland.csv').write_text('PROVINCIE;Aantal\nGroningen;10\n')
            with self.assertRaisesRegex(ValueError, 'Niet-Friese rij'):
                higher_courses(folder, 'hbo')

    def test_education_types_remain_separate(self):
        courses = build_courses(ROOT)['courses']
        self.assertEqual({c['education_type'] for c in courses}, {'mbo', 'hbo', 'wo'})
        self.assertEqual(len(courses), len({(c['education_type'], c['code']) for c in courses}))

    def test_all_pathways_follow_both_duo_sources_and_selected_institutions(self):
        from collections import defaultdict
        courses = build_courses(ROOT)['courses']
        for education_type in ('mbo', 'hbo', 'wo'):
            mbo = education_type == 'mbo'
            expected = defaultdict(set)
            for kind in ('studenten', 'afgestudeerden'):
                partitions = defaultdict(list)
                with (ROOT / f'data/processed/onderwijs/{kind}_{education_type}_friesland.csv').open(encoding='utf-8-sig') as stream:
                    for row in csv.DictReader(stream, delimiter=';'):
                        code = row['Erkende opleiding code' if mbo else 'OPLEIDINGSCODE ACTUEEL']
                        institution = row['Instellingscode' if mbo else 'INSTELLINGSCODE ACTUEEL']
                        pathway = row['Leerweg' if mbo else 'OPLEIDINGSVORM']
                        place = '' if mbo else row['GEMEENTENAAM']
                        partitions[(code, row['Jaar'], institution, place, pathway)].append(row['Aantal'])
                for key, values in partitions.items():
                    if not all(value.isdigit() and int(value) == 0 for value in values):
                        expected[key].add(kind)
            for course in courses:
                if course['education_type'] != education_type:
                    continue
                for year, data in course['years'].items():
                    wanted = defaultdict(set)
                    for (code, source_year, institution, place, pathway), kinds in expected.items():
                        if code == course['code'] and source_year == year and any(label.endswith(f'({institution})') for label in data['institutions']) and (mbo or place in data['places']):
                            wanted[pathway].update(kinds)
                    with self.subTest(type=education_type, code=course['code'], year=year):
                        self.assertEqual(data['pathways'], sorted(wanted))
                        self.assertEqual(data['pathway_sources'], {key: sorted(value) for key, value in wanted.items()})

    def test_accountmanager_keeps_exam_only_graduates_in_2025(self):
        course = next(c for c in build_courses(ROOT)['courses'] if c['education_type'] == 'mbo' and c['code'] == '25132')
        self.assertIn('EX', course['years']['2025']['pathways'])
        self.assertEqual(course['years']['2025']['pathway_sources']['EX'], ['afgestudeerden'])
