import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  BarChart,
  Cell,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { locale } from '../content/nl';
import {
  mapExposureVariants,
  matchesOccupation,
  occupationSuggestions,
} from './perceptualSelection';
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
type Row = { code: string; occupation: string; occupation_names?: string[] } & Record<
  Metric,
  number | null
>;
const format = (value: number) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
export function ExposureChart() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [metric, setMetric] = useState<Metric>('exposure');
  const [query, setQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const suggestionsId = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const chartScroll = useRef<HTMLDivElement>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('descending');
  const [group, setGroup] = useState('');
  const [displayCount, setDisplayCount] = useState('15');
  const resetFilters = () => {
    setMetric('exposure');
    setQuery('');
    setSelectedCode('');
    setSuggestionsOpen(false);
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
    () => (rows ?? []).filter((row) => !group || row.code.startsWith(group)),
    [rows, group],
  );
  const searching = query.trim().length > 0;
  const matchedCodes = new Set(
    filtered
      .filter((row) =>
        selectedCode ? row.code === selectedCode : matchesOccupation(row, query),
      )
      .map((row) => row.code),
  );
  const suggestions = occupationSuggestions(
    (rows ?? []).filter(
      (row) => (!group || row.code.startsWith(group)) && matchesOccupation(row, query),
    ),
    query,
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
    searching || displayCount === 'all'
      ? available
      : available.slice(0, Number(displayCount));
  useEffect(() => {
    const container = chartScroll.current;
    const match = container?.querySelector<HTMLElement>('[data-search-match="true"]');
    if (container && match && query.trim()) {
      container.scrollTop +=
        match.getBoundingClientRect().top - container.getBoundingClientRect().top - 90;
    }
  }, [query, selectedCode, metric, group, rows]);
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
          AI-blootstellingvariant
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
        <div
          className="map-search-field"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setSuggestionsOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              searchInput.current?.focus();
              setSuggestionsOpen(false);
            }
          }}
        >
          <label>
            Zoek beroep of code
            <input
              ref={searchInput}
              type="search"
              value={query}
              aria-expanded={Boolean(query.trim()) && suggestionsOpen}
              aria-controls={
                query.trim() && suggestionsOpen ? suggestionsId : undefined
              }
              onFocus={() => setSuggestionsOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' && query.trim()) {
                  setSuggestionsOpen(true);
                  const first = document
                    .getElementById(suggestionsId)
                    ?.querySelector<HTMLElement>('button');
                  if (first) {
                    event.preventDefault();
                    first.focus();
                  }
                }
              }}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedCode('');
                setSuggestionsOpen(true);
              }}
              placeholder="Bijvoorbeeld verpleegkundige"
            />
          </label>
          {query.trim() && suggestionsOpen && (
            <div
              id={suggestionsId}
              className="map-search-suggestions"
              aria-label="Beroepssuggesties"
            >
              {!suggestions.length && (
                <p role="status">
                  Geen beroepen gevonden. Probeer een andere naam of code.
                </p>
              )}
              <ul>
                {suggestions.map(({ row, name }) => (
                  <li key={`${row.code}-${name}`}>
                    <button
                      type="button"
                      aria-pressed={selectedCode === row.code}
                      onClick={() => {
                        setQuery(name);
                        setSelectedCode(row.code);
                        searchInput.current?.focus();
                        setSuggestionsOpen(false);
                      }}
                    >
                      <strong>{name}</strong>
                      <span>
                        Beroepsgroep: {row.occupation} ({row.code})
                        {row[metric] === null
                          ? '. Geen score beschikbaar voor deze AI-variant.'
                          : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
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
            {searching && (
              <>
                {available.filter((row) => matchedCodes.has(row.code)).length}{' '}
                zoekresultaten geel gemarkeerd. Tijdens het zoeken worden alle beroepen
                binnen de hoofdgroep getoond.{' '}
              </>
            )}
            {searching && !filtered.some((row) => matchedCodes.has(row.code)) && (
              <>Geen overeenkomende beroepen. </>
            )}
            {
              filtered.filter(
                (row) =>
                  row[metric] === null && (!searching || matchedCodes.has(row.code)),
              ).length
            }{' '}
            {searching ? 'zoekresultaten' : 'beroepen'} zonder beschikbare score.
          </p>
          {chartRows.length ? (
            <figure aria-label={`${info.label} per ISCO-08-beroepsgroep`}>
              <div
                ref={chartScroll}
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
                      <span>← Lagere AI-blootstelling</span>
                      <span>Hogere AI-blootstelling →</span>
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
                                  <div
                                    className="exposure-occupation-label"
                                    data-search-match={
                                      searching && matchedCodes.has(payload.value)
                                    }
                                  >
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
                        >
                          {chartRows.map((row) => (
                            <Cell
                              key={row.code}
                              fill={
                                searching && matchedCodes.has(row.code)
                                  ? 'var(--yellow)'
                                  : 'var(--chart-bar)'
                              }
                            />
                          ))}
                        </Bar>
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
            Koppeling AI-blootstelling score naar ISCO-08: DataFryslân.{' '}
            <a href="#methodologie/methodologie-ai">
              Bronnen en methodologische toelichting
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}
