import csv
import json
import tempfile
import unittest
from pathlib import Path
from research.pipeline.imports.common import code, count, year
from research.pipeline.imports.uwv import import_uwv
from research.pipeline.imports.onderwijs import import_education


class ImportTests(unittest.TestCase):
    def test_restructured_source_paths_exist(self):
        sources = json.loads(
            Path('website/public/data/research/occupations.json').read_text())['sources']
        for source in sources:
            self.assertTrue(Path(source['path']).is_file(), source['path'])
        for path in ('research/ai_exposure/exposure.py',
                     'research/pipeline/imports/build_atlas.py',
                     'research/pipeline/imports/occupation_content.py',
                     'research/ai_complementarity/complementary.py',
                     'research/onderwijs/onderwijs.py',
                     'data/schemas/occupation-profile.schema.json'):
            self.assertTrue(Path(path).is_file(), path)

    def test_codes_missing_and_zero(self):
        self.assertEqual(code('0110', 4), '0110')
        for bad in ('110', '01100', 'abcd'):
            with self.assertRaises(ValueError):
                code(bad, 4)
        self.assertIsNone(count('<5'))
        self.assertIsNone(count(''))
        self.assertEqual(count('0'), 0)
        for bad in ('NaN', 'inf', '-1'):
            with self.assertRaises(ValueError):
                count(bad)
        with self.assertRaises(ValueError):
            year('1800')

    def test_actual_uwv_workbook(self):
        from research.pipeline.imports.uwv_workbook import import_workbook
        p = Path('data/raw/uwv/Vacaturemarkt - Data Fryslan.xlsx')
        if not p.is_file():
            self.skipTest('Werkmap niet aanwezig in deze checkout')
        rows = import_workbook(p)
        self.assertEqual(len(rows), 9072)
        self.assertEqual(len({r['occupation'] for r in rows}), 648)
        self.assertEqual(min((r['year'], r['quarter']) for r in rows), (2023, 1))
        self.assertEqual(max((r['year'], r['quarter']) for r in rows), (2026, 2))
        self.assertTrue(all(r['isco_code'] is None for r in rows))
        self.assertTrue(any(r['value'] is None for r in rows))
        self.assertTrue(any(r['value'] == 0 for r in rows))

    def test_uwv_validation(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/'uwv.csv'
            header = 'isco_code;year;quarter;vacancies;geography;source\n'
            p.write_text(header+'0110;2025;1;;Fryslân;UWV\n')
            self.assertIsNone(import_uwv(p, {'0110'})[0]['value'])
            with self.assertRaises(ValueError):
                import_uwv(p, {'2221'})
            p.write_text(header+'0110;2025;5;1;Fryslân;UWV\n')
            with self.assertRaises(ValueError):
                import_uwv(p)
            p.write_text(header+('0110;2025;1;1;Fryslân;UWV\n'*2))
            with self.assertRaises(ValueError):
                import_uwv(p)

    def test_actual_duo_rows_preserved(self):
        for p in Path('data/processed/onderwijs').glob('*.csv'):
            result = import_education(p)
            with p.open(encoding='utf-8-sig') as f:
                original = list(csv.DictReader(f, delimiter=';'))
            self.assertEqual(len(result), len(original))
            self.assertEqual([r['raw_value'] for r in result],
                             [r['Aantal'] for r in original])
            self.assertEqual([r['dimensions'] for r in result], original)
            self.assertTrue(all(r['course_code'] for r in result))

    def test_existing_ai_scores_shared(self):
        profiles = json.loads(
            Path('website/public/data/atlas/profiles.json').read_text())
        ai = json.loads(
            Path('website/public/data/research/occupations.json').read_text())['rows']
        self.assertEqual(len(profiles), len(ai))
        for p, r in zip(profiles, ai):
            self.assertEqual(p['isco_code'], r['code'])
            self.assertEqual(p['ai_exposure']['value'], r['exposure'])
            self.assertEqual(p['ai_complementarity']['value'], r['complementarity'])
            for key in ('vacancies', 'education_inflow', 'retirement_outflow', 'outlook_2035'):
                self.assertIsNone(p[key]['value'])

    def test_publication_gate(self):
        for row in json.loads(Path('website/public/data/atlas/catalogue.json').read_text()):
            if row['download']:
                review = json.loads(
                    Path('data/published/publication_manifest.json').read_text())['files'][row['file']]
                self.assertTrue(review['approved'])
                self.assertTrue(review['evidence'])
                self.assertTrue((Path('website/public')/row['download']).is_file())


if __name__ == '__main__':
    unittest.main()
