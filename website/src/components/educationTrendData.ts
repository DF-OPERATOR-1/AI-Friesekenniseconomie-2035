import type { CountRow } from './EducationCounts';
import { pathwayLabel } from './educationPathways';

export type EducationType = 'mbo' | 'hbo' | 'wo';
export type CourseSelection = string | string[];
export type CodePeriod = { code: string; start: string; end: string };
export const includesCourse = (selection: CourseSelection, code: string) =>
  Array.isArray(selection) ? selection.includes(code) : selection === code;
export type TrendPoint = {
  year: string;
  value: number | null;
  lower?: number;
  upper?: number;
  suppressedCategories?: number;
  scopeLabel?: string;
  status: 'exact' | 'suppressed' | 'missing' | 'duplicate' | 'incomplete' | 'overlap';
};
const codeField = (type: EducationType) =>
  type === 'mbo' ? 'Erkende opleiding code' : 'OPLEIDINGSCODE ACTUEEL';
const dimensions = (type: EducationType, row: CountRow) =>
  type === 'mbo'
    ? [
        'Erkende opleiding code',
        'Instellingscode',
        'Leerweg',
        'Niveau',
        'Geslacht',
      ].map((key) => row[key] ?? '')
    : [
        'OPLEIDINGSCODE ACTUEEL',
        'INSTELLINGSCODE ACTUEEL',
        'GEMEENTENUMMER',
        'OPLEIDINGSVORM',
        row['SOORT DIPLOMA'] ? 'SOORT DIPLOMA' : 'TYPE HOGER ONDERWIJS',
        'Geslacht',
      ].map((key) => row[key] ?? '');
const scopeKey = (type: EducationType, row: CountRow) =>
  `scope:${JSON.stringify(dimensions(type, row).slice(0, -1))}`;
const scopeLabel = (type: EducationType, row: CountRow) =>
  (type === 'mbo'
    ? [
        row.Instellingsnaam,
        row['Plaatsnaam instelling'],
        pathwayLabel(row.Leerweg),
        row.Niveau ? `Niveau ${row.Niveau}` : '',
      ]
    : [
        row['INSTELLINGSNAAM ACTUEEL'],
        row.GEMEENTENAAM,
        row.OPLEIDINGSVORM,
        row['SOORT DIPLOMA'] || row['TYPE HOGER ONDERWIJS'],
      ]
  )
    .filter(Boolean)
    .join(' · ');
const seriesKey = (type: EducationType, row: CountRow) =>
  JSON.stringify(dimensions(type, row));

export function trendSeries(
  rows: CountRow[],
  type: EducationType,
  code: CourseSelection,
) {
  const groups = new Map<string, string>();
  for (const row of rows.filter((row) => includesCourse(code, row[codeField(type)]))) {
    const label =
      type === 'mbo'
        ? [
            row.Instellingsnaam,
            pathwayLabel(row.Leerweg),
            row.Niveau ? `Niveau ${row.Niveau}` : '',
            ...(Array.isArray(code) ? [`Code ${row['Erkende opleiding code']}`] : []),
            row.Geslacht,
          ]
        : [
            row['INSTELLINGSNAAM ACTUEEL'],
            ...(Array.isArray(code) ? [`Code ${row['Erkende opleiding code']}`] : []),
            row.Geslacht,
          ];
    groups.set(seriesKey(type, row), label.filter(Boolean).join(' · '));
    groups.set(
      scopeKey(type, row),
      scopeLabel(type, row) +
        (Array.isArray(code) ? ` · Code ${row[codeField(type)]}` : '') +
        ' · alle geslachten',
    );
  }
  return [...groups]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'nl'));
}

export function buildEducationTrend(
  rows: CountRow[],
  type: EducationType,
  code: CourseSelection,
  series = 'total',
  periods?: CodePeriod[],
): TrendPoint[] {
  const years = [...new Set(rows.map((row) => row.Jaar))]
    .filter((year) => /^\d{4}$/.test(year))
    .sort();
  const groupFilter: Record<string, string> | null = series.startsWith('group:')
    ? JSON.parse(series.slice(6))
    : null;
  const courseRows = rows.filter(
    (row) =>
      includesCourse(code, row[codeField(type)]) &&
      (series === 'total' ||
        (groupFilter &&
          Object.entries(groupFilter).every(
            ([field, value]) => row[field] === value,
          )) ||
        seriesKey(type, row) === series ||
        scopeKey(type, row) === series),
  );
  return years.map((year) => {
    const selected = courseRows.filter((row) => row.Jaar === year);
    if (!selected.length) return { year, value: null, status: 'missing' };
    const peildatum = `${year}1001`;
    if (
      (series === 'total' || groupFilter) &&
      periods?.some(
        (p) =>
          // A valid CREBO code need not have any diplomas in this selected source.
          // Expect a code only when this dataset actually contains that code.
          courseRows.some((row) => row[codeField(type)] === p.code) &&
          p.start <= peildatum &&
          (p.end === '0' || peildatum < p.end) &&
          !selected.some((r) => r[codeField(type)] === p.code),
      )
    )
      return { year, value: null, status: 'incomplete' };
    if (new Set(selected.map((row) => seriesKey(type, row))).size !== selected.length)
      return { year, value: null, status: 'duplicate' };
    if (
      selected.some(
        (row) =>
          !/^<\s*5$/.test(row.Aantal.trim()) &&
          (!/^\d+$/.test(row.Aantal) || !Number.isSafeInteger(Number(row.Aantal))),
      )
    )
      return { year, value: null, status: 'missing' };
    if (series === 'total' || groupFilter || series.startsWith('scope:')) {
      if (
        selected.some((row) =>
          /totaal|alle geslachten|man en vrouw/i.test(row.Geslacht ?? ''),
        )
      )
        return { year, value: null, status: 'overlap' };
      if (
        selected.some((row) =>
          dimensions(type, row)
            .slice(0, -1)
            .some((value) => !value.trim()),
        )
      )
        return { year, value: null, status: 'incomplete' };
      const scopes = new Map<string, CountRow[]>();
      for (const row of selected) {
        const key = JSON.stringify(dimensions(type, row).slice(0, -1));
        const part = scopes.get(key) ?? [];
        part.push(row);
        scopes.set(key, part);
      }
      // DUO telt één hoofdinschrijving/hoofddiploma per persoon per mbo-instelling.
      // De som over instellingen is een registratietotaal, geen gegarandeerd unieke personen.
      // HO source counts main enrolments/main diplomas per degree type.
      // Full-time and part-time are source partitions, not overlapping totals.
      if (
        type !== 'mbo' &&
        new Set(
          selected.map((row) => row['SOORT DIPLOMA'] || row['TYPE HOGER ONDERWIJS']),
        ).size !== 1
      )
        return { year, value: null, status: 'overlap' };
      for (const [key, part] of scopes) {
        // A category in an unrelated programme must not make this programme incomplete.
        // Mbo exports both gender cells. HO is sparse: an absent category is not a source row.
        // Retain HO categories observed in this same source partition across its years;
        // explicit empty amounts still invalidate the total instead of becoming zero.
        const expected = new Set([
          ...(type === 'mbo' ? ['man', 'vrouw'] : []),
          ...courseRows
            .filter((row) => JSON.stringify(dimensions(type, row).slice(0, -1)) === key)
            .map((row) => row.Geslacht),
        ]);
        const present = new Set(part.map((row) => row.Geslacht));
        if ([...expected].some((gender) => !gender || !present.has(gender)))
          return { year, value: null, status: 'incomplete' };
      }
    }
    const suppressedCategories = selected.filter((row) =>
      /^<\s*5$/.test(row.Aantal.trim()),
    ).length;
    const lower = selected.reduce(
      (sum, row) => sum + (/^\d+$/.test(row.Aantal) ? Number(row.Aantal) : 0),
      0,
    );
    const upper = lower + 4 * suppressedCategories;
    return Number.isSafeInteger(lower) && Number.isSafeInteger(upper)
      ? {
          year,
          value: suppressedCategories ? null : lower,
          lower,
          upper,
          suppressedCategories,
          status: suppressedCategories ? 'suppressed' : 'exact',
          scopeLabel:
            type === 'mbo' && new Set(selected.map((r) => scopeKey(type, r))).size > 1
              ? `${[...new Set(selected.map((r) => r.Instellingsnaam))].join(' & ')} · som over alle geregistreerde leerwegen en inschrijvingen`
              : scopeLabel(type, selected[0]),
        }
      : { year, value: null, status: 'missing' };
  });
}

export function summaryYear(rows: CountRow[], selected: string) {
  const years = [...new Set(rows.map((row) => row.Jaar))]
    .filter((year) => /^\d{4}$/.test(year) && Number(year) <= Number(selected))
    .sort();
  return years.includes(selected) ? selected : (years.at(-1) ?? selected);
}

// Apply the same per-year reliability rule to student and graduate chart totals.
export function educationChartTrend(
  rows: CountRow[],
  type: EducationType,
  code: CourseSelection,
  series = 'total',
  periods?: CodePeriod[],
): TrendPoint[] {
  return buildEducationTrend(rows, type, code, series, periods);
}

// UI groups always aggregate genders and programme codes; detailed rows stay in tables.
export function simpleTrendOptions(
  rows: CountRow[],
  type: EducationType,
  code: CourseSelection,
  periods?: CodePeriod[],
) {
  const selected = rows.filter((row) => includesCourse(code, row[codeField(type)]));
  const institutionField =
    type === 'mbo' ? 'Instellingscode' : 'INSTELLINGSCODE ACTUEEL';
  const valid = (point: TrendPoint) =>
    point.status === 'exact' || point.status === 'suppressed';
  const groups = new Map<string, string>();
  const fields = [institutionField];
  for (const row of selected) {
    const filter = Object.fromEntries(fields.map((field) => [field, row[field] ?? '']));
    const value = `group:${JSON.stringify(filter)}`;
    const label = (
      type === 'mbo' ? [row.Instellingsnaam] : [row['INSTELLINGSNAAM ACTUEEL']]
    )
      .filter(Boolean)
      .join(' · ');
    groups.set(value, label);
  }
  const parts = [...groups]
    .filter(([value]) =>
      buildEducationTrend(rows, type, code, value, periods).some(valid),
    )
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'nl'));
  return [{ value: 'total', label: 'Totaal opleiding' }, ...parts];
}

export function resolveEducationSeries(
  rows: CountRow[],
  type: EducationType,
  code: CourseSelection,
  requested = 'total',
  periods?: CodePeriod[],
) {
  const options = simpleTrendOptions(rows, type, code, periods);
  const detailed = requested.startsWith('group:') || requested.startsWith('scope:');
  const series =
    options.some((option) => option.value === requested) || detailed
      ? requested
      : (options[0]?.value ?? 'unavailable');
  const label =
    options.find((option) => option.value === series)?.label ??
    trendSeries(rows, type, code).find((option) => option.value === series)?.label ??
    'Geen verantwoorde reeks beschikbaar';
  return { options, series, label };
}
