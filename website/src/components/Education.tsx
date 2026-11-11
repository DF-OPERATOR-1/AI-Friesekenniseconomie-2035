import { EducationPagination } from './EducationSourceTable';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  EducationFigures,
  EducationDetailedFigures,
  EducationSummaryCards,
  useEducationCounts,
  selectEducationPopulation,
  selectCountYear,
  availableCountYears,
} from './EducationCounts';
import {
  EducationOccupationPanel,
  useEducationOccupations,
} from './EducationOccupationPanel';
import { HoSource } from './HoOccupations';
import { pathwaySummary } from './educationPathways';
export { pathwaySummary } from './educationPathways';

type CourseYear = {
  names: string[];
  levels: string[];
  pathways: string[];
  institutions: string[];
  qualifications: { code: string; name: string }[];
  mapping_status: string;
  offer_names?: string[];
  offer_source_urls?: string[];
  places?: string[];
  source_file?: string;
  pathway_sources?: Record<string, string[]>;
};
type Course = {
  occupations?: { code: string; name: string; kind: string; degree: string }[];
  code: string;
  education_type: 'mbo' | 'hbo' | 'wo';
  years: Record<string, CourseYear>;
};
type CodeFamily = {
  id: string;
  education_type: string;
  name: string;
  codes: {
    code: string;
    status: string;
    start: string;
    entry_until: string;
    end: string;
  }[];
  sources: string[];
};
export type EducationData = {
  code_families?: CodeFamily[];
  courses: Course[];
  sources: { year: number; cohort: string; file: string }[];
};
export const courseCodeFamily = (data: EducationData, course: Course) =>
  data.code_families?.find(
    (family) =>
      family.education_type === course.education_type &&
      family.codes.some((entry) => entry.code === course.code),
  );
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('nl');

export function levelLabel(level: string) {
  const labels: Record<string, string> = {
    'associate degree': 'Associate degree',
    bachelor: 'Bachelor',
    master: 'Master',
  };
  return /^\d+$/.test(level) ? `Niveau ${level}` : (labels[level] ?? level);
}

export function availableLevels(courses: Course[], year: string, type = '') {
  const order = ['1', '2', '3', '4', 'associate degree', 'bachelor', 'master'];
  const levels = [
    ...new Set(
      courses
        .filter((c) => !type || c.education_type === type)
        .flatMap((c) => c.years[year]?.levels ?? []),
    ),
  ];
  return levels.sort((a, b) => {
    const left = order.indexOf(a),
      right = order.indexOf(b);
    return (
      (left < 0 ? order.length : left) - (right < 0 ? order.length : right) ||
      a.localeCompare(b, 'nl')
    );
  });
}

export function filterCourses(
  courses: Course[],
  year: string,
  level: string,
  query: string,
  educationType = '',
) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return courses
    .flatMap((course) =>
      course.years[year] ? [{ ...course, current: course.years[year] }] : [],
    )
    .filter(({ code, current, education_type }) => {
      const haystack = normalize(
        [
          code,
          ...current.names,
          ...current.institutions,
          ...(current.places ?? []),
          ...current.qualifications.flatMap((q) => [q.code, q.name]),
          ...current.pathways,
          pathwaySummary(current.pathways, education_type),
          ...(current.offer_names ?? []),
        ].join(' '),
      );
      return (
        (!educationType || education_type === educationType) &&
        (!level || current.levels.includes(level)) &&
        terms.every((term) => haystack.includes(term))
      );
    })
    .sort((a, b) => a.current.names[0].localeCompare(b.current.names[0], 'nl'));
}

export function groupCourseResults(results: ReturnType<typeof filterCourses>) {
  const groups = new Map<string, typeof results>();
  for (const course of results) {
    // Groepeer naam en niveau; de detailweergave behoudt de oorspronkelijke broncodes.
    const names = course.current.names
      .map((name) =>
        normalize(name)
          .replace(/[^\p{L}\p{N}]+/gu, ' ')
          .trim(),
      )
      .sort()
      .join('|');
    const key =
      course.education_type === 'mbo'
        ? `mbo:${[...course.current.levels].sort().join(',')}:${names}`
        : `${course.education_type}:${course.code}`;
    const group = groups.get(key) ?? [];
    group.push(course);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((registrations) => {
      registrations.sort((a, b) => a.code.localeCompare(b.code));
      const primary = registrations[0];
      const merge = (field: 'names' | 'levels' | 'institutions' | 'pathways') =>
        [...new Set(registrations.flatMap((c) => c.current[field]))].sort((a, b) =>
          a.localeCompare(b, 'nl'),
        );
      return {
        ...primary,
        registrations,
        current: {
          ...primary.current,
          names: primary.current.names,
          levels: merge('levels'),
          institutions: merge('institutions'),
          pathways: merge('pathways'),
        },
      };
    })
    .sort((a, b) => a.current.names[0].localeCompare(b.current.names[0], 'nl'));
}

// Zoek in bronregistraties, maar behoud op de kaart de volledige opleidingsgroep.
export function filteredCourseGroups(
  courses: Course[],
  year: string,
  level: string,
  query: string,
  educationType = '',
) {
  const matches = new Set(
    filterCourses(courses, year, level, query, educationType).map(
      (course) => `${course.education_type}:${course.code}`,
    ),
  );
  return groupCourseResults(filterCourses(courses, year, '', '', educationType)).filter(
    (group) =>
      group.registrations.some((registration) =>
        matches.has(`${registration.education_type}:${registration.code}`),
      ),
  );
}

// Combine codes only when their equivalence has been checked against an official source.
export function courseCountGroup(data: EducationData, course: Course) {
  if (course.education_type !== 'mbo') return [course];
  const codes = new Set([course.code]);
  const groups = (data.code_families ?? [])
    .filter((f) => f.education_type === 'mbo')
    .map((f) => f.codes.map((entry) => entry.code));
  let changed = true;
  while (changed) {
    const before = codes.size;
    for (const group of groups) {
      if (group.some((code) => codes.has(code)))
        group.forEach((code) => codes.add(code));
    }
    changed = codes.size !== before;
  }
  return data.courses
    .filter(
      (candidate) => candidate.education_type === 'mbo' && codes.has(candidate.code),
    )
    .sort((a, b) => a.code.localeCompare(b.code));
}
export function courseCountCodes(data: EducationData, course: Course) {
  const family = courseCodeFamily(data, course);
  if (family?.codes.length) return family.codes.map((entry) => entry.code);
  const registrations = courseCountGroup(data, course);
  return registrations.length > 1
    ? registrations.map((entry) => entry.code)
    : course.code;
}
export function courseCountPeriods(data: EducationData, course: Course) {
  return courseCountGroup(data, course).map((candidate) => {
    const official = data.code_families
      ?.flatMap((f) => f.codes)
      .find((entry) => entry.code === candidate.code);
    if (official) return official;
    const years = Object.keys(candidate.years).sort();
    // Observed source-year coverage, not an official validity period.
    return {
      code: candidate.code,
      start: `${years[0]}0101`,
      end: `${Number(years.at(-1)) + 1}0101`,
    };
  });
}
export function courseRoute(hash: string) {
  const match = /^#opleiding\/(mbo|hbo|wo)\/(\d+)\/(202[1-5])$/.exec(
    hash.split('?')[0],
  );
  return match ? { type: match[1], code: match[2], year: match[3] } : null;
}
export function courseHref(type: string, code: string, year: string) {
  return `#opleiding/${type}/${code}/${year}`;
}
export function figuresRouteYear(route: string) {
  const value = new URLSearchParams(route.split('?')[1] ?? '').get('cijfers');
  return value && /^\d{4}$/.test(value) ? value : undefined;
}
export function courseFiguresHref(
  type: string,
  code: string,
  year: string,
  figuresYear: string,
) {
  return `${courseHref(type, code, year)}?cijfers=${encodeURIComponent(figuresYear)}`;
}
export function overviewHref(year: string) {
  return `#opleidingen?jaar=${encodeURIComponent(year)}`;
}
export function overviewRouteYear(route: string) {
  const value = new URLSearchParams(route.split('?')[1] ?? '').get('jaar');
  return route.split('?')[0] === '#opleidingen' && value && /^\d{4}$/.test(value)
    ? value
    : undefined;
}
export function availableOverviewYears(courses: Course[]) {
  return [...new Set(courses.flatMap((course) => Object.keys(course.years)))]
    .sort()
    .reverse();
}
export function restoredOverviewYear(
  route: string,
  previousRoute: string,
  year: string,
  years: string[] = [],
) {
  const selected = courseRoute(previousRoute)
    ? year
    : (overviewRouteYear(route) ?? year);
  return !years.length || years.includes(selected) ? selected : years[0];
}
const institutionName = (name: string) => name.replace(/\s+\([A-Z0-9]{4}\)$/, '');
export function EducationCard({
  course,
  current,
  year,
}: {
  course: Course;
  current: CourseYear;
  year: string;
}) {
  const id = `course-${course.education_type}-${course.code}`;
  return (
    <a
      className="education-card"
      href={courseHref(course.education_type, course.code, year)}
      aria-labelledby={id}
    >
      <p className="education-card-label">
        {course.education_type.toUpperCase()}
        {current.levels.length > 0 && ` ${current.levels.map(levelLabel).join(' / ')}`}
      </p>
      <h2 id={id}>{current.names.join(' / ')}</h2>
      <p className="education-institution">
        {current.institutions.map(institutionName).join(' & ')}
      </p>
      <p className="education-pathways">
        {pathwaySummary(current.pathways, course.education_type)}
      </p>
    </a>
  );
}
export function EducationDetail({
  course,
  year,
  data,
  figuresYear,
  onFiguresYearChange,
}: {
  course: Course;
  year: string;
  data: EducationData;
  figuresYear?: string;
  onFiguresYearChange?: (year: string) => void;
}) {
  const [countYear, setCountYear] = useState(figuresYear ?? year);
  useEffect(
    () => setCountYear(figuresYear ?? year),
    [figuresYear, year, course.code, course.education_type],
  );
  useEffect(() => onFiguresYearChange?.(countYear), [countYear, onFiguresYearChange]);
  const changeCountYear = (value: string) => {
    setCountYear(value);
    window.history.replaceState(
      window.history.state,
      '',
      courseFiguresHref(course.education_type, course.code, year, value),
    );
  };
  const current = course.years[year];
  const registrations = courseCountGroup(data, course);
  const family = courseCodeFamily(data, course);
  // Include old diploma-only codes even when they have no enrolment detail page.
  const countCodes = courseCountCodes(data, course);
  const countPeriods =
    family?.codes ??
    (registrations.length > 1 ? courseCountPeriods(data, course) : undefined);
  const counts = useEducationCounts(course.education_type);
  const scopes = Object.fromEntries(
    registrations.map((registration) => [
      registration.code,
      Object.fromEntries(
        Object.entries(registration.years).map(([y, value]) => [
          y,
          value.institutions
            .map((label) => label.match(/\(([A-Z0-9]{4})\)$/)?.[1])
            .filter((value): value is string => Boolean(value)),
        ]),
      ),
    ]),
  );
  const selectedCounts = useMemo(
    () =>
      counts.map((entry) => ({
        ...entry,
        rows: selectEducationPopulation(
          entry.rows,
          course.education_type,
          countCodes,
          scopes,
        ),
      })),
    [counts, course.education_type, JSON.stringify(countCodes), JSON.stringify(scopes)],
  );
  const countYears = availableCountYears(
    selectedCounts,
    course.education_type,
    countCodes,
  );
  const effectiveYear = counts.some((entry) => entry.state === 'loading')
    ? countYear
    : selectCountYear(countYears, countYear);
  const [seriesValues, setSeriesValues] = useState(['total', 'total']);
  const occupations = useEducationOccupations(
    course.education_type,
    course.code,
    course.occupations ?? [],
    current.levels,
  );
  const overviewYears = availableOverviewYears(data.courses);
  const returnYear = overviewYears.includes(countYear)
    ? countYear
    : (overviewYears[0] ?? year);
  return (
    <div className="occupation-profile education-detail">
      <section className="profile-header">
        <div className="container">
          <a className="profile-back" href={overviewHref(returnYear)}>
            Terug naar alle opleidingen
          </a>
          <div className="education-header-meta">
            <p className="eyebrow">
              {course.education_type.toUpperCase()}
              {current.levels.length > 0 &&
                ` ${current.levels.map(levelLabel).join(' / ')}`}
            </p>
            <label className="education-count-year">
              Cijfers voor
              <select
                value={countYears.includes(effectiveYear) ? effectiveYear : ''}
                disabled={!countYears.length}
                onChange={(event) => changeCountYear(event.target.value)}
              >
                {!countYears.length && <option value="">Cijfers laden…</option>}
                {countYears.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <h1>{current.names.join(' / ')}</h1>
          <p className="education-detail-institutions">
            {current.institutions.map(institutionName).join(' & ')}
          </p>
          <p className="education-detail-pathways">
            {pathwaySummary(current.pathways, course.education_type)}
          </p>
        </div>
      </section>
      <div className="container">
        <section
          className="profile-section education-overview"
          aria-label="Opleiding in cijfers"
        >
          <EducationSummaryCards
            occupationLoading={occupations.loading}
            occupationCount={
              occupations.loading || occupations.error
                ? null
                : occupations.matches.length
            }
            counts={selectedCounts}
            type={course.education_type}
            code={countCodes}
            periods={countPeriods}
            year={effectiveYear}
            seriesValues={seriesValues}
          />
        </section>
        <EducationFigures
          counts={selectedCounts}
          type={course.education_type}
          code={countCodes}
          periods={countPeriods}
          year={effectiveYear}
          onYearChange={changeCountYear}
          showSummary={false}
          seriesValues={seriesValues}
          onSeriesChange={(index, value) =>
            setSeriesValues((current) =>
              current.map((series, i) => (index === i ? value : series)),
            )
          }
          showYearControl={false}
          showCode={false}
          showTables={false}
        />
        <EducationOccupationPanel
          {...occupations}
          qualifications={current.qualifications}
        />
        {course.education_type !== 'mbo' && (
          <div className="education-inline-source">
            <HoSource />
          </div>
        )}
        {course.education_type === 'mbo' && occupations.matches.length > 0 && (
          <p className="education-inline-source">
            Bronnen beroepskoppelingen: CompetentNL —{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/deed.nl">CC BY 4.0</a>,
            bewerkt; Europese Commissie,{' '}
            <a href="https://esco.ec.europa.eu/en/classification">ESCO v1.2.1</a>. Deze
            dienst maakt gebruik van de ESCO-classificatie van de Europese Commissie.
            Koppeling en beoordeling: DataFryslân.
          </p>
        )}

        <EducationDetailedFigures
          counts={selectedCounts}
          type={course.education_type}
          code={countCodes}
          year={effectiveYear}
        />
      </div>
    </div>
  );
}

export function Education({ route = '' }: { route?: string }) {
  const [data, setData] = useState<EducationData | null>(null);
  const [error, setError] = useState(false);
  const [year, setYear] = useState(
    () => courseRoute(route)?.year ?? overviewRouteYear(route) ?? '2025',
  );
  const previousRoute = useRef(route);
  const [level, setLevel] = useState('');
  const [educationType, setEducationType] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/atlas/opleidingen.json`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(true);
      });
    return () => controller.abort();
  }, []);
  const found = useMemo(
    () => filteredCourseGroups(data?.courses ?? [], year, level, query, educationType),
    [data, year, level, query, educationType],
  );
  useEffect(() => setPage(0), [year, level, query, educationType]);
  const pages = Math.max(1, Math.ceil(found.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const changePage = (value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const selected = courseRoute(route);
  const overviewYears = availableOverviewYears(data?.courses ?? []);
  useEffect(() => {
    if (selected) setYear(figuresRouteYear(route) ?? selected.year);
    else if (route.split('?')[0] === '#opleidingen') {
      const restored = restoredOverviewYear(
        route,
        previousRoute.current,
        year,
        overviewYears,
      );
      setYear(restored);
      if (
        courseRoute(previousRoute.current) ||
        (overviewRouteYear(route) && overviewRouteYear(route) !== restored)
      )
        window.history.replaceState(window.history.state, '', overviewHref(restored));
    }
    previousRoute.current = route;
  }, [route, data]);
  if (route.startsWith('#opleiding/')) {
    if (!data && !error)
      return (
        <section className="container section">
          <p role="status">Opleiding laden…</p>
        </section>
      );
    if (error)
      return (
        <section className="container section">
          <p role="alert">De opleiding kon niet worden geladen.</p>
          <a href="#opleidingen">Terug naar alle opleidingen</a>
        </section>
      );
    const course = data?.courses.find(
      (c) =>
        c.education_type === selected?.type &&
        c.code === selected?.code &&
        Boolean(c.years[selected?.year ?? '']),
    );
    if (!selected || !course || !data)
      return (
        <section className="container section">
          <h1>Opleiding niet gevonden</h1>
          <p>Deze opleiding is voor dit jaar niet opgenomen in onze gegevens.</p>
          <a href="#opleidingen">Terug naar alle opleidingen</a>
        </section>
      );
    return (
      <EducationDetail
        key={`${course.education_type}:${course.code}:${selected.year}`}
        course={course}
        year={selected.year}
        data={data}
        figuresYear={figuresRouteYear(route)}
        onFiguresYearChange={setYear}
      />
    );
  }
  return (
    <section className="container section education-page">
      <p className="eyebrow">OPLEIDINGEN & BEROEPEN</p>
      <h1 className="overview-page-title">Opleidingen en bijbehorende beroepen</h1>
      <p className="education-intro">
        Ontdek welke opleidingen in Fryslân worden aangeboden en welke beroepen daarbij
        aansluiten.
      </p>
      <div
        className="research-controls education-controls"
        role="search"
        aria-label="Opleidingen zoeken"
      >
        <label htmlFor="course-search">
          Zoek een opleiding
          <input
            id="course-search"
            type="search"
            value={query}
            placeholder="Bijvoorbeeld verpleegkunde of techniek"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label htmlFor="course-year">
          Jaar
          <select
            id="course-year"
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
              window.history.replaceState(
                window.history.state,
                '',
                overviewHref(event.target.value),
              );
            }}
          >
            {overviewYears.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label htmlFor="course-type">
          Onderwijssoort
          <select
            id="course-type"
            value={educationType}
            onChange={(event) => {
              setEducationType(event.target.value);
              setLevel('');
            }}
          >
            <option value="">Alle onderwijssoorten</option>
            <option value="mbo">Mbo</option>
            <option value="hbo">Hbo</option>
            <option value="wo">Wo</option>
          </select>
        </label>
        <label htmlFor="course-level">
          Niveau
          <select
            id="course-level"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          >
            <option value="">Alle niveaus</option>
            {availableLevels(data?.courses ?? [], year, educationType).map((n) => (
              <option value={n} key={n}>
                {levelLabel(n)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        className="education-results"
        role="region"
        aria-label="Opleidingenoverzicht"
        key={`${year}:${level}:${query}:${educationType}`}
      >
        {error && (
          <p role="alert">
            Opleidingen konden niet worden geladen. Vernieuw de pagina.
          </p>
        )}
        {!data && !error && <p role="status">Opleidingen laden…</p>}
        {data && (
          <>
            <p className="occupation-result-count" role="status">
              {found.length} opleidingen in {year}
            </p>
            {!found.length && (
              <p>
                Geen opleidingen gevonden. Probeer een andere zoekterm, een ander niveau
                of jaar.
              </p>
            )}
            <div className="education-grid">
              {found
                .slice(currentPage * pageSize, (currentPage + 1) * pageSize)
                .map((course) => (
                  <EducationCard
                    key={`${course.education_type}:${course.code}`}
                    course={course}
                    current={course.current}
                    year={year}
                  />
                ))}
            </div>
            {found.length > 0 && (
              <EducationPagination
                label="Paginering opleidingen"
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
          </>
        )}
      </div>
    </section>
  );
}
