import { useEffect, useState } from 'react';
import { repositoryUrl } from '../content/nl';
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
export function ResearchDownloads() {
  const [rows, setRows] = useState<Dataset[] | null>(null);
  const [error, setError] = useState(false);
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
    <section className="container section sources-page">
      <div className="sources-intro">
        <p className="eyebrow">Open onderzoek</p>
        <h1>Bronnen & open data</h1>
        <p>
          De gegevens achter AI Index Fryslân. Bekijk de beroepsscores en
          onderwijsselecties, of lees de broninformatie per bestand.
        </p>
        <p className="sources-note">
          Download de AI-scores en onderwijsselecties als CSV. Voor UWV is nog geen
          download beschikbaar.
        </p>
        <a className="plain-link" href={repositoryUrl}>
          Repository en bronverantwoording
        </a>
      </div>
      <div className="sources-list">
        {error && <p role="alert">Broncatalogus kon niet worden geladen.</p>}
        {!rows && !error && <p role="status">Bronnen laden…</p>}
        {rows &&
          [
            {
              title: 'AI-beroepsscores',
              items: rows.filter((row) => row.classification.startsWith('ISCO')),
            },
            {
              title: 'Onderwijs · DUO',
              items: rows.filter((row) => row.classification.startsWith('DUO')),
            },
            {
              title: 'Vacatures · UWV',
              items: rows.filter((row) => row.classification.startsWith('BRC')),
            },
          ].map(
            (group) =>
              group.items.length > 0 && (
                <section className="source-group" key={group.title}>
                  <h2>{group.title}</h2>
                  {group.items.map((row) => (
                    <article className="source-row" key={row.file}>
                      <div className="source-summary">
                        <div>
                          <h3>
                            {row.name.charAt(0).toLocaleUpperCase('nl-NL') +
                              row.name.slice(1)}
                          </h3>
                          {row.classification.startsWith('BRC') && row.description && (
                            <p>{row.description}</p>
                          )}
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
                      <details className="source-details">
                        <summary>Broninformatie</summary>
                        <dl>
                          <dt>Bestand</dt>
                          <dd>{row.file}</dd>
                          {row.contents && (
                            <>
                              <dt>Wat staat in dit bestand?</dt>
                              <dd>
                                <ul>
                                  {row.contents.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              </dd>
                            </>
                          )}
                          <dt>Bronorganisatie</dt>
                          <dd>{row.organization}</dd>
                          <dt>Bronvermelding</dt>
                          <dd>{row.citation ?? row.organization}</dd>
                          <dt>Publicatiejaar</dt>
                          <dd>
                            {row.publication_years?.length
                              ? row.publication_years.join('; ')
                              : (row.publication_year ??
                                'z.d. (publicatiejaar niet vastgesteld)')}
                          </dd>
                          <dt>Classificatie</dt>
                          <dd>{row.classification}</dd>
                          <dt>Licentie</dt>
                          <dd>{row.license ?? 'Niet vastgesteld'}</dd>
                        </dl>
                        {row.show_rights_status !== false &&
                          row.rights_status !== 'Goedgekeurd' && (
                            <p>{row.rights_status}</p>
                          )}
                      </details>
                    </article>
                  ))}
                </section>
              ),
          )}
      </div>
    </section>
  );
}
