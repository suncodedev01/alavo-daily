import { describe, expect, it } from 'vitest';

import { monthlyRule, monthlyRuleDay } from './recurrence';

describe('recurrence rules', () => {
  it('writes a monthly rule from a day of the month', () => {
    expect(monthlyRule(8)).toBe('monthly:8');
  });

  it('reads the day back from a monthly rule', () => {
    expect(monthlyRuleDay('monthly:31')).toBe(31);
  });

  it('rejects empty, unknown and out-of-range rules', () => {
    expect(monthlyRuleDay(null)).toBeNull();
    expect(monthlyRuleDay('weekly:2')).toBeNull();
    expect(monthlyRuleDay('monthly:0')).toBeNull();
    expect(monthlyRuleDay('monthly:32')).toBeNull();
    expect(monthlyRuleDay('monthly:x')).toBeNull();
  });
});
