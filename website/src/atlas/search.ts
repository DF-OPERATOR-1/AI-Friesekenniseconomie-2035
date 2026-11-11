import type { OccupationProfile } from './model';
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('nl-NL')
    .replace(/[-–—]/g, ' ');
const terms = (query: string) => normalize(query).trim().split(/\s+/).filter(Boolean);
export function profileCode(hash: string): string | null {
  const match = /^#beroep\/([0-9]{4})$/.exec(hash.split('?')[0]);
  return match?.[1] ?? null;
}
export function profileOccupation(hash: string): string {
  return new URLSearchParams(hash.split('?')[1] ?? '').get('beroep') ?? '';
}
export function matchingOccupationNames(row: OccupationProfile, query: string) {
  const words = terms(query);
  if (!words.length) return [];
  return [...new Set(row.occupation_names ?? [])].filter((name) =>
    words.every((word) => normalize(name).includes(word)),
  );
}
export function occupationHref(code: string, name = '') {
  return `#beroep/${code}${name ? `?beroep=${encodeURIComponent(name)}` : ''}`;
}
export function searchProfiles(
  rows: OccupationProfile[],
  query: string,
  availability = '',
  status = '',
) {
  const words = terms(query);
  return rows.filter((row) => {
    const haystack = normalize(
      `${row.isco_code} ${row.title} ${(row.occupation_names ?? []).join(' ')}`,
    );
    return (
      words.every((word) => haystack.includes(word)) &&
      (!availability ||
        (availability === 'both'
          ? row.ai_exposure.value !== null && row.ai_complementarity.value !== null
          : availability === 'exposure'
            ? row.ai_exposure.value !== null
            : row.ai_complementarity.value !== null)) &&
      (!status || row.data_status === status)
    );
  });
}
export function selectedOccupationUri(
  entries: { uri: string; name: string }[],
  name: string,
) {
  return (
    entries.find((entry) => normalize(entry.name) === normalize(name))?.uri ??
    entries[0]?.uri ??
    ''
  );
}
