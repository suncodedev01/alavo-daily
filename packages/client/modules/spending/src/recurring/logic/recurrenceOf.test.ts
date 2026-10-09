import { describe, expect, it } from 'vitest';

import { transaction } from '../../testing/fixtures';
import { isGenerated, recurrenceOf } from './recurrenceOf';

describe('recurrenceOf', () => {
  it('reads a monthly rule as a template with its day', () => {
    const item = transaction('2026-10-05', 'Tiền nhà', 'home', 'tcb', -7_500_000, 'monthly:5');
    expect(recurrenceOf(item)).toEqual({ kind: 'template', day: 5 });
  });

  it('reads a copy that points at its source as generated', () => {
    const item = { ...transaction('2026-10-05', 'Tiền nhà', 'home', 'tcb', -7_500_000), recurringSourceId: 'tx-1' };
    expect(recurrenceOf(item)).toEqual({ kind: 'generated', templateId: 'tx-1' });
    expect(isGenerated(item)).toBe(true);
  });

  it('treats a one-off or an unreadable rule as not recurring', () => {
    expect(recurrenceOf(transaction('2026-10-05', 'Phở', 'food', 'cash', -70_000))).toEqual({ kind: 'none' });
    const odd = transaction('2026-10-05', 'Lạ', 'food', 'cash', -1, 'weekly:2');
    expect(recurrenceOf(odd)).toEqual({ kind: 'none' });
    expect(isGenerated(odd)).toBe(false);
  });
});
