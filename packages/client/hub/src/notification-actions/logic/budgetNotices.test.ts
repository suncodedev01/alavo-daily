import type { AppNotification } from '@alavo-daily/common';
import { describe, expect, it } from 'vitest';

import { budgetNoticeOptions, unannouncedBudgetNotices } from './budgetNotices';

function notice(id: string, overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id,
    module: 'spending',
    title: 'Ăn uống đã dùng 85% ngân sách',
    body: '',
    subjectId: 'category-food',
    createdAt: 0,
    read: false,
    ...overrides,
  };
}

describe('unannouncedBudgetNotices', () => {
  it('picks unread notices about a category that were not shown yet', () => {
    const notices = [notice('a'), notice('b'), notice('c')];
    const result = unannouncedBudgetNotices(notices, new Set(['a']));
    expect(result.map((item) => item.id)).toEqual(['b', 'c']);
  });

  it('skips read notices and notices that are not about a category', () => {
    const notices = [notice('a', { read: true }), notice('b', { subjectId: null })];
    expect(unannouncedBudgetNotices(notices, new Set())).toEqual([]);
  });
});

describe('budgetNoticeOptions', () => {
  it('asks for the budget buttons and names the category', () => {
    expect(budgetNoticeOptions(notice('a'))).toEqual({
      actionTypeId: 'budget-warning',
      data: { categoryId: 'category-food' },
    });
  });
});
