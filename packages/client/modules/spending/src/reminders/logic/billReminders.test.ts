import type { Bill } from '@alavo-daily/common/engine';
import { describe, expect, it } from 'vitest';

import { billReminderId, billsDueOn, buildBillReminders } from './billReminders';

function bill(id: string, dayOfMonth: number, active = true): Bill {
  return { id, title: id, icon: 'lightning', amountVnd: 650_000, dayOfMonth, active };
}

const describeBill = (item: Bill, dueOn: string) => ({ title: 'Hoá đơn sắp đến hạn', body: `${item.title} ${dueOn}` });
const at = (day: number, hours = 9, minutes = 0) => new Date(2026, 9, day, hours, minutes).getTime();
const input = { time: '09:00', today: '2026-10-09', now: at(9, 8), describe: describeBill };

describe('billsDueOn', () => {
  it('picks the active bills whose day of month is that date', () => {
    const bills = [bill('a', 12), bill('b', 13), bill('paused', 12, false)];
    expect(billsDueOn(bills, '2026-10-12').map((item) => item.id)).toEqual(['a']);
  });

  it('treats the last day of a short month as the due day of a bill on the 31st', () => {
    expect(billsDueOn([bill('rent', 31)], '2026-11-30')).toHaveLength(1);
    expect(billsDueOn([bill('rent', 31)], '2026-11-29')).toHaveLength(0);
  });
});

describe('buildBillReminders', () => {
  it('reminds two days before the due date at the rule time', () => {
    const reminders = buildBillReminders({ ...input, bills: [bill('Điện', 12)] });
    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.at).toBe(at(10));
    expect(reminders[0]?.body).toBe('Điện 2026-10-12');
  });

  it('follows the time chosen in the settings', () => {
    const reminders = buildBillReminders({ ...input, time: '07:45', now: at(9, 6), bills: [bill('Điện', 12)] });
    expect(reminders[0]?.at).toBe(at(10, 7, 45));
  });

  it('does not remind about a bill whose reminder day is already behind', () => {
    const reminders = buildBillReminders({ ...input, bills: [bill('today', 9), bill('tomorrow', 10), bill('day-after', 11)] });
    expect(reminders.map((item) => item.body)).toEqual(['day-after 2026-10-11']);
  });

  it('includes a reminder for today when the time has not passed yet', () => {
    const reminders = buildBillReminders({ ...input, now: at(9, 8), bills: [bill('soon', 11)] });
    expect(reminders[0]?.at).toBe(at(9));
  });

  it('leaves out the reminder that is exactly now', () => {
    const reminders = buildBillReminders({ ...input, now: at(9, 9), bills: [bill('soon', 11)] });
    expect(reminders).toEqual([]);
  });

  it('looks 14 reminder days ahead and no further', () => {
    const reminders = buildBillReminders({ ...input, bills: [bill('last', 24), bill('beyond', 25)] });
    expect(reminders.map((item) => item.body)).toEqual(['last 2026-10-24']);
  });

  it('schedules a bill again for the next month when it falls inside the window', () => {
    const reminders = buildBillReminders({ ...input, today: '2026-10-25', now: at(25, 8), bills: [bill('Net', 1)] });
    expect(reminders.map((item) => item.body)).toEqual(['Net 2026-11-01']);
  });

  it('skips paused bills', () => {
    expect(buildBillReminders({ ...input, bills: [bill('paused', 12, false)] })).toEqual([]);
  });

  it('schedules nothing when the rule time is not valid', () => {
    expect(buildBillReminders({ ...input, time: 'sáng', bills: [bill('a', 12)] })).toEqual([]);
  });

  it('gives each bill and due date its own stable id that fits in 31 bits', () => {
    const first = bill('a', 12);
    expect(billReminderId(first, '2026-10-12')).toBe(billReminderId(first, '2026-10-12'));
    expect(billReminderId(first, '2026-11-12')).not.toBe(billReminderId(first, '2026-10-12'));
    expect(billReminderId(bill('b', 12), '2026-10-12')).not.toBe(billReminderId(first, '2026-10-12'));
    expect(billReminderId(first, '2026-10-12')).toBeLessThan(2 ** 31);
  });
});
