"""Reconstrueer ongestandaardiseerde AIOE en C-AIOE uit openbare inputs."""
# %% Packages
import re
from pathlib import Path

import pandas as pd

# %% 1. Inlezen
basis = Path(__file__).resolve().parent
project = basis.parents[1]
bronmap = project / 'data/raw/ai_complementarity'
uitvoermap = project / 'data/processed/ai_complementarity'
print('Stap 1: oorspronkelijke Felten-inputs en gereconstrueerde theta lezen.')
abilities = pd.read_stata(bronmap / 'abilities_2020.dta')
matrix = pd.read_stata(bronmap / 'mturk_mapping_matrix.dta')
applications = pd.read_stata(bronmap / 'application_list.dta')
beroepen = pd.read_stata(bronmap / 'occ_title_2020.dta')
theta = pd.read_csv(
    uitvoermap / 'SOC2010_Complementary.csv', sep=';', decimal=',',
)
referentie = pd.read_excel(
    project / 'data/raw/ai_exposure/AIOE_DataAppendix.xlsx',
    sheet_name='Appendix A',
)
groepen = pd.read_excel(
    bronmap / 'codelijsten-isco-08.xls',
    sheet_name='ISCO-08 unit group', dtype=str,
).rename(columns={
    'code ISCO-08 unitgroup': 'ISCO_08_code',
    'omschrijving ISCO-08 unitgroup': 'ISCO_08_beroep_NL',
})
crosswalk = pd.read_excel(
    bronmap / 'ISCO_SOC_Crosswalk.xls',
    sheet_name='ISCO-08 to 2010 SOC', header=6, dtype=str,
)

# %% 2. AIOE op de ongestandaardiseerde schaal
print('Stap 2: AIOE uit ability-exposure, importance en level berekenen.')
matrix = matrix.merge(applications, on='applications', validate='one_to_one')
abilitykolommen = [
    c for c in matrix.columns
    if c not in ['applications', 'application_id', 'binary_all']
]
exposure = (
    matrix[abilitykolommen].mul(matrix['binary_all'], axis=0)
    .sum().astype('float32')
)
gewichten = abilities.pivot(
    index=['onetsoccode', 'elementid', 'elementname'],
    columns='scaleid', values='datavalue',
).reset_index()
gewichten['ability'] = (
    gewichten['elementname'].str.lower()
    .str.replace(' ', '').str.replace('-', '')
)
# Stata bewaart gen/egen-resultaten standaard als float (32-bit).
importance = (gewichten['IM'].astype('float64') / 5).astype('float32')
level = (gewichten['LV'].astype('float64') / 7).astype('float32')
gewichten['weight'] = (importance * level).astype('float32')
gewichten['weighted'] = (
    gewichten['ability'].map(exposure) * gewichten['weight']
).astype('float32')

# De oorspronkelijke code laat deze vier velden staan bij duplicates drop.
# Daardoor blijven per detailberoep meerdere rijen over. Neem die impliciete
# multipliciteit over om de gepubliceerde AIOE te reproduceren.
constructiecode = (bronmap / 'AIOE Construction.do').read_text()
velden = []
for categorie in ['cognitive', 'sensory']:
    patroon = rf'replace {categorie}=1 if onet_element=="([^"]+)"'
    abilities_in_categorie = re.findall(patroon, constructiecode)
    gewichten[categorie] = gewichten['ability'].isin(abilities_in_categorie)
    scalar = f'{categorie}_scalar'
    gewichten[scalar] = (
        gewichten[categorie] * gewichten['weight']
    ).astype('float32')
    velden.extend([categorie, scalar])
resterend = gewichten[['onetsoccode'] + velden].drop_duplicates()
aantallen = resterend.groupby('onetsoccode').size()

# Eerst totalen per detailberoep, daarna Stata's impliciet gewogen SOC-means.
detail = gewichten.groupby('onetsoccode')[['weight', 'weighted']].sum()
detail = detail.astype('float32')
detail['Aantal_rijen'] = aantallen
detail['SOC_2010'] = detail.index.str[:7]
for kolom in ['weight', 'weighted']:
    detail[kolom] = detail[kolom].astype('float64') * detail['Aantal_rijen']
soc = detail.groupby('SOC_2010')[
    ['weight', 'weighted', 'Aantal_rijen']
].sum().reset_index()
for kolom in ['weight', 'weighted']:
    soc[kolom] = (soc[kolom] / soc['Aantal_rijen']).astype('float32')
soc['AIOE_raw'] = (soc['weighted'] / soc['weight']).astype('float32')
soc = soc.merge(
    beroepen, left_on='SOC_2010', right_on='occ_code', validate='one_to_one',
)
# Zelfde beschikbare 774 beroepen als de gepubliceerde Appendix A.
soc = soc.merge(
    referentie[['SOC Code', 'AIOE']],
    left_on='SOC_2010', right_on='SOC Code', validate='one_to_one',
)
soc = soc[['SOC_2010', 'occ_title', 'AIOE_raw', 'AIOE']]
soc.columns = ['SOC_2010', 'Beroep_EN', 'AIOE_raw', 'AIOE_gepubliceerd']

# %% 3. C-AIOE op SOC-niveau
print('Stap 3: Pizzinelli-formule op de ongestandaardiseerde AIOE toepassen.')
soc = soc.merge(theta, on='SOC_2010', how='left', validate='one_to_one')
# Referentiepopulatie: alleen de 774 gepubliceerde AIOE-beroepen.
theta_min = soc['Complementary_score'].min()
soc['C_AIOE_score'] = soc['AIOE_raw'] * (
    1 - (soc['Complementary_score'] - theta_min)
)

# %% 4. ISCO-08 en benchmarks
relaties = crosswalk[['ISCO-08 Code', '2010 SOC Code']].copy()
relaties.columns = ['ISCO_08_code', 'SOC_2010']
for kolom in relaties:
    relaties[kolom] = relaties[kolom].str.strip()
relaties = relaties.loc[
    relaties['ISCO_08_code'].str.fullmatch(r'\d{4}')
].drop_duplicates()
kolommen = ['AIOE_raw', 'Complementary_score', 'C_AIOE_score']
koppelingen = relaties.merge(
    soc[['SOC_2010'] + kolommen],
    on='SOC_2010', how='left', validate='many_to_one',
)
gemiddelden = koppelingen.groupby('ISCO_08_code')[kolommen].mean()
resultaat = groepen.merge(
    gemiddelden, on='ISCO_08_code', how='left', validate='one_to_one',
)
# Vergelijk uitsluitend ter validatie met de gepubliceerde z-scores.
zscore = (soc['AIOE_raw'] - soc['AIOE_raw'].mean()) / soc['AIOE_raw'].std()
correlatie = soc['AIOE_raw'].corr(soc['AIOE_gepubliceerd'])
afwijking = (zscore - soc['AIOE_gepubliceerd']).abs().max()
beschikbaar = resultaat['C_AIOE_score'].notna().sum()
print(f'Stap 4: {beschikbaar} van {len(resultaat)} ISCO-groepen met C-AIOE.')
print(f'  AIOE-correlatie met publicatie: {correlatie:.9f}.')
print(
    f'  Grootste AIOE-z-scoreafwijking: {afwijking:.9f}.'
)
print(f'  Berekend theta-minimum: {theta_min:.6f}; paper: circa 0,31.')

# %% 5. Exporteren
uitvoermap.mkdir(exist_ok=True)
for naam, tabel in [('SOC2010_C_AIOE', soc), ('ISCO08_C_AIOE', resultaat)]:
    # Bewaar de 32-bit-rekenuitkomst met dezelfde precisie in CSV en Excel.
    tabel = tabel.astype({
        kolom: 'float64' for kolom in tabel.select_dtypes('floating')
    })
    tabel.to_csv(
        uitvoermap / f'{naam}.csv',
        index=False, sep=';', decimal=',', encoding='utf-8-sig',
    )
    tabel.to_excel(
        uitvoermap / f'{naam}.xlsx',
        index=False, sheet_name='C_AIOE', engine='openpyxl',
    )
print(f'Stap 5: eigen reconstructie opgeslagen in {uitvoermap}')

# %%
