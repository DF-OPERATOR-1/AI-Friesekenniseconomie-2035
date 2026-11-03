export const mapExposureVariants = {
  raw: {
    label: 'Algemene AI',
    axis: 'AI-blootstelling (algemeen)',
    table: 'AI-blootstelling (algemeen)',
    source: 'Felten et al. (2021)',
    note: 'Meet de overlap tussen beroepsvaardigheden en tien AI-toepassingen: strategiespellen, realtimegames, beeldherkenning, vragen over beelden beantwoorden, afbeeldingen genereren, begrijpend lezen, taalmodellering, vertalen, spraakherkenning en instrumentale muziek herkennen.',
  },
  language: {
    label: 'Taalmodellen',
    axis: 'AI-blootstelling (taalmodel)',
    table: 'AI-blootstelling (taalmodel)',
    source: 'Felten et al. (2023)',
    note: 'Meet de overlap tussen beroepsvaardigheden en AI die taal begrijpt en genereert, zoals ChatGPT.',
  },
  image: {
    label: 'Beeldgeneratie',
    axis: 'AI-blootstelling (beeldgeneratie)',
    table: 'AI-blootstelling (beeldgeneratie)',
    source: 'Felten et al. (2023)',
    note: 'Meet de overlap tussen beroepsvaardigheden en AI die afbeeldingen genereert.',
  },
} as const;
export type MapExposureVariant = keyof typeof mapExposureVariants;

type MapRow = {
  code: string;
  occupation: string;
  raw: number | null;
  complementarity: number | null;
};

// Project the chosen existing score onto the map's horizontal coordinate.
// The original input rows and stored scores are never modified or rescaled.
export function mapExposureRows<
  T extends MapRow & { language: number | null; image: number | null },
>(rows: T[], variant: MapExposureVariant) {
  return rows.map((row) => ({ ...row, raw: row[variant] }));
}

export function selectMapRows<T extends MapRow>(
  rows: T[],
  query: string,
  group: string,
  selected = '',
) {
  const term = query.trim().toLocaleLowerCase('nl-NL');
  const context = rows.filter((row) => !group || row.code.startsWith(group));
  const matches = context.filter((row) =>
    `${row.code} ${row.occupation}`.toLocaleLowerCase('nl-NL').includes(term),
  );
  const visible = context.filter(
    (row): row is T & { raw: number; complementarity: number } =>
      row.raw !== null && row.complementarity !== null,
  );
  const matchedCodes = new Set(matches.map((row) => row.code));
  const highlighted = visible.filter((row) => matchedCodes.has(row.code));

  const tableRows = selected
    ? context.filter(
        (row) =>
          row.code === selected || (term.length > 0 && matchedCodes.has(row.code)),
      )
    : matches;
  return {
    matches,
    visible,
    matchedCodes,
    highlighted,
    tableRows,
    searching: term.length > 0,
  };
}

export function pointAppearance({
  found,
  selected,
  hovered,
  searching,
}: {
  found: boolean;
  selected: boolean;
  hovered: boolean;
  searching: boolean;
}) {
  return {
    fill: selected ? 'var(--map-selected)' : found ? 'var(--yellow)' : 'var(--map-dot)',
    fillOpacity: selected || found || hovered ? 1 : searching ? 0.45 : 0.75,
    r: selected ? 8 : hovered ? 7 : found ? 6 : 4,
    stroke: hovered ? 'var(--map-hover)' : 'var(--map-dot-border)',
    strokeWidth: hovered ? 3 : selected || found ? 2 : 1,
  };
}

export function interpretMapPoint(
  point: { raw: number; complementarity: number } | undefined,
  exposureMedian: number,
  complementarityMedian: number,
) {
  if (!point) return null;
  if (point.raw === exposureMedian || point.complementarity === complementarityMedian) {
    return {
      title: 'Op een scheidslijn',
      text: 'Dit beroep ligt op de grens tussen twee vlakken.',
    };
  }
  if (point.raw > exposureMedian) {
    return point.complementarity > complementarityMedian
      ? {
          title: 'Potentieel productiviteitswinst',
          text: 'AI kan helpen om bepaalde werkzaamheden sneller of gemakkelijker uit te voeren.',
        }
      : {
          title: 'Hoger substitutierisico',
          text: 'AI kan mogelijk een groter deel van de werkzaamheden in dit beroep overnemen. Er zijn relatief minder kenmerken die erop wijzen dat AI vooral als ondersteuning wordt ingezet. Dit betekent niet automatisch dat banen verdwijnen.',
        };
  }
  return point.complementarity > complementarityMedian
    ? {
        title: 'Complementair potentieel',
        text: 'AI kan in dit beroep veel werkzaamheden ondersteunen. Tegelijkertijd blijft de menselijke rol belangrijk, bijvoorbeeld bij het nemen van beslissingen, het dragen van verantwoordelijkheid of persoonlijk contact.',
      }
    : {
        title: 'Beperkte directe AI-impact',
        text: 'De werkzaamheden in dit beroep sluiten minder sterk aan bij wat AI momenteel kan. Daardoor lijkt de directe invloed van AI op dit beroep relatief beperkt.',
      };
}
