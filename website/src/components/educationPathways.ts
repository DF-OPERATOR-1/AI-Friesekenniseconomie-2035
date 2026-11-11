const labels: Record<string, string> = {
  BOLVT: 'BOL (voltijd)',
  BOLDT: 'BOL (deeltijd)',
  BOL: 'BOL',
  BBL: 'BBL',
  EX: 'Extraneus',
  OVO: 'Overig onderwijs',
  'voltijd onderwijs': 'Voltijd',
  'deeltijd onderwijs': 'Deeltijd',
  'duaal onderwijs': 'Duaal',
};
export function pathwayLabel(value: string) {
  return labels[value] ?? value;
}
export function pathwaySummary(pathways: string[], type: string) {
  const unique = [...new Set(pathways)];
  if (type === 'mbo') {
    const order = ['BBL', 'BOLVT', 'BOLDT', 'BOL', 'OVO', 'EX'];
    unique.sort(
      (a, b) =>
        (order.includes(a) ? order.indexOf(a) : 99) -
        (order.includes(b) ? order.indexOf(b) : 99),
    );
  }
  return `${type === 'mbo' ? 'Leerweg' : 'Opleidingsvorm'}: ${unique.map(pathwayLabel).join(' / ') || 'Niet vermeld'}`;
}
