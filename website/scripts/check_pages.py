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
courses = json.loads((BUILD / 'data/atlas/opleidingen.json').read_text())['courses']
assert courses, 'Opleidingsgegevens ontbreken'
assert any('2025' in course['years'] for course in courses), 'Hoofdjaar opleidingen ontbreekt'
matches = json.loads((BUILD / 'data/atlas/mbo_beroep_matches.json').read_text())
mbo_codes = {c['code'] for c in courses if c['education_type'] == 'mbo'}
isco_codes = {p['isco_code'] for p in profiles}
assert all(r['code'] in mbo_codes and r['isco'] in isco_codes for r in matches['relations']), 'Opleidings- of beroepslink ontbreekt'
for row in json.loads((BUILD / 'data/atlas/catalogue.json').read_text()):
    if row['download']:
        assert (BUILD / row['download']).is_file(), 'Download ontbreekt'
print(f'Pages-controle geslaagd: routes, profieldata en publicatieregister; {len(removed)} niet-toegestane datakopieën verwijderd.')

# Opleidings-/beroepskoppelingen uitsluitend voor websiteweergave.
allowed_csv = {f'{kind}_{level}_friesland.csv' for kind in ('studenten', 'afgestudeerden') for level in ('mbo', 'hbo', 'wo')} | {'ISCO08_AIOE.csv', 'ISCO08_C_AIOE.csv', 'ISCO08_Complementary.csv'}
assert all(p.name in allowed_csv for p in (BUILD / 'data').rglob('*.csv')), 'Niet-toegestane CSV-publicatie'
for course in courses:
    for occupation in course.get('occupations', []):
        assert occupation['code'] in isco_codes, 'HO-beroepslink ontbreekt'

national = json.loads((BUILD / 'data/atlas/ho_isco_landelijk.json').read_text())['courses']
local_keys = {(c['education_type'], c['code']): c for c in courses}
assert len(national) == len({(c['education_type'], c['code']) for c in national}), 'Dubbele landelijke HO-opleiding'
for course in national:
    assert all(o['code'] in isco_codes for o in course['occupations']), 'Landelijke ISCO-code onbekend'
    for year in course['years']:
        assert year in local_keys[(course['education_type'], course['code'])]['years'], 'Landelijke opleiding heeft ongeldige Friese detailroute'
