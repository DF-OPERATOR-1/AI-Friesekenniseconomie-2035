"""Lees de aanwezige UWV-BRC Plus-werkmap zonder een ISCO-koppeling te raden."""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
from .common import count, year
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def sheet_rows(path, sheet='sheet2.xml'):
    with ZipFile(path) as archive:
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            strings = [''.join(node.itertext()) for node in ET.fromstring(
                archive.read('xl/sharedStrings.xml')).findall('m:si', NS)]
        root = ET.fromstring(archive.read(f'xl/worksheets/{sheet}'))
        result = []
        for row in root.findall('.//m:sheetData/m:row', NS):
            values = {}
            for cell in row.findall('m:c', NS):
                column = ''.join(c for c in cell.attrib['r'] if c.isalpha())
                v = cell.find('m:v', NS)
                text = v.text if v is not None else ''.join(
                    cell.find('m:is', NS).itertext()) if cell.find('m:is', NS) is not None else None
                if cell.attrib.get('t') == 's' and text is not None:
                    text = strings[int(text)]
                values[column] = text
            result.append((int(row.attrib['r']), values))
        return dict(result)


def import_workbook(path):
    rows = sheet_rows(path)
    if rows[6].get('C') != 'Provincies' or rows[6].get('D') != 'Friesland':
        raise ValueError('Onverwachte regio in UWV-werkmap')
    if rows[10].get('C') != 'BRC_Plus':
        raise ValueError('Onverwachte classificatie')
    periods, current = {}, None
    for column in 'DEFGHIJKLMNOPQ':
        if rows[9].get(column):
            current = year(rows[9][column])
        quarter = int(rows[10][column][0])
        if current is None or quarter not in (1, 2, 3, 4):
            raise ValueError('Ongeldige periode')
        periods[column] = (current, quarter)
    output = []
    for index, row in rows.items():
        if index <= 10 or not row.get('C') or row['C'] == 'Eindtotaal':
            continue
        for column, (y, q) in periods.items():
            raw = row.get(column)
            output.append(dict(occupation=row['C'], occupation_class=row.get('B'),
                               year=y, quarter=q, value=count(raw or ''), raw_value=raw,
                               geography='Friesland', classification='BRC Plus', isco_code=None,
                               status='observed', source=Path(path).name,
                               methodology='Openstaande vacatures (onafgerond), zoals aangeleverd; bronberekening niet gevalideerd. Geen ISCO-koppeling.'))
    return output
