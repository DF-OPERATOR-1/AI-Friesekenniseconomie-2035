import { Children, Fragment, isValidElement, type ReactNode } from 'react';

export type ReferenceTopic =
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
        <a href="https://doi.org/10.1002/smj.3286">https://doi.org/10.1002/smj.3286</a>
        <p className="reference-note">
          <a href="https://github.com/AIOE-Data/AIOE/blob/main/AIOE_DataAppendix.xlsx">
            Bijbehorend bestand: AIOE Data Appendix (Excel)
          </a>
        </p>
      </li>
      <li>
        Felten, E. W., Raj, M., &amp; Seamans, R. (2023a).{' '}
        <em>
          How will language modelers like ChatGPT affect occupations and industries?
        </em>{' '}
        [Working paper]. SSRN.{' '}
        <a href="https://doi.org/10.2139/ssrn.4375268">
          https://doi.org/10.2139/ssrn.4375268
        </a>
        <p className="reference-note">
          <a href="https://github.com/AIOE-Data/AIOE/blob/main/Language%20Modeling%20AIOE%20and%20AIIE.xlsx">
            Bijbehorend bestand: Language Modeling AIOE and AIIE (Excel)
          </a>
        </p>
      </li>
      <li>
        Felten, E. W., Raj, M., &amp; Seamans, R. (2023b).{' '}
        <em>Occupational heterogeneity in exposure to generative AI</em> [Working
        paper]. SSRN.{' '}
        <a href="https://doi.org/10.2139/ssrn.4414065">
          https://doi.org/10.2139/ssrn.4414065
        </a>
        <p className="reference-note">
          <a href="https://github.com/AIOE-Data/AIOE/blob/main/Image%20Generation%20AIOE%20and%20AIIE.xlsx">
            Bijbehorend bestand: Image Generation AIOE and AIIE (Excel)
          </a>
        </p>
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
        KiesMBO. (z.d.). <em>Opleidingsaanbod per schoollocatie</em>. Handmatige
        inventarisatie door de gebruiker, gestructureerd door DataFryslân en vastgelegd
        op 9 november 2026. Het geldige schooljaar van de waarneming is niet
        vastgesteld.
        <ul>
          <li>
            <a href="https://www.kiesmbo.nl/scholen/aeres-mbo/aeres-mbo-buitenpost">
              Aeres MBO Buitenpost
            </a>
          </li>
          <li>
            <a href="https://www.kiesmbo.nl/scholen/aeres-mbo/aeres-mbo-heerenveen">
              Aeres MBO Heerenveen
            </a>
          </li>
          <li>
            <a href="https://www.kiesmbo.nl/scholen/aeres-mbo/aeres-mbo-leeuwarden">
              Aeres MBO Leeuwarden
            </a>
          </li>
          <li>
            <a href="https://www.kiesmbo.nl/scholen/aeres-mbo/aeres-mbo-sneek">
              Aeres MBO Sneek
            </a>
          </li>
          <li>
            <a href="https://www.kiesmbo.nl/scholen/roc-nova-college/nova-scheepvaart-harlingen">
              Nova Scheepvaart Harlingen
            </a>
          </li>
          <li>
            <a href="https://www.kiesmbo.nl/scholen/svo-vakopleider-food/jansoniusstraat-2a-leeuwarden">
              SVO Leeuwarden
            </a>
          </li>
        </ul>
      </li>
      <li>
        Firda. (z.d.). <a href="https://www.firda.nl/locaties">Locaties van Firda</a>.
        Firda is volledig behouden; de cijfers omvatten ook Emmeloord en Urk.
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
    </li>
  ),
};

export function scientificSource(
  file: string,
): { authors: string[]; topics: ReferenceTopic[]; processing: string } | null {
  const felten = [
    'Felten, E., Raj, M., & Seamans, R. (2021).',
    'Felten, E. W., Raj, M., & Seamans, R. (2023a).',
    'Felten, E. W., Raj, M., & Seamans, R. (2023b).',
  ];
  const pizzinelli = [
    'Pizzinelli, C., Panton, A., Tavares, M. M., Cazzaniga, M., & Li, L. (2023).',
  ];
  if (file === 'ISCO08_AIOE.csv')
    return {
      authors: felten,
      topics: ['exposure'],
      processing: 'DataFryslân koppelde de oorspronkelijke beroepsscores aan ISCO-08.',
    };
  if (file === 'ISCO08_Complementary.csv')
    return {
      authors: pizzinelli,
      topics: ['complementarity'],
      processing:
        'DataFryslân berekende de complementariteit volgens Pizzinelli et al. (2023), met O*NET 24.3, en koppelde de uitkomsten aan ISCO-08.',
    };
  if (file === 'ISCO08_C_AIOE.csv')
    return {
      authors: [...felten, ...pizzinelli],
      topics: ['exposure', 'complementarity'],
      processing:
        'DataFryslân combineerde de oorspronkelijke AI-blootstelling met de zelf berekende complementariteit volgens Pizzinelli et al. (2023), met O*NET 24.3, en koppelde de uitkomsten aan ISCO-08.',
    };
  return null;
}
function referenceItems(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
      ? referenceItems(child.props.children)
      : [child],
  );
}
function referenceText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? referenceText(child.props.children)
        : String(child),
    )
    .join('');
}
export function ReferenceList({ topics }: { topics: ReferenceTopic[] }) {
  const items = topics
    .flatMap((topic) => referenceItems(references[topic]))
    .sort((a, b) => {
      // The publisher uses E. in 2021 and SSRN uses E. W. for the same author.
      // Normalize only the sort key so this author's works remain chronological.
      const key = (node: ReactNode) =>
        referenceText(node).replace(/^Felten, E\.,/, 'Felten, E. W.,');
      return key(a).localeCompare(key(b), 'nl');
    });
  return (
    <ul className="reference-list">
      {items.map((item, index) => (
        <Fragment key={index}>{item}</Fragment>
      ))}
    </ul>
  );
}
export function References({ topic }: { topic: ReferenceTopic }) {
  return (
    <aside className="methodology-references" aria-labelledby={`references-${topic}`}>
      <h3 id={`references-${topic}`}>Literatuurlijst</h3>
      <ReferenceList topics={[topic]} />
    </aside>
  );
}
