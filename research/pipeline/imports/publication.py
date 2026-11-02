"""Expliciete bestandsselectie voor openbare website-uitvoer (geen licentieadvies)."""
import json
from pathlib import Path
from .common import code


def approved(entry):
    return entry.get('approved') is True and bool(entry.get('evidence'))


def allowed_data_files(data_dir, manifest):
    derived = manifest.get('derived_data', {})
    allowed = {path for path, review in derived.items() if '{isco}' not in path and approved(review)}
    for filename, review in manifest['files'].items():
        # Filenamen in het register mogen geen directory ontsnappen.
        if Path(filename).name != filename:
            raise ValueError('Ongeldige publicatiebestandsnaam')
        if approved(review):
            allowed.add(f'research/{filename}')
    profile_path = Path(data_dir) / 'atlas/profiles.json'
    if approved(derived.get('atlas/occupations/{isco}.json', {})) and profile_path.is_file():
        for profile in json.loads(profile_path.read_text()):
            if profile.get('member_count', 0):
                allowed.add(f'atlas/occupations/{code(profile["isco_code"], 4)}.json')
    return allowed


def prune_public_data(data_dir, manifest):
    """Verwijder alleen niet-toegestane kopieën uit een gegenereerde datamap."""
    folder = Path(data_dir)
    allowed = allowed_data_files(folder, manifest)
    removed = []
    for path in sorted(folder.rglob('*')):
        if path.is_symlink():
            raise ValueError(f'Symlink in openbare data: {path.name}')
        if path.is_file() and path.relative_to(folder).as_posix() not in allowed:
            removed.append(path.relative_to(folder).as_posix())
            path.unlink()
    return removed
