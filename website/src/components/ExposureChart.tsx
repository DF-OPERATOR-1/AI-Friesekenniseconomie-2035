import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { locale } from '../content/nl';
import { mapExposureVariants } from './perceptualSelection';
const metrics = {
  exposure: {
    label: mapExposureVariants.raw.label,
    unit: 'Gestandaardiseerde AIOE-index',
    note: 'Afgeleid van Felten et al. (2021). Negatieve scores betekenen een lagere blootstelling ten opzichte van de oorspronkelijke referentie; nul betekent niet dat er geen blootstelling is.',
  },
  language: {
    label: mapExposureVariants.language.label,
    unit: 'Gestandaardiseerde taalmodelindex',
    note: 'Afgeleid van Felten et al. (2023), taalmodel-AIOE. Vergelijk waarden binnen deze indicator; de verschillende indices zijn geen percentages.',
  },
  image: {
    label: mapExposureVariants.image.label,
    unit: 'Gestandaardiseerde beeldgeneratie-index',
    note: 'Afgeleid van Felten et al. (2023), beeldgeneratie-AIOE. Dit beschrijft beroepsinhoud, geen waargenomen gebruik van AI.',
  },
};
type Metric = keyof typeof metrics;
type SortOrder = 'descending' | 'ascending' | 'code';
const sortLabels: Record<SortOrder, string> = {
  descending: 'Hoog naar laag',
  ascending: 'Laag naar hoog',
  code: 'Beroepscode (oplopend)',
};
type Row = { code: string; occupation: string } & Record<Metric, number | null>;
const format = (value: number) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
export function ExposureChart() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [metric, setMetric] = useState<Metric>('exposure');
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('descending');
  const [group, setGroup] = useState('');
  const [displayCount, setDisplayCount] = useState('15');
  const resetFilters = () => {
    setMetric('exposure');
    setQuery('');
    setGroup('');
    setSortOrder('descending');
    setDisplayCount('15');
  };
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/research/occupations.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data.rows)) throw new Error();
        setRows(data.rows);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setError(true);
      });
    return () => controller.abort();
  }, []);
  const filtered = useMemo(
    () =>
      (rows ?? []).filter(
        (row) =>
          (!group || row.code.startsWith(group)) &&
          `${row.code} ${row.occupation}`
            .toLocaleLowerCase(locale)
            .includes(query.trim().toLocaleLowerCase(locale)),
      ),
    [rows, query, group],
  );
  const sorted = [...filtered].sort((a, b) => {
    const av = a[metric],
      bv = b[metric];
    if (sortOrder === 'code') return a.code.localeCompare(b.code, locale);
    if (av === null) return bv === null ? a.code.localeCompare(b.code, locale) : 1;
    if (bv === null) return -1;
    return (
      (sortOrder === 'descending' ? bv - av : av - bv) ||
      a.code.localeCompare(b.code, locale)
    );
  });
  const available = sorted.filter((row) => row[metric] !== null);
  const chartRows =
    displayCount === 'all' ? available : available.slice(0, Number(displayCount));
  const labelWidth = 300;
  const rowHeight = 76;
  const chartRight = 48;
  const values = (rows ?? []).flatMap((row) =>
    row[metric] === null ? [] : [row[metric]!],
  );
  const domain: [number, number] = [Math.min(0, ...values), Math.max(0, ...values)];
  const ticks =
    domain[0] < 0 && domain[1] > 0
      ? [domain[0], domain[0] / 2, 0, domain[1] / 2, domain[1]]
      : Array.from(
          { length: 5 },
          (_, index) => domain[0] + ((domain[1] - domain[0]) * index) / 4,
        );
  const info = metrics[metric];
  return (
    <div className="chart-card">
      <div className="research-controls exposure-controls">
        <label>
          AI-exposurevariant
          <select
            value={metric}
            onChange={(event) => setMetric(event.target.value as Metric)}
          >
            {Object.entries(metrics).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Zoek beroep of code
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Bijvoorbeeld verpleegkundige"
          />
        </label>
        <label>
          ISCO-hoofdgroep
          <select value={group} onChange={(event) => setGroup(event.target.value)}>
            <option value="">Alle hoofdgroepen</option>
            {[
              'Militaire beroepen',
              'Leidinggevenden',
              'Wetenschappelijke beroepen',
              'Technici en vakspecialisten',
              'Administratief personeel',
              'Dienstverlening en verkoop',
              'Landbouw, bosbouw en visserij',
              'Ambachtslieden',
              'Bedieners en assemblagemedewerkers',
              'Elementaire beroepen',
            ].map((name, index) => (
              <option key={index} value={index}>
                {index} | {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sorteren op
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
          >
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="exposure-display-controls">
        <label>
          Aantal beroepen in de grafiek
          <select
            value={displayCount}
            onChange={(event) => setDisplayCount(event.target.value)}
          >
            <option value="15">15 beroepen</option>
            <option value="30">30 beroepen</option>
            <option value="all">Alle beroepen</option>
          </select>
        </label>
        <button className="reset-button" onClick={resetFilters}>
          Herstel beginweergave
        </button>
      </div>
      {error ? (
        <p role="alert">
          De onderzoeksdata konden niet worden geladen. Vernieuw de pagina om het
          opnieuw te proberen.
        </p>
      ) : !rows ? (
        <p role="status">Onderzoeksdata laden…</p>
      ) : (
        <>
          <p className="research-summary" role="status">
            {chartRows.length} van {available.length} beroepen zichtbaar.{' '}
            {filtered.length - available.length} zoekresultaten zonder volledige
            gegevens.
          </p>
          {chartRows.length ? (
            <figure aria-label={`${info.label} per ISCO-08-beroepsgroep`}>
              <div
                key={`${metric}-${group}-${query}-${sortOrder}-${displayCount}`}
                className="occupation-chart-scroll exposure-named-chart"
                role="region"
                aria-label="Scrollbare grafiek met beroepsnamen, codes en scores"
                tabIndex={0}
              >
                <div className="exposure-chart-canvas">
                  <div className="exposure-fixed-axis" aria-hidden="true">
                    <div
                      className="exposure-direction"
                      style={{ paddingLeft: labelWidth, paddingRight: chartRight }}
                    >
                      <span>← Lagere AI-exposure</span>
                      <span>Hogere AI-exposure →</span>
                    </div>
                    <ResponsiveContainer width="100%" height={44}>
                      <BarChart
                        data={chartRows}
                        layout="vertical"
                        margin={{ left: 0, right: chartRight, top: 4, bottom: 0 }}
                      >
                        <XAxis
                          type="number"
                          orientation="top"
                          domain={domain}
                          allowDataOverflow
                          ticks={ticks}
                          interval={0}
                          tickFormatter={format}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--text)', fontSize: 11 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="code"
                          width={labelWidth}
                          tick={false}
                          axisLine={false}
                          tickLine={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div
                    className="chart-container research-chart"
                    style={{ height: chartRows.length * rowHeight }}
                    role="group"
                    aria-label={`${info.label}: ${chartRows.length} beroepen getoond, gesorteerd op ${sortLabels[sortOrder].toLocaleLowerCase(locale)}. Gebruik de pijltjestoetsen of wijs een balk aan voor de exacte score.`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartRows}
                        layout="vertical"
                        margin={{ left: 0, right: chartRight, top: 0, bottom: 0 }}
                        accessibilityLayer={true}
                      >
                        <CartesianGrid
                          horizontal={false}
                          stroke="var(--border)"
                          strokeDasharray="3 5"
                        />
                        <XAxis
                          type="number"
                          domain={domain}
                          allowDataOverflow
                          ticks={ticks}
                          hide
                        />
                        <YAxis
                          type="category"
                          dataKey="code"
                          interval={0}
                          width={labelWidth}
                          axisLine={false}
                          tickLine={false}
                          tick={({ x = 0, y = 0, payload }) => {
                            const occupation = chartRows.find(
                              (row) => row.code === payload.value,
                            );
                            return (
                              <g transform={`translate(${x},${y})`}>
                                <foreignObject
                                  x={-labelWidth + 24}
                                  y={-rowHeight / 2}
                                  width={labelWidth - 38}
                                  height={rowHeight}
                                >
                                  <div className="exposure-occupation-label">
                                    <a href={`#beroep/${payload.value}`}>
                                      <strong>{payload.value}</strong>
                                      <span>{occupation?.occupation}</span>
                                    </a>
                                  </div>
                                </foreignObject>
                              </g>
                            );
                          }}
                        />
                        <ReferenceLine x={0} stroke="var(--muted)" />
                        <Tooltip
                          cursor={{ fill: 'var(--surface-alt)' }}
                          contentStyle={{
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            maxWidth: 350,
                          }}
                          labelFormatter={(_label, payload) =>
                            payload[0]
                              ? `${payload[0].payload.code} | ${payload[0].payload.occupation}`
                              : ''
                          }
                          formatter={(value) => [format(Number(value)), info.label]}
                        />
                        <Bar
                          dataKey={metric}
                          fill="var(--chart-bar)"
                          radius={[0, 4, 4, 0]}
                          barSize={23}
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </figure>
          ) : (
            <p>
              Geen beroepsgroepen met een beschikbare score binnen deze selectie. Pas je
              zoekopdracht aan of herstel de beginweergave.
            </p>
          )}

          <p className="chart-source">
            Bron:{' '}
            {metric === 'exposure' ? 'Felten et al. (2021)' : 'Felten et al. (2023)'}.{' '}
            Koppeling AI-exposure score naar ISCO-08: DataFryslân.{' '}
            <a href="#methodologie">Volledige bronvermeldingen en methode</a>.
          </p>
        </>
      )}
    </div>
  );
}
