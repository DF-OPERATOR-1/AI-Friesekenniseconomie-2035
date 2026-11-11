import { SourceInformation } from './SourceInformation';
import type { ReactNode } from 'react';
const educationReferences = [
  {
    id: 'sbb',
    title: 'SBB',
    description: 'Kwalificatienamen en erkende opleidingscodes',
    content: (
      <>
        Samenwerkingsorganisatie Beroepsonderwijs Bedrijfsleven. (z.d.).{' '}
        <em>Vind erkende opleidingscodes</em>.{' '}
        <a href="https://www.s-bb.nl/onderwijs/erkende-opleidingscode/">
          https://www.s-bb.nl/onderwijs/erkende-opleidingscode/
        </a>
      </>
    ),
    note: (
      <>
        De officiële kwalificatienaam wordt via de opleidingscode gekoppeld; dit is geen
        ISCO-beroepstoewijzing.
      </>
    ),
  },
  {
    id: 'competentnl',
    accessUrl: 'https://www.competentnl.nl/',
    accessLabel: 'Data aanvragen',
    title: 'CompetentNL',
    description: 'Beroepen, opleidingen en competenties',
    content: (
      <>
        CompetentNL. (z.d.). <em>CompetentNL</em>.{' '}
        <a href="https://www.competentnl.nl/">https://www.competentnl.nl/</a>
      </>
    ),
    note: (
      <>
        <a href="https://creativecommons.org/licenses/by/4.0/deed.nl">CC BY 4.0</a>,
        bewerkt. De aanvullende opleidings-/beroepskoppelingen zijn schattingen en
        onderzoeksvoorstellen van DataFryslân, geen officiële opleidingsvereisten of
        gemeten uitstroom.
      </>
    ),
  },
  {
    id: 'esco',
    accessUrl: 'https://esco.ec.europa.eu/en/classification',
    accessLabel: 'Data aanvragen',
    title: 'Europese Commissie',
    description: 'ESCO v1.2.1, Nederlandstalige classificatie',
    content: (
      <>
        Europese Commissie. (z.d.). <em>ESCO</em> (Versie 1.2.1; Nederlandstalige
        classificatie) [Dataset].{' '}
        <a href="https://esco.ec.europa.eu/en/classification">
          https://esco.ec.europa.eu/en/classification
        </a>
      </>
    ),
    note: (
      <>
        Gebruikt voor aanvullende beroepsinhoud en geschatte opleidingskoppelingen. Deze
        dienst maakt gebruik van de ESCO-classificatie van de Europese Commissie.{' '}
        <em>This service uses the ESCO classification of the European Commission.</em>{' '}
        <a href="https://esco.ec.europa.eu/en/about-esco/faq">
          Gebruiksvoorwaarden en bronvermelding van ESCO
        </a>
        . Koppeling en beoordeling: DataFryslân.
      </>
    ),
  },
  {
    id: 'lcsk',
    accessUrl: 'https://lcsk.nl/over-ons/studiekeuzedata-raadplegen/',
    accessLabel: 'Data aanvragen',
    title: 'Landelijk Centrum Studiekeuze',
    description: 'Studiekeuzedatabase, versie 26.6',
    content: (
      <>
        Landelijk Centrum Studiekeuze. (z.d.). <em>Studiekeuzedatabase</em> (Versie
        26.6) [Dataset].{' '}
        <a href="https://lcsk.nl/over-ons/studiekeuzedata-raadplegen/">
          https://lcsk.nl/over-ons/studiekeuzedata-raadplegen/
        </a>
      </>
    ),
    note: (
      <>
        Er is gebruik gemaakt van de data van Landelijk Centrum Studiekeuze.{' '}
        <a href="https://lcsk.nl/over-ons/studiekeuzedata-raadplegen/">
          Landelijk Centrum Studiekeuze
        </a>{' '}
        – Studiekeuzedatabase, versie 26.6. De koppelingen tussen opleidingen en
        ISCO-beroepen zijn door DataFryslân samengesteld.
      </>
    ),
  },
  {
    id: 'cbs',
    accessUrl: 'https://www.cbs.nl/-/media/_excel/2021/27/codelijstenisco08.xls',
    accessLabel: 'Downloadlink',
    title: 'Centraal Bureau voor de Statistiek',
    description: 'Codelijsten ISCO-08',
    content: (
      <>
        Centraal Bureau voor de Statistiek. (z.d.). <em>Codelijsten ISCO-08</em>.{' '}
        <a href="https://www.cbs.nl/nl-nl/onze-diensten/methoden/classificaties/onderwijs-en-beroepen/beroepenclassificatie--isco-en-sbc--/international-standard-classification-of-occupations--isco--/codelijsten-isco-08">
          https://www.cbs.nl/nl-nl/onze-diensten/methoden/classificaties/onderwijs-en-beroepen/beroepenclassificatie--isco-en-sbc--/international-standard-classification-of-occupations--isco--/codelijsten-isco-08
        </a>
      </>
    ),
  },
  {
    id: 'ilo',
    title: 'International Labour Organization',
    description: 'International Standard Classification of Occupations (ISCO)',
    content: (
      <>
        International Labour Organization. (z.d.).{' '}
        <em>International standard classification of occupations (ISCO)</em>. ILOSTAT.{' '}
        <a href="https://ilostat.ilo.org/methods/concepts-and-definitions/classification-occupation/">
          https://ilostat.ilo.org/methods/concepts-and-definitions/classification-occupation/
        </a>
      </>
    ),
  },
].sort((a, b) => a.title.localeCompare(b.title, 'nl'));

export function EducationSourceList() {
  return (
    <ul className="reference-list education-reference-list">
      {educationReferences.map((reference) => (
        <li key={reference.id}>
          <p className="apa-citation">{reference.content}</p>
          {reference.note && <p className="reference-note">{reference.note}</p>}
        </li>
      ))}
    </ul>
  );
}

const sourceMetadata: Record<
  string,
  {
    file: string;
    contents: string[];
    processing: string;
    classification: string;
    license: ReactNode;
  }
> = {
  sbb: {
    file: 'CREBO-koppeltabellen per schooljaar',
    contents: [
      'Erkende opleidingscodes (CREBO).',
      'Officiële SBB-kwalificatienamen en koppelingen per schooljaar.',
    ],
    processing:
      'Koppeling van officiële kwalificatienamen via opleidingscode en schooljaar. Dit is geen ISCO-beroepstoewijzing.',
    classification: 'CREBO en SBB-kwalificaties',
    license: 'Niet vastgesteld',
  },
  competentnl: {
    file: 'CompetentNL (API)',
    contents: [
      'Beroepsomschrijvingen en werkzaamheden.',
      'Taken, vaardigheden en kennisgebieden.',
    ],
    processing: 'Selectie en weergave van beroepsinhoud door DataFryslân; bewerkt.',
    classification: 'CompetentNL; koppeling met ISCO-08',
    license: (
      <>
        <a href="https://creativecommons.org/licenses/by/4.0/deed.nl">CC BY 4.0</a>,
        bewerkt. Gebruikt voor beroepsomschrijvingen, werkzaamheden, taken, vaardigheden
        en kennisgebieden.
      </>
    ),
  },
  esco: {
    file: 'ESCO v1.2.1, Nederlandstalige classificatie',
    contents: [
      'Nederlandstalige beroepsnamen en omschrijvingen.',
      'Vaardigheden en kennisgebieden.',
      'Koppeling met ISCO-08.',
    ],
    processing:
      'Nederlandstalige aanvulling voor beroepsgroepen zonder CompetentNL-profiel, gegroepeerd naar ISCO-08 door DataFryslân. Geen afzonderlijke ESCO-takenlijst.',
    classification: 'ESCO → ISCO-08',
    license: (
      <>
        Hergebruik onder Besluit 2011/833/EU. Deze dienst maakt gebruik van de
        ESCO-classificatie van de Europese Commissie.{' '}
        <em>This service uses the ESCO classification of the European Commission.</em>{' '}
        <a href="https://esco.ec.europa.eu/en/about-esco/faq">
          Gebruiksvoorwaarden en bronvermelding van ESCO
        </a>
        . Selectie en groepering: DataFryslân.
      </>
    ),
  },
  lcsk: {
    file: 'Studiekeuzedatabase, versie 26.6',
    contents: [
      'Landelijke hbo- en wo-opleidingen.',
      'Onderwijsclassificaties voor koppelingen aan ISCO-beroepsgroepen.',
    ],
    processing:
      'De koppelingen tussen opleidingen en ISCO-beroepen zijn door DataFryslân samengesteld via SOI en ISCED.',
    classification: 'SOI, ISCED en ISCO-08',
    license: (
      <>
        Er is gebruik gemaakt van de data van Landelijk Centrum Studiekeuze.{' '}
        <a href="https://lcsk.nl/over-ons/studiekeuzedata-raadplegen/">
          Landelijk Centrum Studiekeuze
        </a>{' '}
        – Studiekeuzedatabase, versie 26.6.
      </>
    ),
  },
  cbs: {
    file: 'codelijsten-isco-08.xls',
    contents: [
      'ISCO-08-codes en beroepsgroepsnamen.',
      'Voorbeeldberoepen per beroepsgroep.',
    ],
    processing:
      'Nederlandse beroepsgroepsnamen en voorbeeldberoepen worden via ISCO-08 gebruikt voor de indeling op de website.',
    classification: 'ISCO-08',
    license: 'Niet vastgesteld',
  },
  ilo: {
    file: 'ISCO-08 (online beroepsindeling)',
    contents: [
      'Internationale beroepscodes en beroepsgroepen.',
      'Hiërarchische structuur van de ISCO-08-indeling.',
    ],
    processing:
      'Bronverantwoording van de internationale beroepsindeling die op de website wordt gebruikt.',
    classification: 'ISCO-08',
    license: 'Niet vastgesteld',
  },
};

function SourceRows({
  ids,
  context,
}: {
  ids: string[];
  context: 'education' | 'content';
}) {
  return (
    <>
      {' '}
      {educationReferences
        .filter((reference) => ids.includes(reference.id))
        .map((reference) => (
          <article className="source-row" key={reference.id}>
            <div className="source-summary">
              <div>
                <h3>{reference.title}</h3>
                <small>{reference.description}</small>
              </div>
              {reference.accessUrl ? (
                <a
                  className="source-download"
                  href={reference.accessUrl}
                  aria-label={`${reference.accessLabel} bij ${reference.title}`}
                >
                  {reference.accessLabel}
                </a>
              ) : (
                <span className="source-pending">Bronverwijzing</span>
              )}
            </div>
            <SourceInformation
              {...sourceMetadata[reference.id]}
              organization={reference.title}
              year={
                reference.id === 'lcsk'
                  ? '2026 (laatste release: oktober 2026)'
                  : 'z.d. (publicatiejaar niet vastgesteld)'
              }
              references={<p className="apa-citation">{reference.content}</p>}
              note={
                ['competentnl', 'esco', 'lcsk'].includes(reference.id)
                  ? undefined
                  : reference.note
              }
            />
          </article>
        ))}
    </>
  );
}
export function OccupationContentSources() {
  return (
    <section className="source-group" id="beroepsinhoud">
      <h2>Beroepsinhoud</h2>
      <SourceRows ids={['cbs', 'competentnl', 'esco', 'ilo']} context="content" />
    </section>
  );
}
export function EducationSources() {
  return (
    <section className="source-group" id="opleidingskoppelingen">
      <h2>Opleidingskoppelingen</h2>
      <SourceRows ids={['sbb', 'lcsk']} context="education" />
    </section>
  );
}
