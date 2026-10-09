export const DONUT_RADIUS = 40;
export const DONUT_STROKE = 14;
export const DONUT_SIZE = 2 * (DONUT_RADIUS + DONUT_STROKE / 2);
const CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const MAX_SLICES = 5;
const OTHER_ID = 'other';

const SLICE_COLORS = [
  { stroke: 'stroke-chart-1', swatch: 'bg-chart-1' },
  { stroke: 'stroke-chart-2', swatch: 'bg-chart-2' },
  { stroke: 'stroke-chart-3', swatch: 'bg-chart-3' },
  { stroke: 'stroke-chart-4', swatch: 'bg-chart-4' },
  { stroke: 'stroke-chart-5', swatch: 'bg-chart-5' },
] as const;
const OTHER_COLOR = { stroke: 'stroke-line-strong', swatch: 'bg-line-strong' } as const;

export interface DonutInput {
  id: string;
  label: string;
  totalVnd: number;
}

export interface DonutSlice {
  id: string;
  label: string;
  totalVnd: number;
  share: number;
  stroke: string;
  swatch: string;
  dash: number;
  gap: number;
  offset: number;
}

/** The largest categories as slices, and everything after them merged into one "other" slice. */
export function buildDonut(items: readonly DonutInput[], otherLabel: string): DonutSlice[] {
  const total = items.reduce((sum, item) => sum + item.totalVnd, 0);
  if (total <= 0) return [];
  const sorted = [...items].sort((a, b) => b.totalVnd - a.totalVnd);
  const named = sorted.slice(0, MAX_SLICES);
  const rest = sorted.slice(MAX_SLICES);
  const merged = rest.length === 0 ? named : [...named, mergeRest(rest, otherLabel)];
  return withArcs(merged, total);
}

function mergeRest(rest: readonly DonutInput[], label: string): DonutInput {
  return { id: OTHER_ID, label, totalVnd: rest.reduce((sum, item) => sum + item.totalVnd, 0) };
}

function withArcs(items: readonly DonutInput[], total: number): DonutSlice[] {
  let before = 0;
  return items.map((item, index) => {
    const share = item.totalVnd / total;
    const dash = share * CIRCUMFERENCE;
    const color = item.id === OTHER_ID ? OTHER_COLOR : (SLICE_COLORS[index] ?? OTHER_COLOR);
    const slice = { ...item, share, ...color, dash, gap: CIRCUMFERENCE - dash, offset: -before };
    before += dash;
    return slice;
  });
}
