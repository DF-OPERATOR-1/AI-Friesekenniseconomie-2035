import csv
import gzip
import json
import tempfile
import unittest
from pathlib import Path
from research.pipeline.imports.esco import import_esco, supplement_content, canonical

ROOT = Path(__file__).resolve().parents[1]

class EscoSupplementTests(unittest.TestCase):
    def test_cached_supplement_works_without_raw_files(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            cache = root/'data/processed/esco_aanvulling.json.gz'
            cache.parent.mkdir(parents=True)
            cache.write_bytes((ROOT/'data/processed/esco_aanvulling.json.gz').read_bytes())
            result = import_esco(root, {'1311', '1113'})
            self.assertIn('1311', result['content'])
            self.assertNotIn('1113', result['content'])
            self.assertEqual(result['metadata']['version'], '1.2.1')

    def test_existing_source_is_preserved(self):
        original = {'1311': {'description': 'CompetentNL'}}
        members = {'1311': [{'name': 'bestaand'}]}
        extra = {'content': {'1311': {}, '1312': {'source': 'ESCO'}},
                 'members': {'1311': [], '1312': [{'name': 'nieuw'}]}}
        combined, combined_members = supplement_content(original, members, extra)
        self.assertIs(combined['1311'], original['1311'])
        self.assertIs(combined_members['1311'], members['1311'])
        self.assertEqual(set(original), {'1311'})
        self.assertEqual(combined['1312']['source'], 'ESCO')

    def test_actual_source_coverage_and_no_invented_tasks(self):
        result = json.loads(gzip.decompress((ROOT/'data/processed/esco_aanvulling.json.gz').read_bytes()))
        self.assertEqual(len(result['content']), 33)
        self.assertEqual(len(result['metadata']['available_isco_codes']), 426)
        for code, entries in result['members'].items():
            self.assertEqual(len(code), 4)
            for member in entries:
                self.assertEqual(member['isco_code'], code)
                self.assertEqual(member['source'], 'ESCO')
                self.assertEqual(member['language'], 'nl')
                self.assertEqual(member['tasks'], [])
                self.assertTrue(member['description'])
                for skill in member['skills'] + member['knowledge_areas']:
                    self.assertIn(skill['importance'], ('essentieel', 'optioneel'))
                    self.assertTrue(skill['uri'])

    def test_conflicting_source_records_fail(self):
        with self.assertRaises(ValueError):
            canonical([{'conceptUri':'x', 'iscoGroup':'1311'},
                       {'conceptUri':'x', 'iscoGroup':'1312'}])

    def test_four_digit_code_required(self):
        with self.assertRaises(ValueError):
            import_esco(ROOT, {'131'})

    def test_import_uses_official_relationship_and_competence_type(self):
        from research.pipeline.imports.esco import SOURCE_FOLDER
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root/SOURCE_FOLDER
            source.mkdir(parents=True)
            tables = {
                'occupations_nl.csv': [{'conceptUri':'occupation:x', 'iscoGroup':'8322', 'preferredLabel':'taxichauffeur', 'description':'Vervoert personen.'}],
                'skills_nl.csv': [{'conceptUri':'skill:x', 'skillType':'skill/competence', 'preferredLabel':'personen vervoeren', 'description':'Veilig rijden.', 'reuseLevel':'occupation-specific'}],
                'ISCOGroups_nl.csv': [{'conceptUri':'isco:8322', 'code':'8322', 'preferredLabel':'Chauffeurs'}],
                'broaderRelationsOccPillar_nl.csv': [{'conceptUri':'occupation:x', 'broaderUri':'isco:8322'}],
                'occupationSkillRelations_nl.csv': [{'occupationUri':'occupation:x', 'skillUri':'skill:x', 'relationType':'essential'}],
            }
            def write(name):
                with (source/name).open('w') as handle:
                    writer = csv.DictWriter(handle, fieldnames=tables[name][0])
                    writer.writeheader()
                    writer.writerows(tables[name])
            for name in tables:
                write(name)
            result = import_esco(root, {'8322'})
            member = result['members']['8322'][0]
            self.assertEqual(member['name'], 'taxichauffeur')
            self.assertEqual(member['skills'][0]['importance'], 'essentieel')
            self.assertEqual(member['tasks'], [])
            tables['occupations_nl.csv'][0]['iscoGroup'] = '7322'
            write('occupations_nl.csv')
            with self.assertRaises(ValueError):
                import_esco(root, {'8322'}, refresh=True)
