import csv
import json
from pathlib import Path
import tempfile
import unittest

from research.onderwijs.locatiecontrole import (
    inventory_rows, location_observations, normalise, parse_inventory, write_csv,
)


class LocatiecontroleTests(unittest.TestCase):
    def test_hierarchy_preserves_names_and_trailing_source(self):
        sections = parse_inventory(
            'ROC Nova College\n- Maritien officier\n'
            '  - Schoolnaam A\n  - Schoolnaam B\n'
            'https://www.kiesmbo.nl/scholen/voorbeeld\n'
        )
        offers, locations = inventory_rows(sections, '2026-11-09')
        self.assertEqual(len(offers), 2)
        self.assertEqual({r['Opleiding_KiesMBO'] for r in offers}, {'Maritien officier'})
        self.assertEqual(offers[0]['Bronregel_opleiding'], 2)
        self.assertEqual(offers[1]['Bronregel_onderliggend'], 4)
        self.assertEqual(locations[0]['Plaats'], 'Harlingen')
        for row in offers:
            self.assertEqual(row['CREBO'], '')
            self.assertEqual(row['Schooljaar'], '')
            self.assertEqual(row['Handmatige_controle_datum'], '')
            self.assertEqual(row['Bron_URL'], 'https://www.kiesmbo.nl/scholen/voorbeeld')

    def test_missing_source_and_orphan_child_rejected(self):
        for text in ['SVO\n- Een opleiding', 'SVO\n  - Losse vermelding']:
            with self.assertRaises(ValueError):
                parse_inventory(text)

    def test_firda_does_not_invent_courses_or_frisian_cities(self):
        offers, locations = inventory_rows(parse_inventory(
            'Firda\nhttps://www.firda.nl/locaties\n'), '2026-11-09')
        self.assertEqual(offers, [])
        self.assertEqual({r['Plaats'] for r in locations}, {'', 'Emmeloord', 'Urk'})
        self.assertEqual(next(r for r in locations if not r['Plaats'])['Provincie'], 'Fryslân')

    def test_historical_missing_region_suppression_and_duplicates(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            raw = root / 'data/raw/onderwijs'
            raw.mkdir(parents=True)
            files = []
            for year, rows in [
                ('2023', [('25GV', 'Aeres', 'A', 'Sneek', '12')]),
                ('2024', [('25GV', 'Aeres', 'A', 'Sneek', 'Friesland', '< 5'),
                          ('25GV', 'Aeres', 'B', 'Sneek', 'Friesland', '10')]),
                ('2025', [('25GV', 'Aeres', 'A', 'Sneek', 'Friesland', '10'),
                          ('25GV', 'Aeres', 'A', 'Sneek', 'Friesland', '10')]),
            ]:
                name = f'02.-onderwijslocaties-mbo-test-{year}.csv'
                headers = ['Instellingscode', 'Naam_instelling', 'Onderwijslocatiecode',
                           'Plaats_onderwijslocatie']
                if year != '2023':
                    headers.append('Arbeidsmarktregio')
                headers.append('Aantal_hoofdinschrijvingen')
                with (raw / name).open('w', newline='') as stream:
                    writer = csv.writer(stream, delimiter=';')
                    writer.writerow(headers)
                    writer.writerows(rows)
                files.append({'bestand': name, 'url': f'https://duo.nl/{name}'})
            (raw / 'sources.json').write_text(json.dumps(files))
            observations, summaries, hashes = location_observations(root, [])
            self.assertEqual(len(hashes), 3)
            by_year = {r['Jaar']: r for r in summaries}
            self.assertEqual(by_year['2023']['Som_exacte_hoofdinschrijvingen_regio_Friesland'], '')
            self.assertEqual(by_year['2023']['Aantal_bronlocaties_regio_Friesland'], '')
            self.assertEqual(by_year['2024']['Som_exacte_hoofdinschrijvingen_regio_Friesland'], 10)
            self.assertEqual(by_year['2024']['Aantal_afgeschermde_locaties_regio_Friesland'], 1)
            self.assertEqual(by_year['2024']['Volledige_som_gepubliceerde_locaties'], '')
            self.assertIn('< 5', [r['Aantal_hoofdinschrijvingen_bron'] for r in observations])
            self.assertEqual(len([r for r in observations if r['Jaar'] == '2025']), 2)
            self.assertEqual(by_year['2025']['Herhaalde_locatiecodes_binnen_instellingjaar'], 1)
            self.assertEqual(by_year['2025']['Som_exacte_hoofdinschrijvingen_regio_Friesland'], '')

    def test_csv_roundtrip_and_name_normalisation(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'test.csv'
            write_csv(path, [{'naam': 'Fryslân; "opleiding"', 'aantal': '<5'}], ['naam', 'aantal'])
            self.assertTrue(path.read_bytes().startswith(b'\xef\xbb\xbf'))
            with path.open(encoding='utf-8-sig', newline='') as stream:
                self.assertEqual(list(csv.DictReader(stream, delimiter=';')),
                                 [{'naam': 'Fryslân; "opleiding"', 'aantal': '<5'}])
        self.assertEqual(normalise('  Fryslân — Technicus! '), 'fryslan technicus')


if __name__ == '__main__':
    unittest.main()
