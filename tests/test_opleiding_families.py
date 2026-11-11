import csv
import hashlib
import json
import tempfile
import shutil
import unittest
from pathlib import Path
from research.pipeline.imports.opleiding_families import load_code_families, registry_code_families, load_registry_rows, refresh_registry_snapshot


class CodeFamiliesTest(unittest.TestCase):
    def test_missing_mapping_does_not_infer_families(self):
        with tempfile.TemporaryDirectory() as root:
            self.assertEqual(load_code_families(root), [])

    def test_duplicate_codes_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / 'data/mappings/mbo_codefamilies.json'
            path.parent.mkdir(parents=True)
            path.write_text(json.dumps({'families': [{
                'education_type': 'mbo', 'sources': ['https://duo.nl'],
                'codes': [{'code': '25132'}, {'code': '25132'}],
            }]}))
            with self.assertRaises(ValueError):
                load_code_families(root)

    def test_verified_family_is_explicit(self):
        root = Path(__file__).resolve().parents[1]
        family = load_code_families(root)[0]
        self.assertEqual([c['code'] for c in family['codes']], ['93802', '25132', '25877'])
        self.assertTrue(family['registry_sha256'])


    def test_registry_families_preserve_qualification_level_and_include_diploma_only_codes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            registry = root / 'registry.csv'
            columns = ['Erkende opleidingscode', 'Erkende opleiding naam', 'Beroep code',
                       'Beroep naam', 'Niveau', 'Startdatum erkende opleiding',
                       'Uiterste instroomdatum erkende opleiding', 'Einddatum erkende opleiding']
            rows = [
                ['11111', 'Oude naam', 'b0100', 'Kwalificatie', '3', '20000101', '0', '0'],
                ['11112', 'Nieuwe naam', 'b0100', 'Kwalificatie', '3', '20230101', '0', '0'],
                ['11113', 'Oude naam', 'b0100', 'Kwalificatie', '4', '20000101', '0', '0'],
                ['11114', 'Oude naam', 'b0200', 'Andere kwalificatie', '3', '20000101', '0', '0'],
            ]
            with registry.open('w', newline='') as stream:
                writer = csv.writer(stream, delimiter=';')
                writer.writerow(columns)
                writer.writerows(rows)
            for kind, codes in [('studenten', ['11111', '11113', '11114']), ('afgestudeerden', ['11112'])]:
                path = root / f'data/processed/onderwijs/{kind}_mbo_friesland.csv'
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('Erkende opleiding code\n' + '\n'.join(codes) + '\n')
            reference = dict(registry_file='registry.csv',
                             registry_sha256=hashlib.sha256(registry.read_bytes()).hexdigest(),
                             sources=['https://duo.nl', 'https://duo.nl/register'])
            families = registry_code_families(root, [reference], set())
            self.assertEqual(len(families), 1)
            self.assertEqual([entry['code'] for entry in families[0]['codes']], ['11111', '11112'])
            self.assertEqual(families[0]['level'], '3')
            registry.write_text('gewijzigde bron')
            with self.assertRaisesRegex(ValueError, 'gecontroleerde bron'):
                registry_code_families(root, [reference], set())

    def test_all_published_families_have_unique_official_codes(self):
        root = Path(__file__).resolve().parents[1]
        families = load_code_families(root)
        reference = json.loads((root / 'data/mappings/mbo_codefamilies.json').read_text())['families'][0]
        registry = {row['Erkende opleidingscode']: row for row in load_registry_rows(root, reference)}
        codes = [entry['code'] for family in families for entry in family['codes']]
        self.assertEqual(len(codes), len(set(codes)))
        self.assertGreater(len(families), 1)
        for family in families:
            source_rows = [registry[entry['code']] for entry in family['codes']]
            self.assertEqual({row['Beroep code'] for row in source_rows}, {family['qualification']})
            self.assertEqual(len({row['Niveau'] for row in source_rows}), 1)


class RegistrySnapshotTest(unittest.TestCase):
    def copy_build_inputs(self, directory):
        source_root = Path(__file__).resolve().parents[1]
        target = Path(directory)
        reference = json.loads((source_root / 'data/mappings/mbo_codefamilies.json').read_text())['families'][0]
        names = ['data/mappings/mbo_codefamilies.json', reference['registry_snapshot_file'],
                 *reference['registry_selection_sha256']]
        for name in names:
            (target / name).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source_root / name, target / name)
        return source_root, target, reference

    def test_build_families_match_without_any_raw_sources(self):
        with tempfile.TemporaryDirectory() as directory:
            source_root, target, _ = self.copy_build_inputs(directory)
            self.assertFalse((target / 'data/raw').exists())
            self.assertEqual(load_code_families(target), load_code_families(source_root))

    def test_modified_snapshot_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            _, target, reference = self.copy_build_inputs(directory)
            path = target / reference['registry_snapshot_file']
            path.write_bytes(path.read_bytes() + b'\n')
            with self.assertRaisesRegex(ValueError, 'gecontroleerde bron'):
                load_code_families(target)

    def test_changed_duo_selection_requires_explicit_refresh(self):
        with tempfile.TemporaryDirectory() as directory:
            _, target, reference = self.copy_build_inputs(directory)
            path = target / next(iter(reference['registry_selection_sha256']))
            path.write_bytes(path.read_bytes() + b'\n')
            with self.assertRaisesRegex(ValueError, 'DUO-selectie gewijzigd'):
                load_code_families(target)

    def test_refresh_reproduces_selection_without_changing_source_provenance(self):
        with tempfile.TemporaryDirectory() as directory:
            _, target, reference = self.copy_build_inputs(directory)
            # Gebruik de gecontroleerde selectie als klein testvoorbeeld van het oorspronkelijke register.
            raw = target / reference['registry_file']
            raw.parent.mkdir(parents=True, exist_ok=True)
            snapshot = target / reference['registry_snapshot_file']
            expected = snapshot.read_bytes()
            raw.write_bytes(expected)
            mapping_path = target / 'data/mappings/mbo_codefamilies.json'
            mapping = json.loads(mapping_path.read_text())
            source_hash = hashlib.sha256(expected).hexdigest()
            mapping['families'][0]['registry_sha256'] = source_hash
            mapping_path.write_text(json.dumps(mapping))
            self.assertEqual(refresh_registry_snapshot(target).read_bytes(), expected)
            refreshed = json.loads(mapping_path.read_text())['families'][0]
            self.assertEqual(refreshed['registry_file'], reference['registry_file'])
            self.assertEqual(refreshed['registry_sha256'], source_hash)
            self.assertEqual(refreshed['registry_selection_sha256'], reference['registry_selection_sha256'])
            self.assertEqual(refresh_registry_snapshot(target).read_bytes(), expected)
