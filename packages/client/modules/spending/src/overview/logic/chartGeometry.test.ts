import { describe, expect, it } from 'vitest';

import { averageOf, buildChart, CHART_HEIGHT, niceCeiling } from './chartGeometry';

describe('niceCeiling', () => {
  it('rounds up to a readable step', () => {
    expect(niceCeiling(1_150_000)).toBe(2_000_000);
    expect(niceCeiling(480_000)).toBe(500_000);
    expect(niceCeiling(2_300_000)).toBe(2_500_000);
  });

  it('keeps an exact step as it is', () => {
    expect(niceCeiling(1_000_000)).toBe(1_000_000);
  });

  it('uses a default ceiling when nothing was spent', () => {
    expect(niceCeiling(0)).toBe(500_000);
  });
});

describe('averageOf', () => {
  it('averages all days including zero days', () => {
    expect(averageOf([100, 0, 200, 0])).toBe(75);
  });

  it('returns 0 for no days', () => {
    expect(averageOf([])).toBe(0);
  });
});

describe('buildChart', () => {
  const daily = [100_000, 0, 400_000];

  it('makes one bar per day and highlights only today', () => {
    const model = buildChart(daily, 2);
    expect(model.bars).toHaveLength(3);
    expect(model.bars.map((bar) => bar.isToday)).toEqual([false, false, true]);
  });

  it('scales bar height against the ceiling', () => {
    const model = buildChart(daily, null);
    const [first, empty, tall] = model.bars;
    expect(empty?.height).toBe(0);
    expect(tall!.height).toBeGreaterThan(first!.height);
    expect(tall!.y + tall!.height).toBeCloseTo(model.baselineY);
  });

  it('places the average line between the baseline and the top', () => {
    const model = buildChart(daily, null);
    expect(model.averageVnd).toBeCloseTo(166_666.67, 1);
    expect(model.averageY).toBeLessThan(model.baselineY);
    expect(model.averageY).toBeGreaterThan(0);
    expect(model.baselineY).toBeLessThan(CHART_HEIGHT);
  });

  it('draws five grid lines from zero to the ceiling', () => {
    const model = buildChart(daily, null);
    expect(model.grid.map((line) => line.valueVnd)).toEqual([0, 125_000, 250_000, 375_000, 500_000]);
  });

  it('labels every day on a short month and thins labels on a long one', () => {
    expect(buildChart(Array.from({ length: 9 }, () => 0), 8).bars.every((bar) => bar.showLabel)).toBe(true);
    const long = buildChart(Array.from({ length: 31 }, () => 0), 30);
    expect(long.bars.filter((bar) => bar.showLabel).map((bar) => bar.day)).toEqual([1, 5, 10, 15, 20, 25, 30, 31]);
  });

  it('handles an empty month without dividing by zero', () => {
    expect(buildChart([], null).bars).toEqual([]);
  });
});
