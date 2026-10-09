import { describe, expect, it } from 'vitest';

import { presetRange, withFrom, withTo } from './ranges';

describe('presetRange', () => {
  it('runs from the first of this month to today', () => {
    expect(presetRange('month', '2026-10-09')).toEqual({ from: '2026-10-01', to: '2026-10-09' });
  });

  it('covers this month and the two before it for "3 tháng"', () => {
    expect(presetRange('quarter', '2026-10-09')).toEqual({ from: '2026-08-01', to: '2026-10-09' });
  });

  it('crosses the year boundary when going back from January or February', () => {
    expect(presetRange('quarter', '2026-01-15')).toEqual({ from: '2025-11-01', to: '2026-01-15' });
  });

  it('runs from 1 January for this year', () => {
    expect(presetRange('year', '2026-10-09')).toEqual({ from: '2026-01-01', to: '2026-10-09' });
  });
});

describe('custom range editing', () => {
  const range = { from: '2026-09-01', to: '2026-09-30' };

  it('changes one end and keeps the other', () => {
    expect(withFrom(range, '2026-09-10')).toEqual({ from: '2026-09-10', to: '2026-09-30' });
    expect(withTo(range, '2026-09-20')).toEqual({ from: '2026-09-01', to: '2026-09-20' });
  });

  it('pushes the other end along when the start passes the end', () => {
    expect(withFrom(range, '2026-10-05')).toEqual({ from: '2026-10-05', to: '2026-10-05' });
  });

  it('pulls the other end back when the end passes the start', () => {
    expect(withTo(range, '2026-08-15')).toEqual({ from: '2026-08-15', to: '2026-08-15' });
  });

  it('allows a single-day range', () => {
    expect(withTo(range, '2026-09-01')).toEqual({ from: '2026-09-01', to: '2026-09-01' });
  });
});
