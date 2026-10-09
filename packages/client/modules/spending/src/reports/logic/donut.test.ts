import { describe, expect, it } from 'vitest';

import { buildDonut } from './donut';

const item = (id: string, totalVnd: number) => ({ id, label: id.toUpperCase(), totalVnd });

describe('buildDonut', () => {
  it('sizes each slice by its share, largest first', () => {
    const slices = buildDonut([item('a', 100), item('b', 300)], 'Khác');
    expect(slices.map((slice) => slice.id)).toEqual(['b', 'a']);
    expect(slices[0]?.share).toBe(0.75);
    expect(slices[1]?.share).toBe(0.25);
  });

  it('places each arc after the previous one and the arcs fill the circle', () => {
    const [first, second] = buildDonut([item('a', 100), item('b', 300)], 'Khác');
    expect(first?.offset).toBe(-0);
    expect(second?.offset).toBeCloseTo(-(first?.dash ?? 0));
    expect((first?.dash ?? 0) + (second?.dash ?? 0)).toBeCloseTo(2 * Math.PI * 40);
  });

  it('keeps five named slices and merges the rest into one other slice', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id, index) => item(id, 700 - index * 100));
    const slices = buildDonut(many, 'Khác');
    expect(slices).toHaveLength(6);
    const other = slices[5];
    expect(other?.label).toBe('Khác');
    expect(other?.totalVnd).toBe(200 + 100);
    expect(slices.reduce((sum, slice) => sum + slice.share, 0)).toBeCloseTo(1);
  });

  it('adds no other slice for five categories or fewer', () => {
    expect(buildDonut(['a', 'b', 'c', 'd', 'e'].map((id) => item(id, 10)), 'Khác')).toHaveLength(5);
  });

  it('gives every slice its own colour', () => {
    const slices = buildDonut(['a', 'b', 'c'].map((id) => item(id, 10)), 'Khác');
    expect(new Set(slices.map((slice) => slice.stroke)).size).toBe(3);
  });

  it('draws nothing when there is no money', () => {
    expect(buildDonut([], 'Khác')).toEqual([]);
    expect(buildDonut([item('a', 0)], 'Khác')).toEqual([]);
  });
});
