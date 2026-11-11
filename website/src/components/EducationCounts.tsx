import { lazy, Suspense, useEffect, useId, useState } from 'react';
import { educationChartTrend, trendSeries, includesCourse } from './educationTrendData';
import type { CourseSelection, CodePeriod } from './educationTrendData';
import { EducationSourceTable as CountTable } from './EducationSourceTable';
export { EducationSourceTable as CountTable } from './EducationSourceTable';
const EducationTrend = lazy(() =>
  import('./EducationTrend').then((module) => ({ default: module.EducationTrend })),
);

type EducationType = 'mbo' | 'hbo' | 'wo';
export type CountRow = Record<string, string>;
export type CountsState = { rows: CountRow[]; state: 'loading' | 'ready' | 'error' };
export function sharedTrendOptions(
  counts: CountsState[],
  type: EducationType,
  code: CourseSelection,
) {
  if (counts.length !== 2 || counts.some((entry) => entry.state !== 'ready'))
    return null;
  const [students, graduates] = counts.map((entry) =>
    trendSeries(entry.rows, type, code),
  );
  const keys = new Set(graduates.map((option) => option.value));
  return students.length > 0 &&
    students.length === graduates.length &&
    students.every((option) => keys.has(option.value))
    ? students
    : null;
}
const cache = new Map<string, CountRow[]>();

/** Read the existing semicolon CSV, including quoted delimiters and line breaks. */
export function parseEducationCsv(text: string): CountRow[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (char === ';' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('Onvolledig CSV-veld');
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [headers, ...values] = rows;
  if (
    !headers ||
    !['Jaar', 'Aantal', 'Geslacht'].every((key) => headers.includes(key))
  ) {
    throw new Error('Onbekend formaat onderwijsgegevens');
  }
  return values.map((values) => {
    if (values.length !== headers.length) throw new Error('Onvolledige gegevensrij');
    return Object.fromEntries(headers.map((key, index) => [key, values[index]]));
  });
}

export function selectCourseCounts(
  rows: CountRow[],
  type: EducationType,
  code: CourseSelection,
  year: string,
) {
  const field = type === 'mbo' ? 'Erkende opleiding code' : 'OPLEIDINGSCODE ACTUEEL';
  return rows.filter((row) => includesCourse(code, row[field]) && row.Jaar === year);
}

export function availableCountYears(
  counts: CountsState[],
  type: EducationType,
  code: CourseSelection,
) {
  const field = type === 'mbo' ? 'Erkende opleiding code' : 'OPLEIDINGSCODE ACTUEEL';
  return [
    ...new Set(
      counts.flatMap((entry) =>
        entry.state === 'ready'
          ? entry.rows
              .filter(
                (row) =>
                  includesCourse(code, row[field]) &&
                  /^(?:\d+|<\s*5)$/.test(row.Aantal.trim()) &&
                  /^\d{4}$/.test(row.Jaar),
              )
              .map((row) => row.Jaar)
          : [],
      ),
    ),
  ]
    .sort()
    .reverse();
}

export function selectCountYear(years: string[], requested?: string) {
  return requested && years.includes(requested)
    ? requested
    : ([...years].sort().at(-1) ?? requested ?? '');
}
export function countTableRows(
  rows: CountRow[],
  type: EducationType,
  code: CourseSelection,
  year: string,
  allYears = false,
) {
  const field = type === 'mbo' ? 'Erkende opleiding code' : 'OPLEIDINGSCODE ACTUEEL';
  return rows.filter(
    (row) => includesCourse(code, row[field]) && (allYears || row.Jaar === year),
  );
}

export function educationCountFile(type: EducationType, graduates = false) {
  return `${graduates ? 'afgestudeerden' : 'studenten'}_${type}_friesland.csv`;
}

export function filterMboCountInstitutions(
  rows: CountRow[],
  code: string,
  institutionsByYear: Record<string, string[]>,
) {
  // Other courses preserve file-wide year/category availability for the existing total logic.
  return rows.filter(
    (row) =>
      row['Erkende opleiding code'] !== code ||
      institutionsByYear[row.Jaar]?.includes(row.Instellingscode),
  );
}

export function selectEducationPopulation(
  rows: CountRow[],
  type: EducationType,
  code: CourseSelection,
  scopes: Record<string, Record<string, string[]>> = {},
) {
  if (type !== 'mbo') return rows;
  return rows.filter((row) => {
    const sourceCode = row['Erkende opleiding code'];
    if (!includesCourse(code, sourceCode)) return true;
    const allowed = scopes[sourceCode]?.[row.Jaar];
    // De geëxporteerde DUO-selectie blijft leidend wanneer alleen diplomagegevens voor een jaar bestaan.
    return !allowed || allowed.includes(row.Instellingscode);
  });
}

export function EducationCountCard({
  entry,
  type,
  code,
  year,
  title,
  periods,
}: {
  entry: CountsState;
  type: EducationType;
  code: CourseSelection;
  year: string;
  title: string;
  periods?: CodePeriod[];
  series?: string;
}) {
  const total = educationChartTrend(entry.rows, type, code, 'total', periods).find(
    (point) => point.year === year,
  );
  const exact = total?.value !== null && total?.value !== undefined;
  const range =
    total?.status === 'suppressed' &&
    total.lower !== undefined &&
    total.upper !== undefined;
  return (
    <article className="education-summary-card">
      <h3>
        {title} in {year}
      </h3>
      {entry.state === 'loading' ? (
        <p role="status">Cijfers laden…</p>
      ) : entry.state === 'error' ? (
        <p>Cijfers niet geladen</p>
      ) : (
        <>
          {exact ? (
            <p className="education-summary-value">
              {total.value!.toLocaleString('nl-NL')}
            </p>
          ) : range ? (
            <>
              <p className="education-summary-value">
                {total!.lower!.toLocaleString('nl-NL')}–
                {total!.upper!.toLocaleString('nl-NL')}
              </p>
              <p className="education-summary-scope education-range-label">
                Bandbreedte{' '}
                <EducationInfo text="Een bandbreedte toont het minimum en maximum. Elk afgeschermd aantal ‘minder dan 5’ telt mee als 0 tot en met 4." />
              </p>
            </>
          ) : (
            <div className="education-summary-unavailable">
              {!selectCourseCounts(entry.rows, type, code, year).length ? (
                <p className="education-summary-scope">
                  Voor {year} bevat de bron geen cijfers voor deze opleiding.
                </p>
              ) : (
                <p>Geen volledig totaal beschikbaar</p>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}

export function EducationSummaryCards({
  occupationCount,
  occupationLoading = false,
  counts,
  ...props
}: {
  occupationCount: number | null;
  occupationLoading?: boolean;
  counts: CountsState[];
  type: EducationType;
  code: CourseSelection;
  year: string;
  periods?: CodePeriod[];
  seriesValues?: string[];
}) {
  return (
    <div className="education-summary-grid education-overview-grid">
      {counts.map((entry, index) => (
        <EducationCountCard
          key={index}
          {...props}
          entry={entry}
          title={index === 0 ? 'Studenten' : 'Afgestudeerden'}
          series={props.seriesValues?.[index]}
        />
      ))}
      <article className="education-summary-card">
        <h3>Aansluitende beroepsgroepen</h3>
        <p className="education-summary-value">
          {occupationCount ?? (occupationLoading ? '…' : 'Niet beschikbaar')}
        </p>
      </article>
    </div>
  );
}

export function useEducationCounts(type: EducationType) {
  const [loadedType, setLoadedType] = useState(type);
  const [counts, setCounts] = useState<CountsState[]>([
    { rows: [], state: 'loading' },
    { rows: [], state: 'loading' },
  ]);
  useEffect(() => {
    const controller = new AbortController();
    setLoadedType(type);
    setCounts([
      { rows: [], state: 'loading' },
      { rows: [], state: 'loading' },
    ]);
    const files = [educationCountFile(type), educationCountFile(type, true)];
    files.forEach(async (file, index) => {
      try {
        let rows = cache.get(file);
        if (!rows) {
          const response = await fetch(
            `${import.meta.env.BASE_URL}data/research/${file}`,
            { signal: controller.signal },
          );
          if (!response.ok) throw new Error('Bestand niet beschikbaar');
          rows = parseEducationCsv(await response.text());
          cache.set(file, rows);
        }
        if (!controller.signal.aborted)
          setCounts((current) =>
            current.map((entry, i) =>
              i === index ? { rows: rows!, state: 'ready' } : entry,
            ),
          );
      } catch {
        if (!controller.signal.aborted)
          setCounts((current) =>
            current.map((entry, i) =>
              i === index ? { rows: [], state: 'error' } : entry,
            ),
          );
      }
    });
    return () => controller.abort();
  }, [type]);
  return loadedType === type
    ? counts
    : ([
        { rows: [], state: 'loading' },
        { rows: [], state: 'loading' },
      ] as CountsState[]);
}

export function EducationCounts({
  type,
  code,
  year,
  institutionsByYear,
  periods,
  onYearChange,
}: {
  type: EducationType;
  code: CourseSelection;
  year: string;
  institutionsByYear?: Record<string, string[]>;
  periods?: CodePeriod[];
  onYearChange?: (year: string) => void;
}) {
  const counts = useEducationCounts(type);
  const selectedCounts =
    type === 'mbo' && typeof code === 'string' && institutionsByYear
      ? counts.map((entry) => ({
          ...entry,
          rows: filterMboCountInstitutions(entry.rows, code, institutionsByYear),
        }))
      : counts;
  const years = availableCountYears(selectedCounts, type, code);
  const effectiveYear = counts.some((entry) => entry.state === 'loading')
    ? year
    : selectCountYear(years, year);
  useEffect(() => {
    if (
      !counts.some((entry) => entry.state === 'loading') &&
      effectiveYear &&
      effectiveYear !== year
    )
      onYearChange?.(effectiveYear);
  }, [effectiveYear, year, counts, onYearChange]);
  return (
    <EducationFigures
      periods={periods}
      counts={selectedCounts}
      type={type}
      code={code}
      year={effectiveYear}
      onYearChange={onYearChange}
    />
  );
}

export function EducationFigures({
  periods,
  counts,
  type,
  code,
  year,
  onYearChange,
  showTables = true,
  showSummary = true,
  showYearControl = true,
  showCode = true,
  seriesValues,
  onSeriesChange,
}: {
  periods?: CodePeriod[];
  counts: CountsState[];
  type: EducationType;
  code: CourseSelection;
  year: string;
  onYearChange?: (year: string) => void;
  showTables?: boolean;
  showSummary?: boolean;
  showYearControl?: boolean;
  showCode?: boolean;
  seriesValues?: string[];
  onSeriesChange?: (index: number, value: string) => void;
}) {
  const id = useId();
  const years = availableCountYears(counts, type, code);
  return (
    <>
      <section
        className="profile-section education-development"
        aria-labelledby="education-count-heading"
      >
        <p className="eyebrow">Ontwikkeling</p>
        <div className="education-count-heading">
          <h2 id="education-count-heading">Studenten en afgestudeerden</h2>
          {showYearControl && (
            <label className="education-count-year" htmlFor={`${id}-year`}>
              Cijfers voor
              <select
                id={`${id}-year`}
                value={years.includes(year) ? year : ''}
                disabled={
                  !onYearChange ||
                  counts.some((entry) => entry.state === 'loading') ||
                  !years.length
                }
                onChange={(event) => onYearChange?.(event.target.value)}
              >
                {!years.length && (
                  <option value="">
                    {counts.some((entry) => entry.state === 'loading')
                      ? 'Jaren laden…'
                      : 'Geen gegevensjaren'}
                  </option>
                )}
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {showCode && (
          <p className="education-count-code">
            {Array.isArray(code) ? 'Meegetelde opleidingscodes' : 'Opleidingscode'}{' '}
            <strong>{Array.isArray(code) ? code.join(', ') : code}</strong>.
          </p>
        )}
        {showSummary && (
          <div className="education-summary-grid">
            {counts.map((entry, index) => (
              <EducationCountCard
                key={index}
                entry={entry}
                type={type}
                code={code}
                year={year}
                title={index === 0 ? 'Studenten' : 'Afgestudeerden'}
                periods={periods}
                series={seriesValues?.[index]}
              />
            ))}
          </div>
        )}
        <div className="education-chart-grid">
          {counts.map((entry, index) => {
            const title = index === 0 ? 'Studenten' : 'Afgestudeerden';
            return (
              <div key={title}>
                {entry.state === 'ready' ? (
                  <Suspense fallback={<p role="status">Grafiek laden…</p>}>
                    <EducationTrend
                      periods={periods}
                      rows={entry.rows}
                      type={type}
                      code={code}
                      title={title}
                      selectedYear={year}
                      series={seriesValues?.[index]}
                      onSeriesChange={
                        onSeriesChange
                          ? (value) => onSeriesChange(index, value)
                          : undefined
                      }
                      hideNote
                    />
                  </Suspense>
                ) : (
                  <div className="education-chart-placeholder">
                    <h3>Aantal {title.toLowerCase()}</h3>
                    <p role={entry.state === 'error' ? 'alert' : 'status'}>
                      {entry.state === 'error'
                        ? 'Deze cijfers konden niet worden geladen.'
                        : 'Grafiek laden…'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      {showTables && (
        <EducationDetailedFigures counts={counts} type={type} code={code} year={year} />
      )}
    </>
  );
}

export function EducationDetailedFigures({
  counts,
  type,
  code,
  year,
}: {
  counts: CountsState[];
  type: EducationType;
  code: CourseSelection;
  year: string;
}) {
  const [tab, setTab] = useState(0);
  const id = useId();
  const title = tab === 0 ? 'Studenten' : 'Afgestudeerden';
  const entry = counts[tab];
  const rows = countTableRows(entry.rows, type, code, year, true);
  return (
    <section className="profile-section education-detailed-figures">
      <p className="eyebrow">Tabelweergave</p>
      <h2>Gedetailleerde cijfers</h2>
      <div className="education-data-tabs" role="tablist" aria-label="Onderwijscijfers">
        {['Studenten', 'Afgestudeerden'].map((label, index) => (
          <button
            type="button"
            role="tab"
            key={label}
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel`}
            aria-selected={tab === index}
            tabIndex={tab === index ? 0 : -1}
            onClick={() => setTab(index)}
            onKeyDown={(event) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next =
                  event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - tab;
                setTab(next);
                document.getElementById(`${id}-tab-${next}`)?.focus();
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`}>
        {entry.state === 'loading' ? (
          <p role="status">Cijfers laden…</p>
        ) : entry.state === 'error' ? (
          <p role="alert">Cijfers konden niet worden geladen.</p>
        ) : rows.length ? (
          <CountTable
            key={tab}
            rows={rows}
            type={type}
            title={title}
            year="alle beschikbare jaren"
          />
        ) : (
          <p>Voor deze opleiding zijn geen {title.toLowerCase()}cijfers opgenomen.</p>
        )}
      </div>
    </section>
  );
}

export function EducationInfo({ text }: { text: string }) {
  const id = useId();
  return (
    <span className="education-help">
      <button
        type="button"
        className="education-info"
        aria-label={text}
        aria-describedby={id}
      >
        <svg
          width="10"
          height="12"
          viewBox="0 0 10 12"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M5 2.5v4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="5" cy="9" r=".85" fill="currentColor" />
        </svg>
      </button>
      <span id={id} role="tooltip" className="education-help-tooltip">
        {text}
      </span>
    </span>
  );
}
