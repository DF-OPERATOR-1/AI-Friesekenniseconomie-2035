export type NationalHoCourse = {
  code: string;
  education_type: string;
  name: string;
  occupations: { code: string; kind: string; degree: string }[];
  years: Record<string, { levels: string[] }>;
};

export function nationalCoursesForOccupation(
  courses: NationalHoCourse[],
  isco: string,
) {
  const links = new Map<
    string,
    { code: string; type: string; name: string; kind: string; year?: string }
  >();
  for (const course of courses) {
    if (!['hbo', 'wo'].includes(course.education_type)) continue;
    const matches = course.occupations.filter((o) => o.code === isco);
    if (!matches.length) continue;
    const year = Object.keys(course.years).sort().at(-1);
    const detailYear =
      year &&
      matches.some((o) =>
        course.years[year].levels.some((level) => level.toLowerCase() === o.degree),
      )
        ? year
        : undefined;
    const kind = matches.some((o) => o.kind === 'DIRECT') ? 'DIRECT' : 'KANDIDAAT';
    const key = `${course.education_type}:${course.code}`;
    if (!links.has(key) || kind === 'DIRECT')
      links.set(key, {
        code: course.code,
        type: course.education_type,
        name: course.name,
        kind,
        year: detailYear,
      });
  }
  // Een opleidingsnaam kan bij meerdere broncodes/graden voorkomen. Toon die
  // één keer per onderwijssoort; een directe koppeling heeft voorrang.
  // Neem uitsluitend de detailroute van de gekozen koppeling over.
  const unique = new Map<
    string,
    typeof links extends Map<string, infer Link> ? Link : never
  >();
  const preferred = [...links.values()].sort(
    (a, b) =>
      Number(b.kind === 'DIRECT') - Number(a.kind === 'DIRECT') ||
      Number(Boolean(b.year)) - Number(Boolean(a.year)) ||
      a.code.localeCompare(b.code),
  );
  for (const link of preferred) {
    const name = link.name
      .normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase('nl');
    const key = `${link.type}:${name}`;
    if (!unique.has(key)) unique.set(key, link);
  }
  return [...unique.values()].sort(
    (a, b) =>
      a.type.localeCompare(b.type) ||
      a.name.localeCompare(b.name, 'nl') ||
      a.code.localeCompare(b.code),
  );
}

let cached: Promise<{ courses: NationalHoCourse[] }> | undefined;
export function loadNationalHoCourses() {
  return (cached ??= fetch(
    `${import.meta.env.BASE_URL}data/atlas/ho_isco_landelijk.json`,
  )
    .then((response) => {
      if (!response.ok) throw Error('Landelijke opleidingen niet beschikbaar');
      return response.json();
    })
    .catch((error) => {
      cached = undefined;
      throw error;
    }));
}
