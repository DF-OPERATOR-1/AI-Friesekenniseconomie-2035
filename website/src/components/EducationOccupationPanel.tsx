import { useEffect, useState } from 'react';
import { loadMatches } from './MboMatches';
import type { MboRelation } from './MboMatches';

let labelsPromise: Promise<Record<string, string>> | undefined;
function occupationLabels() {
  return (labelsPromise ??= fetch(`${import.meta.env.BASE_URL}data/atlas/profiles.json`)
    .then((response) => {
      if (!response.ok) throw Error('Beroepsgroepen niet beschikbaar');
      return response.json();
    })
    .then((rows: { isco_code: string; title: string }[]) =>
      Object.fromEntries(rows.map((row) => [row.isco_code, row.title])),
    )
    .catch((error) => {
      labelsPromise = undefined;
      throw error;
    }));
}
type Relation = { code: string; name: string; kind: string; degree?: string };
export function uniqueEducationOccupations(relations: Relation[], levels?: string[]) {
  const result = new Map<string, Relation>();
  for (const relation of relations) {
    if (
      !/^\d{4}$/.test(relation.code) ||
      (levels && !levels.some((level) => level.toLowerCase() === relation.degree))
    )
      continue;
    if (!result.has(relation.code) || relation.kind === 'DIRECT')
      result.set(relation.code, relation);
  }
  return [...result.values()].sort(
    (a, b) =>
      Number(b.kind === 'DIRECT') - Number(a.kind === 'DIRECT') ||
      a.name.localeCompare(b.name, 'nl'),
  );
}
export function useEducationOccupations(
  type: string,
  code: string,
  occupations: Relation[],
  levels: string[],
) {
  const [relations, setRelations] = useState<MboRelation[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (type !== 'mbo') return;
    let active = true;
    setRelations(null);
    setError(false);
    Promise.all([loadMatches(), occupationLabels()])
      .then(([data, labels]) => {
        if (active)
          setRelations(
            data.relations
              .filter((row: MboRelation) => row.code === code)
              .map((row: MboRelation) => ({
                ...row,
                occupation: labels[row.isco] ?? row.occupation,
              })),
          );
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [type, code]);
  const matches =
    type === 'mbo'
      ? uniqueEducationOccupations(
          (relations ?? []).map((row) => ({
            code: row.isco,
            name: row.occupation,
            kind: 'VOORSTEL',
          })),
        )
      : uniqueEducationOccupations(occupations, levels);
  return {
    matches,
    relations,
    error,
    loading: type === 'mbo' && relations === null && !error,
  };
}
export function EducationOccupationPanel({
  matches,
  loading,
  error,
}: {
  matches: Relation[];
  relations: MboRelation[] | null;
  loading: boolean;
  error: boolean;
  qualifications: { code: string; name: string }[];
}) {
  const [query, setQuery] = useState('');
  const terms = query.toLocaleLowerCase('nl').trim().split(/\s+/).filter(Boolean);
  const found = matches.filter((row) =>
    terms.every((term) => row.name.toLocaleLowerCase('nl').includes(term)),
  );
  return (
    <section className="profile-section education-careers">
      <p className="eyebrow">Beroepsgroepen</p>
      <h2>Aansluitende beroepsgroepen</h2>
      <p className="profile-section-intro">
        Deze beroepsgroepen geven mogelijke beroepsrichtingen aan. Een koppeling
        betekent niet automatisch dat een afgestudeerde voor ieder beroep gekwalificeerd
        is.
      </p>
      {matches.length > 0 && (
        <label className="education-profession-search">
          Zoek een beroepsgroep
          <input
            type="search"
            value={query}
            placeholder="Zoek op beroepsnaam"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </label>
      )}
      {loading && <p role="status">Beroepskoppelingen laden…</p>}
      {error && <p role="alert">De beroepskoppelingen konden niet worden geladen.</p>}
      {!loading && !error && (
        <>
          {matches.length > 0 && (
            <p className="education-result-count" role="status">
              {query
                ? `${found.length} van ${matches.length} beroepsgroepen gevonden`
                : `${matches.length} beroepsgroepen gekoppeld aan deze opleiding`}
            </p>
          )}
          {matches.length > 0 && !found.length && (
            <p>Geen beroepsgroepen gevonden voor deze zoekopdracht.</p>
          )}
          {found.length > 0 && (
            <div
              className="occupation-course-scroll education-career-scroll"
              role="region"
              aria-label="Gekoppelde beroepsgroepen"
              tabIndex={0}
              key={query}
            >
              {['DIRECT', 'KANDIDAAT', 'VOORSTEL'].map((kind) => {
                const items = found.filter((row) => row.kind === kind);
                if (!items.length) return null;
                return (
                  <div className="education-career-group" key={kind}>
                    {kind !== 'DIRECT' && (
                      <h3 className="occupation-course-list-label">
                        {kind === 'KANDIDAAT'
                          ? 'Afgeleide koppelingen · kandidaten'
                          : 'Voorgestelde koppelingen'}
                      </h3>
                    )}
                    <ul className="occupation-course-links">
                      {items.map((row) => (
                        <li key={row.code}>
                          <a href={`#beroep/${row.code}`}>
                            <span
                              className="occupation-course-icon education-work-icon"
                              aria-hidden="true"
                            />
                            <span>{row.name}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
