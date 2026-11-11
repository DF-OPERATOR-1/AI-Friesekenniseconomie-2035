"""Controleer de aanvullende TNO/CompetentNL-vaardigheidsmapping; nog geen matchscore."""
import csv
import hashlib
import json
from pathlib import Path
import re
import uuid
from .opleiding_beroep import ROOT, read_rows
from .esco import SOURCE_FOLDER
from .esco_audit import read_table

SOURCE_URL='https://publications.tno.nl/publication/34645227/Jd08KjsX/competentNL-2025-vaardigheden-bijl1.pdf'
SOURCE_REL='data/raw/competentnl/mappings/competentNL-2025-vaardigheden-bijl1.pdf'


def cell_uris(value):
    prefix='http://data.europa.eu/esco/skill/'
    parts=''.join(value.split()).split(prefix)
    if parts[0]:
        raise ValueError('Onverwachte tekst in PDF-mappingcel')
    result=[]
    for raw in parts[1:]:
        digits=re.sub(r'[^0-9a-f]','',raw)
        if len(digits)!=32:
            raise ValueError('Onvolledige ESCO-URI in PDF')
        result.append(prefix+str(uuid.UUID(hex=digits)))
    return result


def parse_pages(texts):
    records=[]
    for page,text in texts:
        lines=text.splitlines()
        header=next(l for l in lines if 'ESCO Close Match' in l and 'ESCO Broad Match' in l)
        close=header.index('ESCO Close Match')-18
        broad=header.index('ESCO Broad Match')-18
        other=header.index('O*NET Close Match')-10
        current=None
        def flush(row):
            if row:
                for relation in ('closeMatch','broadMatch'):
                    for uri in cell_uris(row[relation]):
                        records.append(dict(cnl_code=row['code'],source_cnl_name=row['label'],esco_uri=uri,relation=relation,page=page))
        for line in lines[lines.index(header)+1:]:
            if 'CompetentNL' in line or not line.strip():
                continue
            match=re.match(r'^\s*(\d{12})\s',line)
            if match:
                flush(current)
                current=dict(code=match[1],label='',closeMatch='',broadMatch='')
            if current:
                if 'Label' in header and 'RIASEC' in header:
                    fragment=line[max(0,header.index('Label')-16):header.index('RIASEC')-2].strip()
                    current['label'] += (' ' if current['label'] and fragment else '') + fragment
                current['closeMatch']+=line[close:broad].strip()
                current['broadMatch']+=line[broad:other].strip()
        flush(current)
    return records


def audit(root=ROOT):
    from pypdf import PdfReader
    root=Path(root);source=root/SOURCE_REL
    pages=PdfReader(source).pages
    records=parse_pages([(i+1,pages[i].extract_text(extraction_mode='layout')) for i in range(19,26)])
    features={}
    for r in read_rows(root/'data/raw/competentnl/beroepen_vaardigheden.csv',('item_code','item_uri','item_naam')):
        code=re.sub(r'\D','',r['item_code'])
        features.setdefault(code,{})[r['item_uri']]=r['item_naam']
    _,skills=read_table(root/SOURCE_FOLDER/'skills_nl.csv')
    known={r['conceptUri']:r['preferredLabel'] for r in skills}
    expanded=[]
    for r in records:
        for uri,label in features.get(r['cnl_code'],{}).items():
            expanded.append(dict(r,cnl_uri=uri,cnl_name=label,esco_name=known.get(r['esco_uri'],''),source_name_matches=label.casefold().strip()==r['source_cnl_name'].casefold().strip(),esco_status='gevonden' if r['esco_uri'] in known else 'ontbreekt in ESCO 1.2.1-export',source_url=SOURCE_URL))
    target=root/'data/mappings/competentnl_esco_vaardigheden_tno.csv'
    fields=['cnl_code','source_cnl_name','cnl_uri','cnl_name','source_name_matches','esco_uri','esco_name','relation','page','esco_status','source_url']
    with target.open('w',newline='',encoding='utf-8-sig') as stream:
        w=csv.DictWriter(stream,fieldnames=fields,delimiter=';');w.writeheader();w.writerows(expanded)
    report=dict(source_url=SOURCE_URL,source_file=SOURCE_REL,source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
        source_version='CompetentNL knowledge graph versie 1 – september 2025',esco_checked_version='1.2.1',
        extracted_relations=len(records),relations_linked_by_numeric_code=len(expanded),
        distinct_cnl_skills=len({r['cnl_uri'] for r in expanded}),
        unmatched_codes=sorted({r['cnl_code'] for r in records}-set(features)),
        close_matches=sum(r['relation']=='closeMatch' for r in expanded),
        broad_matches=sum(r['relation']=='broadMatch' for r in expanded),
        esco_uris_not_in_export=sorted({r['esco_uri'] for r in records if r['esco_uri'] not in known}),
        audit_only=True,note='Aanvullende bronmapping, geen exactMatch en geen opleidings-beroeprelatie. PDF-kolommen gecontroleerd; codes gekoppeld na verwijderen van punten. Eerst richting, labels en bronversie beoordelen voordat deze als scorebewijs wordt gebruikt.')
    (root/'data/processed/controles').mkdir(parents=True,exist_ok=True)
    (root/'data/processed/controles/competentnl_esco_mapping_audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    return report


if __name__=='__main__':
    print(json.dumps(audit(),ensure_ascii=False,indent=2))


def bind_skill_bridge(root, features, esco_skills):
    """Activeer alleen broncodes én labels die bij beide lokale versies passen."""
    root=Path(root)
    mapping=root/'data/mappings/competentnl_esco_vaardigheden_tno.csv'
    if not mapping.exists():
        return dict(available=False,enabled=False,valid_relations=0,rejected=[])
    from .opleiding_beroep import name_key
    links={};rejected=[]
    for r in read_rows(mapping,('cnl_code','source_cnl_name','cnl_uri','cnl_name','esco_uri','relation','page','source_url')):
        feature=features.get(r['cnl_uri'])
        reason=None
        if not feature or feature['kind']!='skills':
            reason='CompetentNL-vaardigheid ontbreekt'
        elif r['esco_uri'] not in esco_skills:
            reason='ESCO-URI ontbreekt in gebruikte versie'
        elif re.sub(r'\D','',feature.get('code','')) != r['cnl_code']:
            reason='CompetentNL-code verschilt'
        elif name_key(feature['name']) != name_key(r['source_cnl_name']):
            reason='Bronlabel verschilt van lokaal label; controle nodig'
        elif r['relation'] not in ('broadMatch','closeMatch'):
            reason='Niet ondersteund mappingtype'
        if reason:
            rejected.append(dict(cnl_uri=r['cnl_uri'],esco_uri=r['esco_uri'],reason=reason));continue
        key=(r['cnl_uri'],r['esco_uri'])
        if key in links and links[key]['relation']!=r['relation']:
            raise ValueError('Conflicterende bronmapping voor dezelfde competenties')
        links[key]=dict(uri=r['esco_uri'],name=esco_skills[r['esco_uri']]['preferredLabel'],
            relation=r['relation'],direction='cnl_to_esco',source_url=r['source_url'],source_page=int(r['page']),source_cnl_name=r['source_cnl_name'])
    for (uri,_),link in links.items():
        features[uri].setdefault('esco_mappings',[]).append(link)
    return dict(available=True,enabled=True,valid_relations=len(links),rejected=rejected,
        source_url=SOURCE_URL,note='Bronmapping van vaardigheden; broadMatch is richtinggevoelig en geen exactMatch. Niet doorgerold naar specifiekere vaardigheden of beroepen.')
