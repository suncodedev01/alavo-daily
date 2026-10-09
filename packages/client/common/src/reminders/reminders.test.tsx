import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlatformProvider, type ScheduledNotification } from '../platform';
import { createFakePlatform } from '../testing';
import { ReminderProvider, notificationId, useReminderSource } from './index';

function item(id: number, at: number): ScheduledNotification {
  return { id, at, title: `t${id}`, body: '' };
}

function Source({ name, items }: { name: string; items: ScheduledNotification[] | null }) {
  useReminderSource(name, items);
  return null;
}

function setup() {
  const calls: ScheduledNotification[][] = [];
  const platform = createFakePlatform({ scheduleNotifications: async (items) => void calls.push(items) });
  const mount = (sources: { name: string; items: ScheduledNotification[] | null }[]) => (
    <PlatformProvider platform={platform}>
      <ReminderProvider>
        {sources.map((source) => (
          <Source key={source.name} {...source} />
        ))}
      </ReminderProvider>
    </PlatformProvider>
  );
  return { calls, mount };
}

describe('notificationId', () => {
  it('is stable for a key and different for different keys', () => {
    expect(notificationId('morning:2026-10-10:0')).toBe(notificationId('morning:2026-10-10:0'));
    expect(notificationId('morning:2026-10-10:0')).not.toBe(notificationId('morning:2026-10-10:1'));
  });

  it('is a positive 32-bit integer, as mobile notification ids require', () => {
    for (const key of ['a', 'bill:2026-12-31:rent', 'x'.repeat(200)]) {
      const id = notificationId(key);
      expect(id).toBeGreaterThan(0);
      expect(id).toBeLessThan(2 ** 31);
    }
  });
});

describe('ReminderProvider', () => {
  it('hands the platform one list that merges every source in time order', () => {
    const { calls, mount } = setup();
    render(
      mount([
        { name: 'a', items: [item(1, 300), item(2, 100)] },
        { name: 'b', items: [item(3, 200)] },
      ]),
    );
    expect(calls[calls.length - 1]?.map((entry) => entry.id)).toEqual([2, 3, 1]);
  });

  it('passes the buttons and data of a reminder on to the platform', () => {
    const { calls, mount } = setup();
    const withButtons = { ...item(1, 100), actionTypeId: 'dish-reminder', data: { recipeId: 'r1' } };
    render(mount([{ name: 'a', items: [withButtons] }]));
    expect(calls[calls.length - 1]).toEqual([withButtons]);
  });

  it('keeps the other sources when one source changes', () => {
    const { calls, mount } = setup();
    const view = render(mount([{ name: 'a', items: [item(1, 100)] }, { name: 'b', items: [item(2, 200)] }]));
    view.rerender(mount([{ name: 'a', items: [item(3, 50)] }, { name: 'b', items: [item(2, 200)] }]));
    expect(calls[calls.length - 1]?.map((entry) => entry.id)).toEqual([3, 2]);
  });

  it('drops a source that unmounts', () => {
    const { calls, mount } = setup();
    const view = render(mount([{ name: 'a', items: [item(1, 100)] }, { name: 'b', items: [item(2, 200)] }]));
    view.rerender(mount([{ name: 'b', items: [item(2, 200)] }]));
    expect(calls[calls.length - 1]?.map((entry) => entry.id)).toEqual([2]);
  });

  it('does not schedule again when a source reports the same list', () => {
    const { calls, mount } = setup();
    const view = render(mount([{ name: 'a', items: [item(1, 100)] }]));
    const before = calls.length;
    view.rerender(mount([{ name: 'a', items: [item(1, 100)] }]));
    expect(calls.length).toBe(before);
  });

  it('waits while a source has not loaded yet', () => {
    const { calls, mount } = setup();
    render(mount([{ name: 'a', items: null }, { name: 'b', items: [item(2, 200)] }]));
    expect(calls[calls.length - 1]?.map((entry) => entry.id)).toEqual([2]);
  });

  it('refuses to be used outside a provider', () => {
    expect(() => render(<Source name="a" items={[]} />)).toThrow('useReminderSource must be used inside');
  });
});
