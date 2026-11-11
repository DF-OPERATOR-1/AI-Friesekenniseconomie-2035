import { useEffect, useId, useState } from 'react';
import {
  nationalCoursesForOccupation,
  loadNationalHoCourses,
} from './nationalHoCourses';
import type { NationalHoCourse } from './nationalHoCourses';
import { loadMatches } from './MboMatches';
import type { MboRelation } from './MboMatches';

type Courses = NationalHoCourse[];
const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('nl');
export function filterOccupationCourses<T extends { name: string; year?: string }>(
  items: T[],
  query: string,
  onlyFriesland: boolean,
) {
  const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  return items.filter(
    (item) =>
      (!onlyFriesland || Boolean(item.year)) &&
      terms.every((term) => normalizeSearch(item.name).includes(term)),
  );
}

function EducationIcon() {
  return (
    <svg
      className="occupation-course-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m2 8 10-5 10 5-10 5L2 8Z" />
      <path d="M6 10v6c3.5 3 8.5 3 12 0v-6M22 8v6" />
    </svg>
  );
}

export function mboCoursesForOccupation(relations: MboRelation[], isco: string) {
  const groups = new Map<
    string,
    { code: string; name: string; year: string; relations: MboRelation[] }
  >();
  for (const relation of relations) {
    if (relation.isco !== isco) continue;
    const year = [...relation.years].sort().at(-1);
    if (!year) continue;
    const group = groups.get(relation.code) ?? {
      code: relation.code,
      name: relation.course_name,
      year,
      relations: [],
    };
    if (year > group.year) {
      group.year = year;
      group.name = relation.course_name;
    }
    if (
      !group.relations.some(
        (existing) => JSON.stringify(existing) === JSON.stringify(relation),
      )
    )
      group.relations.push(relation);
    groups.set(relation.code, group);
  }
  return [...groups.values()].sort(
    (a, b) => a.name.localeCompare(b.name, 'nl') || a.code.localeCompare(b.code),
  );
}

export function OccupationCourseContent({
  isco,
  courses,
  relations,
  hoError = false,
  mboError = false,
}: {
  isco: string;
  courses: Courses | null;
  relations: MboRelation[] | null;
  hoError?: boolean;
  mboError?: boolean;
}) {
  const controlId = useId();
  const [query, setQuery] = useState('');
  const [onlyFriesland, setOnlyFriesland] = useState(false);
  const mbo = mboCoursesForOccupation(relations ?? [], isco);
  const ho = [
    ...new Map(
      nationalCoursesForOccupation(courses ?? [], isco).map((course) => [
        `${course.type}:${course.code}`,
        course,
      ]),
    ).values(),
  ];
  const levels = (['mbo', 'hbo', 'wo'] as const).map((type) => {
    const allItems = ho.filter((course) => course.type === type);
    const items = filterOccupationCourses(allItems, query, onlyFriesland);
    const mboItems = filterOccupationCourses(mbo, query, onlyFriesland);
    const total = type === 'mbo' ? mbo.length : allItems.length;
    const ready = type === 'mbo' ? relations !== null : courses !== null;
    const error = type === 'mbo' ? mboError : hoError;
    const count = type === 'mbo' ? mboItems.length : items.length;
    const visibleMbo = mboItems;
    const orderedItems = [
      ...items.filter((item) => item.kind === 'DIRECT'),
      ...items.filter((item) => item.kind !== 'DIRECT'),
    ];
    const visibleItems = orderedItems;
    const countText = count === total ? String(count) : `${count} van ${total}`;
    const label = { mbo: 'Mbo', hbo: 'Hbo', wo: 'Wo' }[type];
    return {
      type,
      total,
      ready,
      error,
      count,
      visibleMbo,
      visibleItems,
      countText,
      label,
    };
  });
  return (
    <section className="profile-section profile-education-section">
      <p className="eyebrow">Opleidingen</p>
      <div className="occupation-courses">
        <h2>Welke opleidingen sluiten aan bij deze beroepsgroep?</h2>
        <p>
          Ontdek welke opleidingen aansluiten bij deze beroepsgroep. Een opleiding kan
          toegang bieden tot verschillende beroepen en leidt niet automatisch tot een
          specifiek beroep.
        </p>
        <div className="occupation-course-grid">
          {levels.map(({ type, label, error, ready, count, total, countText }) => (
            <div className="occupation-course-kpi" key={type}>
              <header className="occupation-course-heading">
                <h3 className="occupation-course-label">{label}</h3>
                <p className="occupation-course-count" aria-live="polite">
                  {error
                    ? 'Niet beschikbaar'
                    : !ready
                      ? 'Opleidingen laden…'
                      : type === 'mbo'
                        ? `${countText} voorgestelde ${count === 1 && count === total ? 'koppeling' : 'koppelingen'}`
                        : `${countText} ${count === 1 && count === total ? 'opleiding' : 'opleidingen'}`}
                </p>
              </header>
            </div>
          ))}
        </div>
        <div className="occupation-course-results">
          <div className="occupation-course-results-heading">
            <h3>Gekoppelde opleidingen</h3>
          </div>
          <div
            className="occupation-course-controls"
            role="search"
            aria-label="Gekoppelde opleidingen zoeken"
          >
            <label htmlFor={`${controlId}-search`}>
              Zoek een opleiding
              <input
                id={`${controlId}-search`}
                type="search"
                value={query}
                placeholder="Zoek op opleidingsnaam…"
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
              />
            </label>
            <label
              className="occupation-course-region-filter"
              htmlFor={`${controlId}-region`}
            >
              <input
                id={`${controlId}-region`}
                type="checkbox"
                checked={onlyFriesland}
                onChange={(event) => {
                  setOnlyFriesland(event.target.checked);
                }}
              />
              Alleen aangeboden in Fryslân
            </label>
          </div>
          {levels.every(
            (level) => level.ready && !level.error && level.count === 0,
          ) && (
            <p role="status">
              {levels.some((level) => level.total > 0)
                ? 'Geen opleidingen gevonden met deze zoekopdracht of dit filter.'
                : 'Voor deze beroepsgroep zijn nog geen gekoppelde opleidingen beschikbaar. Dit betekent niet dat er geen passende opleiding bestaat.'}
            </p>
          )}
          {levels.map(
            ({ type, label, error, ready, count, visibleMbo, visibleItems }) => {
              if (ready && !error && count === 0) return null;
              return (
                <section
                  className="occupation-course-level"
                  key={type}
                  aria-label={label}
                >
                  <h4 className="occupation-course-list-label">{label}</h4>
                  <div className="occupation-course-body">
                    {error && (
                      <p role="alert">
                        De opleidingskoppelingen konden niet worden geladen. Open de
                        pagina opnieuw om het nogmaals te proberen.
                      </p>
                    )}
                    {!error && !ready && <p role="status">Opleidingen laden…</p>}
                    {!error && ready && count > 0 && (
                      <div
                        className="occupation-course-scroll"
                        role="region"
                        aria-label={`${label}-opleidingen`}
                        tabIndex={0}
                        key={`${query}:${onlyFriesland}`}
                      >
                        {!error && ready && type === 'mbo' && visibleMbo.length > 0 && (
                          <ul className="occupation-course-links">
                            {visibleMbo.map((course) => (
                              <li key={course.code}>
                                <a
                                  href={`#opleiding/mbo/${course.code}/${course.year}`}
                                >
                                  <EducationIcon />
                                  <span>{course.name}</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                        {!error &&
                          ready &&
                          type !== 'mbo' &&
                          (['DIRECT', 'KANDIDAAT'] as const).map((kind) => {
                            const matches = visibleItems.filter(
                              (course) => course.kind === kind,
                            );
                            return (
                              matches.length > 0 && (
                                <div key={kind}>
                                  <h3>
                                    {kind === 'DIRECT'
                                      ? 'Directe koppelingen'
                                      : 'Afgeleide koppelingen · kandidaten'}
                                  </h3>
                                  <ul className="occupation-course-links">
                                    {matches.map((course) => (
                                      <li key={course.code}>
                                        {course.year ? (
                                          <a
                                            href={`#opleiding/${type}/${course.code}/${course.year}`}
                                          >
                                            <EducationIcon />
                                            <span className="occupation-course-local">
                                              <span>{course.name}</span>
                                              <span className="occupation-course-region">
                                                Aangeboden in Fryslân
                                              </span>
                                            </span>
                                          </a>
                                        ) : (
                                          <span className="occupation-course-name">
                                            <EducationIcon />
                                            <span>{course.name}</span>
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )
                            );
                          })}
                      </div>
                    )}
                    <footer className="occupation-course-footer">
                      {!error && ready && count > 0 && (
                        <p className="occupation-course-shown" role="status">
                          {count} {count === 1 ? 'opleiding' : 'opleidingen'} in deze
                          lijst
                        </p>
                      )}
                      {(type === 'mbo' || (!error && ready && count > 0)) && (
                        <p className={type === 'mbo' ? undefined : 'source-caption'}>
                          {type === 'mbo' ? (
                            'De koppelingen zijn voorlopig, nog in ontwikkeling en worden aangevuld.'
                          ) : (
                            <>
                              Er is gebruik gemaakt van de data van Landelijk Centrum
                              Studiekeuze.{' '}
                              <a href="https://lcsk.nl/over-ons/studiekeuzedata-raadplegen/">
                                Landelijk Centrum Studiekeuze
                              </a>{' '}
                              – Studiekeuzedatabase, versie 26.6.
                            </>
                          )}
                        </p>
                      )}
                    </footer>
                  </div>
                </section>
              );
            },
          )}
        </div>
        <p className="occupation-course-sources-link">
          <a href="#methodologie/opleiding-beroep-verantwoording">
            Bronnen en methodologische toelichting
          </a>
        </p>
      </div>
    </section>
  );
}

export function OccupationCourses({ isco }: { isco: string }) {
  const [courses, setCourses] = useState<Courses | null>(null);
  const [relations, setRelations] = useState<MboRelation[] | null>(null);
  const [hoError, setHoError] = useState(false);
  const [mboError, setMboError] = useState(false);
  useEffect(() => {
    let active = true;
    loadNationalHoCourses()
      .then((data) => {
        if (active) setCourses(data.courses);
      })
      .catch(() => {
        if (active) setHoError(true);
      });
    loadMatches()
      .then((data) => {
        if (active) setRelations(data.relations);
      })
      .catch(() => {
        if (active) setMboError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <OccupationCourseContent
      isco={isco}
      courses={courses}
      relations={relations}
      hoError={hoError}
      mboError={mboError}
    />
  );
}
