import tempfile
import unittest
from pathlib import Path
from research.pipeline.imports.esco_audit import inspect_duplicates, trace_unit_groups, read_table


class EscoAuditTests(unittest.TestCase):
    def test_duplicate_dates_are_distinguished_from_classification_conflicts(self):
        rows = [dict(conceptUri='u', iscoGroup='8322', modifiedDate='2024'),
                dict(conceptUri='u', iscoGroup='8322', modifiedDate='2025')]
        unique, issues = inspect_duplicates(rows)
        self.assertEqual(len(unique), 1)
        self.assertFalse(issues[0]['semantic_conflict'])
        rows[1]['iscoGroup'] = '7322'
        self.assertTrue(inspect_duplicates(rows)[1][0]['semantic_conflict'])

    def test_official_hierarchy_preserves_four_digit_code(self):
        codes, cyclic = trace_unit_groups('esco:child', {'esco:child': {'esco:parent'},
            'esco:parent': {'isco:0110'}}, {'isco:0110':'0110'})
        self.assertEqual(codes, {'0110'})
        self.assertFalse(cyclic)

    def test_hierarchy_cycle_is_reported(self):
        codes, cyclic = trace_unit_groups('a', {'a': {'b'}, 'b': {'a'}}, {})
        self.assertEqual(codes, set())
        self.assertTrue(cyclic)

    def test_missing_core_fields_are_not_silently_padded(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'occupations_nl.csv'
            path.write_text('conceptUri,iscoGroup\nu\n')
            with self.assertRaises(ValueError):
                read_table(path)

    def test_optional_trailing_hierarchy_columns_are_empty_not_invented(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)/'skillsHierarchy_nl.csv'
            path.write_text('Level 0 code,Level 1 code\nL\n')
            _, rows = read_table(path)
        self.assertEqual(rows, [{'Level 0 code':'L','Level 1 code':''}])
