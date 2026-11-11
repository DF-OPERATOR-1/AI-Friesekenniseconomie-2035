"""
Selecteer DUO-bronrijen: HBO/WO in Friesland en vier mbo-instellingen.
"""

# %% Packages
import argparse
import csv
import hashlib
import io
import json
import re
import subprocess
import sys
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.comments import Comment
from openpyxl.styles import Font

# %% 1. Inlezen
ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
sys.path.insert(0, str(PROJECT))
from research.onderwijs.mbo_exportselectie import filter_table, verify_exports
RAW = PROJECT / 'data/raw/onderwijs'
OUT = PROJECT / 'data/processed/onderwijs'
BASE = 'https://duo.nl/open_onderwijsdata/images/'
MBO_INSTELLINGEN = {
    '08PG': 'Firda',
    '25GV': 'Aeres',
    '17WH': 'SVO',
    '25PX': 'ROC Nova College',
}
MBO_TOELICHTING = (
    'Firda behouden; Aeres, SVO en ROC Nova College beperkt tot het door de gebruiker '
    'bevestigde Friese opleidingsaanbod via jaargebonden SBB-kwalificaties. '
    'Plaatsnaam instelling is het administratieve bronadres, niet de leslocatie. '
    'De huidige aanbodselectie bewijst geen historisch aanbod per onderwijslocatie. De aantallen per opleiding gelden voor '
    'de hele instelling en bevatten ook locaties buiten Friesland. '
    'Dit zijn geen uitsluitend Friese mbo studenten aantallen.'
)
BRONNEN = {
    'afgestudeerden_hbo_friesland': '05.-gediplomeerden-hbo-2024.csv',
    'studenten_hbo_friesland': '01a.-ingeschrevenen-hbo-2025.csv',
    'afgestudeerden_wo_friesland': '05.-gediplomeerden-wo-2025.csv',
    'studenten_wo_friesland': '01b.-ingeschrevenen-wo-domein-wo-2025.csv',
    'afgestudeerden_mbo_friesland': (
        'gediplomeerden-per-instelling-plaats-sectorkamer-type-mbo-'
        'opleiding-niveau-geslacht-instromende-studenten-2021-2025.csv'
    ),
    'studenten_mbo_friesland': (
        '03.-studenten-per-instelling-plaats-sectorkamer-type-mbo-'
        'opleiding-niveau-geslacht-2021-2025.csv'
    ),
}
WERKBLADEN = [
    'HBO afgestudeerden',
    'HBO studenten',
    'WO afgestudeerden',
    'WO studenten',
    'MBO afgestudeerden',
    'MBO studenten',
]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--download', action='store_true')
parser.add_argument('--mbo-studenten-only', action='store_true')
parser.add_argument('--mbo-only', action='store_true', help='Filter studenten en afgestudeerden mbo')
parser.add_argument('--check', action='store_true', help='Valideer mbo zonder bestanden te wijzigen')
args = parser.parse_args()
RAW.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)
if args.download:
    for bestand in BRONNEN.values():
        doel = RAW / bestand
        tijdelijk = doel.with_suffix('.download')
        subprocess.run(
            [
                'curl', '--fail', '--location', '--silent', '--show-error',
                '--retry', '3', BASE + bestand, '-o', str(tijdelijk),
            ],
            check=True,
        )
        tijdelijk.replace(doel)


def lees_csv(pad):
    data = pad.read_bytes()
    try:
        tekst = data.decode('utf-8-sig')
    except UnicodeDecodeError:
        tekst = data.decode('cp1252')
    return list(csv.reader(io.StringIO(tekst, newline=''), delimiter=';'))


def mbo_studenten(bron):
    """Behoud broncellen, behalve jaargroepen met uitsluitend nul studenten."""
    kop = bron[0]
    metadata = ['Instellingscode', 'Instellingsnaam', 'Soort instelling',
                'Plaatsnaam instelling', 'Leerweg', 'Niveau',
                'Erkende opleiding code', 'Erkende opleiding naam',
                'Sectorkamer naam', 'Hoofdgroep naam']
    metingen = [f'{s}{y}' for y in range(2021, 2026) for s in ('MAN', 'VROUW')]
    if kop != metadata + metingen or any(len(r) != len(kop) for r in bron[1:]):
        raise ValueError('Onverwacht kolomschema of rijlengte mbo-studenten')
    selectie = [r for r in bron[1:] if r[0] in MBO_INSTELLINGEN]
    if {r[0] for r in selectie} != set(MBO_INSTELLINGEN):
        raise ValueError('Niet alle vier mbo-instellingen aanwezig')
    sleutels = [(r[0], r[6], r[4], r[5]) for r in selectie]
    if len(sleutels) != len(set(sleutels)):
        raise ValueError('Dubbele instelling/CREBO/leerweg/niveausleutel')
    tabel = [metadata + ['Geslacht', 'Jaar', 'Aantal']]
    verwijderd = 0
    for r in selectie:
        if not r[6].isdigit():
            raise ValueError('Ongeldige opleidingscode')
        for waarde in r[10:]:
            if waarde not in ('', '<5') and not waarde.isdigit():
                raise ValueError(f'Onbekende telwaarde: {waarde!r}')
        for jaar in range(2021, 2026):
            start = kop.index(f'MAN{jaar}')
            waarden = r[start:start + 2]
            # Verwijder uitsluitend bewezen lege groepen. Onbekend blijft behouden.
            if all(v.isdigit() and int(v) == 0 for v in waarden):
                verwijderd += 1
                continue
            blok = [r[:10] + [geslacht, str(jaar), waarde]
                    for geslacht, waarde in zip(('man', 'vrouw'), waarden)]
            if [rij[-1] for rij in blok] != waarden:
                raise ValueError('Bronwaarden gewijzigd of verloren')
            tabel.extend(blok)
    print(f'MBO: {len(tabel)-1} uitvoerrijen; '
          f'{verwijderd} instelling/opleiding/leerweg/niveau/jaar-combinaties '
          'zonder studenten verwijderd. Onbekende aantallen blijven behouden.')
    print(MBO_TOELICHTING)
    return tabel


def schrijf_mbo(tabel, naam='studenten_mbo_friesland'):
    """Valideer volledige export voordat het bestaande bestand wordt vervangen."""
    import tempfile
    pad = OUT / f'{naam}.csv'
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8-sig', newline='',
                                     dir=OUT, suffix='.tmp', delete=False) as f:
        tmp = Path(f.name)
        csv.writer(f, delimiter=';').writerows(tabel)
    try:
        if lees_csv(tmp) != tabel:
            raise ValueError('Mbo-export wijkt af bij teruglezen')
        tmp.replace(pad)
    finally:
        tmp.unlink(missing_ok=True)


def mbo_afgestudeerden(bron):
    kop = bron[0]
    metingen = [(i, m[1].lower(), m[2]) for i, k in enumerate(kop)
                if (m := re.fullmatch(r'DIP(MAN|VROUW)(20\d{2})', k))]
    if len(metingen) != 10 or any(len(r) != len(kop) for r in bron[1:]):
        raise ValueError('Onverwacht schema mbo-afgestudeerden')
    indices = {i for i, _, _ in metingen}
    metadata = [i for i in range(len(kop)) if i not in indices]
    return [[kop[i] for i in metadata] + ['Geslacht', 'Jaar', 'Aantal']] + [
        [r[i] for i in metadata] + [geslacht, jaar, r[index]]
        for r in bron[1:] if r[kop.index('Instellingscode')] in MBO_INSTELLINGEN
        for index, geslacht, jaar in metingen]


def selecteer_en_bewaar_mbo(naam, tabel, check=False):
    geselecteerd = filter_table(tabel, PROJECT)
    if check:
        if lees_csv(OUT/f'{naam}.csv') != geselecteerd:
            raise ValueError(f'Mbo-export niet actueel: {naam}; voer --mbo-only uit')
    else:
        archief = OUT/'instellingsselectie'
        archief.mkdir(exist_ok=True)
        with (archief/f'{naam}.csv').open('w', encoding='utf-8-sig', newline='') as f:
            csv.writer(f, delimiter=';').writerows(tabel)
        schrijf_mbo(geselecteerd, naam)
    print(f'{naam}: {len(tabel)-1} → {len(geselecteerd)-1} rijen na aanbodselectie.')
    return geselecteerd


if args.mbo_studenten_only or args.mbo_only or args.check:
    namen = ['studenten_mbo_friesland']
    if args.mbo_only or args.check:
        namen.append('afgestudeerden_mbo_friesland')
    for naam in namen:
        bron = lees_csv(RAW/BRONNEN[naam])
        tabel = mbo_studenten(bron) if naam.startswith('studenten') else mbo_afgestudeerden(bron)
        selecteer_en_bewaar_mbo(naam, tabel, args.check)
    if not args.check and args.mbo_only:
        verify_exports(PROJECT)
    if not args.check:
        from research.pipeline.imports.opleidingen import build_mbo_courses
        build_mbo_courses(PROJECT, refresh=True)
    raise SystemExit(0)

print('Stap 1: oorspronkelijke bronkolommen en bronwaarden inlezen.')
bronnen = {}
for bestand in BRONNEN.values():
    pad = RAW / bestand
    if not pad.is_file():
        raise FileNotFoundError(f'Bron ontbreekt: {pad}; gebruik --download.')
    bronnen[bestand] = lees_csv(pad)

# %% 2. Controleren
print('Stap 2: bronstructuren controleren.')
for bestand, tabel in bronnen.items():
    if len(tabel) < 2 or len(tabel[0]) != len(set(tabel[0])):
        raise ValueError(f'Lege bron of dubbele kolommen: {bestand}')
    if any(len(rij) != len(tabel[0]) for rij in tabel[1:]):
        raise ValueError(f'Onverwacht aantal velden: {bestand}')

# %% 3. Filteren
print(
    'Stap 3: selecteren en geslacht/jaar als afzonderlijke kolommen '
    'weergeven.'
)
print(f'  MBO: {MBO_TOELICHTING}')
uitvoer = {}
selecties = {}
indelingen = {}
for naam, bestand in BRONNEN.items():
    bron = bronnen[bestand]
    kop = bron[0]
    if '_mbo_' in naam:
        index = kop.index('Instellingscode')
        selectie = [rij for rij in bron[1:] if rij[index] in MBO_INSTELLINGEN]
        if {rij[index] for rij in selectie} != set(MBO_INSTELLINGEN):
            raise ValueError(
                f'Niet alle vier mbo-instellingen aanwezig: {bestand}')
    else:
        kolom = 'PROVINCIE'
        if kolom not in kop:
            raise ValueError(f'Geografische kolom ontbreekt: {bestand}')
        index = kop.index(kolom)
        selectie = [
            rij for rij in bron[1:]
            if rij[index].strip().casefold() in {'friesland', 'fryslân'}
        ]
        if not selectie:
            raise ValueError(f'Geen Friese bronrijen: {bestand}')
    selecties[naam] = selectie
    metingen = []
    for i, kolom in enumerate(kop):
        if '_mbo_' in naam:
            match = re.fullmatch(r'(?:DIP)?(MAN|VROUW)(\d{4})', kolom)
            if match:
                metingen.append((i, match[2], match[1].lower()))
        elif re.fullmatch(r'\d{4}', kolom):
            metingen.append((i, kolom, None))
    if not metingen:
        raise ValueError(f'Geen jaarkolommen herkend: {bestand}')
    geslacht_index = None if '_mbo_' in naam else kop.index('GESLACHT')
    meetkolommen = {meting[0] for meting in metingen}
    metadata = [
        i for i in range(len(kop))
        if i not in meetkolommen and i != geslacht_index
    ]
    nieuwe_kop = [kop[i] for i in metadata] + ['Geslacht', 'Jaar', 'Aantal']
    if len(nieuwe_kop) != len(set(nieuwe_kop)):
        raise ValueError(f'Dubbele kolommen na omzetten: {naam}')
    rijen = []
    for rij in selectie:
        kenmerken = [rij[i] for i in metadata]
        for i, jaar, geslacht in metingen:
            geslacht_waarde = (
                geslacht if geslacht is not None else rij[geslacht_index]
            )
            rijen.append(kenmerken + [geslacht_waarde, jaar, rij[i]])
    uitvoer[naam] = [nieuwe_kop] + rijen
    indelingen[naam] = (metadata, metingen, geslacht_index)
    print(
        f'  {naam}: {len(selectie)} bronrijen → {len(rijen)} rijen '
        'per geslacht en jaar.'
    )

# %% 4. Valideren
print('Stap 4: omzetten terugdraaien en alle broncellen vergelijken.')
for naam, tabel in uitvoer.items():
    bron = bronnen[BRONNEN[naam]]
    metadata, metingen, geslacht_index = indelingen[naam]
    breedte = len(metingen)
    if len(tabel) - 1 != len(selecties[naam]) * breedte:
        raise ValueError(f'Aantallen broncellen sluiten niet aan: {naam}')
    for nummer, origineel in enumerate(selecties[naam]):
        hersteld = [None] * len(bron[0])
        blok = tabel[1 + nummer * breedte:1 + (nummer + 1) * breedte]
        for rij, (bronindex, jaar, geslacht) in zip(blok, metingen):
            verwacht_geslacht = (
                geslacht if geslacht is not None else origineel[geslacht_index]
            )
            if rij[-3:-1] != [verwacht_geslacht, jaar]:
                raise ValueError(
                    f'Geslacht of jaar onjuist toegewezen: {naam}')
            for i, waarde in zip(metadata, rij[:-3]):
                if waarde != origineel[i]:
                    raise ValueError(
                        f'Kenmerken gewijzigd bij omzetten: {naam}')
                hersteld[i] = waarde
            if geslacht_index is not None:
                hersteld[geslacht_index] = rij[-3]
            hersteld[bronindex] = rij[-1]
        if hersteld != origineel:
            raise ValueError(f'Bronwaarden gewijzigd of verloren: {naam}')

uitvoer['studenten_mbo_friesland'] = mbo_studenten(bronnen[BRONNEN['studenten_mbo_friesland']])
for naam in ('studenten_mbo_friesland', 'afgestudeerden_mbo_friesland'):
    uitvoer[naam] = selecteer_en_bewaar_mbo(naam, uitvoer[naam])

# %% 5. Exporteren
print('Stap 5: zes CSV-tabellen en Excel opslaan en teruglezen.')
wb = Workbook()
wb.remove(wb.active)
for (naam, tabel), werkblad in zip(uitvoer.items(), WERKBLADEN):
    pad = OUT / f'{naam}.csv'
    if '_mbo_' in naam:
        schrijf_mbo(tabel, naam)
    else:
        with pad.open('w', encoding='utf-8-sig', newline='') as f:
            csv.writer(f, delimiter=';').writerows(tabel)
    if lees_csv(pad) != tabel:
        raise ValueError(f'CSV wijkt af na teruglezen: {naam}')
    ws = wb.create_sheet(werkblad)
    for rij in tabel:
        ws.append(rij)
    if '_mbo_' in naam:
        ws.cell(1, 1).comment = Comment(MBO_TOELICHTING, 'Bronselectie')
    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = ws.dimensions
    for cel in ws[1]:
        cel.font = Font(bold=True)
    for kolom in ws.columns:
        ws.column_dimensions[kolom[0].column_letter].width = min(
            48, max(14, max(len(str(cel.value or '')) for cel in kolom) + 2))
excel = OUT / 'DUO_Friesland.xlsx'
wb.save(excel)
opgeslagen = load_workbook(excel, read_only=True)
try:
    for (naam, tabel), werkblad in zip(uitvoer.items(), WERKBLADEN):
        verwacht = [
            tuple(None if waarde == '' else waarde for waarde in rij)
            for rij in tabel
        ]
        if list(opgeslagen[werkblad].values) != verwacht:
            raise ValueError(f'Excel wijkt af na teruglezen: {naam}')
finally:
    opgeslagen.close()
verify_exports(PROJECT)
from research.pipeline.imports.opleidingen import build_mbo_courses
build_mbo_courses(PROJECT, refresh=True)
# Leg alle bewaarde downloads vast, inclusief historische en referentiebronnen.
manifest = [dict(url=BASE + pad.name, bestand=pad.name,
                 sha256=hashlib.sha256(pad.read_bytes()).hexdigest())
            for pad in sorted(RAW.glob('*.csv'))]
# Bestaand bronmanifest en oorspronkelijke bronbestanden blijven ongewijzigd.
print(
    '  Gereed: zes onderwijstabellen per geslacht en jaar; bronwaarden behouden.'
)
print(
    '  Geen aantallen opgeteld, geschat of over locaties verdeeld.'
)
print(f'  Uitvoermap: {OUT}')

# %%
