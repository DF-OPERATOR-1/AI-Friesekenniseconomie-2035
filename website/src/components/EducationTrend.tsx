import { useId, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Line,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EducationInfo, type CountRow } from './EducationCounts';
import { buildEducationTrend, trendSeries } from './educationTrendData';
import { educationChartTrend, resolveEducationSeries } from './educationTrendData';
import type {
  EducationType,
  TrendPoint,
  CourseSelection,
  CodePeriod,
} from './educationTrendData';
export { buildEducationTrend, trendSeries } from './educationTrendData';

export function trendPointLabel(point: TrendPoint) {
  if (point.value !== null) return `${point.value.toLocaleString('nl-NL')} (exact)`;
  if (point.lower !== undefined && point.upper !== undefined)
    return `${point.lower.toLocaleString('nl-NL')}–${point.upper.toLocaleString('nl-NL')} (bandbreedte)`;
  return 'Niet beschikbaar';
}

export function EducationTrendTooltip({
  point,
  title,
}: {
  point: TrendPoint;
  title: string;
}) {
  return (
    <div className="education-trend-tooltip">
      <strong>{point.year}</strong>
      <p>
        {trendPointLabel(point)} {title.toLowerCase()}
      </p>
      {point.suppressedCategories ? (
        <p>
          {point.suppressedCategories} afgeschermde{' '}
          {point.suppressedCategories === 1 ? 'categorie' : 'categorieën'}: elk 0 t/m 4.
        </p>
      ) : null}
      {point.scopeLabel && <p>{point.scopeLabel}</p>}
    </div>
  );
}

export function EducationTrend({
  rows,
  type,
  code,
  title,
  selectedYear,
  periods,
  series: controlledSeries,
  onSeriesChange,
  hideSelector = false,
  hideNote = false,
  noteId,
}: {
  rows: CountRow[];
  type: EducationType;
  code: CourseSelection;
  title: string;
  selectedYear?: string;
  periods?: CodePeriod[];
  series?: string;
  onSeriesChange?: (value: string) => void;
  hideSelector?: boolean;
  hideNote?: boolean;
  noteId?: string;
}) {
  const [ownSeries, setSeries] = useState('total');
  const requested = controlledSeries ?? ownSeries;
  const {
    options,
    series,
    label: seriesLabel,
  } = useMemo(
    () => resolveEducationSeries(rows, type, code, requested, periods),
    [rows, type, code, requested, periods],
  );
  const id = useId();
  const patternId = `${id.replace(/[^a-zA-Z0-9_-]/g, '')}-uncertainty`;

  const points = useMemo(
    () =>
      series === 'unavailable'
        ? []
        : educationChartTrend(rows, type, code, series, periods),
    [rows, type, code, series, periods],
  );
  const available = points.filter(
    (p) => p.lower !== undefined && p.upper !== undefined,
  );
  const hasRanges = available.some((p) => p.value === null);
  const chartPoints = points.map((p) => ({
    ...p,
    interval:
      p.lower !== undefined && p.upper !== undefined ? [p.lower, p.upper] : null,
    uncertainty: p.suppressedCategories ? [0, p.upper! - p.lower!] : null,
  }));
  return (
    <figure
      className="education-trend"
      aria-labelledby={`${id}-caption`}
      aria-describedby={noteId ?? (hideNote ? undefined : `${id}-note`)}
    >
      <figcaption id={`${id}-caption`}>
        Ontwikkeling aantal {title.toLowerCase()}
      </figcaption>
      {!hideSelector && options.length > 2 ? (
        <div className="education-trend-options">
          <label className="education-trend-selector" htmlFor={`${id}-series`}>
            Weergave
            <select
              id={`${id}-series`}
              value={series}
              onChange={(e) =>
                onSeriesChange
                  ? onSeriesChange(e.target.value)
                  : setSeries(e.target.value)
              }
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : !hideSelector ? (
        <p className="education-trend-selection">Totaal opleiding</p>
      ) : null}
      {available.length ? (
        <>
          <ul className="education-trend-legend" aria-label="Legenda">
            <li>
              <span className="education-trend-exact-key" aria-hidden="true" />
              {series === 'total' ? 'Exact totaal' : 'Exact aantal in deelgroep'}
            </li>
            {hasRanges && (
              <li>
                <span className="education-trend-range-key" aria-hidden="true" />
                Bandbreedte door &lt;5{' '}
                <EducationInfo text="Afgeschermde aantallen worden weergegeven als bandbreedte." />
              </li>
            )}
          </ul>
          <div
            className="education-trend-chart"
            role="img"
            aria-label={`${title} per jaar, ${series === 'total' ? 'totaal opleiding' : seriesLabel}. ${points.map((p) => `${p.year}: ${trendPointLabel(p)}`).join('; ')}. Geen geschatte exacte totalen.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartPoints}
                margin={{ top: 16, right: 24, bottom: 4, left: 4 }}
              >
                <defs>
                  <pattern
                    id={patternId}
                    width="6"
                    height="6"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="6" height="6" fill="var(--teal)" fillOpacity={0.08} />
                    <path
                      d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2"
                      stroke="var(--teal)"
                      strokeWidth="1"
                      opacity="0.45"
                    />
                  </pattern>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted)', fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, 'auto']}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  tick={{ fill: 'var(--muted)', fontSize: 12 }}
                />
                <Tooltip
                  filterNull
                  content={({ active, payload }) =>
                    active &&
                    payload?.[0]?.payload &&
                    payload[0].payload.lower !== undefined ? (
                      <EducationTrendTooltip point={payload[0].payload} title={title} />
                    ) : null
                  }
                />
                {selectedYear &&
                  points.some((point) => point.year === selectedYear) && (
                    <ReferenceLine
                      x={selectedYear}
                      stroke="var(--muted)"
                      strokeDasharray="3 3"
                      label={{
                        value: selectedYear,
                        position: 'insideTopRight',
                        fill: 'var(--muted)',
                        fontSize: 11,
                      }}
                    />
                  )}
                {hasRanges && (
                  <Area
                    type="linear"
                    dataKey="interval"
                    fill={`url(#${patternId})`}
                    fillOpacity={1}
                    stroke="none"
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )}
                {hasRanges && (
                  <Line
                    type="linear"
                    dataKey="upper"
                    stroke="var(--teal)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                )}
                {hasRanges && (
                  <Line
                    type="linear"
                    dataKey="lower"
                    stroke="var(--teal)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  >
                    <ErrorBar
                      dataKey="uncertainty"
                      width={5}
                      stroke="var(--teal)"
                      strokeWidth={1.5}
                      isAnimationActive={false}
                    />
                  </Line>
                )}
                <Line
                  type="linear"
                  dataKey="value"
                  stroke="var(--teal)"
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: 'var(--teal)',
                    stroke: 'var(--surface)',
                    strokeWidth: 2,
                  }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {available.length === 1 && (
            <p className="education-trend-note">
              Er is één jaar beschikbaar; hieruit is nog geen ontwikkeling af te leiden.
            </p>
          )}
        </>
      ) : (
        <p className="education-trend-empty">
          {series === 'total'
            ? 'Geen volledig totaal of bandbreedte beschikbaar.'
            : 'Voor deze deelgroep zijn onvoldoende gegevens beschikbaar.'}{' '}
          Gegevens ontbreken of aantallen kunnen dubbel tellen.
          {options.length > 0 && ' Bekijk eventueel een beschikbare deelgroep.'}
        </p>
      )}
      {!hideNote && (
        <p className="education-trend-note" id={`${id}-note`}>
          De gearceerde band toont de onder- en bovengrens door afgeschermde aantallen
          &lt;5 (0 t/m 4 per categorie). Exact bekende totalen staan op de volle lijn.
          Bij ontbrekende gegevens blijft de grafiek onderbroken.
        </p>
      )}
      <p className="chart-source">Bron: DUO</p>
    </figure>
  );
}
