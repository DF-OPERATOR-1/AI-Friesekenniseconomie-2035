import { SourceInformation } from './SourceInformation';
import { ReferenceList, scientificSource } from './References';
import { EducationSources, OccupationContentSources } from './EducationSources';
import { useEffect, useState } from 'react';

type Dataset = {
  file: string;
  name: string;
  description: string;
  contents?: string[];
  website_use?: string;
  organization: string;
  publication_year: number | null;
  publication_years?: number[];
  citation?: string;
  geography: string;
  classification: string;
  license: string | null;
  limitations: string;
  download: string | null;
  rights_status: string;
  show_rights_status?: boolean;
};
export function sourceGroups(rows: Dataset[]) {
  return [
    {
      title: 'AI-beroepsscores',
      items: rows.filter((row) => row.classification.startsWith('ISCO')),
    },
    {
      title: 'Beroepsinhoud',
      content: true,
      items: rows.filter((row) => row.classification.startsWith('ESCO')),
    },
    {
      title: 'Onderwijs',
      items: rows.filter((row) => row.classification.startsWith('DUO')),
    },
    { title: 'Opleidingskoppelingen', items: [], education: true },
    {
      title: 'Vacatures',
      items: rows.filter((row) => row.classification.startsWith('BRC')),
    },
  ].sort((a, b) => a.title.localeCompare(b.title, 'nl'));
}
export function ResearchDownloads() {
  const [rows, setRows] = useState<Dataset[] | null>(null);
  const [error, setError] = useState(false);
  const [chromeHeight, setChromeHeight] = useState(180);
  useEffect(() => {
    const elements = [
      document.querySelector('.site-header'),
      document.querySelector('footer'),
    ].filter((element): element is Element => Boolean(element));
    const measure = () =>
      setChromeHeight(
        elements.reduce(
          (sum, element) => sum + element.getBoundingClientRect().height,
          0,
        ),
      );
    const observer = new ResizeObserver(measure);
    elements.forEach((element) => observer.observe(element));
    measure();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const match = /^#open-data\/([a-z0-9-]+)$/.exec(window.location.hash);
    if (!match || !rows) return;
    const frame = requestAnimationFrame(() =>
      document
        .getElementById(match[1])
        ?.scrollIntoView({ block: 'start', behavior: 'instant' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [rows]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/atlas/catalogue.json`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setRows)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(true);
      });
    return () => controller.abort();
  }, []);
  return (
    <section
      className="container section sources-page"
      style={{ height: `calc(100dvh - ${chromeHeight}px)` }}
    >
      <div className="sources-intro">
        <p className="eyebrow">Gebruikte data</p>
        <h1>
          Bronnen &<br />
          open data
        </h1>
        <p>
          Bekijk de gegevens en bronnen waarop AI Index Fryslân is gebaseerd.
          Beschikbare bestanden kun je hier downloaden.
        </p>
        <p className="sources-note">
          <strong>Niet alles is te downloaden</strong>
          <br />
          Sommige gegevens zijn alleen op de website te bekijken. Bij iedere bron staat
          duidelijk aangegeven of je deze kunt downloaden.
        </p>
      </div>
      <div
        className="sources-list"
        role="region"
        aria-label="Bronnen per onderwerp"
        tabIndex={0}
      >
        {error && <p role="alert">Broncatalogus kon niet worden geladen.</p>}
        {!rows && !error && <p role="status">Bronnen laden…</p>}
        {sourceGroups(rows ?? []).map((group) =>
          group.education ? (
            <EducationSources key={group.title} />
          ) : group.content ? (
            <OccupationContentSources key={group.title} />
          ) : (
            group.items.length > 0 && (
              <section
                className="source-group"
                key={group.title}
                id={group.title === 'Onderwijs' ? 'onderwijs-duo' : undefined}
              >
                <h2>{group.title}</h2>
                {[...group.items]
                  .sort((a, b) => a.name.localeCompare(b.name, 'nl'))
                  .map((row) => {
                    const publication = scientificSource(row.file);
                    return (
                      <article className="source-row" key={row.file}>
                        <div className="source-summary">
                          <div>
                            <h3>
                              {row.name.charAt(0).toLocaleUpperCase('nl-NL') +
                                row.name.slice(1)}
                            </h3>
                            {row.classification.startsWith('BRC') &&
                              row.description && <p>{row.description}</p>}
                            {row.geography && <small>{row.geography}</small>}
                          </div>
                          {row.download ? (
                            <a
                              className="source-download"
                              href={`${import.meta.env.BASE_URL}${row.download}`}
                              download
                            >
                              CSV
                            </a>
                          ) : (
                            <span className="source-pending">Geen download</span>
                          )}
                        </div>
                        <SourceInformation
                          file={row.file}
                          contents={
                            row.contents?.length ? row.contents : [row.description]
                          }
                          organization={publication ? undefined : row.organization}
                          processing={
                            publication?.processing ??
                            (row.classification.startsWith('DUO')
                              ? /_(hbo|wo)_/.test(row.file)
                                ? 'Gefilterd op Fryslân door DataFryslân.'
                                : 'Selectie en bewerking van DUO-bronregels door DataFryslân.'
                              : row.classification.startsWith('BRC')
                                ? 'Aangeleverde UWV-cijfers volgens BRC Plus; niet gekoppeld aan ISCO-profielen.'
                                : 'Selectie en bewerking door DataFryslân.')
                          }
                          year={
                            row.publication_years?.length
                              ? row.publication_years.join('; ')
                              : (row.publication_year ??
                                'z.d. (publicatiejaar niet vastgesteld)')
                          }
                          classification={row.classification}
                          limitations={
                            row.classification.startsWith('DUO')
                              ? row.limitations
                              : undefined
                          }
                          license={row.license ?? 'Niet vastgesteld'}
                          references={
                            publication ? (
                              <ReferenceList topics={publication.topics} />
                            ) : (
                              <p className="apa-citation">
                                {row.citation ?? row.organization}
                              </p>
                            )
                          }
                          note={
                            row.show_rights_status !== false &&
                            row.rights_status !== 'Goedgekeurd'
                              ? row.rights_status
                              : undefined
                          }
                        />
                      </article>
                    );
                  })}
              </section>
            )
          ),
        )}
      </div>
    </section>
  );
}
