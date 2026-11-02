import type { ReactNode } from 'react';

type ReferenceTopic =
  | 'exposure'
  | 'complementarity'
  | 'classification'
  | 'education'
  | 'labour'
  | 'validation';

const educationFiles = [
  {
    title: 'Afgestudeerden hbo',
    years: '2020–2024',
    file: '05.-gediplomeerden-hbo-2024.csv',
  },
  {
    title: 'Afgestudeerden mbo',
    years: '2021–2025',
    file: 'gediplomeerden-per-instelling-plaats-sectorkamer-type-mbo-opleiding-niveau-geslacht-instromende-studenten-2021-2025.csv',
  },
  {
    title: 'Afgestudeerden wo',
    years: '2020–2024',
    file: '05.-gediplomeerden-wo-2025.csv',
  },
  {
    title: 'Studenten hbo',
    years: '2021–2025',
    file: '01a.-ingeschrevenen-hbo-2025.csv',
  },
  {
    title: 'Studenten mbo',
    years: '2021–2025',
    file: '03.-studenten-per-instelling-plaats-sectorkamer-type-mbo-opleiding-niveau-geslacht-2021-2025.csv',
  },
  {
    title: 'Studenten wo',
    years: '2021–2025',
    file: '01b.-ingeschrevenen-wo-domein-wo-2025.csv',
  },
];

const references: Record<ReferenceTopic, ReactNode> = {
  exposure: (
    <>
      <li>
        Felten, E., Raj, M., &amp; Seamans, R. (2021). Occupational, industry, and
        geographic exposure to artificial intelligence: A novel dataset and its
        potential uses. <em>Strategic Management Journal, 42</em>(12), 2195–2217.{' '}
        <a href="https://doi.org/10.1002/smj.3286">https://doi.org/10.1002/smj.3286</a>.{' '}
        <a href="https://github.com/AIOE-Data/AIOE/blob/main/AIOE_DataAppendix.xlsx">
          Bijbehorend bestand: AIOE Data Appendix (Excel)
        </a>
        .
      </li>
      <li>
        Felten, E. W., Raj, M., &amp; Seamans, R. (2023a).{' '}
        <em>
          How will language modelers like ChatGPT affect occupations and industries?
        </em>{' '}
        [Working paper, 18 maart 2023]. SSRN.{' '}
        <a href="https://doi.org/10.2139/ssrn.4375268">
          https://doi.org/10.2139/ssrn.4375268
        </a>
        .{' '}
        <a href="https://github.com/AIOE-Data/AIOE/blob/main/Language%20Modeling%20AIOE%20and%20AIIE.xlsx">
          Bijbehorend bestand: Language Modeling AIOE and AIIE (Excel)
        </a>
        .
      </li>
      <li>
        Felten, E. W., Raj, M., &amp; Seamans, R. (2023b).{' '}
        <em>Occupational heterogeneity in exposure to generative AI</em> [Working
        paper]. SSRN.{' '}
        <a href="https://doi.org/10.2139/ssrn.4414065">
          https://doi.org/10.2139/ssrn.4414065
        </a>
        .{' '}
        <a href="https://github.com/AIOE-Data/AIOE/blob/main/Image%20Generation%20AIOE%20and%20AIIE.xlsx">
          Bijbehorend bestand: Image Generation AIOE and AIIE (Excel)
        </a>
        .
      </li>
    </>
  ),
  complementarity: (
    <>
      <li>
        Pizzinelli, C., Panton, A., Tavares, M. M., Cazzaniga, M., &amp; Li, L. (2023).{' '}
        <em>
          Labor market exposure to AI: Cross-country differences and distributional
          implications
        </em>{' '}
        (IMF Working Paper No. 23/216). International Monetary Fund.{' '}
        <a href="https://doi.org/10.5089/9798400254802.001">
          https://doi.org/10.5089/9798400254802.001
        </a>
      </li>
      <li>
        U.S. Department of Labor, Employment and Training Administration. (2020).{' '}
        <em>O*NET database</em> (Version 24.3) [Dataset].{' '}
        <a href="https://www.onetcenter.org/dl_files/database/db_24_3_text.zip">
          https://www.onetcenter.org/dl_files/database/db_24_3_text.zip
        </a>{' '}
        (oorspronkelijke download).{' '}
        <a href="https://www.onetcenter.org/db_releases.html">
          Officieel releasearchief
        </a>
        .
      </li>
      <li>
        National Center for O*NET Development. (z.d.).{' '}
        <em>Scales, ratings, and standardized scores</em>.{' '}
        <a href="https://www.onetonline.org/help/online/scales#score">
          Oorspronkelijke uitleg over schaalomzettingen
        </a>
        .
      </li>
    </>
  ),
  classification: (
    <>
      <li>
        Bureau of Labor Statistics. (2015).{' '}
        <em>
          Crosswalk between the International Standard Classification of Occupations
          (ISCO-08) and the 2010 Standard Occupational Classification (SOC)
        </em>{' '}
        [Koppeltabel; oorspronkelijke versie augustus 2012, bijgewerkt juni 2015].{' '}
        <a href="https://www.bls.gov/soc/ISCO_SOC_Crosswalk.xls">
          Oorspronkelijke BLS-koppeltabel (Excel)
        </a>
        .
      </li>
      <li>
        Centraal Bureau voor de Statistiek. (z.d.). <em>Codelijsten ISCO-08</em>{' '}
        [Dataset].{' '}
        <a href="https://www.cbs.nl/-/media/imported/onze-diensten/methoden/classificaties/documents/2012/04/codelijsten-isco-08.xls?sc_lang=nl-nl">
          Oorspronkelijk CBS-bestand: codelijsten-isco-08.xls
        </a>
        .{' '}
        <a href="https://www.cbs.nl/nl-nl/onze-diensten/methoden/classificaties/onderwijs-en-beroepen/beroepenclassificatie--isco-en-sbc--/international-standard-classification-of-occupations--isco--/codelijsten-isco-08">
          Bijbehorende CBS-bronpagina
        </a>
        .
      </li>
      <li>
        International Labour Organization. (z.d.).{' '}
        <em>International Standard Classification of Occupations (ISCO-08)</em>{' '}
        [Beroepsindeling].{' '}
        <a href="https://isco.ilo.org/en/isco-08/">Oorspronkelijke ISCO-08-indeling</a>.
      </li>
      <li>
        National Center for O*NET Development. (z.d.).{' '}
        <em>O*NET-SOC 2010 taxonomy: Appendix A</em> [Dataset].{' '}
        <a href="https://www.onetcenter.org/dl_files/Taxonomy2010_AppA.xls">
          Oorspronkelijke taxonomietabel (Excel)
        </a>
        .
      </li>
    </>
  ),
  education: (
    <>
      {educationFiles.map(({ title, years, file }) => (
        <li key={file}>
          Dienst Uitvoering Onderwijs. (z.d.).{' '}
          <em>
            {title}, {years}
          </em>{' '}
          [CSV-databestand].{' '}
          <a href={`https://duo.nl/open_onderwijsdata/images/${file}`}>{file}</a>.
        </li>
      ))}
      <li>
        Dienst Uitvoering Onderwijs. (z.d.). <em>Adressen mbo-instellingen</em>{' '}
        [CSV-databestand].{' '}
        <a href="https://duo.nl/open_onderwijsdata/images/01.-adressen-mbo-instellingen.csv">
          01.-adressen-mbo-instellingen.csv
        </a>
        .
      </li>
      <li>
        Dienst Uitvoering Onderwijs. (z.d.).{' '}
        <em>Mbo-studenten per onderwijslocatie en onderwijsaanbieder</em>.{' '}
        <a href="https://duo.nl/open_onderwijsdata/middelbaar-beroepsonderwijs/aantal-studenten/studenten-mbo-rio.jsp">
          Bronbestanden voor de geografische afbakening
        </a>
        .
      </li>
      <li>
        Dienst Uitvoering Onderwijs. (z.d.). <em>Statistische beveiliging</em>.{' '}
        <a href="https://duo.nl/open_onderwijsdata/statistische-beveiliging.jsp">
          Toelichting op afgeschermde aantallen
        </a>
        .
      </li>
    </>
  ),
  labour: (
    <li>
      UWV. (2026). <em>Vacaturemarkt - Data Fryslan</em> [Aangeleverde Excelwerkmap,
      ontvangen in 2026].
    </li>
  ),
  validation: (
    <li>
      Williamson, H., Coates, D., Daly, K., FitzGerald, K., &amp; Gannon, N. (2025).
      Occupational exposures, complementarity and the potential consequences of A.I. for
      the labour market: Some evidence from Ireland.{' '}
      <em>Journal for Labour Market Research, 59</em>, Artikel 30.{' '}
      <a href="https://doi.org/10.1186/s12651-025-00418-w">
        https://doi.org/10.1186/s12651-025-00418-w
      </a>
      .
    </li>
  ),
};

export function References({ topic }: { topic: ReferenceTopic }) {
  return (
    <aside className="methodology-references" aria-labelledby={`references-${topic}`}>
      <h3 id={`references-${topic}`}>Literatuurlijst</h3>
      <ul className="reference-list">{references[topic]}</ul>
    </aside>
  );
}
