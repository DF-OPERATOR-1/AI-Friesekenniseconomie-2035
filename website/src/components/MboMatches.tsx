import { useEffect, useState } from 'react';

export type MboRelation = {
  code: string;
  course_name: string;
  years: string[];
  occupation_uri: string;
  occupation: string;
  isco: string;
  status: string;
  source: string;
  score: number | null;
  note: string;
  method: string;
  evidence?: { title: string; url?: string; file?: string }[];
};
type MatchData = { relations: MboRelation[]; pending: Record<string, string> };
let cached: Promise<MatchData> | undefined;
export function loadMatches() {
  return (cached ??= fetch(
    `${import.meta.env.BASE_URL}data/atlas/mbo_beroep_matches.json`,
  )
    .then((r) => {
      if (!r.ok) throw Error('Matches niet beschikbaar');
      return r.json();
    })
    .catch((error) => {
      cached = undefined;
      throw error;
    }));
}
export function selectMboRelations(
  relations: MboRelation[],
  code?: string,
  isco?: string,
  uri?: string,
) {
  return relations.filter(
    (r) =>
      (!code || r.code === code) &&
      (!isco || r.isco === isco) &&
      (!uri || r.occupation_uri === uri),
  );
}

const professionKey = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('nl')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
export function educationOccupationGroups(
  relations: MboRelation[],
  excludeNames: string[] = [],
) {
  const excluded = new Set(excludeNames.map(professionKey));
  const groups = new Map<string, { name: string; codes: Set<string> }>();
  for (const relation of relations) {
    const key = professionKey(relation.occupation);
    if (excluded.has(key)) continue;
    const group = groups.get(key) ?? {
      name: relation.occupation,
      codes: new Set<string>(),
    };
    group.codes.add(relation.isco);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    name: group.name,
    codes: [...group.codes],
  }));
}
export function EducationOccupationLinks({
  relations,
  excludeNames = [],
}: {
  relations: MboRelation[];
  excludeNames?: string[];
}) {
  const groups = educationOccupationGroups(relations, excludeNames);
  return groups.length ? (
    <>
      <h3 className="education-additional-heading">Aanvullende beroepen</h3>
      <ul className="education-occupation-list">
        {groups.map((group) => (
          <li key={professionKey(group.name)}>
            {group.codes.length === 1 ? (
              <a href={`#beroep/${group.codes[0]}`}>{group.name}</a>
            ) : (
              <>
                <span>{group.name}</span>
                {group.codes.map((code, index) => (
                  <span key={code}>
                    {' '}
                    · <a href={`#beroep/${code}`}>Bekijk beroepsgroep {index + 1}</a>
                  </span>
                ))}
              </>
            )}
            <span className="education-match-status">Voorstel</span>
          </li>
        ))}
      </ul>
    </>
  ) : (
    <p>Aanvullende beroepskoppelingen zijn nog niet beschikbaar.</p>
  );
}
export function MboMatchList({
  relations,
  direction,
  year,
}: {
  relations: MboRelation[];
  direction: 'course' | 'occupation';
  year?: string;
}) {
  return (
    <ul className="education-occupation-list">
      {relations.map((r) => (
        <li key={`${r.code}:${r.occupation_uri}:${r.isco}:${r.occupation}`}>
          {direction === 'course' ? (
            <>
              <a href={`#beroep/${r.isco}`}>{r.occupation}</a>
              <span> · ISCO {r.isco}</span>
            </>
          ) : (
            <>
              <a
                href={`#opleiding/mbo/${r.code}/${r.years.includes(year ?? '') ? year : r.years[r.years.length - 1]}`}
              >
                {r.course_name}
              </a>
              <span> · mbo — {r.occupation}</span>
            </>
          )}
          <p className="education-profession-source">{r.status}</p>
          <details>
            <summary>Waarom deze koppeling?</summary>
            <p>{r.note}</p>
            {r.evidence
              ?.filter((item) => item.url)
              .map((item) => (
                <p key={item.url}>
                  Onderbouwing opleiding: <a href={item.url}>{item.title}</a>.
                </p>
              ))}
            {r.score !== null && (
              <p>
                Modelscore:{' '}
                {r.score.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} op 100.
                Dit is geen kanspercentage.
              </p>
            )}
            <p className="source-caption">
              Bron beroep: {r.source}. Methode: {r.method}.
            </p>
            {r.occupation_uri && (
              <p>
                <a href={r.occupation_uri}>Bekijk dit specifieke beroep in de bron</a>.{' '}
                De bron beschrijft het beroep; de koppeling met de opleiding is een
                onderzoeksvoorstel.
              </p>
            )}
          </details>
        </li>
      ))}
    </ul>
  );
}
export function MboMatches({
  code,
  isco,
  uri,
  year,
  variant = 'default',
  excludeNames = [],
}: {
  code?: string;
  isco?: string;
  uri?: string;
  year?: string;
  variant?: 'default' | 'education' | 'sources';
  excludeNames?: string[];
}) {
  const [data, setData] = useState<MatchData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    loadMatches()
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const relations = selectMboRelations(data?.relations ?? [], code, isco, uri);
  if (variant === 'education')
    return (
      <div className="education-additional-professions">
        {!data && !error && <p role="status">Aanvullende beroepen laden…</p>}
        {error && (
          <p role="alert">Aanvullende beroepskoppelingen konden niet worden geladen.</p>
        )}
        {data && (
          <EducationOccupationLinks relations={relations} excludeNames={excludeNames} />
        )}
      </div>
    );
  if (variant === 'sources')
    return (
      <div className="education-match-sources">
        <h3>Onderbouwing beroepskoppelingen</h3>
        <p>
          De officiële SBB-beroepsnaam en voorspelde beroepskoppelingen zijn
          afzonderlijke gegevens. Aanvullende koppelingen zijn onderzoeksvoorstellen,
          geen officiële opleidingsvereisten of gemeten uitstroom.
          Assistentbeoordelingen zijn niet onafhankelijk gevalideerd en de koppelingen
          zijn niet per onderwijsjaar vastgesteld. Een modelscore is geen
          kanspercentage.
        </p>
        {!data && !error && <p role="status">Onderbouwing laden…</p>}
        {error && <p>De onderbouwing kon niet worden geladen.</p>}
        {data && relations.length === 0 && (
          <p>
            {code && data.pending[code]
              ? data.pending[code]
              : 'Voor deze opleidingscode zijn geen aanvullende koppelingen vastgelegd.'}
          </p>
        )}
        {relations.length > 0 && (
          <MboMatchList relations={relations} direction="course" year={year} />
        )}
        <p className="education-profession-source source-caption">
          Bronnen: CompetentNL —{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/deed.nl">CC BY 4.0</a>,
          bewerkt; Europese Commissie,{' '}
          <a href="https://esco.ec.europa.eu/en/classification">ESCO v1.2.1</a>{' '}
          (Nederlandstalige classificatie). Deze dienst maakt gebruik van de
          ESCO-classificatie van de Europese Commissie. Koppeling en beoordeling:
          DataFryslân.
        </p>
      </div>
    );
  return (
    <section className={uri ? 'profile-narrative' : 'profile-section'}>
      {uri ? (
        <h3>Opleidingen die hierbij kunnen aansluiten</h3>
      ) : (
        <h2>
          {code
            ? 'Beroepen die kunnen aansluiten'
            : 'Mbo-opleidingen · geschatte koppelingen'}
        </h2>
      )}
      <p>
        Dit zijn voorgestelde koppelingen, geen officiële opleidingsvereisten of gemeten
        uitstroom. Assistentbeoordelingen zijn niet onafhankelijk gevalideerd. De
        koppelingen zijn niet per onderwijsjaar vastgesteld.
      </p>
      {uri && (
        <p>
          Hier staan alleen opleidingen die aan dit specifieke beroep zijn gekoppeld,
          niet alle opleidingen binnen de beroepsgroep.
        </p>
      )}
      {!data && !error && <p role="status">Koppelingen laden…</p>}
      {error && (
        <p role="alert">
          De opleidingskoppelingen konden niet worden geladen. Open de pagina opnieuw om
          het nogmaals te proberen.
        </p>
      )}
      {data && relations.length === 0 && (
        <p>
          {code && data.pending[code]
            ? `Onzekere match: ${data.pending[code]}`
            : 'Er is nog geen voorgestelde koppeling beschikbaar.'}
        </p>
      )}
      {relations.length > 0 && (
        <MboMatchList
          relations={relations}
          direction={code ? 'course' : 'occupation'}
          year={year}
        />
      )}
      {data && (
        <p className="education-profession-source source-caption">
          Bronnen: CompetentNL — CC BY 4.0, bewerkt; Europese Commissie,{' '}
          <a href="https://esco.ec.europa.eu/en/classification">ESCO v1.2.1</a>{' '}
          (Nederlandstalige classificatie). Deze dienst maakt gebruik van de
          ESCO-classificatie van de Europese Commissie. Koppeling en beoordeling:
          DataFryslân.
        </p>
      )}
    </section>
  );
}
