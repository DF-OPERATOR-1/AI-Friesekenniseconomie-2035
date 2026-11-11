import type { EducationType } from './educationTrendData';

// Presentation only: callers keep the complete model rows for every calculation.
export function filterScenarioCourses<
  T extends { course: { type: EducationType; name: string; code: string } },
>(rows: T[], type: EducationType | '', query: string): T[] {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('nl-NL');
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return rows.filter(
    ({ course }) =>
      (!type || course.type === type) &&
      words.every((word) => normalize(`${course.name} ${course.code}`).includes(word)),
  );
}

/** Display only; never write this rounded percentage back into model state. */
export function formatScenarioPercentage(value: string | number): string {
  if (typeof value === 'string' && !value.trim()) return '';
  const number = typeof value === 'number' ? value : Number(value.replace(',', '.'));
  return Number.isFinite(number)
    ? number.toLocaleString('nl-NL', { maximumFractionDigits: 1, useGrouping: false })
    : String(value);
}
export function isSmallAnnualInflow(
  value: { lower: number; upper: number } | null,
): boolean {
  return (
    value !== null && value.lower === value.upper && value.lower > 0 && value.upper < 1
  );
}

export function scenarioResultCopy(
  id: number,
  ai: {
    title: string;
    highExposure: boolean | null;
    highComplementarity: boolean | null;
  },
) {
  switch (id) {
    case 1:
      return {
        explanation:
          'Er zijn mogelijk meer werknemers beschikbaar dan nodig. Het AI-profiel wijst op een hoger risico dat AI werkzaamheden overneemt.',
        consequences:
          'Een deel van de werknemers kan moeilijker passend werk vinden. Omscholing en overstap naar andere beroepen kunnen daardoor belangrijker worden.',
        action:
          'Help werknemers tijdig met loopbaanbegeleiding en omscholing. Pas opleidingsinstroom pas aan als aanvullende informatie over de arbeidsvraag dat ondersteunt.',
      };
    case 2:
      return {
        explanation:
          'De verwachte vraag naar werknemers is groter dan het berekende aanbod. ' +
          (ai.title === 'Beperkte directe AI-impact'
            ? 'Het AI-profiel wijst op een beperkte directe invloed; AI neemt het personeelstekort niet vanzelf weg.'
            : ai.highComplementarity === true
              ? 'AI kan werkzaamheden ondersteunen, maar neemt het personeelstekort niet vanzelf weg.'
              : 'Onderzoek welke taken AI kan ondersteunen; het AI-profiel biedt geen garantie dat het personeelstekort afneemt.'),
        consequences:
          'De werkdruk en behoefte aan instroom of behoud kunnen toenemen. Waar AI geschikt is voor ondersteuning, kan dat helpen het werk uitvoerbaar te houden.',
        action:
          'Versterk instroom en behoud, maak zij-instroom mogelijk en onderzoek waar AI de productiviteit kan ondersteunen.',
      };
    case 3:
      return {
        explanation:
          'Vraag en aanbod zijn ongeveer in balans en de benodigde personeelsomvang blijft ongeveer gelijk aan 2025. De hoge AI-blootstelling wijst erop dat de inhoud van het werk kan veranderen.',
        consequences:
          'Taken en benodigde vaardigheden kunnen veranderen terwijl de personeelsomvang ongeveer gelijk blijft. Bijscholing en aanpassing van functies kunnen daardoor belangrijker worden.',
        action:
          'Investeer in bijscholing en pas opleidingen en functies aan op veranderende taken. Werk daarbij samen met werkgevers en onderwijs.',
      };
    case 4:
      return {
        explanation:
          'Dit beroep heeft een hoge AI-blootstelling en er is aangenomen dat AI instaptaken raakt. Terwijl er nieuwe afgestudeerden beschikbaar komen, kan de toegang voor starters daardoor onder druk komen.',
        consequences:
          'Starters kunnen minder gelegenheid krijgen om ervaring op te doen in traditionele instaptaken. Andere leerwerkplekken en begeleiding kunnen nodig zijn.',
        action:
          'Ontwikkel met werkgevers nieuwe leerwerkplekken, stages en leerroutes voor starters.',
      };
    case 5:
      return {
        explanation:
          'Er is een mogelijk overschot en er is een tekort in een verwant beroep verondersteld. Dat kan kansen bieden voor overstappen en omscholing.',
        consequences:
          'Overstappen naar verwante beroepen kunnen helpen vraag en aanbod regionaal te verbinden. De mogelijkheden hangen af van vaardigheden, omscholing en de onderbouwing van het tekort.',
        action:
          'Onderzoek welke vaardigheden aansluiten en welke omscholing nodig is. Verbind werknemers met regionale werkgevers met tekorten.',
      };
    default:
      return null;
  }
}

export function scenarioBalanceDisplay(market: import('./scenario2035').MarketResult) {
  if (market.balance === 'shortage')
    return {
      label: 'Mogelijk tekort',
      value: { lower: -market.gap.upper, upper: -market.gap.lower },
    };
  if (market.balance === 'surplus')
    return { label: 'Mogelijk overschot', value: market.gap };
  return {
    label:
      market.balance === 'balanced'
        ? 'Ongeveer in evenwicht'
        : 'Verschil bij onzekere balans',
    value: market.gap,
  };
}

/** Plot running totals without mutating annual model points or rounding them. */
export function cumulativeInflowSeries(
  points: import('./scenario2035').CourseProjection,
) {
  let lower = 0,
    upper = 0;
  return points.map((point) => {
    lower += point.inflow.lower;
    upper += point.inflow.upper;
    return { ...point, inflow: { lower, upper } };
  });
}

export function normalizeScenarioCountInput(value: string): string {
  const compact = value.replace(/\s/g, '');
  return (
    /^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(compact)
      ? compact.replace(/\./g, '')
      : compact
  ).replace(',', '.');
}
export function formatScenarioCountInput(value: string): string {
  if (!value.trim()) return '';
  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number)
    ? number.toLocaleString('nl-NL', { maximumFractionDigits: 20 })
    : value;
}
