import type { ChartModel } from '../types';

export const CHART_WIDTH = 440;
export const CHART_HEIGHT = 260;

export const CHART_LEFT = 8;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 28;
const BAR_WIDTH_RATIO = 0.56;
const GRID_INTERVALS = 4;
const EMPTY_CEILING_VND = 500_000;
const NICE_STEPS = [1, 2, 2.5, 5, 10];
const DENSE_DAY_COUNT = 16;
const LABEL_EVERY_DAYS = 5;

export function niceCeiling(maxVnd: number): number {
  if (maxVnd <= 0) return EMPTY_CEILING_VND;
  const magnitude = 10 ** Math.floor(Math.log10(maxVnd));
  const step = NICE_STEPS.find((factor) => factor * magnitude >= maxVnd) ?? 10;
  return step * magnitude;
}

export function averageOf(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function showLabelFor(day: number, count: number, isToday: boolean): boolean {
  if (count <= DENSE_DAY_COUNT || isToday) return true;
  return day === 1 || day % LABEL_EVERY_DAYS === 0;
}

export function buildChart(dailyVnd: readonly number[], todayIndex: number | null): ChartModel {
  const ceilingVnd = niceCeiling(Math.max(0, ...dailyVnd));
  const baselineY = CHART_HEIGHT - PADDING_BOTTOM;
  const scale = (value: number) => baselineY - (baselineY - PADDING_TOP) * (value / ceilingVnd);
  const slot = (CHART_WIDTH - CHART_LEFT) / Math.max(1, dailyVnd.length);
  const bars = dailyVnd.map((valueVnd, index) => {
    const isToday = index === todayIndex;
    const width = slot * BAR_WIDTH_RATIO;
    return {
      day: index + 1,
      valueVnd,
      x: CHART_LEFT + index * slot + (slot - width) / 2,
      y: scale(valueVnd),
      width,
      height: baselineY - scale(valueVnd),
      isToday,
      showLabel: showLabelFor(index + 1, dailyVnd.length, isToday),
    };
  });
  const grid = Array.from({ length: GRID_INTERVALS + 1 }, (_, step) => {
    const valueVnd = (ceilingVnd * step) / GRID_INTERVALS;
    return { y: scale(valueVnd), valueVnd };
  });
  const averageVnd = averageOf(dailyVnd);
  return { bars, grid, averageVnd, averageY: scale(averageVnd), baselineY, ceilingVnd };
}
