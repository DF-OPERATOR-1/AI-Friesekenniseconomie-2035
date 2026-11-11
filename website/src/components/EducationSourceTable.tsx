import { useId, useState } from 'react';
import type { CountRow } from './EducationCounts';

const amountKind = (value: string) =>
  /^\d+$/.test(value?.trim()) ? 0 : /^<\s*5$/.test(value?.trim()) ? 1 : 2;
export function compareSourceValues(
  left: string,
  right: string,
  field: string,
  direction: number,
) {
  if (field === 'Aantal') {
    const a = amountKind(left),
      b = amountKind(right);
    if (a !== b) return a - b; // Afgeschermd en ontbrekend blijven afzonderlijke categorieën, geen exact getal.
    return a === 0 ? (Number(left) - Number(right)) * direction : 0;
  }
  return (left ?? '').localeCompare(right ?? '', 'nl', { numeric: true }) * direction;
}
export function filterSourceRows(rows: CountRow[], filters: Record<string, string>) {
  return rows.filter((row) =>
    Object.entries(filters).every(
      ([field, value]) =>
        !value || (value === '__missing__' ? !row[field] : row[field] === value),
    ),
  );
}
const labels: Record<string, string> = {
  Jaar: 'Gegevensjaar',
  'Erkende opleiding code': 'Opleidingscode',
  Instellingsnaam: 'Instelling',
  'INSTELLINGSNAAM ACTUEEL': 'Instelling',
  'Plaatsnaam instelling': 'Plaats instelling',
  GEMEENTENAAM: 'Gemeente',
  OPLEIDINGSVORM: 'Opleidingsvorm',
  'SOORT DIPLOMA': 'Diplomatype',
  'TYPE HOGER ONDERWIJS': 'Opleidingsniveau',
  Geslacht: 'Geslacht',
  Leerweg: 'Leerweg',
};
export function EducationSourceTable({
  rows,
  title,
  year,
}: {
  rows: CountRow[];
  type: 'mbo' | 'hbo' | 'wo';
  title: string;
  year: string;
}) {
  const id = useId();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState({ field: 'Jaar', direction: -1 });
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const sourceColumns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const compactColumns = [
    'Jaar',
    'Erkende opleiding code',
    'INSTELLINGSNAAM ACTUEEL',
    'Instellingsnaam',
    'OPLEIDINGSVORM',
    'Leerweg',
    'Geslacht',
    'SOORT DIPLOMA',
    'Aantal',
  ].filter((field) => sourceColumns.includes(field));
  const columns = compactColumns;
  const filterFields = [
    'Jaar',
    'Erkende opleiding code',
    'INSTELLINGSNAAM ACTUEEL',
    'Instellingsnaam',
    'OPLEIDINGSVORM',
    'Leerweg',
    'TYPE HOGER ONDERWIJS',
    'SOORT DIPLOMA',
    'Niveau',
    'Geslacht',
  ].filter((field) => sourceColumns.includes(field));
  const filtered = filterSourceRows(rows, filters).sort((a, b) =>
    compareSourceValues(a[sort.field], b[sort.field], sort.field, sort.direction),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  return (
    <div className="education-source-table">
      <div className="education-table-filters">
        {filterFields.map((field) => (
          <label key={field} htmlFor={`${id}-${field}`}>
            {labels[field] ?? field}
            <select
              id={`${id}-${field}`}
              value={filters[field] ?? ''}
              onChange={(event) => {
                setFilters((current) => ({ ...current, [field]: event.target.value }));
                setPage(0);
              }}
            >
              <option value="">Alle</option>
              {[...new Set(rows.map((row) => row[field] ?? ''))]
                .sort((a, b) => a.localeCompare(b, 'nl', { numeric: true }))
                .map((value) => (
                  <option key={value} value={value || '__missing__'}>
                    {value || 'Niet vermeld'}
                  </option>
                ))}
            </select>
          </label>
        ))}
        <button
          type="button"
          className="button secondary"
          onClick={() => {
            setFilters({});
            setPage(0);
          }}
        >
          Filters wissen
        </button>
      </div>
      <div
        className="education-count-scroll"
        role="region"
        aria-label={`${title} in ${year}`}
        tabIndex={0}
      >
        <table className="education-count-table" aria-label={`${title} in ${year}`}>
          <thead>
            <tr>
              {columns.map((field) => (
                <th
                  scope="col"
                  key={field}
                  aria-sort={
                    sort.field === field
                      ? sort.direction === 1
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button
                    type="button"
                    title={`Sorteer op ${labels[field] ?? field}`}
                    onClick={() => {
                      setSort({
                        field,
                        direction: sort.field === field ? -sort.direction : 1,
                      });
                      setPage(0);
                    }}
                  >
                    {labels[field] ?? field}
                    {sort.field === field ? (sort.direction === 1 ? ' ↑' : ' ↓') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={`${currentPage}:${index}`}>
                {columns.map((field) => (
                  <td
                    className={field === 'Aantal' ? 'education-numeric' : undefined}
                    key={field}
                    data-source-value={row[field] ?? ''}
                  >
                    {/^<\s*5$/.test(row[field])
                      ? 'Minder dan 5'
                      : row[field] || 'Niet vermeld'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <p role="status">Geen bronrijen voor deze filters.</p>}
      </div>
      <p className="chart-source">Bron: DUO</p>
      <EducationPagination
        page={currentPage}
        pages={pages}
        results={filtered.length}
        onChange={setPage}
      />
    </div>
  );
}

/** Zero-based pages, with bounded neighbours and first/last pages always reachable. */
export function educationPageNumbers(
  page: number,
  pages: number,
): (number | 'ellipsis')[] {
  const current = Math.max(0, Math.min(page, pages - 1));
  const selected = new Set([0, pages - 1, current]);
  if (current === 0) selected.add(1);
  if (current === pages - 1) selected.add(pages - 2);
  const sorted = [...selected].filter((n) => n >= 0 && n < pages).sort((a, b) => a - b);
  const items: (number | 'ellipsis')[] = [];
  sorted.forEach((n, index) => {
    const previous = sorted[index - 1];
    if (index && n - previous === 2) items.push(previous + 1);
    else if (index && n - previous > 2) items.push('ellipsis');
    items.push(n);
  });
  return items;
}
export function EducationPagination({
  page,
  pages,
  results,
  onChange,
  label = 'Paginering onderwijscijfers',
  pageSize,
  onPageSizeChange,
}: {
  label?: string;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  page: number;
  pages: number;
  results: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="education-pagination-wrapper">
      {onPageSizeChange && (
        <label className="overview-page-size">
          Per pagina
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </label>
      )}
      <nav className="education-pagination" aria-label={label}>
        <button type="button" disabled={page === 0} onClick={() => onChange(page - 1)}>
          <span aria-hidden="true">←</span> Vorige
        </button>
        <div className="education-page-numbers">
          {educationPageNumbers(page, pages).map((item, index) =>
            item === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="education-page-ellipsis"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-label={`Pagina ${item + 1}`}
                aria-current={page === item ? 'page' : undefined}
                onClick={() => onChange(item)}
              >
                {item + 1}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          disabled={page >= pages - 1}
          onClick={() => onChange(page + 1)}
        >
          Volgende <span aria-hidden="true">→</span>
        </button>
      </nav>
      <p className="education-pagination-results" role="status">
        {results} {results === 1 ? 'resultaat' : 'resultaten'}
      </p>
    </div>
  );
}
