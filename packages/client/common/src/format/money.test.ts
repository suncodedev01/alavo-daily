import { describe, expect, it } from 'vitest';

import {
  formatPercent,
  formatSignedVnd,
  formatVnd,
  formatVndInput,
  parseVndInput,
} from './money';

describe('formatVnd', () => {
  it('groups thousands with dots and appends the đồng sign', () => {
    expect(formatVnd(1250000)).toBe('1.250.000 ₫');
    expect(formatVnd(0)).toBe('0 ₫');
  });

  it('drops the sign and rounds to whole đồng', () => {
    expect(formatVnd(-65000)).toBe('65.000 ₫');
    expect(formatVnd(1999.6)).toBe('2.000 ₫');
  });
});

describe('formatSignedVnd', () => {
  it('shows a minus for spending and a plus for income', () => {
    expect(formatSignedVnd(-65000)).toBe('−65.000 ₫');
    expect(formatSignedVnd(4500000)).toBe('+4.500.000 ₫');
  });

  it('shows no sign for zero', () => {
    expect(formatSignedVnd(0)).toBe('0 ₫');
  });
});

describe('money field helpers', () => {
  it('parses only the digits a person typed', () => {
    expect(parseVndInput('1.250.000')).toBe(1250000);
    expect(parseVndInput('12a3')).toBe(123);
    expect(parseVndInput('')).toBe(0);
  });

  it('re-formats as the person types', () => {
    expect(formatVndInput('1250000')).toBe('1.250.000');
    expect(formatVndInput('')).toBe('');
    expect(formatVndInput('abc')).toBe('');
  });
});

describe('formatPercent', () => {
  it('rounds a ratio to a whole percent and allows over 100', () => {
    expect(formatPercent(0.923)).toBe('92%');
    expect(formatPercent(1.15)).toBe('115%');
    expect(formatPercent(0)).toBe('0%');
  });
});
