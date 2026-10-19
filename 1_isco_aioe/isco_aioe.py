"""Koppel CBS-ISCO-08 aan oorspronkelijke en generatieve AIOE-scores."""
# %% Packages
from pathlib import Path

import numpy as np
import pandas as pd

# %% 1. Inlezen
bronmap = Path(__file__).resolve().parent / 'raw'
uitvoermap = Path(__file__).resolve().parent / 'processed'
CBS = 'codelijsten-isco-08.xls'
CROSSWALK = 'ISCO_SOC_Crosswalk.xls'
TAXONOMIE = 'Taxonomy2010_AppA.xls'
score = {
    'AIOE_score': ('AIOE_DataAppendix.xlsx', 'Appendix A', 'AIOE'),
    'AIOE_LM_score': ('Language Modeling AIOE and AIIE.xlsx', 'LM AIOE',
                      'Language Modeling AIOE'),
    'AIOE_IG_score': ('Image Generation AIOE and AIIE.xlsx', 'IG AIOE',
                      'Image Generation AIOE'),
}
benodigd = [CBS, CROSSWALK, TAXONOMIE]
benodigd += [bestand for bestand, _, _ in score.values()]
for bestand in benodigd:
    if not (bronmap / bestand).is_file():
        raise FileNotFoundError(f'Bron ontbreekt: {bronmap / bestand}')

print('Stap 1: zes lokale bronbestanden inlezen.')
groepen = pd.read_excel(bronmap / CBS, sheet_name='ISCO-08 unit group',
                        dtype=str)
# Lees kopinformatie en relaties samen; de kolomkoppen staan op rij 7.
crosswalk = pd.read_excel(bronmap / CROSSWALK,
                          sheet_name='ISCO-08 to 2010 SOC', header=None,
                          dtype=str)
taxonomie = pd.read_excel(bronmap / TAXONOMIE, header=2, dtype=str)
bronnen = {}
for kolom, (bestand, werkblad, bronkolom) in score.items():
    bronnen[kolom] = pd.read_excel(bronmap / bestand, sheet_name=werkblad,
                                   dtype={'SOC Code': str})

# %% 2. Controleren
print('Stap 2: bronstructuren, codes en SOC-2010-versie controleren.')
if set(groepen.columns) != {
    'code ISCO-08 unitgroup', 'omschrijving ISCO-08 unitgroup',
}:
    raise ValueError('Onverwachte kolommen in de CBS-groepslijst')
groepen = groepen.rename(columns={
    'code ISCO-08 unitgroup': 'ISCO_08_code',
    'omschrijving ISCO-08 unitgroup': 'ISCO_08_beroep_NL',
})
if groepen.empty:
    raise ValueError('CBS-groepslijst bevat geen beroepen')
groepen['ISCO_08_code'] = groepen['ISCO_08_code'].str.strip()
if not groepen['ISCO_08_code'].str.fullmatch(r'\d{4}', na=False).all():
    raise ValueError('Ongeldige viercijferige CBS-ISCO-code')
if not groepen['ISCO_08_code'].is_unique:
    raise ValueError('Dubbele CBS-ISCO-codes')
if groepen['ISCO_08_beroep_NL'].isna().any():
    raise ValueError('Nederlandse groepsnaam ontbreekt in CBS')

if len(crosswalk) < 8 or crosswalk.shape[1] < 2:
    raise ValueError('Onverwachte crosswalkstructuur')
if 'August 2012 (Updated June 2015)' not in crosswalk.iloc[:6, 0].tolist():
    raise ValueError('Onverwachte crosswalkversie')
vertaaltabel = crosswalk.iloc[7:].copy()
vertaaltabel.columns = crosswalk.iloc[6].tolist()
if not {'ISCO-08 Code', '2010 SOC Code'} <= set(vertaaltabel.columns):
    raise ValueError('Onverwachte crosswalkkolommen')
for kolom, patroon in [('ISCO-08 Code', r'\d{3,4}'),
                       ('2010 SOC Code', r'\d{2}-\d{4}')]:
    vertaaltabel[kolom] = vertaaltabel[kolom].str.strip()
    if not vertaaltabel[kolom].str.fullmatch(patroon, na=False).all():
        raise ValueError(f'Ongeldige crosswalkcode in {kolom}')
if 'O*NET-SOC 2010 Code' not in taxonomie:
    raise ValueError('Taxonomiebestand is niet O*NET-SOC 2010')
geldige_soc = set(taxonomie['O*NET-SOC 2010 Code'].dropna().str[:7])
militair = vertaaltabel['2010 SOC Code'].str.startswith('55-')
if not (vertaaltabel['2010 SOC Code'].isin(geldige_soc) | militair).all():
    raise ValueError('Crosswalk bevat codes buiten SOC 2010')

for kolom, bron in bronnen.items():
    bronkolom = score[kolom][2]
    if set(bron.columns) != {'SOC Code', 'Occupation Title', bronkolom}:
        raise ValueError(f'Onverwachte bronkolommen voor {kolom}')
    bron['SOC Code'] = bron['SOC Code'].str.strip()
    if not bron['SOC Code'].str.fullmatch(r'\d{2}-\d{4}', na=False).all():
        raise ValueError(f'Ongeldige SOC-code voor {kolom}')
    if not bron['SOC Code'].is_unique:
        raise ValueError(f'Dubbele SOC-codes voor {kolom}')
    if not set(bron['SOC Code']) <= geldige_soc:
        raise ValueError(f'Broncodes buiten SOC 2010 voor {kolom}')
    if not {'15-1132', '15-1133', '11-3011'} <= set(bron['SOC Code']):
        raise ValueError(f'SOC-2010-signatuur ontbreekt voor {kolom}')
    bron[bronkolom] = pd.to_numeric(bron[bronkolom], errors='raise')
    if not np.isfinite(bron[bronkolom].dropna()).all():
        raise ValueError(f'Niet-eindige bronscore voor {kolom}')
    print(f'  {kolom}: {len(bron)} SOC-beroepen; '
          f'{bron[bronkolom].isna().sum()} ontbrekende bronscores.')
print(f'  ISCO-08-beroepsgroepen: {len(groepen)}')

# %% 3. Koppelen
print('Stap 3: officiële ISCO–SOC-relaties koppelen en scores middelen.')
viercijferig = vertaaltabel['ISCO-08 Code'].str.len().eq(4)
print(f'  Uitgesloten driecijferige relaties: {(~viercijferig).sum()}')
for _, rij in vertaaltabel.loc[~viercijferig].iterrows():
    print(f"    ISCO {rij['ISCO-08 Code']} → SOC {rij['2010 SOC Code']}")
relaties = vertaaltabel.loc[
    viercijferig, ['ISCO-08 Code', '2010 SOC Code']
].rename(columns={'ISCO-08 Code': 'ISCO_08_code',
                  '2010 SOC Code': 'SOC_code'})
if relaties.duplicated().any():
    raise ValueError('Dubbele ISCO–SOC-relaties in de crosswalk')
print(f'  Unieke ISCO–SOC-relaties: {len(relaties)}')
koppelingen = relaties.copy()
for kolom, bron in bronnen.items():
    bronkolom = score[kolom][2]
    scores = bron[['SOC Code', bronkolom]].rename(
        columns={'SOC Code': 'SOC_code', bronkolom: kolom})
    koppelingen = koppelingen.merge(
        scores, on='SOC_code', how='left', validate='many_to_one')
if len(koppelingen) != len(relaties):
    raise ValueError('Onbedoelde rijvermenigvuldiging bij koppelen')

# Alleen unieke relaties staan in koppelingen; elke SOC-code telt eenmaal mee.
scorekolommen = list(score)
per_groep = koppelingen.groupby('ISCO_08_code')
statistieken = per_groep[scorekolommen].agg(['mean', 'sum', 'count'])
gemiddelden = statistieken.xs('mean', axis=1, level=1)
aantallen = per_groep.size()
resultaat = groepen.merge(gemiddelden, on='ISCO_08_code', how='left',
                          validate='one_to_one')

# %% 4. Valideren
print('Stap 4: groepsgemiddelden en dekking valideren.')
if not resultaat['ISCO_08_code'].is_unique or len(resultaat) != len(groepen):
    raise ValueError('Output bevat niet precies één rij per CBS-groep')
print(f'  Groepen met meerdere SOC-codes: '
      f'{groepen["ISCO_08_code"].map(aantallen).gt(1).sum()}')
for kolom in scorekolommen:
    beschikbaar = statistieken[(kolom, 'count')]
    # Onafhankelijke rekencontrole: gemiddelde = som / aantal scores.
    verwacht = statistieken[(kolom, 'sum')] / beschikbaar.replace(0, np.nan)
    verwacht = resultaat['ISCO_08_code'].map(verwacht)
    if not np.allclose(resultaat[kolom], verwacht, equal_nan=True,
                       rtol=1e-12, atol=1e-12):
        raise ValueError(f'Onjuist ongewogen gemiddelde voor {kolom}')
    bronscores = bronnen[kolom][score[kolom][2]].dropna()
    aanwezig = resultaat[kolom].dropna()
    if not aanwezig.between(bronscores.min(), bronscores.max()).all():
        raise ValueError(f'Afgeleide score buiten bronbereik voor {kolom}')
    gedeeltelijk = beschikbaar.gt(0) & beschikbaar.lt(aantallen)
    gekoppeld = resultaat[kolom].notna().sum()
    print(f'  {kolom}: {gekoppeld} gekoppeld; '
          f'{100 * gekoppeld / len(resultaat):.2f}% dekking; '
          f'{len(resultaat) - gekoppeld} ontbrekende scores.')
    print(f'    Groepen met gedeeltelijke scoredekking: '
          f'{groepen["ISCO_08_code"].map(gedeeltelijk).fillna(False).sum()}')

# %% 5. Exporteren
uitvoerkolommen = ['ISCO_08_code', 'ISCO_08_beroep_NL'] + scorekolommen
resultaat = resultaat[uitvoerkolommen]
uitvoermap.mkdir(exist_ok=True)
uitvoer = uitvoermap / 'ISCO08_AIOE.csv'
resultaat.to_csv(uitvoer, index=False, sep=';', decimal=',',
                 encoding='utf-8-sig', na_rep='')
# Controleer de opgeslagen CSV; bronbestanden worden niet opnieuw gelezen.
opgeslagen = pd.read_csv(uitvoer, sep=';', decimal=',',
                         encoding='utf-8-sig', dtype={'ISCO_08_code': str})
pd.testing.assert_frame_equal(opgeslagen, resultaat, rtol=1e-12, atol=1e-12)
excel = uitvoermap / 'ISCO08_AIOE.xlsx'
resultaat.to_excel(excel, index=False, sheet_name='ISCO_AIOE',
                   engine='openpyxl')
opgeslagen_excel = pd.read_excel(excel, dtype={'ISCO_08_code': str})
pd.testing.assert_frame_equal(opgeslagen_excel, resultaat,
                              rtol=1e-12, atol=1e-12)
print(f'Stap 5: {len(resultaat)} rijen, vijf kolommen opgeslagen '
      'en gecontroleerd.')
print(f'  CSV: {uitvoer}')
print(f'  Excel: {excel}')

from visualiseer import maak_visualisatie

maak_visualisatie()

# %%
