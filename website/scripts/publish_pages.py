"""Synchroniseer alleen de gegenereerde websitebestanden naar docs, zonder deployment."""
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))


def sync_build(build, target):
    build, target = Path(build), Path(target)
    for required in ('index.html', '.nojekyll', 'assets', 'data'):
        if not (build / required).exists():
            raise ValueError('Geen complete websitebuild. Voer eerst npm --prefix website run build uit.')
    # Documentatie buiten deze twee gegenereerde mappen blijft altijd behouden.
    target.mkdir(exist_ok=True)
    removed = 0
    for name in ('assets', 'data'):
        source, destination = build / name, target / name
        if destination.is_symlink():
            raise ValueError('Publicatiemap mag geen symlink zijn')
        existing = {p.relative_to(destination) for p in destination.rglob('*') if p.is_file()}
        current = {p.relative_to(source) for p in source.rglob('*') if p.is_file()}
        removed += len(existing - current)
        shutil.copytree(source, destination, dirs_exist_ok=True)
        for path in existing - current:
            (destination / path).unlink()
        for directory in sorted(destination.rglob('*'), reverse=True):
            if directory.is_dir() and not any(directory.iterdir()):
                directory.rmdir()
    for name in ('index.html', '.nojekyll'):
        shutil.copy2(build / name, target / name)
    return removed


if __name__ == '__main__':
    removed = sync_build(ROOT / 'website/dist', ROOT / 'docs')
    print(f'Website gesynchroniseerd naar docs; {removed} verouderde gegenereerde bestanden verwijderd. Niets online gepubliceerd.')
