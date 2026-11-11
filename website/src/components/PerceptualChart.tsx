import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { locale } from '../content/nl';
import {
  pointAppearance,
  selectMapRows,
  mapExposureRows,
  mapExposureVariants,
  interpretMapPoint,
} from './perceptualSelection';
import type { MapExposureVariant } from './perceptualSelection';
type Row = {
  code: string;
  occupation: string;
  raw: number | null;
  language: number | null;
  image: number | null;
  complementarity: number | null;
};
type CompleteRow = Row & { raw: number; complementarity: number };
const format = (value: number) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
export function PerceptualChart({
  compact = false,
  selectedCode = '',
  explanationTarget,
}: {
  compact?: boolean;
  selectedCode?: string;
  explanationTarget?: HTMLElement | null;
} = {}) {
  const renderExplanation = (content: ReactNode) =>
    explanationTarget ? createPortal(content, explanationTarget) : content;
  const variantId = useId();
  const [sourceRows, setRows] = useState<Row[] | null>(null);
  const [variant, setVariant] = useState<MapExposureVariant>('raw');
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [internalSelected, setSelected] = useState('');
  const selected = compact ? selectedCode : internalSelected;
  const [hovered, setHovered] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [chartWidth, setChartWidth] = useState(1040);
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
        if (
          !Array.isArray(data.rows) ||
          !data.rows.every(
            (row: Row) =>
              typeof row.code === 'string' &&
              typeof row.occupation === 'string' &&
              (row.raw === null || Number.isFinite(row.raw)) &&
              (row.language === null || Number.isFinite(row.language)) &&
              (row.image === null || Number.isFinite(row.image)) &&
              (row.complementarity === null || Number.isFinite(row.complementarity)),
          )
        )
          throw new Error();
        setRows(data.rows);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setError(true);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!svg.current) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setChartWidth(Math.max(720, Math.round(width)));
    });
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, [sourceRows]);
  if (error)
    return (
      <p role="alert">
        De kaartgegevens konden niet worden geladen. Vernieuw de pagina om het opnieuw
        te proberen.
      </p>
    );
  if (!sourceRows) return <p role="status">Perceptuele kaart laden…</p>;
  const displayedVariant =
    compact &&
    !sourceRows.some(
      (row) =>
        row.code === selected && row[variant] !== null && row.complementarity !== null,
    )
      ? 'raw'
      : variant;
  const rows = mapExposureRows(sourceRows, displayedVariant);
  const info = mapExposureVariants[displayedVariant];
  const complete = rows.filter(
    (row): row is CompleteRow => row.raw !== null && row.complementarity !== null,
  );
  if (!complete.length)
    return (
      <p role="status">Er zijn geen beroepsgroepen met beide scores beschikbaar.</p>
    );
  const mx = median(complete.map((row) => row.raw));
  const my = median(complete.map((row) => row.complementarity));
  const {
    matches: filtered,
    visible,
    matchedCodes,
    highlighted,
    searching,
    tableRows,
  } = selectMapRows(rows, query, group, selected);
  const missingCount = filtered.length - highlighted.length;
  const active = visible.find(
    (row) => row.code === (compact ? selected : (hovered ?? selected)),
  );
  // Fixed reference population; leave 5% of its range clear on each side.
  const xs = complete.map((row) => row.raw),
    ys = complete.map((row) => row.complementarity);
  const xlo = Math.min(...xs),
    xhi = Math.max(...xs);
  const ylo = Math.min(...ys),
    yhi = Math.max(...ys);
  const xpad = (xhi - xlo || 1) * 0.05,
    ypad = (yhi - ylo || 0.1) * 0.05;
  const interpretation = interpretMapPoint(active, mx, my);
  const xmin = xlo - xpad,
    xmax = xhi + xpad;
  const ymin = Math.max(0, ylo - ypad),
    ymax = Math.min(1, yhi + ypad);
  const chartHeight = Math.max(350, Math.min(420, Math.round(chartWidth * 0.36)));
  const legendHeight = 32;
  const left = 80,
    right = chartWidth - 24,
    top = 30,
    bottom = chartHeight - 100;
  const x = (value: number) => left + ((value - xmin) / (xmax - xmin)) * (right - left);
  const y = (value: number) =>
    bottom - ((value - ymin) / (ymax - ymin)) * (bottom - top);
  const exportSvg = () => {
    if (!svg.current) return;
    const copy = svg.current.cloneNode(true) as SVGSVGElement;
    const style = getComputedStyle(document.documentElement);
    copy.querySelectorAll('*').forEach((element) => {
      for (const attribute of ['fill', 'stroke']) {
        const value = element.getAttribute(attribute);
        if (value?.startsWith('var('))
          element.setAttribute(
            attribute,
            style.getPropertyValue(value.slice(4, -1)).trim(),
          );
      }
    });
    copy.setAttribute('width', String(chartWidth));
    copy.setAttribute('height', String(chartHeight + legendHeight));
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('font-family', 'Poppins, Arial, sans-serif');
    // Keep attribution in downloaded figures without duplicating the on-page information block.
    const attribution = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    attribution.setAttribute('x', '16');
    attribution.setAttribute('y', String(chartHeight + legendHeight - 10));
    attribution.setAttribute('fill', style.getPropertyValue('--muted').trim());
    attribution.setAttribute('font-size', '9');
    attribution.setAttribute('textLength', String(chartWidth - 32));
    attribution.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    attribution.textContent = `Bron: ${info.source} en Pizzinelli et al. (2023). De complementariteitsscores zijn door DataFryslân berekend volgens de methode van Pizzinelli et al. (2023), op basis van O*NET 24.3 (2020).`;
    copy.appendChild(attribution);
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(copy)], {
        type: 'image/svg+xml;charset=utf-8',
      }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `DataFryslan-AI-perceptuele-kaart-${variant}.svg`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className={`chart-card perceptual-card${compact ? ' compact-ai-map' : ''}`}>
      <div className="research-controls">
        <div className="map-variant-control">
          <div className="map-variant-label">
            <label htmlFor={variantId}>AI-blootstellingvariant</label>
            {!compact && (
              <details className="map-variant-info">
                <summary aria-label="Uitleg over AI-blootstellingvariant">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                    <circle cx="10" cy="6.3" r="1" fill="currentColor" />
                    <path
                      d="M10 9v5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </summary>
                <div className="map-variant-info-content">
                  <strong>{info.label}</strong>
                  <p>{info.note}</p>
                  <p className="source-caption">Bron: {info.source}.</p>
                </div>
              </details>
            )}
          </div>
          <select
            id={variantId}
            value={displayedVariant}
            onChange={(event) => {
              setVariant(event.target.value as MapExposureVariant);
              setHovered(null);
            }}
          >
            {Object.entries(mapExposureVariants)
              .filter(
                ([value]) =>
                  !compact ||
                  sourceRows.some(
                    (row) =>
                      row.code === selected &&
                      row[value as MapExposureVariant] !== null &&
                      row.complementarity !== null,
                  ),
              )
              .map(([value, item]) => (
                <option key={value} value={value}>
                  {item.label}
                </option>
              ))}
          </select>
        </div>
        {!compact && (
          <>
            <label>
              Zoek beroep of code
              <input
                type="search"
                placeholder="Bijvoorbeeld verpleegkundige"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHovered(null);
                }}
              />
            </label>
            <label>
              Beroepshoofdgroep
              <select
                value={group}
                onChange={(event) => {
                  setGroup(event.target.value);
                  setSelected('');
                  setHovered(null);
                }}
              >
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
              Kies een beroep
              <select
                value={visible.some((row) => row.code === selected) ? selected : ''}
                onChange={(event) => {
                  setSelected(event.target.value);
                  setHovered(null);
                }}
              >
                <option value="">Kies een beroep</option>
                {[
                  ...visible.filter(
                    (row) => matchedCodes.has(row.code) || row.code === selected,
                  ),
                ]
                  .sort((a, b) => a.occupation.localeCompare(b.occupation, locale))
                  .map((row) => (
                    <option key={row.code} value={row.code}>
                      {row.code} | {row.occupation}
                    </option>
                  ))}
              </select>
            </label>
          </>
        )}
      </div>
      {!compact && (
        <div className="map-toolbar">
          <p className="research-summary" role="status">
            {visible.length} beroepen weergegeven met beide scores.{' '}
            {searching && (
              <>
                {highlighted.length}{' '}
                {highlighted.length === 1 ? 'zoekresultaat' : 'zoekresultaten'}{' '}
                gemarkeerd op de kaart.{' '}
              </>
            )}
            {missingCount}{' '}
            {searching
              ? missingCount === 1
                ? 'zoekresultaat'
                : 'zoekresultaten'
              : missingCount === 1
                ? 'beroep binnen deze selectie'
                : 'beroepen binnen deze selectie'}{' '}
            niet weergegeven omdat een of beide scores ontbreken.
          </p>
        </div>
      )}
      <div className="map-layout">
        <div className="perceptual-scroll">
          <svg
            ref={svg}
            className="perceptual-svg"
            viewBox={`0 0 ${chartWidth} ${chartHeight + legendHeight}`}
            role="group"
            aria-labelledby="map-title map-description"
            fontFamily="Poppins, Arial, sans-serif"
          >
            <title id="map-title">{info.label} × AI-complementariteit</title>
            <desc id="map-description">
              {compact
                ? `Het geselecteerde beroep ${active?.occupation ?? selected} is paars gemarkeerd. Alle overige beschikbare beroepen zijn subtiele punten. `
                : ''}
              Elke stip is een beroepsgroep. Horizontaal: {info.axis}. Verticaal: zelf
              berekende complementariteitsscore. Mediane lijnen verdelen de kaart in
              relatieve posities. Gebruik de beroepsselectie of de gegevenstabel voor
              exacte waarden. Bij zoeken worden overeenkomende punten geel gemarkeerd.
              Het geselecteerde beroep is paars. Een contrasterende rand toont het
              aangewezen beroep; de overige punten blijven zichtbaar.
            </desc>
            <rect
              width={chartWidth}
              height={chartHeight + legendHeight}
              fill="var(--surface)"
            />
            <g aria-label="Legenda beroepspunten" fontSize="11" fill="var(--text)">
              {searching && (
                <g transform={`translate(${left}, 14)`}>
                  <circle
                    r="6"
                    fill="var(--yellow)"
                    stroke="var(--map-dot-border)"
                    strokeWidth="2"
                  />
                  <text x="14" y="4">
                    Gevonden beroepen
                  </text>
                </g>
              )}
              <g
                transform={`translate(${left + (searching ? 190 : 0)}, ${compact ? 44 : 14})`}
              >
                <circle
                  r="8"
                  fill="var(--map-selected)"
                  stroke="var(--map-dot-border)"
                  strokeWidth="2"
                />
                <text x="15" y="4">
                  Geselecteerd beroep
                </text>
              </g>
              {!compact && (
                <g transform={`translate(${left + (searching ? 390 : 200)}, 14)`}>
                  <circle
                    r="7"
                    fill="var(--map-dot)"
                    stroke="var(--map-hover)"
                    strokeWidth="3"
                  />
                  <text x="15" y="4">
                    Aangewezen beroep
                  </text>
                </g>
              )}
            </g>
            <g transform={`translate(0, ${legendHeight})`}>
              <rect
                x={left}
                y={top}
                width={x(mx) - left}
                height={y(my) - top}
                fill="var(--map-complementary)"
              />
              <rect
                x={x(mx)}
                y={top}
                width={right - x(mx)}
                height={y(my) - top}
                fill="var(--map-support)"
              />
              <rect
                x={left}
                y={y(my)}
                width={x(mx) - left}
                height={bottom - y(my)}
                fill="var(--map-limited)"
              />
              <rect
                x={x(mx)}
                y={y(my)}
                width={right - x(mx)}
                height={bottom - y(my)}
                fill="var(--map-substitution)"
              />
              {Array.from({ length: 6 }, (_, i) => xmin + ((xmax - xmin) * i) / 5).map(
                (value) => (
                  <g key={value}>
                    <line
                      x1={x(value)}
                      x2={x(value)}
                      y1={top}
                      y2={bottom}
                      stroke="var(--map-grid)"
                    />
                    <text
                      x={x(value)}
                      y={bottom + 23}
                      textAnchor="middle"
                      fill="var(--muted)"
                      fontSize="12"
                    >
                      {format(value)}
                    </text>
                  </g>
                ),
              )}
              {Array.from({ length: 6 }, (_, i) => ymin + ((ymax - ymin) * i) / 5).map(
                (value) => (
                  <g key={value}>
                    <line
                      x1={left}
                      x2={right}
                      y1={y(value)}
                      y2={y(value)}
                      stroke="var(--map-grid)"
                    />
                    <text
                      x={left - 12}
                      y={y(value) + 4}
                      textAnchor="end"
                      fill="var(--muted)"
                      fontSize="12"
                    >
                      {format(value)}
                    </text>
                  </g>
                ),
              )}
              <line
                x1={x(mx)}
                x2={x(mx)}
                y1={top}
                y2={bottom}
                stroke="var(--map-median)"
                strokeDasharray="5 5"
              />
              <line
                x1={left}
                x2={right}
                y1={y(my)}
                y2={y(my)}
                stroke="var(--map-median)"
                strokeDasharray="5 5"
              />
              <g fill="var(--map-label)" fontSize="12">
                <text x={left + 12} y={top + 22}>
                  Complementair potentieel
                </text>
                <text x={right - 12} y={top + 22} textAnchor="end">
                  Potentieel productiviteitswinst
                </text>
                <text x={left + 12} y={bottom - 12}>
                  Beperkte directe AI-impact
                </text>
                <text x={right - 12} y={bottom - 12} textAnchor="end">
                  Hoger substitutierisico
                </text>
              </g>
              {[...visible]
                .sort(
                  (a, b) =>
                    (a.code === hovered
                      ? 3
                      : a.code === selected
                        ? 2
                        : searching && matchedCodes.has(a.code)
                          ? 1
                          : 0) -
                    (b.code === hovered
                      ? 3
                      : b.code === selected
                        ? 2
                        : searching && matchedCodes.has(b.code)
                          ? 1
                          : 0),
                )
                .map((row) => (
                  <circle
                    key={row.code}
                    cx={x(row.raw)}
                    cy={y(row.complementarity)}
                    {...pointAppearance({
                      found: searching && matchedCodes.has(row.code),
                      selected: row.code === selected,
                      hovered: row.code === hovered,
                      searching: compact || searching,
                    })}
                    onMouseEnter={() => {
                      if (!compact) setHovered(row.code);
                    }}
                    onMouseLeave={() => setHovered(null)}
                    tabIndex={compact ? undefined : 0}
                    role={compact ? undefined : 'button'}
                    aria-label={`${row.occupation}, ${selected === row.code ? 'deselecteer' : 'selecteer'} beroep`}
                    aria-pressed={row.code === selected}
                    onFocus={() => setHovered(row.code)}
                    onBlur={() => setHovered(null)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelected((current) =>
                          current === row.code ? '' : row.code,
                        );
                        setHovered(null);
                      }
                    }}
                    onClick={() => {
                      if (compact) return;
                      setSelected((current) => (current === row.code ? '' : row.code));
                      setHovered(null);
                    }}
                  >
                    <title>
                      {row.code} | {row.occupation}
                      {searching && matchedCodes.has(row.code)
                        ? ' · Gevonden beroep'
                        : ''}
                    </title>
                  </circle>
                ))}
              <text
                x={(left + right) / 2}
                y={bottom + 53}
                textAnchor="middle"
                fill="var(--text)"
                fontSize="13"
              >
                {info.axis} →
              </text>
              <text
                transform={`translate(20 ${(top + bottom) / 2}) rotate(-90)`}
                textAnchor="middle"
                fill="var(--text)"
                fontSize="13"
              >
                Complementariteitsscore →
              </text>
            </g>
          </svg>
        </div>
        <div className="map-detail-panel">
          <div className="map-detail" aria-live="polite">
            {active ? (
              <>
                <strong>
                  <a href={`#beroep/${active.code}`}>
                    {active.code} | {active.occupation}
                  </a>
                </strong>
                <a href={`#beroep/${active.code}`}>Bekijk beroepsprofiel →</a>
                {!compact && (
                  <dl className="map-detail-scores">
                    <div>
                      <dt>{info.table}</dt>
                      <dd>{format(active.raw)}</dd>
                    </div>
                    <div>
                      <dt>Complementariteitsscore</dt>
                      <dd>{format(active.complementarity)}</dd>
                    </div>
                  </dl>
                )}
                {interpretation && (
                  <p className="map-interpretation">
                    <strong>{interpretation.title}:</strong> {interpretation.text}
                  </p>
                )}
              </>
            ) : (
              <>
                <strong>
                  {searching && !highlighted.length
                    ? 'Geen punten gemarkeerd'
                    : 'Ontdek een beroep'}
                </strong>
                <span>
                  {searching && !highlighted.length
                    ? 'Geen overeenkomende beroepen met beide scores. De overige punten blijven zichtbaar; pas de zoekopdracht of hoofdgroep aan.'
                    : 'Wijs een stip aan of kies een beroep voor scores en een korte uitleg.'}
                </span>
              </>
            )}
          </div>
          {!compact && (
            <div className="map-figure-actions">
              <button type="button" className="text-button" onClick={exportSvg}>
                Download als SVG
              </button>
            </div>
          )}
        </div>
      </div>

      {compact && (
        <>
          {renderExplanation(
            <section
              className="scenario-score-explanation"
              aria-label="Wat betekenen deze scores?"
            >
              <h3>Wat betekenen deze scores?</h3>
              <p>
                <strong>AI-blootstelling:</strong> {info.note}
              </p>
              <p>
                <strong>Complementariteit:</strong> geeft aan in hoeverre AI menselijke
                arbeid kan ondersteunen, terwijl de menselijke rol belangrijk blijft.
              </p>
              <p className="source-caption scenario-analysis-reference">
                Kijk verder bij{' '}
                <a className="scenario-analysis-link" href="#invloed-ai">
                  Invloed van AI
                </a>
              </p>
            </section>,
          )}
        </>
      )}
      {!compact && (
        <>
          <section
            className="map-visualisation-info"
            aria-labelledby={`${variantId}-about`}
          >
            <h3 id={`${variantId}-about`}>Over deze visualisatie</h3>
            <p>
              De stippellijnen geven de mediane scores weer: {info.table}{' '}
              {format(mx).replace('-', '−')} en complementariteit {format(my)}.
            </p>
            <p className="source-caption">
              <strong>Bron:</strong> {info.source} en Pizzinelli et al. (2023). De
              complementariteitsscores zijn door DataFryslân berekend volgens de methode
              van Pizzinelli et al. (2023), op basis van O*NET 24.3 (2020).
            </p>
            <a href="#methodologie/methodologie-ai">
              Bronnen en methodologische toelichting
            </a>
          </section>
          <details className="map-data">
            <summary>
              Beroepen binnen de selectie bekijken in een scrollbare tabel (
              {tableRows.length})
            </summary>
            <div
              className="research-table"
              tabIndex={0}
              role="region"
              aria-label="Scrollbare tabel met alle beroepsgroepen binnen de selectie"
            >
              <table>
                <caption>
                  Beroepsgroepen binnen de huidige zoek-, hoofdgroep- en beroepsselectie
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Code</th>
                    <th scope="col">Beroep</th>
                    <th scope="col">{info.table}</th>
                    <th scope="col">Complementariteitsscore</th>
                  </tr>
                </thead>
                <tbody>
                  {!tableRows.length && (
                    <tr>
                      <td colSpan={4}>
                        Geen beroepen binnen deze selectie. Pas de zoekopdracht of
                        filters aan.
                      </td>
                    </tr>
                  )}
                  {tableRows.map((row) => (
                    <tr
                      key={row.code}
                      className={
                        row.code === selected ? 'map-table-selected' : undefined
                      }
                    >
                      <th scope="row">
                        {row.code}
                        {row.code === selected && (
                          <small className="map-table-selected-label">
                            Geselecteerd
                          </small>
                        )}
                      </th>
                      <td>
                        <a href={`#beroep/${row.code}`}>{row.occupation}</a>
                      </td>
                      <td>{row.raw === null ? 'Ontbreekt' : format(row.raw)}</td>
                      <td>
                        {row.complementarity === null
                          ? 'Ontbreekt'
                          : format(row.complementarity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
