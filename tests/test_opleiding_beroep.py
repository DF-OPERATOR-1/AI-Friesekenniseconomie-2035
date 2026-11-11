import csv
from pathlib import Path
import tempfile
import unittest
from research.pipeline.imports.opleiding_beroep import build_matches, overlap, domain_anchors, domain_evidence, domain_words, level_compatible, weighted_task_score, exact_specific_name, name_keys, fallback_role_factor


class MatchTests(unittest.TestCase):
    def setUp(self):
        # Bronlezen is gescheiden van de matchlogica; unitfixtures hebben geen XLS.
        from unittest.mock import patch
        self.cbs_patch = patch('research.pipeline.imports.opleiding_beroep.load_cbs_index', return_value=({}, {}))
        self.cbs_loader = self.cbs_patch.start()
        self.addCleanup(self.cbs_patch.stop)

    def write(self, root, relative, fields, rows):
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open('w', encoding='utf-8', newline='') as stream:
            writer = csv.DictWriter(stream, fieldnames=fields, delimiter=';')
            writer.writeheader(); writer.writerows(rows)

    def fixture(self, root):
        base = 'data/raw/competentnl/'
        self.write(root, base+'beroepen_isco.csv', ['uri', 'naam', 'definitie', 'isco_code', 'isco_naam'], [
            dict(uri='occupation:a', naam='Afvalinzamelaar', definitie='Verzamelt afval bij huishoudens en sorteert materiaal.', isco_code='9611', isco_naam='Groep A'),
            dict(uri='occupation:b', naam='Softwareprogrammeur', definitie='Ontwikkelt software en programmeert applicaties.', isco_code='1234', isco_naam='Groep B')])
        self.write(root, base+'beroepen_vaardigheden.csv', ['uri', 'item_uri', 'item_naam', 'belang'], [
            dict(uri='occupation:a', item_uri='skill:x', item_naam='X', belang='essentieel'),
            dict(uri='occupation:b', item_uri='skill:y', item_naam='Y', belang='belangrijk')])
        self.write(root, base+'beroepen_kennisgebieden.csv', ['uri', 'item_uri', 'item_naam', 'belang'], [])
        self.write(root, base+'beroepen_taken.csv', ['uri', 'item_uri', 'item_naam', 'item_definitie', 'belang'], [
            dict(uri='occupation:a', belang='essentieel', item_uri='task:a', item_naam='Afval inzamelen', item_definitie='Verzamelt afval bij huishoudens en sorteert materiaal.'),
            dict(uri='occupation:b', belang='essentieel', item_uri='task:b', item_naam='Programmeren', item_definitie='Ontwikkelt software en programmeert applicaties.')])
        row = dict(code='12345', opleiding='course:a', naam='Afvalinzamelaar', definitie='Verzamelt afval bij huishoudens en sorteert materiaal.', beschrijving='Verzamelt afval bij huishoudens en sorteert materiaal.', hat_essentieel='skill:x', hat_belangrijk='unknown:z')
        self.write(root, base+'mbo.csv', list(row), [row, row,
                   dict(code='54321', opleiding='course:b', naam='Qzx', definitie='', beschrijving='', hat_essentieel='unknown:z', hat_belangrijk='')])
        from openpyxl import Workbook
        from research.pipeline.imports.opleidingen import COHORTS
        book = Workbook(); sheet = book.active; sheet.title = 'koppeltabel'
        sheet.append(['opleidingscode', 'niveau beroep', 'subgroep',
                      'beroepsopleiding (dossier)', 'omschrijving ISCED-F2013'])
        sheet.append(['12345', '2', 'Afvalinzameling', 'Afvalbeheer', 'Afvalinzameling'])
        sheet.append(['54321', '2', 'Qzx', 'Qzx', 'Qzx'])
        context = root / 'data/raw/crebo' / COHORTS[2025][0]
        context.parent.mkdir(parents=True, exist_ok=True); book.save(context); book.close()
        self.write(root, 'data/mappings/isco2008_brc2014.csv',
                   ['ISCO2008unitgroup', 'ISCO2008niveau'], [
                       {'ISCO2008unitgroup': '9611', 'ISCO2008niveau': '2'},
                       {'ISCO2008unitgroup': '1234', 'ISCO2008niveau': '4'}])
        self.write(root, 'data/processed/onderwijs/studenten_mbo_friesland.csv',
                   ['Erkende opleiding code', 'Jaar'], [{'Erkende opleiding code': '12345', 'Jaar': '2025'}])

    def test_exact_feature_link_deduplicates_and_preserves_unresolved_courses(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            results, summary = build_matches(root)
        matched = results[0]
        self.assertEqual(matched['beroeps_uri'], 'occupation:a')
        self.assertEqual(matched['isco_code'], '9611')
        self.assertEqual(matched['aantal_gedeeld'], 1)
        self.assertGreater(matched['matchpercentage'], 80)
        self.assertEqual(matched['dekking_opleiding_pct'], 50)
        self.assertEqual(matched['status'], 'kandidaat; niet gevalideerd')
        self.assertEqual(results[1]['status'], 'onvoldoende vakinhoudelijke aansluiting')
        self.assertEqual(results[1]['matchpercentage'], '')
        self.assertEqual(summary['courses'], 2)

    def test_score_distinguishes_identical_partial_and_disjoint_profiles(self):
        weights = {'a': 1, 'b': 2, 'c': 1}
        self.assertEqual(overlap({'a'}, {'a'}, weights), 100)
        self.assertEqual(overlap({'a'}, {'c'}, weights), 0)
        self.assertAlmostEqual(overlap({'a'}, {'a', 'b'}, weights), 100 / 3)

    def test_non_four_digit_isco_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            p = root / 'data/raw/competentnl/beroepen_isco.csv'
            p.write_text(p.read_text().replace('9611', '961'))
            with self.assertRaisesRegex(ValueError, 'viercijferige'):
                build_matches(root)

    def test_text_and_tasks_outweigh_generic_shared_skills(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            p = root / 'data/raw/competentnl/mbo.csv'
            p.write_text(p.read_text().replace('skill:x', 'skill:y'))
            results, _ = build_matches(root)
        # De opleidingsinhoud beschrijft afvalinzameling, terwijl uitsluitend de
        # softwareprogrammeur de generieke vaardigheids-URI deelt.
        best = results[0]
        self.assertEqual(best['beroepsnaam'], 'Afvalinzamelaar')
        self.assertEqual(best['aantal_gedeeld'], 0)
        self.assertGreater(best['deelscores']['taken'], 0)
        self.assertGreater(best['deelscores']['definitie'], 0)

    def test_duplicate_description_and_task_rows_do_not_change_scores(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            before, _ = build_matches(root)
            p = root / 'data/raw/competentnl/beroepen_taken.csv'
            with p.open() as f:
                rows = list(csv.DictReader(f, delimiter=';'))
            self.write(root, 'data/raw/competentnl/beroepen_taken.csv', list(rows[0]), rows + rows)
            after, _ = build_matches(root)
        self.assertEqual(before, after)

    def test_leadership_words_are_not_domain_evidence(self):
        title = 'Meewerkend leidinggevende algemeen schoonmaakonderhoud'
        vocab = set().union(*(domain_words(t) for t in [
            'Algemeen directeur', 'Leidinggevende bediening',
            'Objectleider schoonmaak', 'Voorman / voorvrouw schoonmaak']))
        anchors = domain_anchors(title, vocab)
        self.assertEqual(anchors, {'schoonmaak'})
        cleaner = dict(name='Objectleider schoonmaak', definition='Geeft leiding aan schoonmakers en voert schoonmaakwerk uit.', tasks=set())
        director = dict(name='Algemeen directeur', definition='Geeft leiding aan een bedrijf en bepaalt algemeen beleid.', tasks=set())
        hospitality = dict(name='Leidinggevende bediening', definition='Stuurt personeel in een restaurant aan.', tasks=set())
        self.assertTrue(domain_evidence(anchors, cleaner))
        self.assertFalse(domain_evidence(anchors, director))
        self.assertFalse(domain_evidence(anchors, hospitality))

    def test_domain_mention_only_in_definition_is_insufficient(self):
        profession = dict(name='Algemeen directeur', definition='Leidt een schoonmaakbedrijf.', tasks=set())
        self.assertFalse(domain_evidence({'schoonmaak'}, profession))

    def test_export_cleaning_supervisor_has_domain_alignment(self):
        path = Path(__file__).resolve().parents[1] / 'data/processed/opleiding_beroep.csv'
        with path.open(encoding='utf-8-sig') as stream:
            rows = [r for r in csv.DictReader(stream, delimiter=';') if r['Opleidingscode'] == '25033']
        self.assertTrue(rows)
        self.assertEqual(rows[0]['Mogelijk passend beroep'], 'Objectleider schoonmaak')
        self.assertEqual(rows[0]['ISCO-code'], '5151')
        self.assertTrue(all('schoonmaak' in r['Mogelijk passend beroep'].casefold() or
                            'schoonmaker' in r['Mogelijk passend beroep'].casefold() for r in rows))
        self.assertFalse(any(r['ISCO-code'] == '1120' for r in rows))

    def test_level_control_does_not_equate_mbo_and_isco_numbers(self):
        self.assertTrue(level_compatible(3, 2))
        self.assertFalse(level_compatible(3, 3))
        self.assertTrue(level_compatible(4, 3))
        self.assertFalse(level_compatible(4, 4))
        self.assertFalse(level_compatible(None, 2))
        self.assertFalse(level_compatible(2, 0))

    def test_essential_tasks_count_twice_as_much_as_optional(self):
        self.assertAlmostEqual(weighted_task_score(100, 0, True, True), 200/3)
        self.assertAlmostEqual(weighted_task_score(0, 100, True, True), 100/3)
        self.assertEqual(weighted_task_score(100, 0, True, False), 100)

    def test_missing_level_is_visible_on_uncertain_proposal(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            p = root / 'data/mappings/isco2008_brc2014.csv'
            p.write_text(p.read_text().replace('9611;2', '9611;0'))
            rows, _ = build_matches(root)
        self.assertEqual(rows[0]['beroeps_uri'], 'occupation:a')
        self.assertTrue(rows[0]['voorlopig_voorstel'])
        self.assertIn('controleren', rows[0]['beoordeling'])

    def test_higher_level_is_only_returned_as_uncertain_proposal(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            p = root / 'data/mappings/isco2008_brc2014.csv'
            p.write_text(p.read_text().replace('9611;2', '9611;4'))
            rows, _ = build_matches(root)
        self.assertEqual(rows[0]['beroeps_uri'], 'occupation:a')
        self.assertTrue(rows[0]['voorlopig_voorstel'])
        self.assertIn('controleren', rows[0]['beoordeling'])

    def test_wrong_study_direction_is_only_returned_as_uncertain_proposal(self):
        from openpyxl import load_workbook
        from research.pipeline.imports.opleidingen import COHORTS
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            profile = root / 'data/raw/competentnl/mbo.csv'
            profile.write_text(profile.read_text().replace(';Afvalinzamelaar;', ';Allround afvalinzamelaar;'))
            p = root / 'data/raw/crebo' / COHORTS[2025][0]
            book = load_workbook(p)
            for column in (3, 4, 5):
                book.active.cell(2, column).value = 'Horeca'
            book.save(p); book.close()
            rows, _ = build_matches(root)
        self.assertEqual(rows[0]['beroeps_uri'], 'occupation:a')
        self.assertTrue(rows[0]['voorlopig_voorstel'])
        self.assertIn('controleren', rows[0]['beoordeling'])

    def test_exact_specific_name_survives_nonliteral_study_direction(self):
        from openpyxl import load_workbook
        from research.pipeline.imports.opleidingen import COHORTS
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            p = root / 'data/raw/crebo' / COHORTS[2025][0]
            book = load_workbook(p)
            for column in (3, 4, 5):
                book.active.cell(2, column).value = 'Transport en logistiek'
            book.save(p); book.close()
            rows, _ = build_matches(root)
        self.assertEqual(rows[0]['beroepsnaam'], 'Afvalinzamelaar')
        self.assertTrue(rows[0]['exacte_naam_met_werkbewijs'])

    def test_generic_role_name_does_not_override_direction_check(self):
        self.assertFalse(exact_specific_name({'Algemeen leidinggevende'}, 'Algemeen leidinggevende'))
        self.assertTrue(exact_specific_name({'Taxichauffeur'}, 'Taxichauffeur'))

    def test_export_taxichauffeur_uses_existing_isco_8322(self):
        path = Path(__file__).resolve().parents[1] / 'data/processed/opleiding_beroep.csv'
        with path.open(encoding='utf-8-sig') as stream:
            rows = [r for r in csv.DictReader(stream, delimiter=';') if r['Opleidingscode'] == '25674']
        self.assertTrue(rows)
        self.assertEqual(rows[0]['Mogelijk passend beroep'], 'Taxichauffeur')
        self.assertEqual(rows[0]['ISCO-code'], '8322')
        self.assertNotEqual(rows[0]['Match (%)'], '')

    def test_cbs_index_can_supply_missing_specific_occupation(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            self.cbs_loader.return_value = ({'afvalinzamelaar': {('afvalinzamelaar', '1234', 'Groep CBS')}}, {})
            p = root / 'data/mappings/isco2008_brc2014.csv'
            p.write_text(p.read_text().replace('1234;4', '1234;2'))
            rows, summary = build_matches(root)
        self.assertEqual(rows[0]['isco_code'], '1234')
        self.assertEqual(rows[0]['herkomst'], 'CBS-index (exacte beroepsnaam)')
        self.assertEqual(rows[0]['matchpercentage'], '')
        self.assertEqual(summary['courses_with_exact_cbs_name'], 1)

    def test_cbs_and_competentnl_exact_name_are_not_duplicated(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            self.cbs_loader.return_value = ({'afvalinzamelaar': {('afvalinzamelaar', '9611', 'Groep A')}}, {})
            rows, _ = build_matches(root)
        first = [r for r in rows if r['opleidingscode'] == '12345']
        self.assertEqual(len(first), 1)
        self.assertEqual(first[0]['herkomst'], 'CBS-index en CompetentNL')
        self.assertNotEqual(first[0]['matchpercentage'], '')

    def test_cbs_group_plural_can_classify_singular_course(self):
        self.assertTrue(name_keys('Drukker') & name_keys('Drukkers'))
        self.assertTrue(name_keys('Gespecialiseerd kok') & name_keys('Koks'))
        self.assertFalse(name_keys('Drukker') & name_keys('Algemeen directeur'))

    def test_cbs_name_outside_level_limit_is_marked_for_review(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); self.fixture(root)
            self.cbs_loader.return_value = ({'afvalinzamelaar': {('afvalinzamelaar', '1234', 'Groep CBS')}}, {})
            rows, _ = build_matches(root)
        self.assertEqual(rows[0]['isco_code'], '1234')
        self.assertIn('niveau controleren', rows[0]['beoordeling'])

    def test_fallback_does_not_turn_support_worker_into_teacher_or_soldier(self):
        self.assertEqual(fallback_role_factor('Medewerker facilitaire dienstverlening',
            {'name': 'Docent dienstverlening', 'isco': '2320'}), 0)
        self.assertEqual(fallback_role_factor('Assistent mobiliteitsbranche',
            {'name': 'Matroos technische dienst', 'isco': '0310'}), 0)
        self.assertGreater(fallback_role_factor('Aankomend militair',
            {'name': 'Soldaat', 'isco': '0310'}), 0)

    def test_complete_export_preserves_review_status_and_valid_codes(self):
        path = Path(__file__).resolve().parents[1] / 'data/processed/opleiding_beroep.csv'
        with path.open(encoding='utf-8-sig') as stream:
            rows = list(csv.DictReader(stream, delimiter=';'))
        self.assertEqual(len({r['Opleidingscode'] for r in rows}), 438)
        self.assertTrue(all(r['ISCO-code'].isdigit() and len(r['ISCO-code']) == 4 for r in rows))
        self.assertTrue(all(r['Beoordeling'] for r in rows))
        printing = [r for r in rows if r['Opleidingscode'] == '25208']
        self.assertEqual(printing[0]['ISCO-code'], '7322')
        self.assertTrue(any(r['Beoordeling'].startswith('Onzeker voorstel') for r in rows))
