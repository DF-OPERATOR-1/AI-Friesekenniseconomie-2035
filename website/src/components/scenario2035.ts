import type { OccupationProfile } from '../atlas/model';
import type { CountRow } from './EducationCounts';
import { educationChartTrend, includesCourse } from './educationTrendData';
import type { EducationType, CourseSelection, CodePeriod } from './educationTrendData';
import { interpretMapPoint } from './perceptualSelection';

export const START_YEAR = 2025;
export const END_YEAR = 2035;
export type Interval = { lower: number; upper: number };
type CountSelection = {
  countCodes?: CourseSelection;
  countPeriods?: CodePeriod[];
  countScopes?: Record<string, Record<string, string[]>>;
};
export type ScenarioEducation = CountSelection & {
  code: string;
  education_type: string;
  name?: string;
  occupations?: { code: string; kind: string; degree?: string }[];
  years: Record<string, { names?: string[]; levels: string[] }>;
};
export type LinkedCourse = CountSelection & {
  key: string;
  code: string;
  type: EducationType;
  name: string;
  kind: string;
  localYear?: string;
  occupations: string[];
};
export function linkedScenarioCourses(
  local: ScenarioEducation[],
  national: ScenarioEducation[],
  isco: string,
): LinkedCourse[] {
  if (!/^\d{4}$/.test(isco)) return [];
  const locals = new Map(
    local.map((course) => [`${course.education_type}:${course.code}`, course]),
  );
  const selected = new Map<string, LinkedCourse>();
  for (const course of [...national, ...local]) {
    if (!['mbo', 'hbo', 'wo'].includes(course.education_type)) continue;
    const codes = Array.isArray(course.countCodes)
      ? [...course.countCodes].sort().join(',')
      : course.code;
    const key = `${course.education_type}:${codes}`;
    const resident = locals.get(`${course.education_type}:${course.code}`);
    const year = resident && Object.keys(resident.years).sort().at(-1);
    const levels = year
      ? resident!.years[year].levels.map((level) => level.toLowerCase())
      : null;
    const relations = (course.occupations ?? []).filter(
      (row) =>
        /^\d{4}$/.test(row.code) &&
        (!levels || !row.degree || levels.includes(row.degree.toLowerCase())),
    );
    const matches = relations.filter((row) => row.code === isco);
    const previous = selected.get(key);
    const currentStart =
      course.countPeriods?.find((p) => p.code === course.code)?.start ?? '';
    const previousStart =
      previous?.countPeriods?.find((p) => p.code === previous.code)?.start ?? '';
    const keepPrevious =
      previous &&
      ((previous.localYear ?? '') > (year ?? '') ||
        (previous.localYear === year && previousStart > currentStart));
    selected.set(key, {
      key,
      code: course.code,
      type: course.education_type as EducationType,
      countCodes: course.countCodes,
      countPeriods: course.countPeriods,
      countScopes: course.countScopes,
      name: year
        ? resident!.years[year].names?.join(' / ') || course.name || course.code
        : course.name || course.code,
      kind:
        previous?.kind === 'DIRECT' || matches.some((row) => row.kind === 'DIRECT')
          ? 'DIRECT'
          : course.education_type === 'mbo'
            ? 'VOORSTEL'
            : 'KANDIDAAT',
      localYear: year,
      ...(keepPrevious
        ? { code: previous.code, name: previous.name, localYear: previous.localYear }
        : {}),
      occupations: [
        ...new Set([
          ...(previous?.occupations ?? []),
          ...relations.map((row) => row.code),
        ]),
      ],
    });
  }
  return [...selected.values()]
    .filter((course) => course.occupations.includes(isco))
    .sort(
      (a, b) =>
        ['mbo', 'hbo', 'wo'].indexOf(a.type) - ['mbo', 'hbo', 'wo'].indexOf(b.type) ||
        a.name.localeCompare(b.name, 'nl'),
    );
}
/** Only occupations linked to an existing course in the Friese DUO selection. */
export function availableScenarioProfiles(
  profiles: OccupationProfile[],
  courses: ScenarioEducation[],
) {
  return profiles.filter(
    (profile) =>
      !profile.cbs_relevance &&
      linkedScenarioCourses(courses, [], profile.isco_code).some(
        (course) => course.localYear,
      ),
  );
}
export function parseAssumption(
  value: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number | null {
  if (!value.trim()) return null;
  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}
export function educationBaseline(
  rows: CountRow[],
  type: EducationType,
  code: CourseSelection,
  periods?: CodePeriod[],
) {
  const latest = rows
    .filter(
      (row) =>
        includesCourse(
          code,
          row[type === 'mbo' ? 'Erkende opleiding code' : 'OPLEIDINGSCODE ACTUEEL'],
        ) &&
        /^20\d{2}$/.test(row.Jaar) &&
        Number(row.Jaar) >= 2021 &&
        Number(row.Jaar) <= START_YEAR,
    )
    .map((row) => row.Jaar)
    .sort()
    .at(-1);
  if (!latest) return null;
  const point = educationChartTrend(rows, type, code, 'total', periods).find(
    (point) => point.year === latest,
  );
  return point?.lower !== undefined && point.upper !== undefined
    ? { year: Number(latest), lower: point.lower, upper: point.upper }
    : null;
}
/** Exact source year only: never substitute a different cohort for comparison. */
export function educationCountsAtYear(
  rows: CountRow[],
  type: EducationType,
  code: CourseSelection,
  year: number,
  periods?: CodePeriod[],
) {
  return educationBaseline(
    rows.filter((row) => row.Jaar === String(year)),
    type,
    code,
    periods,
  );
}
export type AllocationOverrides = Record<string, Record<string, string>>;
/** Explicit choices consume the budget; the remainder is shared by unassigned professions. */
export function courseAllocation(
  course: LinkedCourse,
  isco: string,
  overrides: AllocationOverrides,
) {
  if (!course.occupations.includes(isco))
    return { value: null, error: 'Dit beroep is niet aan deze opleiding gekoppeld.' };
  const explicit = overrides[course.key] ?? {};
  const applicable = Object.entries(explicit).filter(([code]) =>
    course.occupations.includes(code),
  );
  const values = applicable.map(([, value]) => parseAssumption(value, 0, 100));
  if (values.some((value) => value === null))
    return {
      value: null,
      error: 'Vul een geldig toedelingspercentage tussen 0 en 100 in.',
    };
  const total = values.reduce<number>((sum, value) => sum + value!, 0);
  if (total > 100 + 1e-9)
    return {
      value: null,
      error:
        'De toedeling over alle beroepen samen mag niet hoger zijn dan 100%. Verlaag een eerdere toedeling.',
    };
  const remaining = course.occupations.length - applicable.length;
  return {
    value:
      explicit[isco] !== undefined
        ? parseAssumption(explicit[isco], 0, 100)
        : remaining
          ? Math.max(0, 100 - total) / remaining
          : 0,
    error: null,
  };
}
export type CourseProjection = {
  year: number;
  graduates: Interval;
  inflow: Interval;
}[];
/** DUO graduates only: G(t) = G(b)(1 + g)^(t-b), I(t) = G(t)BF.
 * Input percentages become decimal factors here; no intermediate rounding.
 * Student counts are context and never enter this projection.
 */
export function projectGraduates(
  baseline: Interval & { year: number },
  growth: number,
  allocation: number,
  regionalShare: number,
): CourseProjection | null {
  if (
    ![
      baseline.lower,
      baseline.upper,
      baseline.year,
      growth,
      allocation,
      regionalShare,
    ].every(Number.isFinite) ||
    baseline.lower < 0 ||
    baseline.upper < baseline.lower ||
    !Number.isInteger(baseline.year) ||
    baseline.year < 2021 ||
    baseline.year > START_YEAR ||
    growth < -100 ||
    growth > 100 ||
    allocation < 0 ||
    allocation > 100 ||
    regionalShare < 0 ||
    regionalShare > 100
  )
    return null;
  const result: CourseProjection = [];
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const factor = (1 + growth / 100) ** (year - baseline.year);
    const graduates = {
      lower: baseline.lower * factor,
      upper: baseline.upper * factor,
    };
    const inflow = {
      lower: (((graduates.lower * allocation) / 100) * regionalShare) / 100,
      upper: (((graduates.upper * allocation) / 100) * regionalShare) / 100,
    };
    if (
      ![graduates.lower, graduates.upper, inflow.lower, inflow.upper].every(
        (value) => Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER,
      )
    )
      return null;
    result.push({ year, graduates, inflow });
  }
  return result;
}
export function addIntervals(values: Interval[]): Interval {
  return values.reduce(
    (sum, value) => ({
      lower: sum.lower + value.lower,
      upper: sum.upper + value.upper,
    }),
    { lower: 0, upper: 0 },
  );
}
export function aggregateProjections(projections: CourseProjection[]) {
  if (!projections.length) return null;
  const years = Array.from(
    { length: END_YEAR - START_YEAR + 1 },
    (_, index) => START_YEAR + index,
  );
  if (
    projections.some(
      (projection) =>
        projection.length !== years.length ||
        projection.some((point, index) => point.year !== years[index]),
    )
  )
    return null;
  const result = years.map((year, index) => ({
    year,
    graduates: addIntervals(
      projections.map((projection) => projection[index].graduates),
    ),
    inflow: addIntervals(projections.map((projection) => projection[index].inflow)),
  }));
  return result.every((point) =>
    [
      point.graduates.lower,
      point.graduates.upper,
      point.inflow.lower,
      point.inflow.upper,
    ].every(
      (value) =>
        Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER,
    ),
  )
    ? result
    : null;
}
const median = (values: number[]) => {
  const ordered = [...values].sort((a, b) => a - b),
    n = ordered.length;
  return n
    ? n % 2
      ? ordered[Math.floor(n / 2)]
      : (ordered[n / 2 - 1] + ordered[n / 2]) / 2
    : null;
};
export function scenarioAI(profiles: OccupationProfile[], profile: OccupationProfile) {
  const complete = profiles.filter(
    (row) => row.map_exposure !== null && row.ai_complementarity.value !== null,
  );
  const exposureMedian = median(complete.map((row) => row.map_exposure!)),
    complementarityMedian = median(
      complete.map((row) => row.ai_complementarity.value!),
    );
  const raw = profile.map_exposure,
    complementarity = profile.ai_complementarity.value;
  if (
    raw === null ||
    complementarity === null ||
    exposureMedian === null ||
    complementarityMedian === null
  )
    return {
      title: 'AI-profiel niet beschikbaar',
      text: 'Een of beide bestaande AI-scores ontbreken.',
      highExposure: null,
      highComplementarity: null,
    };
  const existing = interpretMapPoint(
    { raw, complementarity },
    exposureMedian,
    complementarityMedian,
  )!;
  return {
    ...existing,
    highExposure: raw === exposureMedian ? null : raw > exposureMedian,
    highComplementarity:
      complementarity === complementarityMedian
        ? null
        : complementarity > complementarityMedian,
  };
}
export type LabourInputs = {
  source: 'user' | 'data';
  stock: number | null;
  outflow: number | null;
  demand: number | null;
  tolerance: number | null;
  aiEffect: number | null;
};
export type MarketResult = {
  supply: Interval;
  gap: Interval;
  demand: number;
  stock: number;
  outflow: number;
  tolerance: number;
  balance: 'shortage' | 'surplus' | 'balanced' | 'uncertain';
  stableDemand: boolean;
};
export function calculateMarket(
  input: LabourInputs,
  cumulative: Interval | null,
): MarketResult | null {
  const { stock, outflow, demand, tolerance, aiEffect } = input;
  if (
    stock === null ||
    outflow === null ||
    demand === null ||
    tolerance === null ||
    aiEffect === null ||
    !cumulative
  )
    return null;
  if (
    ![
      stock,
      outflow,
      demand,
      tolerance,
      aiEffect,
      cumulative.lower,
      cumulative.upper,
    ].every(Number.isFinite) ||
    stock < 0 ||
    outflow < 0 ||
    outflow > stock ||
    demand < 0 ||
    tolerance < 0 ||
    tolerance > 100 ||
    aiEffect < -100 ||
    aiEffect > 100 ||
    cumulative.lower < 0 ||
    cumulative.upper < cumulative.lower
  )
    return null;
  const adjusted = demand * (1 + aiEffect / 100),
    supply = {
      lower: stock - outflow + cumulative.lower,
      upper: stock - outflow + cumulative.upper,
    };
  const gap = { lower: supply.lower - adjusted, upper: supply.upper - adjusted },
    margin = (adjusted * tolerance) / 100;
  if (
    ![adjusted, supply.lower, supply.upper].every((value) =>
      Number.isSafeInteger(Math.ceil(value)),
    )
  )
    return null;
  const balance =
    gap.upper < -margin
      ? 'shortage'
      : gap.lower > margin
        ? 'surplus'
        : gap.lower >= -margin && gap.upper <= margin
          ? 'balanced'
          : 'uncertain';
  return {
    supply,
    gap,
    demand: adjusted,
    stock,
    outflow,
    tolerance,
    balance,
    stableDemand: Math.abs(adjusted - stock) <= (stock * tolerance) / 100,
  };
}
export const SCENARIOS = [
  {
    id: 1,
    title: 'Verdringing en overschot',
    mechanism:
      'Het berekende arbeidsaanbod is groter dan de verwachte arbeidsvraag. Bij het bestaande hogere substitutierisico kan AI de personeelsvraag mogelijk verder verminderen. Dat vergroot onder deze aannames het risico op verdringing.',
    policy:
      'Zet vroegtijdige loopbaanbegeleiding, omscholing en mobiliteitsprogramma’s in. Stel opleidingsinstroom pas bij na aanvullende vraagprognoses.',
  },
  {
    id: 2,
    title: 'Versterking bij krapte',
    mechanism:
      'De verwachte arbeidsvraag is groter dan het berekende aanbod. De meegenomen onderwijsinstroom is onvoldoende om de personeelsbehoefte op te vangen. AI kan ondersteuning bieden, maar lost het tekort niet automatisch op.',
    policy:
      'Versterk instroom en behoud, faciliteer zij-instroom en onderzoek waar AI de productiviteit kan ondersteunen.',
  },
  {
    id: 3,
    title: 'Transformatie zonder groot banenverlies',
    mechanism:
      'Bij hoge AI-blootstelling liggen vraag en aanbod binnen de ingestelde evenwichtsmarge. Ook de veronderstelde personeelsvraag blijft binnen die marge van de startomvang. Veranderingen kunnen vooral taken en benodigde vaardigheden raken.',
    policy:
      'Investeer in bijscholing, curriculumvernieuwing, samenwerking tussen onderwijs en werkgevers en functieherontwerp.',
  },
  {
    id: 4,
    title: 'De startersparadox',
    mechanism:
      'Hoge AI-blootstelling gaat samen met de expliciete aanname dat AI instaptaken raakt. Er is potentiële onderwijsinstroom, terwijl traditionele starterswerkzaamheden mogelijk verdwijnen. Dit is een veronderstelde spanning, geen gemeten tekort aan startersfuncties.',
    policy:
      'Ontwikkel nieuwe leerwerkplekken, stagevormen en expliciete junior-leerroutes met werkgevers en opleidingen.',
  },
  {
    id: 5,
    title: 'Regionale mobiliteit als kans',
    mechanism:
      'Een berekend overschot valt samen met een door de gebruiker verondersteld tekort in een verwant beroep. Dat kan aanleiding geven om omscholing en mobiliteit te onderzoeken; de verwantschap volgt niet uit alleen een opleidingskoppeling.',
    policy:
      'Onderzoek vaardighedenoverlap, modulaire omscholing, EVC en regionale matching voordat mobiliteit als oplossing wordt ingezet.',
  },
] as const;
export function selectScenarios(
  market: MarketResult | null,
  ai: ReturnType<typeof scenarioAI>,
  annualInflow: Interval | null,
  extra: {
    juniorAutomation: boolean;
    relatedCode: string;
    selectedCode: string;
    relatedShortage: number | null;
    relatedConfirmed: boolean;
  },
) {
  if (!market) return { main: null, additional: [] as (typeof SCENARIOS)[number][] };
  const ids: number[] = [];
  if (market.balance === 'surplus' && ai.title === 'Hoger substitutierisico')
    ids.push(1);
  if (market.balance === 'shortage') ids.push(2);
  if (market.balance === 'balanced' && market.stableDemand && ai.highExposure === true)
    ids.push(3);
  if (
    ai.highExposure === true &&
    extra.juniorAutomation &&
    annualInflow &&
    annualInflow.upper > 0
  )
    ids.push(4);
  if (
    market.balance === 'surplus' &&
    extra.relatedConfirmed &&
    /^\d{4}$/.test(extra.relatedCode) &&
    extra.relatedCode !== extra.selectedCode &&
    extra.relatedShortage !== null &&
    extra.relatedShortage > 0 &&
    Number.isFinite(extra.relatedShortage)
  )
    ids.push(5);
  const relevant = SCENARIOS.filter((scenario) => ids.includes(scenario.id));
  return { main: relevant[0] ?? null, additional: relevant.slice(1) };
}
/** Round displayed people only; preserve every non-zero interval width. */
export function formatInterval(value: Interval | null): string {
  if (!value) return 'Niet beschikbaar';
  const format = (n: number) => n.toLocaleString('nl-NL', { maximumFractionDigits: 0 });
  return value.upper === value.lower
    ? format(Math.round(value.lower))
    : `${format(Math.floor(value.lower))}–${format(Math.ceil(value.upper))}`;
}
