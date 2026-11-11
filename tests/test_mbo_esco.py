import json
from pathlib import Path
import unittest
import numpy as np
from research.pipeline.imports.mbo_esco import combine, classify, aggregate_isco, competence_coverage, evaluate, evaluate_models

CONFIG = json.loads(Path('research/pipeline/config/mbo_esco.json').read_text())

class MboEscoTests(unittest.TestCase):
    def test_missing_tasks_do_not_mean_mismatch(self):
        score, weights, share = combine(dict(tasks=None,skills=.8,description=.8,knowledge=.8,name=.8), CONFIG['weights'])
        self.assertAlmostEqual(score,.8)
        self.assertNotIn('tasks',weights)
        self.assertAlmostEqual(share,.65)

    def test_all_fields_missing_abstains(self):
        self.assertIsNone(combine({}, CONFIG['weights'])[0])
        self.assertEqual(classify(None,CONFIG['thresholds']),'geen match')

    def test_high_score_without_role_or_level_evidence_needs_review(self):
        self.assertEqual(classify(.95,CONFIG['thresholds'],False,True,.9),'onzeker')
        self.assertEqual(classify(.95,CONFIG['thresholds'],True,False,.9),'onzeker')
        self.assertNotEqual(classify(.95,CONFIG['thresholds'],True,None,.9),'directe beroepsmatch')

    def test_more_weak_occupations_cannot_increase_isco_score(self):
        candidates=[dict(uri='a',isco='8322',isco_name='Chauffeurs',score=.8),
                    dict(uri='b',isco='8322',isco_name='Chauffeurs',score=.4)]
        result=aggregate_isco(candidates+candidates)
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]['score'],.8)
        self.assertEqual(result[0]['occupations'],['a','b'])

    def feature(self,uri,name,reuse='occupation-specific'):
        return dict(uri=uri,name=name,description='',importance='essential',reuse_level=reuse)

    def test_coverage_is_directional_and_missing_is_not_zero(self):
        c=[self.feature('c','rijden')]
        o=[self.feature('o1','besturen'),self.feature('o2','lassen')]
        v={'rijden':np.array([1.,0.]),'besturen':np.array([1.,0.]),'lassen':np.array([0.,1.])}
        r=competence_coverage(c,o,v,{},10,CONFIG)
        self.assertEqual(r['course_to_occupation'],1)
        self.assertEqual(r['occupation_to_course'],.5)
        self.assertEqual(r['not_demonstrated'][0]['name'],'lassen')
        self.assertIsNone(competence_coverage([],o,v,{},10,CONFIG)['occupation_to_course'])

    def test_only_generic_skills_do_not_produce_strong_component(self):
        c=[self.feature('c','samenwerken')];o=[self.feature('o','teamwerk','transversal')]
        v={'samenwerken':np.array([1.,0.]),'teamwerk':np.array([1.,0.])}
        result=competence_coverage(c,o,v,{},10,CONFIG)
        self.assertEqual(result['occupation_to_course'],1.)
        self.assertAlmostEqual(result['weighted_score'],.1)

    def test_official_identifier_takes_priority_over_semantic_neighbour(self):
        c=[self.feature('https://id/x','zelfde'),self.feature('c2','ander')]
        o=[self.feature('http://id/x','vereist')]
        v={'zelfde':np.array([0.,1.]),'ander':np.array([1.,0.]),'vereist':np.array([1.,0.])}
        result=competence_coverage(c,o,v,{},10,CONFIG)
        self.assertEqual(result['evidence'][0]['method'],'official_identifier')
        self.assertEqual(result['evidence'][0]['course_uri'],'https://id/x')

    def test_no_claim_from_assistant_or_incomplete_labels(self):
        for labels in [[],[dict(code='c',complete=False,reviewer_type='human')],
                        [dict(code='c',complete=True,reviewer_type='assistant')]]:
            self.assertIsNone(evaluate({},labels)['f1'])

    def test_multiple_valid_occupations_and_negative_only_reference(self):
        rankings={'c':dict(ranked=['a','b','x'],selected=['a','x']), 'd':dict(ranked=['x'],selected=['x'])}
        labels=[dict(code='c',complete=True,reviewer_type='human',positive_esco_uris=['a','b']),
                dict(code='d',complete=True,reviewer_type='human',positive_esco_uris=[])]
        r=evaluate(rankings,labels,k=2)
        self.assertEqual(r['evaluated_courses'],2)
        self.assertAlmostEqual(r['precision'],1/3)
        self.assertEqual(r['recall'],.5)
        self.assertEqual(r['recall_at_10'],1.)

    def test_unknown_or_conflicting_labels_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_models({},[dict(code='c',positive_esco_uris=['invented'])],[],[])

    def test_source_loader_keeps_unresolved_features_and_missing_tasks(self):
        import csv
        import tempfile
        from unittest.mock import patch
        from research.pipeline.imports.mbo_esco import load_data
        from research.pipeline.imports.esco import SOURCE_FOLDER
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            def write(path, rows):
                path.parent.mkdir(parents=True,exist_ok=True)
                with path.open('w',newline='') as handle:
                    writer=csv.DictWriter(handle,fieldnames=rows[0],delimiter=';' if 'competentnl' in str(path) else ',')
                    writer.writeheader();writer.writerows(rows)
            cnl=root/'data/raw/competentnl'
            feature=dict(item_uri='c:skill',item_naam='Rijden',item_definitie='Vervoert personen.')
            write(cnl/'beroepen_vaardigheden.csv',[feature])
            write(cnl/'beroepen_kennisgebieden.csv',[dict(feature,item_uri='c:knowledge')])
            row=dict(opleiding='course:x',code='12345',naam='Chauffeur',definitie='Vervoert personen',beschrijving='',hat_essentieel='c:skill',hat_belangrijk='missing')
            write(cnl/'mbo.csv',[row,dict(row,hat_essentieel='c:knowledge')])
            write(cnl/'beroepen_isco.csv',[dict(uri='occupation:cnl')])
            write(cnl/'beroepen_taken.csv',[dict(uri='occupation:cnl')])
            esco=root/SOURCE_FOLDER
            write(esco/'occupations_nl.csv',[dict(conceptUri='esco:o',iscoGroup='8322',preferredLabel='Taxichauffeur',altLabels='',description='Vervoert personen',regulatedProfessionNote='note')])
            write(esco/'skills_nl.csv',[dict(conceptUri='esco:s',preferredLabel='Rijden',description='Vervoert personen',skillType='skill/competence',reuseLevel='occupation-specific')])
            write(esco/'ISCOGroups_nl.csv',[dict(conceptUri='isco:8322',code='8322',preferredLabel='Chauffeurs')])
            write(esco/'broaderRelationsOccPillar_nl.csv',[dict(conceptUri='esco:o',broaderUri='isco:8322')])
            write(esco/'occupationSkillRelations_nl.csv',[dict(occupationUri='esco:o',skillUri='esco:s',relationType='essential')])
            with patch('research.pipeline.imports.mbo_esco.load_context',return_value=({}, {'8322':2}, {})):
                courses,jobs,meta=load_data(root)
            self.assertEqual(len(courses),1)
            self.assertEqual(courses[0]['unresolved'],['missing'])
            self.assertIsNone(courses[0]['tasks'])
            self.assertIsNone(jobs[0]['tasks'])
            self.assertEqual(jobs[0]['isco'],'8322')
            self.assertEqual(meta['official_cnl_esco_competence_overlap'],0)

            # Exercise the full pipeline with deterministic fake vectors, no model download.
            from research.pipeline.imports.mbo_esco import run
            class FakeEncoder:
                def __init__(self,*args,**kwargs):
                    self.cache_hash='fixture'
                def encode(self,texts):
                    return {t:np.array([1.,0.]) for t in texts if t.strip()}
            baseline=root/'data/processed/opleiding_beroep.csv'
            baseline.parent.mkdir(parents=True)
            baseline.write_text('existing baseline')
            config=root/'config.json'
            config.write_text(json.dumps(dict(CONFIG,top_k=10,role_check=True)))
            with patch('research.pipeline.imports.mbo_esco.load_context',return_value=({}, {'8322':2}, {})), \
                 patch('research.pipeline.imports.mbo_esco.Encoder',FakeEncoder), \
                 patch('research.pipeline.imports.mbo_esco.importlib.metadata.version',return_value='fixture'):
                result=run(root,config,root/'cache',model='fixture',revision='fixture')
            self.assertEqual(len(result['courses']),1)
            candidate=result['courses'][0]['candidates'][0]
            self.assertEqual(candidate['esco_isco_relation'],'official')
            self.assertEqual(candidate['mbo_esco_relation'],'predicted')
            self.assertEqual(candidate['role_factor'],1.)
            self.assertEqual(candidate['validation_status'],'menselijke controle nodig')
            self.assertEqual(baseline.read_text(),'existing baseline')
            # A broken official classification chain must stop the import.
            write(esco/'broaderRelationsOccPillar_nl.csv',[dict(conceptUri='esco:o',broaderUri='isco:other')])
            with patch('research.pipeline.imports.mbo_esco.load_context',return_value=({}, {'8322':2}, {})):
                with self.assertRaises(ValueError):
                    load_data(root)

    def test_export_does_not_force_five_or_drop_sixth_match(self):
        from research.pipeline.imports.mbo_esco import proposed_candidates
        items=[dict(classification='verwant beroep',uri=str(i)) for i in range(7)]
        items.append(dict(classification='onzeker',uri='review'))
        self.assertEqual(len(proposed_candidates(items)),7)
        self.assertEqual(proposed_candidates([items[-1]]),[])

    def test_mapping_pdf_linebreaks_and_relation_columns(self):
        from research.pipeline.imports.cnl_esco_mappings import cell_uris,parse_pages
        uri='http://data.europa.eu/esco/skill/d9013e0e-e937-43d5-ab71-0e917ee882b8'
        self.assertEqual(cell_uris(uri[:44]+'\n'+uri[44:]),[uri])
        with self.assertRaises(ValueError):
            cell_uris('http://data.europa.eu/esco/skill/123')
        header=' '*90+'ESCO Close Match'+' '*40+'ESCO Broad Match'+' '*26+'O*NET Close Match'
        start=header.index('ESCO Broad Match')-18
        line='100001001005'+' '*(start-12)+uri[:41]+'\n'+' '*start+uri[41:]
        records=parse_pages([(20,header+'\n'+line)])
        self.assertEqual(records[0]['relation'],'broadMatch')
        self.assertEqual(records[0]['esco_uri'],uri)

    def test_broad_mapping_is_partial_and_does_not_propagate_to_narrower_skills(self):
        c=[self.feature('cnl:x','opleidingsvaardigheid')]
        c[0]['esco_mappings']=[dict(uri='esco:broad',relation='broadMatch',direction='cnl_to_esco',source_url='source',source_page=20)]
        vectors={'opleidingsvaardigheid':np.array([1.,0.]),'brede vaardigheid':np.array([0.,1.]),'specifieke vaardigheid':np.array([0.,1.])}
        broad=[self.feature('esco:broad','brede vaardigheid')]
        r=competence_coverage(c,broad,vectors,{},10,CONFIG)
        self.assertAlmostEqual(r['occupation_to_course'],.6)
        self.assertTrue(r['mapping_evidence'][0]['partial_support'])
        self.assertEqual(r['evidence'],[])
        narrow=[self.feature('esco:narrow','specifieke vaardigheid')]
        r=competence_coverage(c,narrow,vectors,{},10,CONFIG)
        self.assertEqual(r['occupation_to_course'],0.)
        self.assertEqual(r['mapping_evidence'],[])
        # The inverse link cannot be silently treated as the same relation.
        c[0]['esco_mappings'][0]['direction']='esco_to_cnl'
        self.assertEqual(competence_coverage(c,broad,vectors,{},10,CONFIG)['mapping_evidence'],[])

    def test_bridge_rejects_changed_labels_and_unknown_target(self):
        from research.pipeline.imports.cnl_esco_mappings import bind_skill_bridge
        import tempfile,csv
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);path=root/'data/mappings/competentnl_esco_vaardigheden_tno.csv'
            path.parent.mkdir(parents=True)
            rows=[dict(cnl_code='100001001005',source_cnl_name='Concentreren',cnl_uri='cnl:a',cnl_name='Concentreren',esco_uri='esco:a',relation='broadMatch',page='20',source_url='source'),
                  dict(cnl_code='100001001006',source_cnl_name='Oude naam',cnl_uri='cnl:b',cnl_name='Nieuwe naam',esco_uri='esco:a',relation='broadMatch',page='20',source_url='source'),
                  dict(cnl_code='100001001007',source_cnl_name='Lezen',cnl_uri='cnl:c',cnl_name='Lezen',esco_uri='missing',relation='broadMatch',page='20',source_url='source')]
            with path.open('w',newline='') as f:
                w=csv.DictWriter(f,fieldnames=rows[0],delimiter=';');w.writeheader();w.writerows(rows)
            features={r['cnl_uri']:dict(code=r['cnl_code'],name=r['cnl_name'],kind='skills') for r in rows}
            report=bind_skill_bridge(root,features,{'esco:a':dict(preferredLabel='Concentreren')})
            self.assertEqual(report['valid_relations'],1)
            self.assertEqual(len(report['rejected']),2)
            self.assertEqual(features['cnl:a']['esco_mappings'][0]['relation'],'broadMatch')
            self.assertNotIn('esco_mappings',features['cnl:b'])

    def test_isco_export_keeps_multiple_groups_and_deduplicates_occupations(self):
        from research.pipeline.imports.mbo_esco import isco_proposals
        def candidate(uri,code,score):
            return dict(uri=uri,name=uri,isco=code,isco_name=code,score=score,classification='verwant beroep',esco_isco_relation='official')
        rows=[candidate('taxi','8322',.7),candidate('personenauto','8322',.65),candidate('bus','8331',.68)]
        rows.append(dict(candidate('zwak','1120',.4),classification='onzeker'))
        groups=isco_proposals(rows)
        self.assertEqual([g['isco'] for g in groups],['8322','8331'])
        self.assertEqual(groups[0]['score'],.7)
        self.assertEqual(groups[0]['occupation_names'],['taxi','personenauto'])
        self.assertEqual(isco_proposals([rows[-1]]),[])
        with self.assertRaises(ValueError):
            isco_proposals([dict(rows[0],esco_isco_relation='predicted')])
