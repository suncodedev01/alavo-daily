import type { MenuDish, MorningMenu } from '@alavo-daily/common';
import { describe, expect, it } from 'vitest';

import { buildReminders, localTimeOf, reminderId } from './reminders';

const HOUR = 60 * 60 * 1000;

function menu(date: string, source: MorningMenu['source'] = 'planned'): MorningMenu {
  return { date, source, dishes: [] };
}

function at(date: string, hours: number, minutes = 0): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year!, month! - 1, day!, hours, minutes).getTime();
}

const describeAnything = () => ({ title: 'Hôm nay ăn gì?', body: 'Bún chả' });
const input = { startTime: '06:00', describe: describeAnything };

describe('localTimeOf', () => {
  it('reads the date and the clock in the local time zone', () => {
    expect(localTimeOf('2026-10-10', '06:30')).toBe(at('2026-10-10', 6, 30));
  });

  it.each(['6:00', '24:00', '06:60', 'sáng', ''])('rejects the time %j', (time) => {
    expect(localTimeOf('2026-10-10', time)).toBeNull();
  });

  it('rejects a date that is not YYYY-MM-DD', () => {
    expect(localTimeOf('10/10/2026', '06:00')).toBeNull();
  });
});

describe('reminderId', () => {
  it('is stable and different for each date and reminder', () => {
    expect(reminderId('2026-10-10', 0)).toBe(reminderId('2026-10-10', 0));
    expect(reminderId('2026-10-10', 3)).not.toBe(reminderId('2026-10-10', 0));
    expect(reminderId('2026-10-11', 0)).not.toBe(reminderId('2026-10-10', 0));
  });

  it('fits in a 32-bit integer, which mobile notification ids require', () => {
    expect(reminderId('2099-12-31', 3)).toBeLessThan(2 ** 31);
    expect(reminderId('2099-12-31', 3)).toBeGreaterThan(0);
  });
});

describe('buildReminders', () => {
  it('reminds at 6, 7, 8 and 9 o clock for a morning that has a menu', () => {
    const reminders = buildReminders({ ...input, menus: [menu('2026-10-10')], now: at('2026-10-09', 20) });
    const expected = [0, 1, 2, 3].map((hour) => at('2026-10-10', 6) + hour * HOUR);
    expect(reminders.map((item) => item.at)).toEqual(expected);
  });

  it('follows the time of the rule', () => {
    const reminders = buildReminders({ ...input, startTime: '05:30', menus: [menu('2026-10-10')], now: 0 });
    expect(reminders[0]?.at).toBe(at('2026-10-10', 5, 30));
    expect(reminders[3]?.at).toBe(at('2026-10-10', 8, 30));
  });

  it('leaves out reminders whose time has passed', () => {
    const now = at('2026-10-10', 7, 30);
    const reminders = buildReminders({ ...input, menus: [menu('2026-10-10')], now });
    expect(reminders.map((item) => item.at)).toEqual([at('2026-10-10', 8), at('2026-10-10', 9)]);
  });

  it('leaves out the reminder that is exactly now, because it would already have shown', () => {
    const now = at('2026-10-10', 6);
    const reminders = buildReminders({ ...input, menus: [menu('2026-10-10')], now });
    expect(reminders).toHaveLength(3);
  });

  it('says nothing for a morning with no dish and no recipe to suggest', () => {
    const reminders = buildReminders({ ...input, menus: [menu('2026-10-10', 'empty')], now: 0 });
    expect(reminders).toEqual([]);
  });

  it('reminds a suggested morning like a planned one', () => {
    const reminders = buildReminders({ ...input, menus: [menu('2026-10-10', 'suggested')], now: 0 });
    expect(reminders).toHaveLength(4);
  });

  it('gives every reminder of several mornings its own id', () => {
    const menus = [menu('2026-10-10'), menu('2026-10-11'), menu('2026-10-12')];
    const reminders = buildReminders({ ...input, menus, now: 0 });
    expect(new Set(reminders.map((item) => item.id)).size).toBe(12);
  });

  it('carries the text of the menu', () => {
    const [first] = buildReminders({ ...input, menus: [menu('2026-10-10')], now: 0 });
    expect(first).toMatchObject({ title: 'Hôm nay ăn gì?', body: 'Bún chả' });
  });

  it('offers the buttons for the first dish, so one tap starts cooking it', () => {
    const dishes: MenuDish[] = [
      { recipeId: 'recipe-1', name: 'Bún chả', icon: 'cooking-pot', slot: 'dinner' },
      { recipeId: 'recipe-2', name: 'Canh', icon: 'cooking-pot', slot: 'dinner' },
    ];
    const reminders = buildReminders({
      ...input,
      menus: [{ date: '2026-10-10', source: 'planned', dishes }],
      now: 0,
    });
    expect(reminders).toHaveLength(4);
    reminders.forEach((reminder) =>
      expect(reminder).toMatchObject({ actionTypeId: 'dish-reminder', data: { recipeId: 'recipe-1' } }),
    );
  });

  it('offers no buttons when the menu has no dish to cook', () => {
    const [first] = buildReminders({ ...input, menus: [menu('2026-10-10')], now: 0 });
    expect(first).not.toHaveProperty('actionTypeId');
    expect(first).not.toHaveProperty('data');
  });

  it('schedules nothing when the rule time is not valid', () => {
    const reminders = buildReminders({ ...input, startTime: 'sáng', menus: [menu('2026-10-10')], now: 0 });
    expect(reminders).toEqual([]);
  });
});
