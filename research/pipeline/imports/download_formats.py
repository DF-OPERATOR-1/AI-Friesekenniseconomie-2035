"""Maak Excel- en Stata-versies van goedgekeurde CSV-downloads."""
import re
from datetime import datetime
from pathlib import Path

import pandas as pd


def export_formats(source):
    source = Path(source)
    frame = pd.read_csv(source, sep=';', encoding='utf-8-sig', dtype=str,
                        keep_default_na=False)
    for column in frame:
        values = frame[column]
        # Identificatiecodes blijven tekst, ook wanneer ze uitsluitend cijfers bevatten.
        identifier = 'code' in column.lower() or column.upper() == 'GEMEENTENUMMER'
        numeric = values.str.fullmatch(r'-?\d+(?:[,.]\d+)?') | values.eq('')
        if not identifier and numeric.all() and values.ne('').any():
            frame[column] = pd.to_numeric(values.str.replace(',', '.', regex=False), errors='coerce').astype(float)
    notes = pd.DataFrame([
        ('Bronbestand', source.name),
        ('Codes', 'Identificatiecodes zijn tekst; voorloopnullen blijven behouden.'),
        ('Ontbrekende waarden', 'Lege numerieke waarden blijven ontbrekend, niet nul.'),
        ('Afgeschermde aantallen', 'Waarden zoals <5 blijven letterlijk behouden. Kolommen met zulke waarden zijn tekst.'),
        ('Stata', 'Stata 14 of nieuwer; variabelelabels bevatten de oorspronkelijke kolomnamen.'),
    ], columns=['Onderwerp', 'Toelichting'])
    xlsx = source.with_suffix('.xlsx')
    with pd.ExcelWriter(xlsx, engine='openpyxl') as writer:
        frame.to_excel(writer, sheet_name='Gegevens', index=False)
        notes.to_excel(writer, sheet_name='Toelichting', index=False)
        sheet = writer.sheets['Gegevens']
        sheet.freeze_panes = 'A2'
        sheet.auto_filter.ref = sheet.dimensions
        # Brontekst wordt altijd als tekst opgeslagen, ook als die met '=' begint.
        for row in sheet.iter_rows(min_row=2):
            for cell in row:
                if isinstance(cell.value, str):
                    cell.data_type = 's'
    names = {}
    used = set()
    for column in frame:
        base = re.sub(r'[^a-zA-Z0-9_]', '_', column).strip('_').lower()
        if not base or base[0].isdigit():
            base = 'v_' + base
        name = base[:30]
        counter = 1
        while name in used:
            name = f'{base[:26]}_{counter}'
            counter += 1
        used.add(name)
        names[column] = name
    stata = frame.rename(columns=names)
    stata.to_stata(source.with_suffix('.dta'), write_index=False, version=118,
                   variable_labels={names[c]: c[:80] for c in frame},
                   data_label=source.stem[:80], time_stamp=datetime(2000, 1, 1))
    return {ext: f'data/research/{source.with_suffix("." + ext).name}'
            for ext in ('xlsx', 'dta')}
