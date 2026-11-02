import type { OccupationProfile } from './model';
export function profileCode(hash: string): string | null {
  const match = /^#beroep\/([0-9]{4})$/.exec(hash);
  return match?.[1] ?? null;
}
export function searchProfiles(
  rows: OccupationProfile[],
  query: string,
  availability = '',
  status = '',
) {
  const term = query.trim().toLocaleLowerCase('nl-NL');
  return rows.filter(
    (row) =>
      `${row.isco_code} ${row.title} ${(row.occupation_names ?? []).join(' ')}`
        .toLocaleLowerCase('nl-NL')
        .includes(term) &&
      (!availability ||
        (availability === 'both'
          ? row.ai_exposure.value !== null && row.ai_complementarity.value !== null
          : availability === 'exposure'
            ? row.ai_exposure.value !== null
            : row.ai_complementarity.value !== null)) &&
      (!status || row.data_status === status),
  );
}
