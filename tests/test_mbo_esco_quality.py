import json
from pathlib import Path
import tempfile
import unittest
import csv
from research.pipeline.imports.mbo_esco_quality import checks,decide,content_text,fallback_jobs,regression_metrics

CONFIG=json.loads(Path('research/pipeline/config/mbo_esco_quality.json').read_text())

def course(name,body,sector=''):
    return dict(name=name,description=body,context=dict(level=4,sector=sector))

def job(name,body):
    return dict(name=name,description=body,isco_level=2)

class QualityTests(unittest.TestCase):
    def test_supervisory_word_does_not_validate_wrong_domain(self):
        c=course('Logistiek supervisor','Stuurt logistieke processen aan en organiseert het magazijn.','Logistiek')
        r=checks(c,job('rigging supervisor','Ziet toe op takeloperaties en organiseert werknemers met hijs- en hefgereedschap.'),CONFIG)
        self.assertTrue(r['conflicts'])
        self.assertEqual(decide(.99,r,dict(tasks=.99),CONFIG),'onzeker')
        self.assertFalse(checks(c,job('manager logistiek','Organiseert de opslag en distributie van goederen in de logistiek.'),CONFIG)['conflicts'])

    def test_kitchen_context_is_not_same_as_installation_work(self):
        c=course('Allround keukenmonteur','Monteert kasten, leest bouwtekeningen en installeert werkbladen en apparatuur.')
        r=checks(c,job('medewerker keuken','Wast potten, pannen, keukengerei en bestek af en bereidt maaltijden.'),CONFIG)
        self.assertTrue(r['conflicts'])
        self.assertFalse(checks(c,job('keukenmonteur','Monteert en installeert kasten en werkbladen volgens bouwtekeningen.'),CONFIG)['conflicts'])

    def test_veterinary_reception_is_secondary_to_clinical_role(self):
        c=course('Dierenartsassistent paraveterinair','Assisteert de dierenarts bij consulten en operaties, voert gebitsreiniging en laboratoriumwerk uit.')
        receptionist=job('dierenartsassistent','Zorgt voor de receptie en administratieve ondersteuning, ontvangt klanten en plant afspraken.')
        clinical=job('veterinair technicus','Verleent dierenartsen technische en administratieve ondersteuning.')
        self.assertTrue(checks(c,receptionist,CONFIG)['conflicts'])
        self.assertFalse(checks(c,clinical,CONFIG)['conflicts'])

    def test_design_role_is_not_proven_by_manual_construction(self):
        c=course('Middenkaderfunctionaris GWW','Werkt een ontwerp uit, maakt bestektekeningen en een raming en bereidt de aanbesteding voor.','Bouwkunde')
        manual=job('vakman grond-, weg- en waterbouw','Verricht schoonvegen en voorbereiden van bouwplaatsen voor civieltechnische werken.')
        technical=job('technicus civiele bouwkunde','Helpt bij het ontwerpen van bouwplannen en maakt technische tekeningen en berekent de materiaalbehoeften.')
        self.assertTrue(checks(c,manual,CONFIG)['conflicts'])
        self.assertFalse(checks(c,technical,CONFIG)['conflicts'])

    def test_doctor_qualifications_not_inferred_from_assistant(self):
        c=course('Dierenartsassistent paraveterinair','Assisteert bij medische zorg voor dieren.')
        self.assertTrue(checks(c,job('algemeen dierenarts','Onderzoekt en behandelt dieren.'),CONFIG)['qualification_review'])
        self.assertFalse(checks(course('Tandartsassistent','Ondersteunt bij behandelingen.'),job('tandartsassistent','Ondersteunt een tandarts.'),CONFIG)['qualification_review'])

    def test_nursing_grade_numbers_are_not_used_as_scale_conversion(self):
        c=course('Mbo-Verpleegkundige','Verpleegt mensen, stelt het verpleegplan op en verricht verpleegtechnische handelingen.')
        o=job('Verpleegkundige','Verpleegt mensen en coördineert de patiëntenzorg.');o['isco_level']=4
        r=checks(c,o,CONFIG)
        self.assertFalse(r['conflicts'])
        self.assertEqual(decide(.7,r,dict(tasks=.7),CONFIG),'verwant beroep')

    def test_unknown_predictions_are_not_false_negatives_or_positives(self):
        cases=[dict(code='a',positive_isco=['3221'],negative_isco=['5321'])]
        result=dict(courses=[dict(code='a',candidates=[dict(isco='3221',classification='verwant beroep'),dict(isco='9999',classification='verwant beroep')])])
        m=regression_metrics(cases,result)
        self.assertEqual((m['tp'],m['fp'],m['fn']),(1,0,0))
        self.assertEqual(m['recall_at_10'],1.)
        missing=dict(courses=[dict(code='a',candidates=[dict(isco='5321',classification='verwant beroep')])])
        m=regression_metrics(cases,missing)
        self.assertEqual((m['tp'],m['fp'],m['fn']),(0,1,1))

    def test_official_cnl_fallback_does_not_recode_esco(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);folder=root/'data/raw/competentnl';folder.mkdir(parents=True)
            def write(name,rows):
                with (folder/name).open('w',newline='') as stream:
                    w=csv.DictWriter(stream,fieldnames=rows[0],delimiter=';');w.writeheader();w.writerows(rows)
            write('beroepen_isco.csv',[dict(uri='cnl:nurse',naam='Verpleegkundige',definitie='Verpleegt mensen.',isco_code='3221',isco_naam='Verpleegkundigen middelbaar')])
            for name in ['beroepen_taken.csv','beroepen_vaardigheden.csv','beroepen_kennisgebieden.csv']:
                write(name,[dict(uri='cnl:nurse',item_uri='',item_naam='',item_definitie='',belang='')])
            result=fallback_jobs(root,[dict(isco='2221')])
            self.assertEqual(result[0]['isco'],'3221')
            self.assertEqual(result[0]['source'],'CompetentNL')
            self.assertNotIn('esco_uri',result[0])
            self.assertEqual(result[0]['tasks'],[])

    def test_bachelor_role_is_not_automatically_validated_for_mbo_nursing(self):
        c=course('Mbo-Verpleegkundige','Stelt zorgplannen op en verricht verpleegtechnische handelingen.')
        r=checks(c,job('Bachelor Medisch Hulpverlener','Verleent medische hulp.'),CONFIG)
        self.assertTrue(any(q['type']=='education_requirement' for q in r['qualification_review']))
        self.assertEqual(decide(.95,r,dict(tasks=.95),CONFIG),'onzeker')

    def test_absence_of_a_keyword_is_not_proof_of_missing_work(self):
        from research.pipeline.imports.mbo_esco_quality import work_score
        import numpy as np
        c=course('Vakman','Verricht beschreven werkzaamheden op een veilige manier.')
        o=job('Beroep','Voert vergelijkbare werkzaamheden uit op de werkplek.')
        vectors={c['description']:np.array([1.,0.]),o['description']:np.array([.8,.6])}
        value,_=work_score(c,o,vectors,dict(activity_coverage=0))
        self.assertAlmostEqual(value,.8)

    def test_generic_role_words_do_not_dominate_lexical_name_search(self):
        text=content_text('Mbo allround supervisor medewerker technicus logistiek')
        self.assertEqual(text,'logistiek')
