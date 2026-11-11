import { EducationPagination } from '../components/EducationSourceTable';
import { useEffect, useId, useState } from 'react';
import type {
  Indicator,
  OccupationProfile,
  SpecificOccupation,
  OccupationItem,
} from './model';
import { interpretMapPoint } from '../components/perceptualSelection';
import {
  searchProfiles,
  matchingOccupationNames,
  occupationHref,
  selectedOccupationUri,
} from './search';
import { TopicIcon } from '../components/TopicIcon';
import { OccupationCourses } from '../components/OccupationCourses';
export function useProfiles() {
  const [profiles, setProfiles] = useState<OccupationProfile[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/atlas/profiles.json`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setProfiles)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);
  return { profiles, error, loading };
}
function Availability({ value }: { value: unknown }) {
  const present = value !== null;
  return (
    <span className={`occupation-status ${present ? 'is-present' : 'is-missing'}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="9" />
        {present ? <path d="m7.5 12 3 3 6-7" /> : <path d="M7 12h10" />}
      </svg>
      {present ? 'Ja' : 'Nee'}
    </span>
  );
}
export function OccupationSearchResult({
  row,
  query,
}: {
  row: OccupationProfile;
  query: string;
}) {
  const matches = matchingOccupationNames(row, query);
  return (
    <>
      <a href={occupationHref(row.isco_code, matches[0])}>
        {row.title}
        <span>ISCO {row.isco_code}</span>
      </a>
      {matches.length > 0 && (
        <ul className="occupation-search-matches">
          {matches.slice(0, 5).map((name) => (
            <li key={name}>
              <a href={occupationHref(row.isco_code, name)}>{displayLabel(name)}</a>
            </li>
          ))}
        </ul>
      )}
      {matches.length > 5 && (
        <small className="occupation-search-more">
          En {matches.length - 5} andere overeenkomende beroepen
        </small>
      )}
    </>
  );
}
function Search({ profiles }: { profiles: OccupationProfile[] }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const id = useId();
  const found = searchProfiles(profiles, query);
  const pages = Math.max(1, Math.ceil(found.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  useEffect(() => setPage(0), [query]);
  const changePage = (value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  return (
    <div className="occupation-directory">
      <div className="research-controls" role="search">
        <label htmlFor={id}>
          Zoek op beroep of ISCO-code:
          <input
            id={id}
            type="search"
            value={query}
            placeholder="Bijvoorbeeld verpleegkundigen of 2221"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <p className="occupation-result-count" role="status">
        {found.length} beroepen beschikbaar
      </p>
      <div
        className="occupation-table-scroll"
        role="region"
        aria-label="Beroepen en beschikbare informatie"
        tabIndex={0}
      >
        <table className="occupation-table">
          <thead>
            <tr>
              <th scope="col">Beroep</th>
              <th scope="col">Omschrijving</th>
              <th scope="col">Taken</th>
              <th scope="col">Vaardigheden</th>
              <th scope="col">Kennisgebied</th>
              <th scope="col">AI-blootstelling</th>
              <th scope="col">Complementariteit</th>
            </tr>
          </thead>
          <tbody>
            {found
              .slice(currentPage * pageSize, (currentPage + 1) * pageSize)
              .map((row) => (
                <tr key={row.isco_code}>
                  <th scope="row">
                    <OccupationSearchResult row={row} query={query} />
                  </th>
                  <td>
                    <Availability value={row.description.value} />
                  </td>
                  <td>
                    <Availability value={row.tasks.value} />
                  </td>
                  <td>
                    <Availability value={row.skills.value} />
                  </td>
                  <td>
                    <Availability value={row.knowledge_areas.value} />
                  </td>
                  <td>
                    <Availability value={row.ai_exposure.value} />
                  </td>
                  <td>
                    <Availability value={row.ai_complementarity.value} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!found.length && (
          <p className="occupation-empty">
            Geen beroepen gevonden. Probeer een andere naam of code.
          </p>
        )}
      </div>
      {found.length > 0 && (
        <EducationPagination
          label="Paginering beroepen"
          page={currentPage}
          pages={pages}
          results={found.length}
          onChange={changePage}
          pageSize={pageSize}
          onPageSizeChange={(value) => {
            setPageSize(value);
            changePage(0);
          }}
        />
      )}
      <p className="occupation-directory-note">
        <strong>Ja</strong> betekent dat de informatie beschikbaar is.{' '}
        <strong>Nee</strong> betekent dat de informatie ontbreekt bij het ophalen van de
        gegevens. Bij <strong>Invloed van AI</strong> gaat het om twee scores:
        AI-blootstelling en complementariteit. ‘Nee’ betekent dus niet dat AI geen
        invloed heeft op het beroep, maar dat er geen score beschikbaar is.
      </p>
    </div>
  );
}
export function QuickSearch({ profiles }: { profiles: OccupationProfile[] }) {
  const [query, setQuery] = useState('');
  const id = useId();
  const matches = searchProfiles(profiles, query);
  const examples = ['2512', '2221', '2411']
    .map((code) => profiles.find((p) => p.isco_code === code))
    .filter((p): p is OccupationProfile => !!p);
  const suggestions = query.trim() ? matches.slice(0, 5) : [];
  return (
    <div className="quick-search">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim() && matches.length)
            window.location.hash = occupationHref(
              matches[0].isco_code,
              matchingOccupationNames(matches[0], query)[0],
            );
        }}
      >
        <label htmlFor={id}>Zoek op beroep of ISCO-code:</label>
        <div className="quick-search-field">
          <span aria-hidden="true">⌕</span>
          <input
            id={id}
            type="search"
            autoComplete="off"
            placeholder="Bijvoorbeeld softwareontwikkelaar of 2512"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" disabled={!query.trim() || !matches.length}>
            Bekijk beroep
          </button>
        </div>
      </form>
      {query.trim() ? (
        <div className="quick-results">
          <p role="status">
            {matches.length
              ? `${matches.length} beroepen gevonden`
              : 'Geen beroep gevonden. Probeer een andere naam of ISCO code.'}
          </p>
          <ul>
            {suggestions.map((p) => (
              <li key={p.isco_code}>
                <a
                  href={occupationHref(
                    p.isco_code,
                    matchingOccupationNames(p, query)[0],
                  )}
                >
                  <span>
                    {matchingOccupationNames(p, query)[0] ?? p.title}
                    <small>
                      {p.title} · ISCO-08 {p.isco_code}
                    </small>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {matches.length > 5 && (
            <a href="#beroepen">Bekijk alle beroepen en filters</a>
          )}
        </div>
      ) : (
        <div className="search-examples">
          <span>Bekijk</span>
          {examples.map((p) => (
            <a key={p.isco_code} href={`#beroep/${p.isco_code}`}>
              {p.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
export function Home({ profiles }: { profiles: OccupationProfile[] }) {
  return (
    <>
      <section className="action-hero">
        <div className="container">
          <p className="eyebrow">ONTDEK DE TOEKOMST VAN JOUW BEROEP</p>
          <h1>
            Wat betekent AI
            <br />
            voor jouw werk?
          </h1>
          <p className="action-intro">
            Ontdek hoe kunstmatige intelligentie jouw werkzaamheden kan beïnvloeden.
          </p>
          <QuickSearch profiles={profiles} />
          <a className="hero-explorer-link" href="#invloed-ai">
            Liever vergelijken? bekijk <span>Invloed van AI</span>
          </a>
        </div>
      </section>
      <section className="container section discovery-section">
        <p className="eyebrow">De mogelijkheden met AI Index Fryslân</p>
        <h2>Wat kun je ontdekken?</h2>
        <div className="discovery-grid">
          <a className="discovery-card" href="#invloed-ai/exposure">
            <TopicIcon name="ai" />
            <h3>Hoe raakt AI jouw werk?</h3>
            <p>
              Ontdek welke beroepen veel of weinig overlap hebben met kunstmatige
              intelligentie.
            </p>
            <span className="card-action">Bekijk AI-blootstelling score</span>
          </a>
          <a className="discovery-card" href="#invloed-ai">
            <TopicIcon name="ai-complementariteit" />
            <h3>Kan AI jouw werk ondersteunen?</h3>
            <p>
              Bekijk bij welke beroepen kunstmatige intelligantie eerder een aanvulling
              kan zijn op het werk.
            </p>
            <span className="card-action">Bekijk AI-complementariteit score</span>
          </a>
          <a className="discovery-card" href="#toekomst">
            <TopicIcon name="agenda" />
            <h3>Hoe ziet de arbeidsmarkt eruit in 2035?</h3>
            <p>
              Bekijk de verwachte instroom van nieuwe professionals, pensionering en
              mogelijke personeelstekorten richting 2035.
            </p>
            <span className="card-action">Verken de toekomst</span>
            <small className="discovery-note">In ontwikkeling</small>
          </a>
          <a className="discovery-card" href="#beroepen">
            <TopicIcon name="skills" />
            <h3>Wat houdt jouw werk in?</h3>
            <p>Bekijk welke werkzaamheden en vaardigheden bij een beroep horen.</p>
            <span className="card-action">
              Ontdek skills en vaardigheden bij elk beroep
            </span>
          </a>
        </div>
      </section>
      <section className="open-research">
        <div className="container">
          <div>
            <p className="eyebrow">DataFryslân</p>
            <h2>Inzicht begint bij de bron.</h2>
            <p>
              DataFryslân is een coöperatief kennis- en innovatieknooppunt voor het
              veilig verzamelen, bewerken, delen en inzetten van Friese data door en
              voor Friese publieke en private organisaties. Voor DataFryslân zijn data
              geen doel, maar een middel. Dat doen we door middel van
              kennisuitwisseling, innovatief onderzoek, advies, productontwikkeling,
              voorlichting en het creëren van een relevante, openbare datacollectie.
              DataFryslân levert een bijdrage aan beter beleid en effectievere
              dienstverlening. Gebaseerd op objectieve en verifieerbare gegevens,
              waarbij dataveiligheid en de privacy van de Friese burger zijn
              gewaarborgd.
            </p>
          </div>
          <div className="research-actions">
            <a className="button primary" href="#open-data">
              Bronnen & open data
            </a>
            <a className="button primary" href="#methodologie">
              Lees de methodologie
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
export function Occupations({ profiles }: { profiles: OccupationProfile[] }) {
  return (
    <section className="container section occupations-page">
      <p className="eyebrow">ISCO-08 beroepen lijst</p>
      <h1 className="overview-page-title">Vind een beroep</h1>
      <Search profiles={profiles} />
    </section>
  );
}
function ScoreCard({
  title,
  indicator,
  range,
  median,
  classification,
}: {
  title: string;
  indicator: Indicator<number>;
  range: [number, number];
  median: number;
  classification: string;
}) {
  const value = indicator.value;
  const [min, max] = range;
  const position =
    value === null || max === min ? null : ((value - min) / (max - min)) * 100;
  const medianPosition = max === min ? 50 : ((median - min) / (max - min)) * 100;
  return (
    <article className="score-card">
      <h3 className="score-label">{title}</h3>
      <p className="score-number">
        {value === null
          ? 'Niet beschikbaar'
          : value.toLocaleString('nl-NL', { maximumFractionDigits: 3 })}
      </p>
      <span className="availability">
        {value === null ? 'Niet beschikbaar' : classification}
      </span>
      {value !== null && (
        <div className="profile-score-scale">
          <div
            role="meter"
            aria-label={title}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-valuetext={`${value.toLocaleString('nl-NL')}; ${classification}; mediaan ${median.toLocaleString('nl-NL')}`}
            className="profile-scale-track"
          >
            <i
              className="profile-scale-median"
              aria-hidden="true"
              style={{ left: `${medianPosition}%` }}
            />
            <span style={{ left: `${position ?? 50}%` }} />
          </div>
          <div className="profile-scale-labels">
            <span>{min.toLocaleString('nl-NL', { maximumFractionDigits: 2 })}</span>
            <span>{max.toLocaleString('nl-NL', { maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}
      <p className="profile-median-value">
        Mediaan: {median.toLocaleString('nl-NL', { maximumFractionDigits: 3 })}
      </p>
    </article>
  );
}
function displayLabel(value: string) {
  const text = value.trim();
  return /^ij/i.test(text)
    ? 'IJ' + text.slice(2)
    : text.charAt(0).toLocaleUpperCase('nl-NL') + text.slice(1);
}
function CompetentSource({
  source,
  version,
}: {
  source?: string | null;
  version?: string | null;
}) {
  if (source === 'ESCO')
    return (
      <p className="competent-source">
        <em>
          <strong>Bron:</strong> Europese Commissie,{' '}
          <a href="https://esco.ec.europa.eu/en/classification">
            ESCO v{version ?? '1.2.1'}
          </a>{' '}
          (Nederlandstalige classificatie).{' '}
          <span lang="en">
            This service uses the ESCO classification of the European Commission.
          </span>
        </em>
      </p>
    );
  return (
    <p className="competent-source">
      <em>
        Bron: CompetentNL — CC BY 4.0 (
        <a href="https://creativecommons.org/licenses/by/4.0/deed.nl">
          https://creativecommons.org/licenses/by/4.0/deed.nl
        </a>
        ). Bewerkt.
      </em>
    </p>
  );
}
function TaskBlocks({ entries, id }: { entries: OccupationItem[]; id: string }) {
  return (
    <div id={id} className="task-blocks">
      {entries.map((item, index) =>
        item.description ? (
          <details className="task-block" key={`${item.uri}-${index}`}>
            <summary>
              <span>{displayLabel(item.name)}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M5 12h14" />
                <path className="task-expand-line" d="M12 5v14" />
              </svg>
            </summary>
            <p>{item.description}</p>
          </details>
        ) : (
          <div className="task-block task-block-static" key={`${item.uri}-${index}`}>
            {displayLabel(item.name)}
          </div>
        ),
      )}
    </div>
  );
}
export function OccupationCategory({
  entries,
  label,
  kind = 'skills',
}: {
  entries: OccupationItem[];
  label: string;
  kind?: 'tasks' | 'skills' | 'knowledge_areas';
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const visible = expanded ? entries : entries.slice(0, 6);
  return (
    <section
      className={`occupation-item-group${kind === 'tasks' ? ' task-category-panel' : ' competency-category-panel'}`}
    >
      <div className="skill-category-heading">
        <h4>
          {label} <span className="skill-count">({entries.length})</span>
        </h4>
        {entries.length > 6 && (
          <button
            type="button"
            className="skills-toggle"
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded
              ? 'Toon minder'
              : kind === 'tasks'
                ? 'Toon alle taken'
                : kind === 'knowledge_areas'
                  ? 'Toon alle kennisgebieden'
                  : 'Toon alle vaardigheden'}
          </button>
        )}
      </div>
      {kind === 'tasks' ? (
        <TaskBlocks entries={visible} id={id} />
      ) : (
        <ul id={id}>
          {visible.map((item, index) => (
            <li key={`${item.uri}-${index}`}>
              {item.description ? (
                <details>
                  <summary>
                    <span>{displayLabel(item.name)}</span>
                    <span className="competency-expand" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p>{displayLabel(item.description)}</p>
                </details>
              ) : (
                displayLabel(item.name)
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
function GroupedItems({
  items,
  kind,
}: {
  items: OccupationItem[];
  kind: 'tasks' | 'skills' | 'knowledge_areas';
}) {
  const levels =
    kind === 'tasks'
      ? ['essentieel', 'optioneel']
      : ['essentieel', 'belangrijk', 'enigszins'];
  const groups = [
    ...levels,
    ...new Set(
      items.map((item) => item.importance).filter((level) => !levels.includes(level)),
    ),
  ];
  return (
    <div className={kind !== 'tasks' ? 'skills-categories' : 'task-categories'}>
      {items.length ? (
        groups.map((level) => {
          const entries = items.filter((item) => item.importance === level);
          if (!entries.length) return null;
          const label =
            level === 'enigszins'
              ? 'Enigszins belangrijk'
              : level
                ? level.charAt(0).toUpperCase() + level.slice(1)
                : 'Niet ingedeeld';
          return (
            <OccupationCategory
              key={level}
              entries={entries}
              label={label}
              kind={kind}
            />
          );
        })
      ) : (
        <p>
          {kind === 'tasks'
            ? 'Voor dit beroep zijn nog geen taken beschikbaar.'
            : kind === 'knowledge_areas'
              ? 'Voor dit beroep zijn nog geen kennisgebieden beschikbaar.'
              : 'Voor dit beroep zijn nog geen vaardigheden beschikbaar.'}
        </p>
      )}
    </div>
  );
}
export function SpecificOccupationDetails({ member }: { member: SpecificOccupation }) {
  const examplesMarker = /Voorbeelden van werkzaamheden\s*:/i.exec(member.description);
  const description = examplesMarker
    ? member.description.slice(0, examplesMarker.index).trim()
    : member.description;
  const examples = examplesMarker
    ? member.description.slice(examplesMarker.index + examplesMarker[0].length).trim()
    : '';
  return (
    <div aria-live="polite">
      <div className="profile-narrative">
        <h3>Beroepsomschrijving</h3>
        <p>{description || 'Nog geen omschrijving beschikbaar voor dit beroep.'}</p>
        {examples && (
          <>
            <h3>Voorbeelden van werkzaamheden</h3>
            <p>{examples.charAt(0).toLocaleUpperCase('nl-NL') + examples.slice(1)}</p>
          </>
        )}
      </div>
      <CompetentSource source={member.source} version={member.source_version} />
      <div className="professional-information">
        <div className="profile-narrative">
          <h3>Taken</h3>
          {member.source === 'ESCO' ? (
            <div className="competency-unavailable">
              <strong>Niet beschikbaar</strong>
              <p>De ESCO-bron bevat geen afzonderlijke takenlijst voor dit beroep.</p>
            </div>
          ) : (
            <GroupedItems kind="tasks" items={member.tasks} />
          )}
        </div>
        <div className="profile-narrative competency-section">
          <h3>
            Vaardigheden{' '}
            <span className="competency-total">{member.skills.length}</span>
          </h3>
          {member.skills.some((item) => item.description) && (
            <p className="competency-help">
              Klik op een vaardigheid voor de toelichting.
            </p>
          )}
          {member.source === 'ESCO' && (
            <p className="competency-help">
              Essentieel: nodig voor dit beroep. Optioneel: afhankelijk van de functie
              of werkomgeving.
            </p>
          )}
          <GroupedItems kind="skills" items={member.skills} />
        </div>
        <div className="profile-narrative competency-section">
          <h3>
            Kennisgebieden{' '}
            <span className="competency-total">
              {(member.knowledge_areas ?? []).length}
            </span>
          </h3>
          {(member.knowledge_areas ?? []).some((item) => item.description) && (
            <p className="competency-help">
              Klik op een kennisgebied voor de toelichting.
            </p>
          )}
          <GroupedItems kind="knowledge_areas" items={member.knowledge_areas ?? []} />
        </div>
      </div>
    </div>
  );
}
function ProfessionalContent({
  row,
  occupationName = '',
}: {
  row: OccupationProfile;
  occupationName?: string;
}) {
  const [entries, setEntries] = useState<SpecificOccupation[]>([]);
  const [selected, setSelected] = useState('');
  const [state, setState] = useState('loading');
  const id = useId();
  useEffect(() => {
    if (!row.member_count) {
      setState('empty');
      return;
    }
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/atlas/occupations/${row.isco_code}.json`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data: SpecificOccupation[]) => {
        setEntries(data);
        setSelected(selectedOccupationUri(data, occupationName));
        setState('ready');
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setState('error');
      });
    return () => controller.abort();
  }, [row.isco_code, row.member_count]);
  useEffect(() => {
    if (entries.length) setSelected(selectedOccupationUri(entries, occupationName));
  }, [entries, occupationName]);
  const member = entries.find((item) => item.uri === selected);
  return (
    <section className="profile-section">
      <p className="eyebrow">Werkzaamheden</p>
      <h2>Welke beroepen vallen onder deze beroepsgroep?</h2>
      <p className="profile-section-intro">
        Kies hieronder een specifiek beroep voor de bijbehorende omschrijving, taken en
        vaardigheden.
      </p>
      {state === 'loading' && <p role="status">Beroepen laden…</p>}
      {state === 'empty' && <p>Er zijn nog geen specifieke beroepen gekoppeld.</p>}
      {state === 'error' && (
        <p role="alert">
          De beroepsinformatie kon niet worden geladen. Probeer de pagina opnieuw te
          openen.
        </p>
      )}
      {state === 'ready' && (
        <>
          <div className="professional-selector">
            <label htmlFor={id}>Kies een beroep binnen {row.title}</label>
            <select
              id={id}
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              {entries.map((item) => (
                <option key={item.uri} value={item.uri}>
                  {displayLabel(item.name)}
                </option>
              ))}
            </select>
          </div>
          {member && <SpecificOccupationDetails key={member.uri} member={member} />}
        </>
      )}
    </section>
  );
}
export function Profile({
  code,
  profiles,
  occupationName = '',
}: {
  code: string;
  profiles: OccupationProfile[];
  occupationName?: string;
}) {
  const row = profiles.find((p) => p.isco_code === code);
  if (!row)
    return (
      <section className="container section">
        <h1>Beroep niet gevonden</h1>
        <p>ISCO-code {code} is niet opgenomen in de huidige bronselectie.</p>
        <a href="#beroepen">Terug naar beroepen</a>
      </section>
    );
  const complete = profiles.filter(
    (p) => p.map_exposure !== null && p.ai_complementarity.value !== null,
  );
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length
      ? sorted.length % 2
        ? sorted[middle]
        : (sorted[middle - 1] + sorted[middle]) / 2
      : 0;
  };
  const exposureMedian = median(complete.map((p) => p.map_exposure!));
  const complementarityMedian = median(
    complete.map((p) => p.ai_complementarity.value!),
  );
  const exposureDisplayMedian = median(
    complete.flatMap((p) =>
      p.ai_exposure.value === null ? [] : [p.ai_exposure.value],
    ),
  );
  const classify = (value: number | null, median: number) =>
    value === null
      ? 'Niet beschikbaar'
      : value === median
        ? 'Op de mediaan'
        : value > median
          ? 'Hoog'
          : 'Laag';
  const interpretation = interpretMapPoint(
    row.map_exposure !== null && row.ai_complementarity.value !== null
      ? { raw: row.map_exposure, complementarity: row.ai_complementarity.value }
      : undefined,
    exposureMedian,
    complementarityMedian,
  );
  const exposureValues = profiles.flatMap((p) =>
    p.ai_exposure.value === null ? [] : [p.ai_exposure.value],
  );
  const exposureRange: [number, number] = exposureValues.length
    ? [Math.min(...exposureValues), Math.max(...exposureValues)]
    : [0, 1];
  return (
    <div className="occupation-profile">
      <section className="profile-header">
        <div className="container">
          <a className="profile-back" href="#beroepen">
            Terug naar alle beroepen
          </a>
          <p className="eyebrow">
            ISCO-08 <span className="isco-tag">{row.isco_code}</span>
          </p>
          <h1>{row.title}</h1>
          {row.cbs_relevance && (
            <div className="profile-narrative">
              <h2 className="profile-data-notice-heading">
                Beperkte gegevens beschikbaar
              </h2>
              <p>
                Het CBS beschouwt deze beroepsgroep als niet relevant voor de
                Nederlandse arbeidsmarkt. Daarom zijn er geen gegevens beschikbaar over
                de beroepsomschrijving, taken, vaardigheden, kennisgebieden en in- en
                uitstroom op de arbeidsmarkt.
              </p>
              <p className="profile-data-notice-source">
                Bron:{' '}
                <a href={row.cbs_relevance.source_url}>
                  CBS, Codelijsten en beroepenindex ISCO 2008
                </a>
                , tabblad ‘ISCO-08 voorbeeldberoepen’.
              </p>
            </div>
          )}
        </div>
      </section>
      <div className="container">
        <section
          className="profile-section profile-ai-section"
          aria-labelledby="profile-ai-heading"
        >
          <p className="eyebrow">Invloed van AI</p>
          <h2 id="profile-ai-heading">Wat voor invloed heeft AI op dit beroep?</h2>
          <div className="score-grid">
            <ScoreCard
              title="AI-blootstelling"
              indicator={row.ai_exposure}
              median={exposureDisplayMedian}
              classification={classify(row.map_exposure, exposureMedian)}
              range={exposureRange}
            />
            <ScoreCard
              title="Complementariteit"
              indicator={row.ai_complementarity}
              median={complementarityMedian}
              classification={classify(
                row.ai_complementarity.value,
                complementarityMedian,
              )}
              range={[0, 1]}
            />
          </div>
          {interpretation && (
            <div className="profile-ai-interpretation">
              <h3>{interpretation.title}</h3>
              <p>{interpretation.text}</p>
            </div>
          )}
          {!interpretation && (
            <p className="profile-ai-interpretation">
              Er zijn geen scores beschikbaar om dit beroep te duiden.
            </p>
          )}

          <p className="profile-compare">
            <span>Wat zeggen deze scores ten opzichte van andere beroepen?</span>
            <a href="#invloed-ai">
              Vergelijk bij <span>Invloed van AI</span>
            </a>
          </p>
        </section>
        {!row.cbs_relevance && (
          <>
            <OccupationCourses key={`courses:${row.isco_code}`} isco={row.isco_code} />
            <ProfessionalContent
              key={row.isco_code}
              row={row}
              occupationName={occupationName}
            />
            <section className="profile-section">
              <h2>Regionale context</h2>
              <dl className="labour-stats">
                <div>
                  <dt>Aantal werkenden en leeftijdsopbouw</dt>
                  <dd>
                    Nog niet beschikbaar per beroep
                    <details>
                      <summary>Toelichting</summary>
                      <p>
                        Gegevens over het aantal werkenden en hun leeftijdsopbouw zijn
                        nog niet aan dit beroep gekoppeld.
                      </p>
                    </details>
                  </dd>
                </div>
              </dl>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
