"""Reproduceerbare atlas vanuit bestaande AI-uitvoer en DUO; geen nieuwe scores."""
import csv
import hashlib
import json
import gzip
import runpy
from pathlib import Path
from .onderwijs import import_education
from .occupation_content import import_content, import_brc
from .opleidingen import build_courses
from .mbo_website_matches import build_mbo_matches
from .esco import import_esco, supplement_content, VERSION as ESCO_VERSION, SERVICE_ATTRIBUTION
ROOT = Path(__file__).resolve().parents[3]
TARGET = ROOT / 'website/public/data/atlas'


MBO_SELECTION_NOTE = 'Voor Aeres, SVO en ROC Nova College nemen we alleen opleidingen mee waarvan handmatig is bevestigd dat ze in Fryslân worden aangeboden. Deze opleidingen zijn via SBB gekoppeld aan opleidingscodes per schooljaar. Bij Firda behouden we alle opleidingen, inclusief die in Emmeloord en Urk.\n\nVoor studenten en afgestudeerden gebruiken we dezelfde selectie. De aantallen gelden per opleiding en onderwijsinstelling, niet per afzonderlijke onderwijslocatie. Daardoor kunnen ook studenten van buiten Fryslân zijn meegeteld.\n\nDe vestigingsplaats van een instelling is een administratief gegeven en zegt niet noodzakelijk waar de opleiding wordt gevolgd. Omdat het jaar van de handmatige controle onbekend is, kunnen we niet bevestigen dat alle geselecteerde opleidingen gedurende 2021–2025 in Fryslân werden aangeboden. Afgeschermde aantallen blijven onbekend.'


AI_DATASET_METADATA = {
    'ISCO08_AIOE.csv': {
        'name': 'AI-blootstelling · algemeen, taalmodellen en beeldgeneratie',
        'description': '',
        'geography': '',
        'show_rights_status': False,
        'organization': 'Felten, Raj en Seamans; ISCO-08-koppeling door DataFryslân',
        'contents': [
            'Algemene AI-blootstelling: overlap tussen beroepsvaardigheden en tien AI-toepassingen.',
            'Taalmodel-exposure: overlap met de mogelijkheden van taalmodellen.',
            'Beeldgeneratie-exposure: overlap met de mogelijkheden van beeldgeneratie.',
        ],
        'website_use': '',
        'limitations': '',
    },
    'ISCO08_C_AIOE.csv': {
        'name': 'AI-blootstelling en complementariteit',
        'description': '',
        'geography': '',
        'show_rights_status': False,
        'organization': 'DataFryslân; gebaseerd op Felten et al., Pizzinelli et al. en O*NET 24.3',
        'contents': [
            'Algemene AI-blootstelling (AIOE_raw): gereconstrueerd op de oorspronkelijke, ongestandaardiseerde schaal.',
            'Complementariteit (Complementary_score): door DataFryslân berekend volgens de componentmethode van Pizzinelli et al. (2023).',
            'C-AIOE (C_AIOE_score): AI-blootstelling gecorrigeerd voor complementariteit; een gecombineerde onderzoeksmaat.',
        ],
        'website_use': 'De perceptuele kaart gebruikt de algemene AI-blootstelling en complementariteit uit dit bestand. Ook beroepsprofielen gebruiken deze complementariteitsscore. De gecombineerde C-AIOE-score zelf wordt niet getoond in de grafieken of beroepsprofielen.',
        'limitations': '',
    },
    'ISCO08_Complementary.csv': {
        'name': 'Complementariteit',
        'description': '',
        'geography': '',
        'show_rights_status': False,
        'organization': 'DataFryslân; volgens Pizzinelli et al. (2023), met O*NET 24.3',
        'contents': [
            'De complementariteitsscore per ISCO-08-beroepsgroep.',
            'De zes onderdelen: communicatie, verantwoordelijkheid, fysieke omstandigheden, kritieke beslissingen, niet-routinematig werk en vaardigheden.',
        ],
        'website_use': 'Aanvullend onderzoeksbestand om de opbouw van complementariteit te bekijken. De perceptuele kaart en beroepsprofielen halen hun complementariteit uit ISCO08_C_AIOE.csv, niet rechtstreeks uit dit afzonderlijke bestand.',
        'limitations': '',
    },
}


def build(refresh_sources=False):
    runpy.run_path(str(ROOT / 'website/scripts/export_research.py'))
    TARGET.mkdir(parents=True, exist_ok=True)
    courses = build_courses(ROOT, refresh=refresh_sources)
    from .ho_isco import attach_ho_occupations, load_ho_courses, national_ho_display
    national = load_ho_courses(ROOT)
    attach_ho_occupations(ROOT, courses, national)
    (TARGET / 'ho_isco_landelijk.json').write_text(json.dumps(national_ho_display(courses, national), ensure_ascii=False) + '\n')
    (TARGET / 'opleidingen.json').write_text(json.dumps(courses, ensure_ascii=False) + '\n')
    (TARGET / 'mbo_beroep_matches.json').write_text(json.dumps(build_mbo_matches(ROOT, courses), ensure_ascii=False) + '\n')
    source = ROOT / 'website/public/data/research/occupations.json'
    data = json.loads(source.read_text())
    from .common import code
    uwv_path = ROOT/'data/raw/uwv/Vacaturemarkt - Data Fryslan.xlsx'
    uwv = []
    if refresh_sources and uwv_path.is_file():
        from .uwv_workbook import import_workbook
        uwv = import_workbook(uwv_path)
        (ROOT/'data/processed/uwv_brc_plus.json').write_text(json.dumps(uwv, ensure_ascii=False)+'\n')
    content_path = ROOT / 'data/processed/competentnl_occupations.json.gz'
    content = import_content(ROOT) if refresh_sources or not content_path.is_file() else json.loads(gzip.decompress(content_path.read_bytes()))
    brc = import_brc(ROOT, prefer_processed=not refresh_sources)
    members = json.loads(gzip.decompress((ROOT / 'data/processed/competentnl_members.json.gz').read_bytes()))
    needed_esco = {r['code'] for r in data['rows']} - set(content)
    esco = import_esco(ROOT, needed_esco, refresh=refresh_sources)
    content, members = supplement_content(content, members, esco)
    (TARGET / 'occupations').mkdir(exist_ok=True)
    for isco, entries in members.items():
        (TARGET / 'occupations' / f'{isco}.json').write_text(json.dumps(entries, ensure_ascii=False) + '\n')
    score_rows = {r['code']: r for r in data['rows']}
    for isco, details in content.items():
        if isco not in score_rows:
            score_rows[isco] = dict(code=isco, occupation=details['title'], exposure=None, complementarity=None)
    relevance_report = json.loads((ROOT/'data/processed/controles/isco_cbs_relevantie_validatie.json').read_text())
    cbs_relevance = {r['isco_code']: r for r in relevance_report['groups']}
    profiles = []

    def indicator(value=None, status='unavailable', source=None, methodology='', geography='Fryslân; gegevens ontbreken', classification='ISCO-08'):
        return dict(value=value, status=status, source=source or [], year=None, geography=geography, classification=classification, methodology=methodology)
    for row in sorted(score_rows.values(), key=lambda r: r['code']):
        code(row['code'], 4)

        def ai(key, source, method): return indicator(row[key], 'calculated' if row[key] is not None else 'unavailable', [
            source, 'Felten et al. (2021)' if key == 'exposure' else 'Eigen berekening door DataFryslân volgens de methode van Pizzinelli et al. (2023), met O*NET 24.3 (2020)'], method, 'Internationale beroepsscores; geen Friese weging')
        profile = dict(isco_code=row['code'], title=row['occupation'],
                       description=indicator(
                           methodology='Officiële beroepsomschrijving nog niet geïmporteerd.'),
                       tasks=indicator(
                           methodology='NLcompetent en officiële ISCO-taken nog niet geïmporteerd.'),
                       skills=indicator(
                           methodology='NLcompetent-vaardigheden nog niet geïmporteerd.'),
                       ai_exposure=ai('exposure', 'ISCO08_AIOE.csv',
                                      'Gestandaardiseerde AIOE-score (algemene AI), ongewogen via ISCO–SOC; geen voorspelling van banenverlies. Publicatie: Felten et al. (2021); geen actuele regionale meting.'),
                       ai_complementarity=ai('complementarity', 'ISCO08_C_AIOE.csv',
                                             'De complementariteitsscore is door DataFryslân zelf berekend aan de hand van de methode van Pizzinelli et al. (2023). Score 0–1; broncomponenten O*NET 24.3 (2020); geen regionale meting.'),
                       vacancies=indicator(
                           methodology='UWV-werkmap beschikbaar met BRC Plus-beroepsnamen; geen ISCO-codes of gevalideerde BRC Plus–ISCO-koppeling.'),
                       education_inflow=indicator(
                           status='not_responsible', methodology='DUO-opleidingsgegevens beschikbaar, maar geen gevalideerde opleiding–ISCO-koppeling. Geen beroepsinstroom berekend.'),
                       retirement_outflow=indicator(
                           status='not_responsible', methodology='Werkgelegenheid en leeftijdsopbouw per SBI-5 ontbreken. AOW-bereik is geen daadwerkelijke pensionering.'),
                       outlook_2035=indicator(
                           status='not_responsible', methodology='Gevalideerd scenario- en knelpuntmodel ontbreekt.'),
                       source_references=['ISCO08_AIOE.csv', 'ISCO08_C_AIOE.csv'],
                       data_status='calculated' if row['exposure'] is not None or row['complementarity'] is not None else 'unavailable')
        details = content.get(row['code'], {})
        is_esco = details.get('source') == 'ESCO'
        profile['content_source'] = 'ESCO' if is_esco else 'CompetentNL' if details else None
        profile['content_version'] = details.get('source_version')
        relevance = cbs_relevance.get(row['code'])
        profile['cbs_relevance'] = dict(note=relevance['cbs_note'], source_url=relevance_report['source_url'], source='CBS · Codelijsten en beroepenindex ISCO 2008', sheet=relevance_report['sheet']) if relevance else None
        if relevance:
            profile['source_references'].append('CBS · Codelijsten en beroepenindex ISCO 2008 · ' + relevance_report['source_url'])
        for field, filename in [('description', 'beroepen_isco.csv'), ('tasks', 'beroepen_taken.csv'), ('skills', 'beroepen_vaardigheden.csv'), ('knowledge_areas', 'beroepen_kennisgebieden.csv')]:
            value = details.get(field)
            profile[field] = indicator(value or None, 'observed' if value else 'unavailable',
                [f'Europese Commissie · ESCO v{ESCO_VERSION} (nl)'] if value and is_esco else [f'CompetentNL · {filename}'] if value else [],
                'Nederlandse ESCO-beroepen geselecteerd en gegroepeerd via de officiële ISCO-relatie; geen officiële ISCO-groepsdefinitie.' if value and is_esco else 'Samengevoegde inhoud van gekoppelde specifieke beroepen; niet elk onderdeel geldt voor ieder beroep binnen deze ISCO-groep.' if value else 'ESCO bevat geen afzonderlijke takenlijst; zie omschrijving en vaardigheden.' if is_esco and field == 'tasks' else 'Nog geen gekoppelde inhoud beschikbaar.',
                'Nederland; beroepsinhoud')
        profile['member_count'] = details.get('member_count', 0)
        profile['map_exposure'] = row.get('raw')
        profile['occupation_names'] = details.get('occupation_names', [])
        profile['brc2014'] = brc.get(row['code'])
        if profile['brc2014']:
            profile['vacancies']['methodology'] = 'ISCO–BRC 2014-schakelschema beschikbaar. De UWV-bron gebruikt BRC Plus-namen; aansluiting op BRC 2014 is nog niet gevalideerd. Vacatureaantallen worden niet verdeeld over ISCO-beroepen.'
        profile['source_references'] += [f'Europese Commissie · ESCO v{ESCO_VERSION} · {name}' for name in ('occupations_nl.csv','skills_nl.csv','occupationSkillRelations_nl.csv')] if is_esco else [f'CompetentNL · {name}' for name in ('beroepen_isco.csv', 'beroepen_taken.csv', 'beroepen_vaardigheden.csv', 'beroepen_kennisgebieden.csv')] if details else []
        if profile['brc2014']:
            profile['source_references'].append('CBS · Schakelschema ISCO2008-BRC2014.xls')
        profiles.append(profile)
    if len({p['isco_code'] for p in profiles}) != len(profiles):
        raise ValueError('Dubbele beroepscodes')
    (TARGET/'profiles.json').write_text(json.dumps(profiles, ensure_ascii=False, indent=2)+'\n')
    manifest = json.loads(
        (ROOT/'data/published/publication_manifest.json').read_text())['files']
    catalogue = []
    imported = []
    for path in sorted((ROOT/'data/processed/onderwijs').glob('*.csv')):
        rows = import_education(path)
        imported.append(dict(file=path.name, rows=len(rows),
                        sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    for entry in data['sources']:
        file = entry['file']
        edu = file.startswith(('studenten_', 'afgestudeerden_'))
        mbo = '_mbo_' in file
        review = manifest.get(file, {})
        published = ROOT/'website/public/data/research'/file
        approved = review.get('approved') is True and bool(
            review.get('evidence')) and published.is_file()
        catalogue.append(dict(file=file, name=file.removesuffix('.csv').replace('_', ' '),
                              description=('Studentenaantallen per opleiding en onderwijsinstelling' if file.startswith('studenten_') else 'Afgestudeerden per opleiding en onderwijsinstelling') if edu else 'Bestaande AI-beroepsscores; geen regionale arbeidsmarktmeting',
                              organization='DUO' if edu else 'DataFryslân; Felten et al. / Pizzinelli et al.',
                              version=entry['sha256'], publication_year=None,
                              geography='Bevestigd Fries opleidingsaanbod; Firda inclusief Emmeloord en Urk. Aantallen per opleiding en onderwijsinstelling.' if mbo else 'Onderwijsinstellingen in Fryslân' if edu else 'Internationale beroepsscores; geen regionale weging',
                              classification='DUO opleidingscode' if edu else 'ISCO-08 via SOC',
                              license=review.get('license'), download=f'data/research/{file}' if approved else None,
                              limitations=MBO_SELECTION_NOTE if mbo else '' if edu else 'Ongewogen koppeling van beroepsgroepen. De complementariteitsscore is door DataFryslân zelf berekend aan de hand van de methode van Pizzinelli et al. (2023). Geen regionale arbeidsmarktmeting.',
                              rights_status='Goedgekeurd' if approved else 'Herpublicatierechten nog niet vastgesteld'))
    for entry in catalogue:
        if entry['classification'].startswith('DUO'):
            entry['citation'] = 'Dienst Uitvoering Onderwijs. (z.d.). Open Onderwijsdata [Databestanden]. Selectie en bewerking: DataFryslân.'
            entry['publication_years'] = []
        elif entry['file'] == 'ISCO08_AIOE.csv':
            entry['citation'] = 'Felten, E., Raj, M., & Seamans, R. (2021). Occupational, industry, and geographic exposure to artificial intelligence: A novel dataset and its potential uses. Strategic Management Journal, 42(12), 2195–2217. https://doi.org/10.1002/smj.3286 — Taalmodellen en beeldgeneratie: Felten, E. W., Raj, M., & Seamans, R. (2023). Occupational heterogeneity in exposure to generative AI. SSRN. https://doi.org/10.2139/ssrn.4414065. ISCO-bewerking: DataFryslân.'
            entry['publication_years'] = [2021, 2023]
        else:
            entry['citation'] = 'Pizzinelli, C., Panton, A., Tavares, M. M., Cazzaniga, M., & Li, L. (2023). Labor market exposure to AI: Cross-country differences and distributional implications (IMF Working Paper No. 23/216). International Monetary Fund. https://doi.org/10.5089/9798400254802.001. De complementariteitsscore is door DataFryslân zelf berekend aan de hand van de methode van Pizzinelli et al. (2023), met O*NET 24.3 (2020).'
            entry['publication_years'] = [2023]
            if entry['file'] == 'ISCO08_C_AIOE.csv':
                entry['citation'] += ' AIOE volgens Felten et al. (2021), https://doi.org/10.1002/smj.3286.'
                entry['publication_years'] = [2021, 2023]
    for entry in catalogue:
        entry.update(AI_DATASET_METADATA.get(entry['file'], {}))
    if uwv:
        catalogue.append(dict(file=uwv_path.name, name='UWV openstaande vacatures · BRC Plus',
                              description='Aangeleverde kwartaalreeks 2023-Q1 t/m 2026-Q2; niet gekoppeld aan ISCO-profielen',
                              organization='UWV (aangeleverde werkmap)', version=hashlib.sha256(uwv_path.read_bytes()).hexdigest(),
                              publication_year=None, geography='Friesland', classification='BRC Plus (namen; geen codes)',
                              license=None, download=None, limitations='OnAfgeronde bronwaarden behouden; definitie en berekeningsmethode nog valideren. Geen gevalideerde BRC Plus–ISCO-koppeling.',
                              rights_status='Herpublicatierechten nog niet vastgesteld', citation='UWV. (z.d.). Vacaturemarkt - Data Fryslan [Aangeleverde Excelwerkmap; niet openbaar]. Verslagperiode 2023-Q1 tot en met 2026-Q2.', publication_years=[]))
    uwv_catalogue = ROOT / 'data/published/uwv_catalogue.json'
    if uwv:
        uwv_catalogue.write_text(json.dumps(catalogue[-1], ensure_ascii=False, indent=2) + '\n')
    elif uwv_catalogue.is_file():
        catalogue.append(json.loads(uwv_catalogue.read_text()))
    catalogue.append(dict(file='ESCO_v1.2.1_nl', name='ESCO v1.2.1 — Nederlandse beroepsinhoud',
        description='Aanvulling van beroepsinhoud voor ISCO-groepen zonder CompetentNL-profiel.',
        organization='Europese Commissie', version=ESCO_VERSION, publication_year=None,
        publication_years=[], geography='Europese classificatie; Nederlandstalige labels',
        classification='ESCO → ISCO-08', license='Hergebruik onder Besluit 2011/833/EU', download=None,
        rights_status='Bronvermelding en herkenbare bewerking volgens ESCO-gebruiksvoorwaarden',
        limitations=esco['metadata']['adaptation'] + ' Geen afzonderlijke ESCO-takenlijst; geen studenteninstroom.',
        citation=SERVICE_ATTRIBUTION + ' ESCO v1.2.1, Nederlands. Selectie en groepering: DataFryslân.'))
    (TARGET/'catalogue.json').write_text(json.dumps(catalogue, ensure_ascii=False, indent=2)+'\n')
    from .publication import prune_public_data
    prune_public_data(ROOT / 'website/public/data', json.loads((ROOT / 'data/published/publication_manifest.json').read_text()))
    (ROOT/'data/processed/import_report.json').write_text(json.dumps(imported, indent=2)+'\n')
    print(f'{len(profiles)} beroepsprofielen; {len(imported)} DUO-bestanden gecontroleerd; {len(uwv)} UWV-BRC Plus-kwartaalcellen gecontroleerd.')


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh-sources', action='store_true', help='Herimporteer lokale CompetentNL-, CBS- en UWV-bronnen.')
    build(refresh_sources=parser.parse_args().refresh_sources)
