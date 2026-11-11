import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { PerceptualChart } from './PerceptualChart';
import type { OccupationProfile } from '../atlas/model';
import { searchProfiles } from '../atlas/search';
import {
  filterScenarioCourses,
  formatScenarioPercentage,
  formatScenarioCountInput,
  normalizeScenarioCountInput,
  isSmallAnnualInflow,
  scenarioResultCopy,
  scenarioBalanceDisplay,
} from './scenarioPresentation';
import { resolveLabourValue, resetLabourValue } from './scenarioLabour';
import type { LabourSources, LabourOverrides, LabourKey } from './scenarioLabour';
import { useEducationCounts, selectEducationPopulation } from './EducationCounts';
import {
  courseCountCodes,
  courseCountGroup,
  courseCountPeriods,
  courseCodeFamily,
} from './Education';
import type { EducationData } from './Education';
import { loadMatches } from './MboMatches';
import type { MboRelation } from './MboMatches';
import type { EducationType } from './educationTrendData';
import {
  linkedScenarioCourses,
  educationBaseline,
  educationCountsAtYear,
  availableScenarioProfiles,
  parseAssumption,
  courseAllocation,
  projectGraduates,
  aggregateProjections,
  addIntervals,
  scenarioAI,
  calculateMarket,
  selectScenarios,
  SCENARIOS,
  formatInterval,
} from './scenario2035';
import type { ScenarioEducation, AllocationOverrides } from './scenario2035';
const ForecastChart = lazy(() =>
  import('./ScenarioForecastChart').then((module) => ({
    default: module.ScenarioForecastChart,
  })),
);
const EMPTY_LABOUR = {
  stock: '',
  outflow: '',
  demand: '',
  effect: '0',
  junior: false,
  related: '',
  shortage: '',
  confirmed: false,
  reason: '',
};
type LabourForm = typeof EMPTY_LABOUR;
function PercentageInput({
  value,
  onChange,
  min = 0,
  max = 100,
  disabled,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const invalid = value.trim() !== '' && parseAssumption(value, min, max) === null;
  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      aria-label={label}
      aria-invalid={invalid || undefined}
      placeholder={placeholder}
      value={editing ? draft : formatScenarioPercentage(value)}
      onFocus={() => {
        setDraft(formatScenarioPercentage(value));
        setEditing(true);
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(event.target.value);
      }}
      onBlur={() => setEditing(false)}
    />
  );
}
function CountInput({
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  min: number;
  max?: number;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      aria-invalid={
        (value.trim() !== '' && parseAssumption(value, min, max) === null) || undefined
      }
      value={editing ? draft : formatScenarioCountInput(value)}
      onFocus={() => {
        setDraft(value.replace('.', ','));
        setEditing(true);
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(normalizeScenarioCountInput(event.target.value));
      }}
      onBlur={() => setEditing(false)}
    />
  );
}
function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  suffix,
  help,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  suffix?: string;
  help?: string;
  placeholder?: string;
}) {
  return (
    <label className="scenario-field">
      <span>
        {label}
        {suffix ? ` (${suffix})` : ''}
      </span>
      {suffix?.includes('%') ? (
        <PercentageInput
          value={value}
          onChange={onChange}
          min={min}
          max={max ?? 100}
          placeholder={placeholder}
        />
      ) : (
        <CountInput
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          placeholder={placeholder}
        />
      )}
      {help && <small>{help}</small>}
    </label>
  );
}
export function ScenarioExplorer({
  profiles,
  labourSources = {},
}: {
  profiles: OccupationProfile[];
  labourSources?: LabourSources;
}) {
  const [selected, setSelected] = useState(''),
    [query, setQuery] = useState(''),
    [group, setGroup] = useState('');
  const [searchOpen, setSearchOpen] = useState(true);
  const [courseFilter, setCourseFilter] = useState<EducationType | ''>('');
  const [courseQuery, setCourseQuery] = useState('');
  const [editingEducation, setEditingEducation] = useState(false);
  const [sourceYear, setSourceYear] = useState('');
  const [explanationTarget, setExplanationTarget] = useState<HTMLDivElement | null>(
    null,
  );
  const [sources, setSources] = useState<{
      local: ScenarioEducation[];
    } | null>(null),
    [sourceError, setSourceError] = useState(false);
  const mbo = useEducationCounts('mbo'),
    hbo = useEducationCounts('hbo'),
    wo = useEducationCounts('wo');
  const [growth, setGrowth] = useState('0'),
    [regional, setRegional] = useState('100'),
    [tolerance] = useState('5');
  const [allocations, setAllocations] = useState<AllocationOverrides>({});
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const [labourCases] = useState<Record<string, LabourForm>>({});
  const [labourOverrides, setLabourOverrides] = useState<LabourOverrides>({});
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/atlas/opleidingen.json`, {
        signal: controller.signal,
      }).then((response) => {
        if (!response.ok) throw Error();
        return response.json() as Promise<EducationData>;
      }),
      loadMatches(),
    ])
      .then(([data, matches]) => {
        if (controller.signal.aborted) return;
        const local = data.courses.map((course) => {
          const countCodes = courseCountCodes(data, course);
          const codes = Array.isArray(countCodes) ? countCodes : [countCodes];
          return {
            ...course,
            countCodes,
            countPeriods:
              courseCodeFamily(data, course)?.codes ?? courseCountPeriods(data, course),
            countScopes: Object.fromEntries(
              courseCountGroup(data, course).map((registration) => [
                registration.code,
                Object.fromEntries(
                  Object.entries(registration.years).map(([year, value]) => [
                    year,
                    value.institutions
                      .map((label) => label.match(/\(([A-Z0-9]{4})\)$/)?.[1])
                      .filter((value): value is string => Boolean(value)),
                  ]),
                ),
              ]),
            ),
            occupations:
              course.education_type === 'mbo'
                ? matches.relations
                    .filter((row: MboRelation) => codes.includes(row.code))
                    .map((row: MboRelation) => ({ code: row.isco, kind: 'VOORSTEL' }))
                : course.occupations,
          };
        });
        setSources({ local });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSourceError(true);
      });
    return () => controller.abort();
  }, []);
  const availableProfiles = useMemo(
    () =>
      sources
        ? availableScenarioProfiles(profiles, sources.local).filter(
            (row) => row.map_exposure !== null && row.ai_complementarity.value !== null,
          )
        : [],
    [profiles, sources],
  );
  const profile = availableProfiles.find((row) => row.isco_code === selected);
  const options = searchProfiles(availableProfiles, query).filter(
    (row) => !group || row.isco_code.startsWith(group),
  );
  const linked = useMemo(
    () =>
      sources && profile
        ? linkedScenarioCourses(sources.local, [], selected).filter(
            (course) => course.localYear,
          )
        : [],
    [sources, profile, selected],
  );
  const local = linked;
  const availableCounts = (type: EducationType) =>
    type === 'mbo' ? mbo : type === 'hbo' ? hbo : wo;
  const globalGrowth = parseAssumption(growth, -100, 100),
    share = parseAssumption(regional, 0, 100);
  const modelRows = useMemo(
    () =>
      local.map((course) => {
        const entry = availableCounts(course.type)[1];
        const codes = course.countCodes ?? course.code;
        const selectedRows = (rows: typeof entry.rows) =>
          selectEducationPopulation(rows, course.type, codes, course.countScopes);
        const baseline =
          entry.state === 'ready'
            ? educationBaseline(
                selectedRows(entry.rows),
                course.type,
                codes,
                course.countPeriods,
              )
            : null;
        const studentEntry = availableCounts(course.type)[0];
        const students =
          studentEntry.state === 'ready' && baseline
            ? educationCountsAtYear(
                selectedRows(studentEntry.rows),
                course.type,
                codes,
                baseline.year,
                course.countPeriods,
              )
            : null;
        const rate = parseAssumption(growth, -100, 100);
        const allocation = courseAllocation(course, selected, allocations);
        const included = !excluded[`${selected}:${course.key}`];
        const projection =
          included &&
          baseline &&
          rate !== null &&
          share !== null &&
          globalGrowth !== null &&
          allocation.value !== null &&
          !allocation.error
            ? projectGraduates(baseline, rate, allocation.value, share)
            : null;
        return {
          course,
          baseline,
          students,
          studentState: studentEntry.state,
          rate,
          allocation,
          included,
          projection,
          state: entry.state,
        };
      }),
    [linked, mbo, hbo, wo, growth, selected, allocations, excluded, regional],
  );
  const visibleCourses = filterScenarioCourses(modelRows, courseFilter, courseQuery);
  const sourceYears = [
    ...new Set(
      ['mbo', 'hbo', 'wo']
        .flatMap((type) =>
          availableCounts(type as EducationType)[1].rows.map((row) => row.Jaar),
        )
        .filter(
          (year) =>
            /^20\d{2}$/.test(year) && Number(year) >= 2021 && Number(year) <= 2025,
        ),
    ),
  ]
    .sort()
    .reverse();
  const displayCourses = visibleCourses.map((row) => {
    if (!sourceYear) return { ...row, displayYear: row.baseline?.year };
    const codes = row.course.countCodes ?? row.course.code;
    const selectedCounts = (index: number) => {
      const entry = availableCounts(row.course.type)[index];
      return entry.state === 'ready'
        ? educationCountsAtYear(
            selectEducationPopulation(
              entry.rows,
              row.course.type,
              codes,
              row.course.countScopes,
            ),
            row.course.type,
            codes,
            Number(sourceYear),
            row.course.countPeriods,
          )
        : null;
    };
    return {
      ...row,
      baseline: selectedCounts(1),
      students: selectedCounts(0),
      displayYear: Number(sourceYear),
    };
  });
  const included = modelRows.filter((row) => row.included),
    projected = included.filter((row) => row.projection);
  const complete = included.length > 0 && projected.length === included.length;
  const points = aggregateProjections(projected.map((row) => row.projection!));
  const last = points?.at(-1),
    cumulative = points ? addIntervals(points.map((point) => point.inflow)) : null;
  const ai = profile ? scenarioAI(profiles, profile) : null;
  const labourValues = Object.fromEntries(
    (['stock', 'outflow', 'demand'] as const).map((key) => [
      key,
      resolveLabourValue(
        labourSources[selected]?.[key],
        labourOverrides[selected]?.[key],
      ),
    ]),
  ) as Record<LabourKey, ReturnType<typeof resolveLabourValue>>;
  const labour = {
    ...(labourCases[selected] ?? EMPTY_LABOUR),
    stock: labourValues.stock.value,
    outflow: labourValues.outflow.value,
    demand: labourValues.demand.value,
  };
  const setLabourValue = (key: LabourKey, value: string) =>
    setLabourOverrides((current) => ({
      ...current,
      [selected]: { ...current[selected], [key]: value },
    }));
  const market = complete
    ? calculateMarket(
        {
          source: Object.values(labourValues).every((value) => value.origin === 'data')
            ? 'data'
            : 'user',
          stock: parseAssumption(labour.stock),
          outflow: parseAssumption(labour.outflow),
          demand: parseAssumption(labour.demand),
          tolerance: parseAssumption(tolerance, 0, 100),
          aiEffect: parseAssumption(labour.effect, -100, 100),
        },
        cumulative,
      )
    : null;
  const related = availableProfiles.find(
    (row) => row.isco_code === labour.related && row.isco_code !== selected,
  );
  const scenarios = ai
    ? selectScenarios(market, ai, last?.inflow ?? null, {
        juniorAutomation: labour.junior,
        relatedCode: related?.isco_code ?? '',
        selectedCode: selected,
        relatedShortage: parseAssumption(labour.shortage),
        relatedConfirmed: labour.confirmed,
      })
    : null;
  const resultCopy = scenarios?.main
    ? scenarioResultCopy(scenarios.main.id, ai!)
    : null;
  const balanceDisplay = market ? scenarioBalanceDisplay(market) : null;
  return (
    <section className="container section scenario-page future-page">
      <p className="eyebrow">Toekomstverkenning Fryslân</p>
      <h1 className="overview-page-title">
        Hoe ontwikkelt dit beroep zich richting 2035?
      </h1>
      <p className="scenario-intro">
        We combineren gegevens over opleidingen, arbeidsmarkt en AI om mogelijke
        ontwikkelingen richting 2035 in beeld te brengen.
      </p>
      <div
        className="research-controls scenario-selection"
        role="search"
        aria-label="Beroep kiezen"
      >
        <label htmlFor="scenario-occupation-search">
          Zoek op beroep of ISCO-code:
          <input
            id="scenario-occupation-search"
            type="search"
            value={query}
            placeholder="Bijvoorbeeld verpleegkundigen of 2221"
            aria-expanded={searchOpen}
            aria-controls="scenario-occupation-results"
            autoComplete="off"
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
              setSelected('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSearchOpen(false);
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSearchOpen(true);
                requestAnimationFrame(() =>
                  document
                    .querySelector<HTMLButtonElement>(
                      '#scenario-occupation-results button',
                    )
                    ?.focus(),
                );
              }
              if (event.key === 'Enter' && options.length === 1) {
                event.preventDefault();
                setSelected(options[0].isco_code);
                setEditingEducation(false);
                setQuery(options[0].title);
                setSearchOpen(false);
              }
            }}
          />
        </label>
        <label>
          Beroepshoofdgroep
          <select
            value={group}
            onChange={(event) => {
              setGroup(event.target.value);
              setSearchOpen(true);
              setSelected('');
              setQuery('');
            }}
          >
            <option value="">Alle hoofdgroepen</option>
            {[
              'Militaire beroepen',
              'Leidinggevenden',
              'Wetenschappelijke beroepen',
              'Technici en vakspecialisten',
              'Administratief personeel',
              'Dienstverlening en verkoop',
              'Landbouw, bosbouw en visserij',
              'Ambachtslieden',
              'Bedieners en assemblagemedewerkers',
              'Elementaire beroepen',
            ].map((name, index) => (
              <option key={index} value={index}>
                {index} | {name}
              </option>
            ))}
          </select>
        </label>
        {searchOpen && sources && (
          <div id="scenario-occupation-results" className="scenario-search-results">
            <p className="scenario-assumption" role="status">
              {options.length
                ? `${options.length} beroepsgroepen met gekoppelde opleidingen in Fryslân beschikbaar. Kies een beroep:`
                : 'Geen beroepen gevonden binnen dit filter.'}
            </p>
            <ul aria-label="Gevonden beroepen">
              {options.map((row) => (
                <li key={row.isco_code}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(row.isco_code);
                      setEditingEducation(false);
                      setQuery(row.title);
                      setSearchOpen(false);
                    }}
                  >
                    <span>{row.title}</span>
                    <small>ISCO-08 {row.isco_code}</small>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {!sources && !sourceError && (
        <p role="status">Friese opleidingen en beroepsgroepen laden…</p>
      )}
      {sourceError && (
        <p role="alert">
          De Friese opleidingsgegevens konden niet worden geladen. Vernieuw de pagina om
          het opnieuw te proberen.
        </p>
      )}
      {sources && profiles.length > 0 && !availableProfiles.length && (
        <p role="status">
          Er zijn geen beroepsgroepen met een beschikbaar AI-profiel en gekoppelde mbo-,
          hbo- of wo-opleidingen in de Friese DUO-selectie beschikbaar.
        </p>
      )}
      {!profile && (
        <aside className="scenario-search-intro">
          <h2>Wat laat deze verkenning zien?</h2>
          <p>
            Brongegevens vormen de basis. Met een rekentool laten we zien hoe een beroep
            zich richting 2035 kan ontwikkelen.
          </p>
        </aside>
      )}
      {profile && ai && (
        <>
          <section
            className="scenario-profession-card"
            aria-label="Geselecteerd beroep en AI-positie"
          >
            <div className="scenario-selected-profession">
              <p className="eyebrow">
                ISCO-08 <span>{profile.isco_code}</span>
              </p>
              <h2>{profile.title}</h2>
              <div ref={setExplanationTarget} />
            </div>
            <div className="scenario-ai-position">
              <PerceptualChart
                compact
                selectedCode={profile.isco_code}
                explanationTarget={explanationTarget}
              />
            </div>
          </section>
          <section
            className="profile-section scenario-explore"
            aria-labelledby="scenario-explore-title"
          >
            <h2 id="scenario-explore-title">Rekentool arbeidsmarktbeeld 2035</h2>
            <div className="scenario-workspace-block scenario-education-summary">
              <div className="scenario-block-heading">
                <h3>Instroom vanuit opleidingen</h3>
                <span className="scenario-badge">Rekentool · DUO</span>
              </div>
              <p className="scenario-assumption">
                Berekende potentiële instroom in 2035
              </p>
              <p className="scenario-inflow-value" aria-live="polite">
                <strong>
                  {isSmallAnnualInflow(last?.inflow ?? null)
                    ? 'minder dan 1'
                    : formatInterval(last?.inflow ?? null)}
                </strong>{' '}
                <span>per jaar</span>
              </p>
              <div className="scenario-inflow-extra">
                <div className="scenario-input-grid">
                  <NumberField
                    label="Jaarlijkse groei afgestudeerden"
                    suffix="%"
                    value={growth}
                    min={-100}
                    max={100}
                    onChange={setGrowth}
                    help="Bij 0% blijft het aantal afgestudeerden elk jaar gelijk. Dit geldt voor alle gekozen opleidingen."
                  />
                  <NumberField
                    label="Welk deel blijft in Fryslân?"
                    suffix="%"
                    value={regional}
                    max={100}
                    onChange={setRegional}
                    help="Bij 100% rekenen we met alle afgestudeerden. Kies een lager percentage als je verwacht dat een deel buiten Fryslân gaat werken."
                  />
                </div>
                {(globalGrowth === null || share === null) && (
                  <p role="alert">
                    Vul een groei tussen −100 en 100% en een beschikbaar aandeel tussen
                    0 en 100% in.
                  </p>
                )}
              </div>
              <details className="scenario-inflow-settings">
                <summary>Hoe is dit berekend?</summary>
                <p>
                  We gebruiken de meest recente DUO-cijfers om te berekenen hoeveel
                  mensen tot 2035 afstuderen. Daarbij houden we rekening met de
                  verwachte jaarlijkse groei, het aandeel dat in dit beroep gaat werken
                  en hoeveel daarvan beschikbaar komt voor Fryslân.
                </p>
                <div className="scenario-calculation-example">
                  <h4>Berekening voor {profile.title}</h4>
                  <p className="scenario-assumption">
                    We tonen afgeronde aantallen en percentages. Voor de berekening
                    gebruiken we de precieze waarden.
                  </p>
                  <ul>
                    {modelRows
                      .filter((row) => row.included)
                      .map(({ course, baseline, rate, allocation, projection }) => (
                        <li key={course.key}>
                          <strong>{course.name}</strong>
                          {baseline &&
                          rate !== null &&
                          allocation.value !== null &&
                          share !== null &&
                          projection ? (
                            <>
                              <p>
                                {formatInterval(baseline)} × (1 +{' '}
                                {formatScenarioPercentage(rate)} / 100)
                                <sup>{2035 - baseline.year}</sup> × (
                                {formatScenarioPercentage(allocation.value)} / 100) × (
                                {formatScenarioPercentage(share)} / 100) ≈{' '}
                                <strong>
                                  {isSmallAnnualInflow(projection.at(-1)!.inflow)
                                    ? 'minder dan 1'
                                    : formatInterval(projection.at(-1)!.inflow)}{' '}
                                  per jaar
                                </strong>
                              </p>
                              <small>
                                DUO-afgestudeerden {baseline.year} × groei tot 2035 ×
                                aandeel richting dit beroep × beschikbaarheid voor
                                Fryslân.
                              </small>
                            </>
                          ) : (
                            <p>
                              De berekening is nog niet mogelijk: er ontbreken geldige
                              broncijfers of instellingen.
                            </p>
                          )}
                        </li>
                      ))}
                  </ul>
                  <p>
                    <strong>Instroom in 2035:</strong> de som van de meetellende
                    opleidingen ≈ {formatInterval(last?.inflow ?? null)} personen per
                    jaar.
                  </p>
                  <p>
                    <strong>Cumulatieve instroom:</strong> de jaarlijkse instroom
                    opgeteld over 2025–2035 ≈ {formatInterval(cumulative)} personen.
                  </p>
                  {!complete && (
                    <p className="scenario-assumption">
                      De uitkomsten zijn nog onvolledig.
                    </p>
                  )}
                </div>
                <p className="source-caption">
                  Volledige{' '}
                  <a
                    className="scenario-analysis-link"
                    href="#methodologie/methodologie-scenario"
                  >
                    Methodologie
                  </a>
                </p>
              </details>
              <div className="scenario-cumulative-trend">
                {points ? (
                  <Suspense fallback={<p role="status">Trend laden…</p>}>
                    <ForecastChart points={points} cumulative />
                  </Suspense>
                ) : (
                  <p className="scenario-assumption">Cumulatieve instroom: onbekend.</p>
                )}
                {!complete && (
                  <p className="scenario-assumption">
                    Onvolledige berekening: alleen berekenbare, meetellende opleidingen
                    zijn opgenomen.
                  </p>
                )}
              </div>
              <p className="scenario-course-count">
                {local.length} gekoppelde{' '}
                {local.length === 1 ? 'opleiding' : 'opleidingen'}
              </p>
              {!complete && (
                <p role="status" className="scenario-assumption">
                  {included.length === 0
                    ? 'Laat minimaal één opleiding meetellen om de instroom te berekenen.'
                    : `Voor ${included.length - projected.length} meetellende opleiding(en) ontbreken geldige cijfers of aannames.`}
                </p>
              )}
              <div className="scenario-education-action">
                <button
                  type="button"
                  className="scenario-edit-button"
                  aria-expanded={editingEducation}
                  aria-controls="scenario-distribution-editor"
                  onClick={() => setEditingEducation((open) => !open)}
                >
                  {editingEducation ? 'Bewerken sluiten' : 'Verdeling aanpassen'}
                </button>
              </div>
              {editingEducation && (
                <div
                  id="scenario-distribution-editor"
                  className="scenario-distribution-editor"
                >
                  <h3>Verdeling van de beroepsinstroom</h3>
                  <div className="research-controls scenario-distribution-filters">
                    <label>
                      Zoek een opleiding
                      <input
                        type="search"
                        value={courseQuery}
                        onChange={(event) => setCourseQuery(event.target.value)}
                        placeholder="Zoek op naam of opleidingscode"
                      />
                    </label>
                    <label>
                      Niveau
                      <select
                        value={courseFilter}
                        onChange={(event) =>
                          setCourseFilter(event.target.value as EducationType | '')
                        }
                      >
                        <option value="">Alle</option>
                        <option value="mbo">Mbo</option>
                        <option value="hbo">Hbo</option>
                        <option value="wo">Wo</option>
                      </select>
                    </label>
                    <label>
                      Bronjaar (weergave)
                      <select
                        value={sourceYear}
                        onChange={(event) => setSourceYear(event.target.value)}
                      >
                        <option value="">Modelbasis per opleiding</option>
                        {sourceYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {sourceYear && (
                    <p className="scenario-assumption">
                      Broncijfers uit {sourceYear}; de rekentool blijft de laatst
                      beschikbare afgestudeerden per opleiding gebruiken.
                    </p>
                  )}
                  <div
                    className="education-count-scroll scenario-distribution-scroll"
                    role="region"
                    aria-label="Opleidingen en beroepsverdeling"
                    tabIndex={0}
                  >
                    <table className="education-count-table scenario-distribution-table">
                      <caption className="sr-only">
                        Gekoppelde opleidingen en aanpasbare modelverdeling richting{' '}
                        {profile.title}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Opleiding</th>
                          <th scope="col">Niveau</th>
                          <th scope="col">Afgestudeerden</th>
                          <th scope="col">Aandeel (%)</th>
                          <th scope="col">Meetellen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayCourses.map(
                          ({
                            course,
                            baseline,
                            state,
                            allocation,
                            included,
                            displayYear,
                          }) => {
                            const source = sources?.local.find(
                              (row) =>
                                row.education_type === course.type &&
                                row.code === course.code,
                            );
                            const levels =
                              source?.years[course.localYear ?? '']?.levels ?? [];
                            const overridden =
                              allocations[course.key]?.[selected] !== undefined;
                            return (
                              <tr key={course.key}>
                                <th scope="row">
                                  <a
                                    href={`#opleiding/${course.type}/${course.code}/${course.localYear}`}
                                  >
                                    {course.name}
                                  </a>
                                  {course.type === 'mbo' && (
                                    <small>Voorlopige koppeling</small>
                                  )}
                                </th>
                                <td data-label="Niveau">
                                  {course.type.toUpperCase()}
                                  {levels.length > 0 && (
                                    <small>{levels.join(', ')}</small>
                                  )}
                                </td>
                                <td
                                  data-label="Afgestudeerden"
                                  title={
                                    baseline
                                      ? `DUO-afgestudeerden ${baseline.year}`
                                      : undefined
                                  }
                                >
                                  {state === 'loading'
                                    ? 'Laden…'
                                    : state === 'error'
                                      ? 'Niet geladen'
                                      : baseline
                                        ? formatInterval(baseline)
                                        : displayYear
                                          ? `Onbekend (${displayYear})`
                                          : 'Onbekend'}
                                </td>
                                <td data-label="Aandeel (%)">
                                  <PercentageInput
                                    min={0}
                                    max={100}
                                    disabled={!included}
                                    label={`Aandeel ${course.name} richting ${profile.title}`}
                                    value={
                                      allocations[course.key]?.[selected] ??
                                      (allocation.value === null
                                        ? ''
                                        : String(allocation.value))
                                    }
                                    placeholder="Onbekend"
                                    onChange={(value) =>
                                      setAllocations((current) => {
                                        const record = {
                                          ...(current[course.key] ?? {}),
                                        };
                                        if (value === '') delete record[selected];
                                        else record[selected] = value;
                                        return { ...current, [course.key]: record };
                                      })
                                    }
                                  />
                                  {overridden && <small>Eigen aandeel</small>}
                                  {overridden && (
                                    <button
                                      type="button"
                                      className="text-button"
                                      aria-label={`Herstel automatisch aandeel ${course.name}`}
                                      onClick={() =>
                                        setAllocations((current) => {
                                          const record = {
                                            ...(current[course.key] ?? {}),
                                          };
                                          delete record[selected];
                                          return { ...current, [course.key]: record };
                                        })
                                      }
                                    >
                                      Herstel
                                    </button>
                                  )}
                                  {allocation.error && (
                                    <small role="alert">{allocation.error}</small>
                                  )}
                                </td>
                                <td data-label="Meetellen">
                                  <input
                                    type="checkbox"
                                    aria-label={`${course.name} meetellen`}
                                    checked={included}
                                    onChange={(event) =>
                                      setExcluded((current) => ({
                                        ...current,
                                        [`${selected}:${course.key}`]:
                                          !event.target.checked,
                                      }))
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                  {visibleCourses.length === 0 && (
                    <p role="status">Geen opleidingen gevonden.</p>
                  )}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setCourseFilter('');
                      setCourseQuery('');
                      setSourceYear('');
                    }}
                  >
                    Wis filters
                  </button>
                </div>
              )}
            </div>
            <div className="scenario-workspace-block scenario-labour-summary">
              <div className="scenario-block-heading">
                <h3>Werkenden en uitstroom</h3>
                <span className="scenario-badge">
                  {Object.values(labourValues).some((entry) => entry.origin === 'user')
                    ? 'Testinvoer'
                    : Object.values(labourValues).some((entry) => entry.source)
                      ? 'Brongegevens'
                      : 'Testinvoer'}
                </span>
              </div>
              {!Object.values(labourValues).some((entry) => entry.source) && (
                <p className="scenario-assumption">
                  Arbeidsmarktcijfers zijn nog niet gekoppeld. Vul voorlopig zelf
                  waarden in; beschikbare broncijfers worden later automatisch
                  toegevoegd.
                </p>
              )}
              <div className="scenario-input-grid scenario-labour-inputs">
                {(
                  [
                    ['stock', 'Werkenden in 2025'],
                    ['outflow', 'Uitstroom tot 2035'],
                    ['demand', 'Benodigd in 2035'],
                  ] as const
                ).map(([key, label]) => {
                  const entry = labourValues[key];
                  return (
                    <div key={key}>
                      <NumberField
                        label={label}
                        value={entry.value}
                        onChange={(value) => setLabourValue(key, value)}
                        placeholder="Aantal"
                        max={
                          key === 'outflow'
                            ? (parseAssumption(labour.stock) ?? undefined)
                            : undefined
                        }
                      />
                      {entry.source && (
                        <p className="scenario-value-origin">
                          {entry.origin === 'user'
                            ? 'Testinvoer (aangepast)'
                            : entry.origin === 'data'
                              ? 'Brongegevens'
                              : 'Zelf invullen · geen bronwaarde beschikbaar'}
                          {entry.source && (
                            <>
                              {' '}
                              ·{' '}
                              {entry.source.url ? (
                                <a href={entry.source.url}>{entry.source.source}</a>
                              ) : (
                                entry.source.source
                              )}{' '}
                              · peiljaar {entry.source.referenceYear}
                            </>
                          )}
                        </p>
                      )}
                      {entry.origin === 'user' && entry.source && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() =>
                            setLabourOverrides((current) =>
                              resetLabourValue(current, selected, key),
                            )
                          }
                        >
                          Herstel bronwaarde (
                          {entry.source.value.toLocaleString('nl-NL')})
                        </button>
                      )}
                      {entry.value !== '' && parseAssumption(entry.value) === null && (
                        <p role="alert" className="scenario-assumption">
                          Vul een geldig aantal van minimaal 0 in.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {parseAssumption(labour.stock) !== null &&
                parseAssumption(labour.outflow) !== null &&
                Number(labour.outflow) > Number(labour.stock) && (
                  <p role="alert">
                    De uitstroom kan niet groter zijn dan de startpopulatie.
                  </p>
                )}

              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setLabourOverrides((current) => {
                    const next = { ...current };
                    delete next[selected];
                    return next;
                  })
                }
              >
                Wis testinvoer
              </button>
            </div>
          </section>
          <section
            className="profile-section scenario-results scenario-result-card"
            aria-live="polite"
            aria-atomic="false"
            aria-labelledby="scenario-result-title"
          >
            <div className="scenario-result-heading">
              <p className="eyebrow">Arbeidsmarktbeeld 2035</p>
              {market && <span className="scenario-badge">Rekentool</span>}
            </div>
            <h2 id="scenario-result-title">
              {scenarios?.main?.title ??
                (market
                  ? 'Nog geen eenduidig arbeidsmarktbeeld'
                  : 'Ontbrekende gegevens')}
            </h2>
            {resultCopy ? (
              <p className="scenario-result-explanation">{resultCopy.explanation}</p>
            ) : (
              <p className="scenario-result-explanation">
                {market
                  ? 'De berekende balans en het AI-profiel ondersteunen geen van de vijf scenario’s voldoende. De beschikbare aantallen staan hieronder.'
                  : 'Vul de rekentool in om het arbeidsmarktbeeld voor 2035 te berekenen.'}
                {!complete &&
                  ' Voor de onderwijsinstroom ontbreken nog geldige cijfers of aannames.'}
              </p>
            )}
            {market && balanceDisplay && (
              <dl className="scenario-balance-summary">
                <div className="education-summary-card">
                  <dt>Berekend aanbod</dt>
                  <dd>{formatInterval(market.supply)}</dd>
                </div>
                <div className="education-summary-card">
                  <dt>Benodigd</dt>
                  <dd>
                    {formatInterval({ lower: market.demand, upper: market.demand })}
                  </dd>
                </div>
                <div className="education-summary-card">
                  <dt>{balanceDisplay.label}</dt>
                  <dd>{formatInterval(balanceDisplay.value)}</dd>
                </div>
              </dl>
            )}
            {resultCopy && (
              <div className="scenario-result-action">
                <h3>Mogelijke gevolgen</h3>
                <p>{resultCopy.consequences}</p>
              </div>
            )}
            {scenarios?.main?.id === 5 && related && (
              <p className="scenario-assumption">
                Aanvullende aanname: {related.title} heeft in 2035 een tekort van{' '}
                {formatInterval({
                  lower: Number(labour.shortage.replace(',', '.')),
                  upper: Number(labour.shortage.replace(',', '.')),
                })}{' '}
                professionals en omscholing is mogelijk.
              </p>
            )}
            {!!scenarios?.additional.length && (
              <details className="scenario-additional">
                <summary>
                  Aanvullende mogelijke ontwikkelingen ({scenarios.additional.length})
                </summary>
                {scenarios.additional.map((scenario) => {
                  const copy = scenarioResultCopy(scenario.id, ai)!;
                  return (
                    <div className="scenario-additional-item" key={scenario.id}>
                      <h3>{scenario.title}</h3>
                      <p>{copy.explanation}</p>
                      <h4>Mogelijke gevolgen</h4>
                      <p>{copy.consequences}</p>
                      {scenario.id === 5 && related && (
                        <p className="scenario-assumption">
                          Aanname: {related.title} heeft in 2035 een tekort van{' '}
                          {formatInterval({
                            lower: Number(labour.shortage.replace(',', '.')),
                            upper: Number(labour.shortage.replace(',', '.')),
                          })}{' '}
                          professionals en omscholing is mogelijk.
                        </p>
                      )}
                    </div>
                  );
                })}
              </details>
            )}
            {labour.reason && (
              <p className="scenario-assumption">
                Toelichting bij de aannames: {labour.reason}
              </p>
            )}
            <details className="framework-details scenario-overview">
              <summary>Uitleg en methode bij de vijf scenario’s</summary>
              <div className="framework-scroll">
                <table className="scenario-overview-table">
                  <caption>De vijf mogelijke ontwikkelingen richting 2035</caption>
                  <thead>
                    <tr>
                      <th scope="col">Scenario</th>
                      <th scope="col">Uitleg en voorwaarden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SCENARIOS.map((scenario) => (
                      <tr key={scenario.id}>
                        <th scope="row">{scenario.title}</th>
                        <td>{scenario.mechanism}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="scenario-assumption">
                De indeling volgt uit de berekende arbeidsmarktbalans en het vaste
                AI-profiel. De startersparadox en regionale mobiliteit vereisen
                aanvullende informatie of aannames; zonder voldoende gegevens wordt geen
                scenario gekozen.
              </p>
              <p className="source-caption">
                Berekening en verantwoording bij{' '}
                <a
                  className="scenario-analysis-link"
                  href="#methodologie/methodologie-scenario"
                >
                  Methodologie
                </a>
              </p>
            </details>
          </section>
        </>
      )}
    </section>
  );
}
