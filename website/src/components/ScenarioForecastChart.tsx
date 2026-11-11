import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CourseProjection } from './scenario2035';
import { formatInterval } from './scenario2035';
import { cumulativeInflowSeries } from './scenarioPresentation';
export function ScenarioForecastChart({
  points: annualPoints,
  cumulative = false,
}: {
  points: CourseProjection;
  cumulative?: boolean;
}) {
  const points = cumulative ? cumulativeInflowSeries(annualPoints) : annualPoints;
  const range = points.some((point) => point.inflow.lower !== point.inflow.upper);
  const data = points.map((point) => ({
    ...point,
    interval: [point.inflow.lower, point.inflow.upper],
    exact: point.inflow.lower === point.inflow.upper ? point.inflow.lower : null,
    lower: point.inflow.lower,
    upper: point.inflow.upper,
  }));
  return (
    <figure className="education-trend scenario-forecast-chart">
      <figcaption>
        {cumulative
          ? 'Cumulatieve potentiële instroom'
          : 'Potentiële instroom per jaar'}{' '}
        · 2025–2035
        {cumulative && (
          <strong>{formatInterval(points.at(-1)?.inflow ?? null)} personen</strong>
        )}
      </figcaption>
      <p className="scenario-assumption">
        Rekentool op basis van DUO-afgestudeerden en aannames
        {range ? '. Bandbreedte door afgeschermde DUO-aantallen' : ''}
      </p>
      <div
        className="education-trend-chart"
        role="img"
        aria-label={points
          .map((point) => `${point.year}: ${formatInterval(point.inflow)}`)
          .join('; ')}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 16, right: 20, bottom: 4, left: 4 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="year"
              tickLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
            />
            <YAxis
              domain={[0, 'auto']}
              tickFormatter={(value) =>
                Number(value).toLocaleString('nl-NL', { maximumFractionDigits: 0 })
              }
              allowDecimals={false}
              tickLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              width={55}
            />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0]?.payload ? (
                  <div className="education-trend-tooltip">
                    <strong>{payload[0].payload.year}</strong>
                    <p>
                      {formatInterval(payload[0].payload.inflow)} potentiële
                      professionals{cumulative ? ' tot en met dit jaar' : ' per jaar'}
                    </p>
                    <p>Berekende instroom; geen gemeten arbeidsmarktinstroom.</p>
                  </div>
                ) : null
              }
            />
            {range && (
              <Area
                type="linear"
                dataKey="interval"
                stroke="none"
                fill="var(--teal)"
                fillOpacity={0.18}
                isAnimationActive={false}
              />
            )}
            {range && (
              <Line
                type="linear"
                dataKey="lower"
                stroke="var(--teal)"
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
            {range && (
              <Line
                type="linear"
                dataKey="upper"
                stroke="var(--teal)"
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Line
              type="linear"
              dataKey="exact"
              stroke="var(--teal)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-source">
        Bron: DUO en gebruikersaannames. Berekening: DataFryslân.
      </p>
    </figure>
  );
}
