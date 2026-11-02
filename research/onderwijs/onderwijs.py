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
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.comments import Comment
from openpyxl.styles import Font

# %% 1. Inlezen
ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[1]
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
    'Selectie van Firda, Aeres, SVO en ROC Nova College, instellingen met '
    'onderwijslocaties in Friesland. De aantallen per opleiding gelden voor '
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

# %% 5. Exporteren
print('Stap 5: zes CSV-tabellen en Excel opslaan en teruglezen.')
wb = Workbook()
wb.remove(wb.active)
for (naam, tabel), werkblad in zip(uitvoer.items(), WERKBLADEN):
    pad = OUT / f'{naam}.csv'
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
# Leg alle bewaarde downloads vast, inclusief historische en referentiebronnen.
manifest = [dict(url=BASE + pad.name, bestand=pad.name,
                 sha256=hashlib.sha256(pad.read_bytes()).hexdigest())
            for pad in sorted(RAW.glob('*.csv'))]
(RAW / 'sources.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(
    '  Gereed: zes tabellen met Geslacht, Jaar en Aantal; '
    'bronwaarden behouden.'
)
print(
    '  Geen aantallen opgeteld, geschat, omgerekend of over locaties verdeeld.'
)
print(f'  Uitvoermap: {OUT}')

# %%
