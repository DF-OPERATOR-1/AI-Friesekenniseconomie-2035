"""Controleer de gegenereerde Pages-bundel en verwijder niet-toegestane data."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from research.pipeline.imports.publication import prune_public_data

BUILD = ROOT / 'website/dist'
manifest = json.loads((ROOT / 'data/published/publication_manifest.json').read_text())
removed = prune_public_data(BUILD / 'data', manifest)
index = (BUILD / 'index.html').read_text()
assert '/AI-Friesekenniseconomie-2035/assets/' in index, 'Verkeerde Vite-basepath'
assert (BUILD / '.nojekyll').exists(), '.nojekyll ontbreekt'
profiles = json.loads((BUILD / 'data/atlas/profiles.json').read_text())
assert any(p['isco_code'] == '0110' for p in profiles), 'Voorloopnullen verloren'
for profile in profiles:
    if profile.get('member_count'):
        assert (BUILD / 'data/atlas/occupations' / f'{profile["isco_code"]}.json').is_file(), 'Beroepsinhoud ontbreekt'
for row in json.loads((BUILD / 'data/atlas/catalogue.json').read_text()):
    if row['download']:
        assert (BUILD / row['download']).is_file(), 'Download ontbreekt'
print(f'Pages-controle geslaagd: routes, profieldata en publicatieregister; {len(removed)} niet-toegestane datakopieën verwijderd.')
