"""Reconstrueer theta uit openbare O*NET-data volgens Pizzinelli et al."""
# %% Packages
from pathlib import Path

import pandas as pd

# %% 1. Inlezen
basis = Path(__file__).resolve().parent
project = basis.parents[1]
bronmap = project / 'data/raw/ai_complementarity'
uitvoermap = project / 'data/processed/ai_complementarity'
print('Stap 1: O*NET 24.3 (mei 2020) inlezen.')
context = pd.read_csv(bronmap / 'Work Context.txt', sep='\t')
jobzones = pd.read_csv(bronmap / 'Job Zones.txt', sep='\t')
groepen = pd.read_excel(
    project / 'data/raw/cbs/codelijsten-isco-08-nl.xls',
    sheet_name='ISCO-08 unit group', dtype=str,
).rename(columns={
    'code ISCO-08 unitgroup': 'ISCO_08_code',
    'omschrijving ISCO-08 unitgroup': 'ISCO_08_beroep_NL',
})
crosswalk = pd.read_excel(
    bronmap / 'ISCO_SOC_Crosswalk.xls',
    sheet_name='ISCO-08 to 2010 SOC', header=6, dtype=str,
)

# %% 2. Zes componenten
print('Stap 2: werkcontexten naar 0–100 omzetten en componenten berekenen.')
componenten = {
    'Communicatie': ['4.C.1.a.2.l', '4.C.1.a.2.c'],
    'Verantwoordelijkheid': ['4.C.1.c.2', '4.C.1.c.1'],
    'Fysieke_omstandigheden': ['4.C.2.a.1.c', '4.C.2.a.3'],
    'Kritieke_beslissingen': ['4.C.3.a.1', '4.C.3.a.4', '4.C.3.a.2.b'],
    'Niet_routinematig': ['4.C.3.b.2', '4.C.3.b.8'],
}
elementen = [code for codes in componenten.values() for code in codes]
context = context.loc[
    (context['Scale ID'] == 'CX') & context['Element ID'].isin(elementen)
]
waarden = context.pivot(
    index='O*NET-SOC Code', columns='Element ID', values='Data Value',
)
# O*NET: score = (waarde - schaalminimum) / schaalbereik * 100.
waarden = (waarden - 1) / 4 * 100
waarden['4.C.3.b.2'] = 100 - waarden['4.C.3.b.2']
detail = pd.DataFrame(index=waarden.index)
for naam, codes in componenten.items():
    # Alle elementen vereist; geen stilzwijgend gemiddelde van een deelset.
    detail[naam] = (
        waarden[codes].sum(axis=1, min_count=len(codes)) / len(codes)
    )
detail['Vaardigheden'] = (
    jobzones.set_index('O*NET-SOC Code')['Job Zone'] * 20
)
kolommen = list(componenten) + ['Vaardigheden']
detail['Complementary_score'] = (
    detail[kolommen].sum(axis=1, min_count=6) / 6 / 100
)

# %% 3. Naar SOC 2010 en ISCO-08
print('Stap 3: eerst naar SOC 2010 middelen, daarna naar ISCO-08.')
detail['SOC_2010'] = detail.index.str[:7]
soc = detail.groupby('SOC_2010')[kolommen + ['Complementary_score']].mean()
soc = soc.reset_index()
relaties = crosswalk[['ISCO-08 Code', '2010 SOC Code']].copy()
relaties.columns = ['ISCO_08_code', 'SOC_2010']
for kolom in relaties:
    relaties[kolom] = relaties[kolom].str.strip()
relaties = relaties.loc[
    relaties['ISCO_08_code'].str.fullmatch(r'\d{4}')
].drop_duplicates()
koppelingen = relaties.merge(
    soc, on='SOC_2010', how='left', validate='many_to_one',
)
gemiddelden = koppelingen.groupby('ISCO_08_code')[
    kolommen + ['Complementary_score']
].mean()
resultaat = groepen.merge(
    gemiddelden, on='ISCO_08_code', how='left', validate='one_to_one',
)

# %% 4. Dekking en benchmark
beschikbaar = resultaat['Complementary_score'].notna().sum()
minimum = soc.loc[soc['Complementary_score'].idxmin()]
hand = soc.set_index('SOC_2010').loc['51-9031', 'Complementary_score']
print(f'Stap 4: {beschikbaar} van {len(resultaat)} ISCO-groepen met theta.')
print(f'  Berekend minimum: {minimum["Complementary_score"]:.6f}; '
      f'SOC {minimum["SOC_2010"]}.')
print(f'  Hand Cutters and Trimmers: {hand:.6f}; paper: minimum circa 0,31.')
print('  Reconstructie; niet numeriek gelijk verklaard aan de auteursdata.')

# %% 5. Exporteren
uitvoermap.mkdir(exist_ok=True)
for naam, tabel in [('SOC2010_Complementary', soc),
                    ('ISCO08_Complementary', resultaat)]:
    tabel.to_csv(
        uitvoermap / f'{naam}.csv',
        index=False, sep=';', decimal=',', encoding='utf-8-sig',
    )
    tabel.to_excel(
        uitvoermap / f'{naam}.xlsx',
        index=False, sheet_name='Complementary', engine='openpyxl',
    )
print(f'Stap 5: theta en zes componenten opgeslagen in {uitvoermap}')

# %%
