import tempfile
import unittest
from pathlib import Path

import pandas as pd
from openpyxl import load_workbook

from research.pipeline.imports.download_formats import export_formats
from research.pipeline.imports.publication import allowed_data_files


class DownloadFormatsTest(unittest.TestCase):
    def test_roundtrip_preserves_codes_missing_scores_and_suppression(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / 'sample.csv'
            source.write_text('ISCO_08_code;Score;Aantal;Naam\n0110;1,25;<5;Verpleegkundige\n0210;;7;=bronwaarde\n', encoding='utf-8-sig')
            paths = export_formats(source)
            self.assertEqual(set(paths), {'xlsx', 'dta'})
            workbook = load_workbook(source.with_suffix('.xlsx'))
            sheet = workbook['Gegevens']
            self.assertEqual(sheet['A2'].value, '0110')
            self.assertEqual(sheet['B2'].value, 1.25)
            self.assertIsNone(sheet['B3'].value)
            self.assertEqual(sheet['C2'].value, '<5')
            self.assertEqual(sheet['D3'].data_type, 's')
            frame = pd.read_stata(source.with_suffix('.dta'))
            self.assertEqual(frame['isco_08_code'].tolist(), ['0110', '0210'])
            self.assertEqual(frame['score'][0], 1.25)
            self.assertTrue(pd.isna(frame['score'][1]))
            self.assertEqual(frame['aantal'].tolist(), ['<5', '7'])
            with pd.io.stata.StataReader(source.with_suffix('.dta')) as reader:
                self.assertEqual(reader.variable_labels()['isco_08_code'], 'ISCO_08_code')

    def test_formats_only_allowed_for_explicitly_approved_csv(self):
        review = dict(approved=True, evidence='test', formats=['xlsx', 'dta'], format_evidence='test')
        allowed = allowed_data_files('/tmp/nonexistent-download-test', {'files': {'sample.csv': review}})
        self.assertEqual(allowed, {'research/sample.csv', 'research/sample.xlsx', 'research/sample.dta'})
        review['approved'] = False
        self.assertEqual(allowed_data_files('/tmp/nonexistent-download-test', {'files': {'sample.csv': review}}), set())
