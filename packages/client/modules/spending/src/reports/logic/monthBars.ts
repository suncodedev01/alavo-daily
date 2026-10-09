import type { MonthBar } from '@alavo-daily/common/engine';

import { niceCeiling } from '../../overview';

export const BARS_WIDTH = 440;
export const BARS_HEIGHT = 240;
const LEFT = 8;
const TOP = 12;
const BOTTOM = 28;
const GRID_INTERVALS = 4;
const GROUP_FILL = 0.7;
const MAX_LABELS = 12;

export interface BarBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MonthGroup {
  month: string;
  label: string;
  showLabel: boolean;
  expense: BarBox;
  income: BarBox;
  expenseVnd: number;
  incomeVnd: number;
}

export interface MonthBarsModel {
  groups: MonthGroup[];
  grid: { y: number; valueVnd: number }[];
  baselineY: number;
}

interface Frame {
  baselineY: number;
  ceiling: number;
  slot: number;
  scale: (value: number) => number;
}

interface LabelPlan {
  multiYear: boolean;
  every: number;
}

export function buildMonthBars(months: readonly MonthBar[]): MonthBarsModel {
  const frame = frameFor(months);
  const labels = labelPlan(months);
  return {
    groups: months.map((bar, index) => groupOf(bar, index, frame, labels)),
    grid: gridOf(frame),
    baselineY: frame.baselineY,
  };
}

function frameFor(months: readonly MonthBar[]): Frame {
  const tallest = Math.max(0, ...months.flatMap((bar) => [bar.incomeVnd, bar.expenseVnd]));
  const ceiling = niceCeiling(tallest);
  const baselineY = BARS_HEIGHT - BOTTOM;
  return {
    baselineY,
    ceiling,
    slot: (BARS_WIDTH - LEFT) / Math.max(1, months.length),
    scale: (value) => baselineY - (baselineY - TOP) * (value / ceiling),
  };
}

function groupOf(bar: MonthBar, index: number, frame: Frame, labels: LabelPlan): MonthGroup {
  const width = (frame.slot * GROUP_FILL) / 2;
  const left = LEFT + index * frame.slot + (frame.slot - width * 2) / 2;
  const box = (x: number, value: number): BarBox => ({
    x,
    y: frame.scale(value),
    width,
    height: frame.baselineY - frame.scale(value),
  });
  return {
    month: bar.month,
    label: monthLabel(bar.month, labels.multiYear),
    showLabel: index % labels.every === 0,
    expense: box(left, bar.expenseVnd),
    income: box(left + width, bar.incomeVnd),
    expenseVnd: bar.expenseVnd,
    incomeVnd: bar.incomeVnd,
  };
}

function gridOf(frame: Frame): { y: number; valueVnd: number }[] {
  return Array.from({ length: GRID_INTERVALS + 1 }, (_, step) => {
    const valueVnd = (frame.ceiling * step) / GRID_INTERVALS;
    return { y: frame.scale(valueVnd), valueVnd };
  });
}

function labelPlan(months: readonly MonthBar[]): LabelPlan {
  const firstYear = months[0]?.month.slice(0, 4);
  const lastYear = months.at(-1)?.month.slice(0, 4);
  return { multiYear: firstYear !== lastYear, every: Math.max(1, Math.ceil(months.length / MAX_LABELS)) };
}

/** `2026-10` → `T10`, or `10/26` when the range spans more than one year. */
export function monthLabel(month: string, multiYear: boolean): string {
  const number = Number(month.slice(5));
  return multiYear ? `${number}/${month.slice(2, 4)}` : `T${number}`;
}
