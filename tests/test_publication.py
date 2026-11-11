import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from research.pipeline.imports.publication import prune_public_data


class PublicationTests(unittest.TestCase):
    def test_only_registered_data_and_known_occupations_are_publishable(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            approved = dict(approved=True, evidence='Expliciet toegestaan')
            manifest = dict(files={
                'allowed.csv': approved,
                'missing-evidence.csv': dict(approved=True),
                'private.csv': dict(approved=False, evidence='Niet toegestaan')},
                derived_data={'atlas/profiles.json': approved, 'atlas/occupations/{isco}.json': approved})
            files = ['atlas/occupations/0110.json', 'atlas/occupations/9999.json',
                     'uwv/private.json', 'research/private.csv', 'research/allowed.csv',
                     'research/missing-evidence.csv', 'workbook.xlsx', 'unexpected.json']
            for name in files:
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('[]')
            (root / 'atlas/profiles.json').write_text(json.dumps([dict(isco_code='0110', member_count=1)]))
            removed = prune_public_data(root, manifest)
            self.assertEqual(set(removed), set(files) - {'atlas/occupations/0110.json', 'research/allowed.csv'})
            self.assertTrue((root / 'atlas/profiles.json').exists())

    def test_repository_guard_keeps_local_sources_out_of_git(self):
        script = Path('website/scripts/check_repository.py').resolve()
        spec = importlib.util.spec_from_file_location('check_repository', script)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        for name in ['data/raw/uwv/private.xlsx', 'data/raw/uwv/README.md', 'research/diagnostics/complementarity/analyze.py', 'docs/research_plan/roadmap.md', 'website/public/data/atlas/profiles.json', '.env.production', 'research/literature/pdf/paper.pdf', 'data/processed/uwv_brc_plus.json']:
            self.assertTrue(module.is_local_only(name), name)
        for name in ['.env.example', 'data/processed/competentnl_members.json.gz', 'website/src/App.tsx']:
            self.assertFalse(module.is_local_only(name), name)

    def test_sync_removes_stale_assets_and_data_but_keeps_documentation(self):
        script = Path('website/scripts/publish_pages.py').resolve()
        spec = importlib.util.spec_from_file_location('publish_pages', script)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            build, target = root / 'build', root / 'docs'
            for folder in [build / 'assets', build / 'data', target / 'assets', target / 'data']:
                folder.mkdir(parents=True)
            for name in ['index.html', '.nojekyll', 'assets/current.svg', 'data/allowed.json']:
                (build / name).write_text('huidig')
            for name in ['assets/old.svg', 'data/uwv.json', 'methodology.md']:
                (target / name).write_text('bewaard')
            self.assertEqual(module.sync_build(build, target), 2)
            self.assertFalse((target / 'data/uwv.json').exists())
            self.assertFalse((target / 'assets/old.svg').exists())
            self.assertEqual((target / 'methodology.md').read_text(), 'bewaard')
            self.assertTrue((target / 'assets/current.svg').exists())
            # Nieuwe CSS en JavaScript moeten gelijk aan de actuele build worden gekopieerd.
            for name in ('index.html', 'assets/index-new.css', 'assets/index-new.js'):
                (build / name).write_text('actuele inhoud: ' + name)
            module.sync_build(build, target)
            for name in ('index.html', 'assets/index-new.css', 'assets/index-new.js'):
                self.assertEqual((target / name).read_bytes(), (build / name).read_bytes())
            self.assertEqual(module.sync_build(build, target), 0)

