import csv
import tempfile
import unittest
from pathlib import Path
from research.pipeline.imports.ho_isco import attach_ho_occupations


class HoIscoTests(unittest.TestCase):
    def test_multiple_matches_deduplication_and_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'data/raw/studiekeuzedatabase/ho_alle_isco.csv'
            source.parent.mkdir(parents=True)
            (root / 'data/processed').mkdir()
            fields = ['opleidingCode', 'soortHo', 'iscoCode', 'iscoNaam', 'matchtype', 'graad', 'opleidingNaam']
            with source.open('w') as stream:
                writer = csv.DictWriter(stream, fieldnames=fields, delimiter=';')
                writer.writeheader()
                for code, kind in [('110', 'DIRECT'), ('110', 'DIRECT'), ('2422', 'KANDIDAAT')]:
                    writer.writerow(dict(zip(fields, ['12345', 'HBO', code, 'Beroep', kind, 'Bachelor', 'Voorbeeldopleiding'])))
            courses = {'courses': [{'education_type': 'hbo', 'code': '12345'}, {'education_type': 'wo', 'code': '99999'}]}
            attach_ho_occupations(root, courses)
            self.assertEqual(len(courses['courses'][0]['occupations']), 2)
            self.assertEqual(courses['courses'][0]['occupations'][0]['code'], '0110')
            self.assertEqual(courses['courses'][1]['occupations'], [])
            source.unlink()
            restored = {'courses': [{'education_type': 'hbo', 'code': '12345'}, {'education_type': 'wo', 'code': '99999'}]}
            attach_ho_occupations(root, restored)
            self.assertEqual(courses, restored)

    def test_national_courses_are_not_added_to_frisian_overview(self):
        from research.pipeline.imports.ho_isco import load_ho_courses, national_ho_display
        import gzip
        import json
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'data/raw/studiekeuzedatabase/ho_alle_isco.csv'
            source.parent.mkdir(parents=True)
            fields = ['opleidingCode', 'opleidingNaam', 'soortHo', 'iscoCode', 'iscoNaam', 'matchtype', 'graad']
            with source.open('w') as stream:
                writer = csv.DictWriter(stream, fieldnames=fields, delimiter=';')
                writer.writeheader()
                for code, name, kind in [('11111', 'Friese opleiding', 'DIRECT'), ('22222', 'Landelijke opleiding', 'DIRECT'), ('22222', 'Landelijke opleiding', 'DIRECT'), ('33333', 'Landelijke kandidaat', 'KANDIDAAT')]:
                    writer.writerow(dict(zip(fields, [code, name, 'WO', '2114', 'Geologen', kind, 'Master'])))
            local = {'courses': [dict(code='11111', education_type='wo', years={'2025':dict(levels=['master'])})]}
            national = load_ho_courses(root)
            attach_ho_occupations(root, local, national)
            display = national_ho_display(local, national)['courses']
            self.assertEqual(len(local['courses']), 1)
            self.assertEqual(len(display), 3)
            self.assertEqual(len(display[1]['occupations']), 1)
            self.assertEqual(display[0]['years'], {'2025': {'levels': ['master']}})
            self.assertEqual(display[1]['years'], {})
            source.unlink()
            self.assertEqual(load_ho_courses(root), national)
