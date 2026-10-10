import { describe, expect, it } from 'vitest';

import { shortMoney } from './shortMoney';

describe('shortMoney', () => {
  it('writes millions with one decimal and a comma', () => {
    expect(shortMoney(40_500_000)).toBe('40,5 tr');
    expect(shortMoney(2_000_000)).toBe('2 tr');
    expect(shortMoney(1_050_000)).toBe('1,1 tr');
  });

  it('drops the decimal from a hundred million up', () => {
    expect(shortMoney(150_400_000)).toBe('150 tr');
  });

  it('keeps the minus sign for a shortfall', () => {
    expect(shortMoney(-12_300_000)).toBe('−12,3 tr');
  });

  it('writes an amount under a million in full', () => {
    expect(shortMoney(950_000)).toBe('950.000 ₫');
    expect(shortMoney(0)).toBe('0 ₫');
  });
});
