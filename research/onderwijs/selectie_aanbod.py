"""Verbind de bevestigde handmatige Friese selectie met exacte SBB-kwalificaties."""
import csv
import hashlib
import json
from pathlib import Path
from .locatiecontrole import normalise, write_csv

ROOT = Path(__file__).resolve().parents[2]
SBB = 'data/raw/crebo/251126 mbo-opleidingskoppeltabel 2026-27 met wijzigingenblad.xlsx'
MANUAL = 'data/mappings/mbo_locaties/opleidingsaanbod_handmatig.csv'
# Alleen twee expliciete transcriptiecorrecties; oorspronkelijke tekst blijft bewaard.
CORRECTIONS = {
    'Maritiem officie alle schepen nautisch, visserij': 'Maritiem officier alle schepen nautisch, visserij',
    'Maritien officier alle schepen nautisch, waterbouw': 'Maritiem officier alle schepen nautisch, waterbouw',
}


def build(root=ROOT):
    from openpyxl import load_workbook
    root = Path(root)
    book = load_workbook(root/SBB, read_only=True, data_only=True)
    names = {}
    try:
        sheet = next(s for s in book if 'koppeltabel' in s.title.lower())
        rows = sheet.iter_rows(values_only=True)
        headers = list(next(rows))
        for values in rows:
            row = dict(zip(headers, values))
            qid, name = row['beroep_id'], row['beroep (kwalificatie)']
            if qid not in ('b0000', 'b9999', None):
                names.setdefault(normalise(name), {})[qid] = name
    finally:
        book.close()
    output = []
    seen = set()
    with (root/MANUAL).open(encoding='utf-8-sig', newline='') as stream:
        for row in csv.DictReader(stream, delimiter=';'):
            if row['Provincie'] != 'Fryslân':
                continue
            original = row['Opleiding_KiesMBO']
            key = (row['Instellingscode'], row['Plaats'], original)
            if key in seen:
                continue
            seen.add(key)
            corrected = CORRECTIONS.get(original, original)
            matches = names.get(normalise(corrected), {})
            if len(matches) != 1:
                raise ValueError(f'Geen unieke SBB-kwalificatie voor {key}: {matches}')
            qid, official = next(iter(matches.items()))
            output.append(dict(Instellingscode=key[0], Instelling=row['Instelling'], Plaats=key[1],
                Opleiding_handmatig=original, SBB_kwalificatie=qid, SBB_naam=official,
                Naamcorrectie=corrected if corrected != original else '', Bron_URL=row['Bron_URL'],
                SBB_referentieschooljaar='2026-2027', Vastgelegd_op='2026-11-09',
                Selectiegrond='Door gebruiker bevestigd Fries aanbod; geen historische campusvalidatie'))
    folder = root/'data/mappings/mbo_locaties'
    exclusions_path = folder/'uitsluitingen.csv'
    with exclusions_path.open(encoding='utf-8-sig', newline='') as stream:
        excluded = {(r['Instellingscode'], r['Opleidingscode']) for r in csv.DictReader(stream, delimiter=';')}
    write_csv(folder/'friese_aanbodselectie.csv', output, list(output[0]))
    # Leg ook de jaargebonden CREBO-sleutels vast voor studenten én afgestudeerden.
    from research.pipeline.imports.opleidingen import COHORTS, qualifications
    allowed = {}
    for row in output:
        allowed.setdefault(row['Instellingscode'], set()).add(row['SBB_kwalificatie'])
    code_rows = []
    cohort_sources = {}
    for year, (filename, *fields) in COHORTS.items():
        path = root/'data/raw/crebo'/filename
        cohort_sources[str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()
        for code, entries in qualifications(path, fields).items():
            for institution, qids in sorted(allowed.items()):
                for q in entries:
                    if q['code'] in qids and (institution, code) not in excluded:
                        code_rows.append(dict(Instellingscode=institution, Opleidingscode=code,
                            Jaar=str(year), SBB_kwalificatie=q['code'], SBB_naam_jaar=q['name']))
    write_csv(folder/'friese_opleidingscodes_per_jaar.csv', code_rows, list(code_rows[0]))
    manifest = dict(sources={p: hashlib.sha256((root/p).read_bytes()).hexdigest() for p in [MANUAL, SBB, str(exclusions_path.relative_to(root))]},
        note='Alleen hoofdnamen op Friese locaties; geen onderliggende vermeldingen of Dronten. Firda behouden. Huidige aanbodselectie, geen bewijs van historische locatie of regionale telling.',
        cohort_sources=cohort_sources, code_year_rows=len(code_rows), rows=len(output), corrections=CORRECTIONS)
    (folder/'friese_aanbodselectie_bronnen.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    print(f'{len(output)} locatie-opleidingsnamen gekoppeld aan exacte SBB-kwalificaties.')


if __name__ == '__main__':
    build()
