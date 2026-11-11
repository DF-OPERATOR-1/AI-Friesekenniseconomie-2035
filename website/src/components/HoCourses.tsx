import { useEffect, useState } from 'react';
import { HoSource } from './HoOccupations';

type Course = {
  code: string;
  education_type: string;
  years: Record<string, { names: string[]; levels: string[] }>;
  occupations?: { code: string; kind: string; degree: string }[];
};
type CourseLink = {
  code: string;
  type: string;
  name: string;
  year: string;
  kind: string;
};

export function coursesForOccupation(courses: Course[], isco: string): CourseLink[] {
  return courses
    .flatMap((course) => {
      if (!['hbo', 'wo'].includes(course.education_type)) return [];
      // Gebruik het meest recente opleidingsjaar, zonder een oude graad aan een nieuwe route toe te kennen.
      const year = Object.keys(course.years).sort().at(-1);
      if (!year) return [];
      const current = course.years[year];
      const matches = (course.occupations ?? []).filter(
        (o) =>
          o.code === isco &&
          current.levels.some((level) => level.toLowerCase() === o.degree),
      );
      if (!matches.length) return [];
      return [
        {
          code: course.code,
          type: course.education_type,
          year,
          name: current.names.join(' / '),
          kind: matches.some((o) => o.kind === 'DIRECT') ? 'DIRECT' : 'KANDIDAAT',
        },
      ];
    })
    .sort(
      (a, b) =>
        a.type.localeCompare(b.type) ||
        a.name.localeCompare(b.name, 'nl') ||
        a.code.localeCompare(b.code),
    );
}

let cached: Promise<{ courses: Course[] }> | undefined;
export function loadCourses() {
  return (cached ??= fetch(`${import.meta.env.BASE_URL}data/atlas/opleidingen.json`)
    .then((r) => {
      if (!r.ok) throw Error('Opleidingen niet beschikbaar');
      return r.json();
    })
    .catch((error) => {
      cached = undefined;
      throw error;
    }));
}

export function HoCourseList({ courses, isco }: { courses: Course[]; isco: string }) {
  const links = coursesForOccupation(courses, isco);
  return (
    <>
      {!links.length && (
        <p>
          Voor deze beroepsgroep zijn geen hbo- of wo-opleidingen gekoppeld binnen de
          opleidingen op deze website. Dit betekent niet dat er geen passende opleiding
          bestaat; ook mbo-opleidingen kunnen aansluiten.
        </p>
      )}
      {['DIRECT', 'KANDIDAAT'].map((kind) => {
        const items = links.filter((link) => link.kind === kind);
        return (
          items.length > 0 && (
            <div key={kind}>
              <h3>
                {kind === 'DIRECT'
                  ? 'Directe koppelingen'
                  : 'Afgeleide koppelingen · kandidaten'}
              </h3>
              <ul className="education-occupation-list">
                {items.map((link) => (
                  <li key={`${link.type}:${link.code}`}>
                    <a href={`#opleiding/${link.type}/${link.code}/${link.year}`}>
                      {link.name}
                    </a>
                    <span> · {link.type.toUpperCase()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        );
      })}
    </>
  );
}

export function HoCourses({ isco }: { isco: string }) {
  const [data, setData] = useState<{ courses: Course[] } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    loadCourses()
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
  return (
    <section className="profile-section">
      <h2>Hbo- en wo-opleidingen bij deze beroepsgroep</h2>
      <p>
        Hier staan de opleidingen op deze website die via de Studiekeuzedatabase aan
        deze ISCO-08-beroepsgroep zijn gekoppeld. De koppeling geldt voor de
        beroepsgroep en geeft geen garantie op kwalificatie of werk in ieder specifiek
        beroep daarbinnen.
      </p>
      {!data && !error && <p role="status">Opleidingen laden…</p>}
      {error && (
        <p role="alert">
          De opleidingen konden niet worden geladen. Open de pagina opnieuw om het
          nogmaals te proberen.
        </p>
      )}
      {data && <HoCourseList courses={data.courses} isco={isco} />}
      <HoSource />
    </section>
  );
}
