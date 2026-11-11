/** Source observations stay immutable; user overrides are stored separately by ISCO. */
export type LabourKey = 'stock' | 'outflow' | 'demand';
export type LabourObservation = {
  value: number;
  source: string;
  referenceYear: number;
  url?: string;
};
export type LabourSources = Record<
  string,
  Partial<Record<LabourKey, LabourObservation>>
>;
export type LabourOverrides = Record<string, Partial<Record<LabourKey, string>>>;
export function resolveLabourValue(
  observation: LabourObservation | undefined,
  override: string | undefined,
) {
  const source =
    observation && Number.isFinite(observation.value) && observation.value >= 0
      ? observation
      : undefined;
  return {
    value: override !== undefined ? override : source ? String(source.value) : '',
    origin:
      override !== undefined
        ? ('user' as const)
        : source
          ? ('data' as const)
          : ('missing' as const),
    source,
  };
}
export function resetLabourValue(
  overrides: LabourOverrides,
  code: string,
  key: LabourKey,
): LabourOverrides {
  const next = { ...overrides[code] };
  delete next[key];
  return { ...overrides, [code]: next };
}
