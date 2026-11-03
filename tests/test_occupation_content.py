import csv
import json
import gzip
import tempfile
import unittest
from pathlib import Path
from research.pipeline.imports.occupation_content import import_content


class OccupationContentTests(unittest.TestCase):
    def test_uri_join_preserves_leading_zero_and_deduplicates(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            folder = root / 'data/raw/competentnl'
            folder.mkdir(parents=True)
            (root / 'data/processed').mkdir()
            def write(name, fields, records):
                with (folder / name).open('w', newline='') as stream:
                    writer = csv.DictWriter(stream, fieldnames=fields, delimiter=';')
                    writer.writeheader()
                    writer.writerows(records)
            write('beroepen_isco.csv', ['uri', 'naam', 'definitie', 'isco_code', 'isco_naam'], [
                dict(uri='u1', naam='Specifiek beroep', definitie='Eigen definitie', isco_code='0110', isco_naam='Officieren'),
                dict(uri='u2', naam='Ander beroep', definitie='Andere definitie', isco_code='2512', isco_naam='Softwareontwikkelaars')])
            for name in ['beroepen_taken.csv', 'beroepen_vaardigheden.csv', 'beroepen_kennisgebieden.csv']:
                write(name, ['uri', 'item_naam', 'belang', 'item_definitie'], [dict(uri='u1', item_naam='Uniek onderdeel', belang='essentieel', item_definitie='Uitleg van het onderdeel'), dict(uri='u1', item_naam='Uniek onderdeel', belang='essentieel', item_definitie='Uitleg van het onderdeel'), dict(uri='onbekend', item_naam='Niet koppelen')])
            result = import_content(root)
            member_content = json.loads(gzip.decompress((root / 'data/processed/competentnl_members.json.gz').read_bytes()))
            self.assertEqual(len(member_content['0110'][0]['tasks']), 1)
            self.assertEqual(member_content['0110'][0]['tasks'][0]['name'], 'Uniek onderdeel')
            self.assertEqual(member_content['0110'][0]['tasks'][0]['importance'], 'essentieel')
            self.assertEqual(member_content['0110'][0]['tasks'][0]['description'], 'Uitleg van het onderdeel')
            self.assertEqual(member_content['2512'][0]['tasks'], [])
            self.assertEqual(member_content['2512'][0]['skills'], [])
            self.assertEqual(result['0110']['tasks'], ['Uniek onderdeel'])
            self.assertEqual(result['0110']['knowledge_areas'], ['Uniek onderdeel'])
            self.assertEqual(member_content['0110'][0]['knowledge_areas'][0]['description'], 'Uitleg van het onderdeel')
            self.assertEqual(member_content['2512'][0]['knowledge_areas'], [])
            self.assertEqual(result['2512']['tasks'], [])
            self.assertEqual(result['0110']['description'], 'Specifiek beroep: Eigen definitie')
            for path in folder.glob('*.csv'):
                path.unlink()
            self.assertEqual(import_content(root), result)

    def test_partial_source_set_fails_instead_of_using_stale_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            folder = root / 'data/raw/competentnl'
            folder.mkdir(parents=True)
            (folder / 'beroepen_isco.csv').touch()
            with self.assertRaisesRegex(ValueError, 'Onvolledige'):
                import_content(root)
