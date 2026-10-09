import { describe, expect, it } from 'vitest';

import { buildActionTypes } from './actionTypes';

const translate = (key: string, values?: Record<string, string | number>) =>
  Object.entries(values ?? {}).reduce((text, [name, value]) => text.replace(`{{${name}}}`, String(value)), key);

describe('buildActionTypes', () => {
  it('gives the dish reminder a button to start cooking and one to be reminded again', () => {
    const [dish] = buildActionTypes(translate);
    expect(dish).toEqual({
      id: 'dish-reminder',
      actions: [
        { id: 'start-cooking', label: 'Bắt đầu nấu' },
        { id: 'snooze-10', label: 'Nhắc lại sau 10 phút' },
      ],
    });
  });

  it('gives the budget warning a button to raise the budget by the amount and one to keep it', () => {
    const budget = buildActionTypes(translate)[1];
    expect(budget?.id).toBe('budget-warning');
    expect(budget?.actions.map((action) => action.id)).toEqual(['raise-budget', 'keep-budget']);
    expect(budget?.actions[0]?.label).toBe('Tăng thêm 300.000 ₫');
    expect(budget?.actions[1]?.label).toBe('Giữ nguyên');
  });
});
