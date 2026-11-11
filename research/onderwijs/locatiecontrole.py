"""Bewaar handmatig MBO-aanbod; verken DUO-locaties zonder studenten te verdelen."""
import argparse
from collections import Counter, defaultdict
import csv
import gzip
import hashlib
import json
from pathlib import Path
import re
import unicodedata

ROOT=Path(__file__).resolve().parents[2]
INSTITUTIONS={
    'Firda':('08PG','Firda',''),
    'ROC Nova College':('25PX','ROC Nova College','Harlingen'),
    'SVO':('17WH','SVO','Leeuwarden'),
    'Aeres':('25GV','Aeres (V) MBO',''),
}
MAPPING=Path('data/mappings/mbo_locaties')
REPORTS=Path('data/processed/onderwijs/locatiecontrole')


def normalise(value):
    value=unicodedata.normalize('NFKD',value.casefold())
    return ' '.join(re.findall(r'[a-z0-9]+',''.join(c for c in value if not unicodedata.combining(c))))


def parse_inventory(text):
    """Een hoofdbullet is één opleiding; inspringing bewaart alleen onderliggende tekst."""
    sections=[];current=None;parent=None
    def finish_parent():
        nonlocal parent
        if parent is not None:
            current['items'].append(parent);parent=None
    def finish_section():
        if current:
            finish_parent()
            if current['items'] and not current['url']:
                raise ValueError('Aanbod zonder bron-URL')
            sections.append(current)
    for line_no,line in enumerate(text.splitlines(),1):
        stripped=line.strip()
        if stripped in INSTITUTIONS:
            finish_section()
            current=dict(institution=stripped,place=INSTITUTIONS[stripped][2],url='',items=[],line=line_no)
            continue
        place=re.fullmatch(r'([A-ZÀ-Ý][a-zà-ÿ-]+) specifieke opleidingen:',stripped)
        if place:
            if not current or current['institution']!='Aeres':
                raise ValueError('Onverwachte locatiekop')
            finish_section()
            current=dict(institution='Aeres',place=place[1],url='',items=[],line=line_no)
            continue
        url=re.search(r'https://\S+',stripped)
        if url:
            if not current:raise ValueError('Bron zonder instelling')
            current['url']=url[0]
            continue
        if stripped.startswith('- '):
            if not current:raise ValueError('Opleiding zonder instelling')
            name=stripped[2:].strip()
            if not name:raise ValueError('Lege opleiding')
            if line.startswith((' ','\t')):
                if parent is None:raise ValueError('Onderliggende vermelding zonder hoofdbullet')
                parent['children'].append(dict(name=name,line=line_no))
            else:
                finish_parent();parent=dict(name=name,line=line_no,children=[])
    finish_section()
    return sections


def write_csv(path, rows, fields):
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('w',encoding='utf-8-sig',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=fields,delimiter=';');writer.writeheader();writer.writerows(rows)


def inventory_rows(sections, captured):
    offers=[];locations=[]
    for section in sections:
        name,place=section['institution'],section['place']
        code,duo_name,_=INSTITUTIONS[name]
        if not place:continue
        province='Flevoland' if place in ('Dronten','Emmeloord','Urk') else 'Fryslân'
        common=dict(Instelling=name,Instellingscode=code,Instelling_DUO=duo_name,Plaats=place,Provincie=province,
            Bron='KiesMBO' if 'kiesmbo.nl' in section['url'] else 'Firda',Bron_URL=section['url'],
            Vastgelegd_op=captured,Handmatige_controle_datum='',Schooljaar='',
            Validatiestatus='Handmatige gebruikersinventarisatie; geen volledige code- en jaarcontrole')
        locations.append(dict(common,Detailniveau='plaats'))
        for parent in section['items']:
            for child in parent['children'] or [dict(name='',line='')]:
                offers.append(dict(common,Opleiding_KiesMBO=parent['name'],Onderliggende_vermelding=child['name'],
                    CREBO='',Bronregel_opleiding=parent['line'],Bronregel_onderliggend=child['line']))
    # Firda: no detailed programme list or named Frisian towns were provided.
    firda=next((s for s in sections if s['institution']=='Firda'),None)
    if firda:
        for place,province,detail in [('Emmeloord','Flevoland','plaats'),('Urk','Flevoland','plaats'),('','Fryslân','provincie; plaatsen niet gespecificeerd')]:
            locations.append(dict(Instelling='Firda',Instellingscode='08PG',Instelling_DUO='Firda',Plaats=place,Provincie=province,
                Bron='Firda',Bron_URL=firda['url'],Vastgelegd_op=captured,Handmatige_controle_datum='',Schooljaar='',
                Validatiestatus='Handmatige gebruikersinventarisatie; geen lijst per opleiding',Detailniveau=detail))
    return offers,locations


def exact_name_candidates(root, offers):
    """Voorstellen, geen codevaststelling of historische aanbodselectie."""
    indexed=defaultdict(lambda:defaultdict(set))
    source=root/'data/processed/onderwijs/studenten_mbo_friesland.csv'
    with source.open(encoding='utf-8-sig',newline='') as stream:
        for r in csv.DictReader(stream,delimiter=';'):
            if r['Jaar']=='2025':indexed[r['Instellingscode'],normalise(r['Erkende opleiding naam'])][r['Erkende opleiding code']].add('DUO-opleidingsnaam')
    snapshot=root/'data/processed/mbo_opleidingen.json.gz'
    if snapshot.exists():
        for course in json.loads(gzip.decompress(snapshot.read_bytes()))['courses']:
            year=course['years'].get('2025',{})
            codes=[code for _,(code,name,place) in INSTITUTIONS.items() if any(f'({code})' in inst for inst in year.get('institutions',[]))]
            for q in year.get('qualifications',[]):
                for code in codes:indexed[code,normalise(q['name'])][course['code']].add('SBB-beroepsnaam 2025-2026')
    result=[];seen=set()
    for r in offers:
        key=(r['Instellingscode'],r['Plaats'],r['Opleiding_KiesMBO'])
        if key in seen:continue
        seen.add(key)
        matched=indexed.get((key[0],normalise(key[2])),{})
        result.append(dict(Instelling=r['Instelling'],Instellingscode=key[0],Plaats=key[1],Opleiding_handmatig=key[2],
            Referentiejaar='2025',Mogelijke_CREBO_codes=' | '.join(sorted(matched)),
            Naamovereenkomst_bron=' | '.join(sorted({s for values in matched.values() for s in values})),
            Status='Naamovereenkomst; code en geldigheidsjaar handmatig controleren' if matched else 'Geen exacte naamovereenkomst; geen code toegekend',
            Gebruikt_voor_tellingen='nee'))
    return result


def location_observations(root, locations):
    lookup=json.loads((root/'data/raw/onderwijs/sources.json').read_text())
    urls={r['bestand']:r['url'] for r in lookup}
    listed={(r['Instellingscode'],normalise(r['Plaats'])) for r in locations if r['Plaats']}
    selected={values[0] for values in INSTITUTIONS.values()}
    observations=[];summaries=[];hashes={}
    files=sorted((root/'data/raw/onderwijs').glob('02.-onderwijslocaties-mbo-*.csv'))
    for path in files:
        year=re.search(r'(20\d{2})\.csv$',path.name)[1]
        hashes[str(path.relative_to(root))]=hashlib.sha256(path.read_bytes()).hexdigest()
        raw=path.read_bytes()
        try:text=raw.decode('utf-8-sig')
        except UnicodeDecodeError:text=raw.decode('cp1252')
        import io
        reader=csv.DictReader(io.StringIO(text),delimiter=';')
        headers={normalise(key):key for key in reader.fieldnames or []}
        aliases={
            'Instellingscode':['instellingscode','Brinnr'],
            'Naam_instelling':['Naam_instelling','Naam Instelling'],
            'Onderwijslocatiecode':['Onderwijslocatiecode','onderwijslocatie','OWLocatie'],
            'Plaats_onderwijslocatie':['Plaats_onderwijslocatie','Plaats OWLocatie'],
            'Arbeidsmarktregio':['Arbeidsmarktregio'],
            'Aantal_hoofdinschrijvingen':['Aantal_hoofdinschrijvingen','HFD'],
        }
        columns={key:next((headers[normalise(alias)] for alias in values if normalise(alias) in headers),None) for key,values in aliases.items()}
        if any(columns[key] is None for key in aliases if key!='Arbeidsmarktregio'):
            raise ValueError(f'Onbekend DUO-locatieschema: {path.name}')
        has_region=columns['Arbeidsmarktregio'] is not None
        rows=[{key:row[column] if column else '' for key,column in columns.items()} for row in reader]
        frequencies=Counter((r['Instellingscode'],r['Onderwijslocatiecode']) for r in rows if r['Instellingscode'] in selected)
        groups=defaultdict(list)
        for r in rows:
            code=r['Instellingscode']
            if code not in selected:continue
            key=(code,r['Onderwijslocatiecode'])
            groups[code].append(r)
            observations.append(dict(Jaar=year,Instellingscode=code,Instelling=r['Naam_instelling'],
                Onderwijslocatiecode=r['Onderwijslocatiecode'],Locatiecode_meermaals_in_bron='ja' if frequencies[key]>1 else 'nee',Plaats=r['Plaats_onderwijslocatie'],
                DUO_arbeidsmarktregio=r['Arbeidsmarktregio'],Regio_in_bron_aanwezig='ja' if has_region else 'nee',Aantal_hoofdinschrijvingen_bron=r['Aantal_hoofdinschrijvingen'],
                Plaats_in_handmatige_lijst='ja' if (code,normalise(r['Plaats_onderwijslocatie'])) in listed else 'nee',
                Bron_URL=urls.get(path.name,'')))
        for code,entries in sorted(groups.items()):
            frisian=[r for r in entries if normalise(r['Arbeidsmarktregio']) in ('friesland','fryslan')]
            exact=[int(r['Aantal_hoofdinschrijvingen']) for r in frisian if r['Aantal_hoofdinschrijvingen'].isdigit()]
            masked=[r for r in frisian if re.sub(r'\s','',r['Aantal_hoofdinschrijvingen'])=='<5']
            other=[r for r in frisian if not r['Aantal_hoofdinschrijvingen'].isdigit() and r not in masked]
            duplicates=len(entries)-len({r['Onderwijslocatiecode'] for r in entries})
            sums=sum(exact)
            summaries.append(dict(Jaar=year,Instellingscode=code,Instelling=entries[0]['Naam_instelling'],
                Aantal_bronlocaties_regio_Friesland=len(frisian) if has_region else '',Som_exacte_hoofdinschrijvingen_regio_Friesland=sums if has_region and not duplicates else '',
                Aantal_afgeschermde_locaties_regio_Friesland=len(masked) if has_region else '',Aantal_overige_onbekende_aantallen=len(other) if has_region else '',
                Volledige_som_gepubliceerde_locaties=sums if frisian and not masked and not other and not duplicates else '',
                Aantal_locaties_met_onbekend_gebied=sum(normalise(r['Arbeidsmarktregio']) in ('onbekend','') for r in entries),
                Herhaalde_locatiecodes_binnen_instellingjaar=duplicates,
                Geografische_basis='DUO-arbeidsmarktregio Friesland; geen opleiding-locatieverdeling' if has_region else 'Geen arbeidsmarktregio in bron; geen automatische historische provincie afgeleid',
                Is_exact_Friese_opleidingstelling='nee'))
    return observations,summaries,hashes


def run(input_path,captured,root=ROOT):
    root=Path(root).resolve();input_path=Path(input_path).resolve()
    sections=parse_inventory(input_path.read_text(encoding='utf-8-sig'))
    offers,locations=inventory_rows(sections,captured)
    if not offers:raise ValueError('Geen opleidingen gevonden')
    target=root/MAPPING;target.mkdir(parents=True,exist_ok=True)
    write_csv(target/'opleidingsaanbod_handmatig.csv',offers,list(offers[0]))
    write_csv(target/'locaties_handmatig.csv',locations,list(locations[0]))
    policies=[]
    for name,(code,duo_name,place) in INSTITUTIONS.items():
        policies.append(dict(Instelling=name,Instellingscode=code,
            Gebruikersnotitie='Alle bestaande opleidingen behouden vanwege overlap tussen Friese en niet-Friese locaties' if name=='Firda' else 'Gebruiker bevestigt: genoemde opleidingen op Friese locaties vormen de Friese aanbodselectie; overige opleidingen vallen buiten de selectie',
            Friese_selectie_bevestigd_door_gebruiker='uitzondering; alle opleidingen behouden' if name=='Firda' else 'ja',
            Lijst_bewezen_volledig='nee',Automatisch_toegepast_op_aantallen='nee',Geldig_schooljaar='',Vastgelegd_op=captured))
    write_csv(target/'instellingsnotities.csv',policies,list(policies[0]))
    candidates=exact_name_candidates(root,offers)
    write_csv(root/REPORTS/'naamkoppeling_voorstellen_2025.csv',candidates,list(candidates[0]))
    observations,summaries,hashes=location_observations(root,locations)
    write_csv(root/REPORTS/'duo_locaties_2021_2025.csv',observations,list(observations[0]))
    write_csv(root/REPORTS/'duo_regio_sommen_2021_2025.csv',summaries,list(summaries[0]))
    source_rows=[]
    for url in dict.fromkeys(s['url'] for s in sections if s['url']):
        source_rows.append(dict(url=url,source='KiesMBO' if 'kiesmbo.nl' in url else 'Firda',
            captured=captured,user_check_date=None,valid_schoolyear=None,origin='Door gebruiker handmatig geïnventariseerd',
            license='Niet vastgesteld; bronvermelding is geen licentievaststelling'))
    manifest=dict(captured=captured,input_file=str(input_path.relative_to(root)),input_sha256=hashlib.sha256(input_path.read_bytes()).hexdigest(),
        sources=source_rows,duo_source_hashes=hashes,offer_rows=len(offers),unique_location_parent_courses=len(candidates),
        selection_policy='Gebruiker bevestigt op 2026-11-09: voor Nova College, SVO en Aeres is aanbod op de genoemde Friese locaties de Friese selectie; overige opleidingen vallen erbuiten. Firda behoudt alle opleidingen. Dronten is buiten Fryslân. Codekoppelingen en historische geldigheid zijn nog niet bevestigd.',
        note='Onderliggende vermeldingen zijn geen extra zelfstandig bevestigde opleidingen en geen gevalideerde CREBO-aliassen. Geen studentenaantallen verdeeld of bestaande filters gewijzigd.')
    (target/'bronnen.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(dict(rows=len(offers),parents=len(candidates),locations=len(locations),duo_location_rows=len(observations),
        parents_by_location=dict(Counter(f"{r['Instelling']} · {r['Plaats']}" for r in candidates)),
        exact_name_candidates=sum(bool(r['Mogelijke_CREBO_codes']) for r in candidates)),ensure_ascii=False,indent=2))
    return manifest


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--input',type=Path,required=True);p.add_argument('--vastgelegd-op',required=True)
    a=p.parse_args();run(a.input,a.vastgelegd_op)
