"""Controleer welke bestaande bestanden git add zou meenemen, zonder iets te stagen."""
from pathlib import Path
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from research.pipeline.imports.publication import allowed_data_files

LOCAL_ONLY = (
    'data/raw/', 'data/processed/uwv_brc_plus.json',
    'research/literature/', 'research/diagnostics/',
    'research/COMPLEMENTARITY_DISCREPANCY_ANALYSIS.md', 'research/METHODOLOGY_VALIDATION.md',
    'data/mappings/candidates/', 'data/processed/ai_complementarity/SOC2010',
    'data/schemas/profile.example.json', 'docs/research_plan/', 'docs/data_dictionary/', 'docs/methodology/',
    'website/node_modules/', 'website/dist/', 'website/public/data/',
    '.venv/', '.aws/',
)


def is_local_only(name):
    path = Path(name)
    if name.startswith(LOCAL_ONLY):
        return True
    if path.name == '.env' or (path.name.startswith('.env.') and path.name != '.env.example'):
        return True
    if name.startswith('research/literature/conversion/') and path.suffix != '.py':
        return True
    if name.startswith(('research/diagnostics/', 'data/mappings/candidates/')) and path.suffix in ('.csv', '.json'):
        return True
    return False


def check():
    manifest = json.loads((ROOT / 'data/published/publication_manifest.json').read_text())
    allowed = allowed_data_files(ROOT / 'docs/data', manifest)
    names = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')
    problems = []
    checked = 0
    for name in names:
        path = ROOT / name
        if not name or not path.is_file():
            continue
        checked += 1
        if is_local_only(name) or (name.startswith('docs/data/') and name.removeprefix('docs/data/') not in allowed):
            problems.append(name)
    if problems:
        raise SystemExit('Niet voor publicatie geselecteerde bestanden in Git-selectie:\n' + '\n'.join(problems))
    print(f'Repositorycontrole geslaagd: {checked} bestaande kandidaatbestanden; geen lokale brondata of ongeautoriseerde websitebestanden in de Git-selectie.')


if __name__ == '__main__':
    check()
