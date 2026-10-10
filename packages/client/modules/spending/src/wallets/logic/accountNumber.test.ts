import { describe, expect, it } from 'vitest';

import { maskedAccountNumber } from './accountNumber';

describe('maskedAccountNumber', () => {
  it('shows only the last four digits', () => {
    expect(maskedAccountNumber('190345678901')).toBe('•••• 8901');
  });

  it('ignores spaces and shows short numbers as they are after the dots', () => {
    expect(maskedAccountNumber('1903 4567 8901')).toBe('•••• 8901');
    expect(maskedAccountNumber('123')).toBe('•••• 123');
  });

  it('says nothing when there is no number', () => {
    expect(maskedAccountNumber(null)).toBeNull();
    expect(maskedAccountNumber(undefined)).toBeNull();
    expect(maskedAccountNumber('  ')).toBeNull();
  });
});
