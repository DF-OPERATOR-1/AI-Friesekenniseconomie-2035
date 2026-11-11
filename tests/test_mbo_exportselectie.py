import csv
from pathlib import Path
import unittest
from research.onderwijs.mbo_exportselectie import filter_rows

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT/'data/processed/onderwijs'


def read(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream, delimiter=';'))


class MboExportTests(unittest.TestCase):
    def test_aeres_outdoor_codes_excluded_from_both_exports(self):
        for kind in ('studenten','afgestudeerden'):
            rows = read(BASE/f'{kind}_mbo_friesland.csv')
            self.assertFalse(any(r['Instellingscode']=='25GV' and
                r['Erkende opleiding code'] in {'25844','26000'} for r in rows))

    def test_both_csvs_exact_subsets_with_original_places_and_counts(self):
        for kind in ('studenten','afgestudeerden'):
            filename = f'{kind}_mbo_friesland.csv'
            original = read(BASE/'instellingsselectie'/filename)
            selected = read(BASE/filename)
            self.assertEqual(selected, filter_rows(original, ROOT))
            self.assertLess(len(selected), len(original))
            self.assertEqual([r for r in selected if r['Instellingscode']=='08PG'],
                             [r for r in original if r['Instellingscode']=='08PG'])
            places = {r['Plaatsnaam instelling'] for r in selected}
            self.assertEqual(places, {'LEEUWARDEN','HOUTEN','EDE','HAARLEM'})
            self.assertTrue(any(r['Aantal']=='<5' for r in selected))
            self.assertTrue(any(r['Aantal']=='0' for r in selected))

    def test_svo_does_not_sneak_back_via_graduate_rows(self):
        for kind in ('studenten','afgestudeerden'):
            rows = read(BASE/f'{kind}_mbo_friesland.csv')
            svo2025 = {r['Erkende opleiding code'] for r in rows if r['Instellingscode']=='17WH' and r['Jaar']=='2025'}
            self.assertEqual(svo2025, {'25178','25425','25703','26028'} if kind=='afgestudeerden' else {'25178','25703'})
            self.assertFalse(any(r['Instellingscode']=='25PX' and r['Erkende opleiding code']=='25542' for r in rows))

    def test_graduates_cells_match_original_duo_source(self):
        source = ROOT/'data/raw/onderwijs/gediplomeerden-per-instelling-plaats-sectorkamer-type-mbo-opleiding-niveau-geslacht-instromende-studenten-2021-2025.csv'
        if not source.exists():
            self.skipTest('Optionele broncontrole vereist het lokale oorspronkelijke DUO-diplomabestand')
        raw = source.read_bytes()
        try:
            text = raw.decode('utf-8-sig')
        except UnicodeDecodeError:
            text = raw.decode('cp1252')
        import io
        reader = csv.DictReader(io.StringIO(text), delimiter=';')
        metadata = reader.fieldnames[:9]
        expected=[]
        for row in reader:
            if row['Instellingscode'] not in {'08PG','17WH','25GV','25PX'}:
                continue
            for year in range(2021,2026):
                for gender in ('MAN','VROUW'):
                    expected.append({**{k:row[k] for k in metadata}, 'Geslacht':gender.lower(),
                                     'Jaar':str(year), 'Aantal':row[f'DIP{gender}{year}']})
        self.assertEqual(read(BASE/'afgestudeerden_mbo_friesland.csv'), filter_rows(expected, ROOT))
