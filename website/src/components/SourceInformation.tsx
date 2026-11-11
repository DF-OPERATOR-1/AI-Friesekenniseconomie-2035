import type { ReactNode } from 'react';

export function SourceInformation({
  file,
  contents,
  organization,
  processing,
  year,
  classification,
  license,
  references,
  note,
  limitations,
}: {
  file: ReactNode;
  contents: string[];
  organization?: ReactNode;
  processing: ReactNode;
  year: ReactNode;
  classification: ReactNode;
  license: ReactNode;
  references: ReactNode;
  note?: ReactNode;
  limitations?: ReactNode;
}) {
  return (
    <details className="source-details">
      <summary>Broninformatie</summary>
      <dl>
        <dt>Bestand</dt>
        <dd>{file}</dd>
        <dt>Wat staat in dit bestand?</dt>
        <dd>
          {contents.length === 1 ? (
            contents[0]
          ) : (
            <ul>
              {contents.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </dd>
        {organization && (
          <>
            <dt>Bronorganisatie</dt>
            <dd>{organization}</dd>
          </>
        )}
        <dt>Bewerking en berekening</dt>
        <dd>{processing}</dd>
        <dt>Publicatiejaar</dt>
        <dd>{year}</dd>
        <dt>Classificatie</dt>
        <dd>{classification}</dd>
        {limitations && (
          <>
            <dt>Afbakening en telbeperkingen</dt>
            <dd className="source-limitations">{limitations}</dd>
          </>
        )}
        <dt>Licentie</dt>
        <dd>{license}</dd>
      </dl>
      <div className="source-literature">
        <h4>Literatuurlijst</h4>
        {references}
      </div>
      {note && <p className="reference-note">{note}</p>}
    </details>
  );
}
