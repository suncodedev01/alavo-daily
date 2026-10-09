import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationActionEvent } from '@alavo-daily/common';
import { createActionablePlatform, renderWithProviders } from '@alavo-daily/common/testing';

import { useSnoozedReminders } from './useSnoozedReminders';

const NOW = new Date(2026, 9, 9, 6, 0).getTime();
const TEN_MINUTES = 10 * 60 * 1000;
const EVENT: NotificationActionEvent = {
  actionId: 'snooze-10',
  actionTypeId: 'dish-reminder',
  notificationId: 3,
  title: 'Hôm nay ăn gì?',
  body: 'Bún chả',
  data: { recipeId: 'recipe-1' },
};

let snooze: (event: NotificationActionEvent) => void = () => undefined;

function Probe() {
  snooze = useSnoozedReminders();
  return null;
}

function startAppAndSnooze() {
  const actions = createActionablePlatform();
  const view = renderWithProviders(<Probe />, { platform: actions.platform });
  act(() => snooze(EVENT));
  return { actions, view };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], now: NOW });
});
afterEach(() => vi.useRealTimers());

describe('useSnoozedReminders', () => {
  it('drops the reminder from the schedule once it has fired', async () => {
    const { actions } = startAppAndSnooze();
    expect(actions.scheduled.at(-1)).toHaveLength(1);
    await act(async () => void vi.advanceTimersByTime(TEN_MINUTES + 5));
    expect(actions.scheduled.at(-1)).toEqual([]);
  });

  it('keeps the reminder for the next start of the app until it has fired', () => {
    startAppAndSnooze().view.unmount();
    vi.setSystemTime(NOW + TEN_MINUTES / 2);
    const next = createActionablePlatform();
    renderWithProviders(<Probe />, { platform: next.platform });
    expect(next.scheduled.at(-1)).toEqual([expect.objectContaining({ at: NOW + TEN_MINUTES })]);
  });

  it('forgets a saved reminder whose time has passed', () => {
    startAppAndSnooze().view.unmount();
    vi.setSystemTime(NOW + TEN_MINUTES + 1);
    const next = createActionablePlatform();
    renderWithProviders(<Probe />, { platform: next.platform });
    expect(next.scheduled.at(-1)).toEqual([]);
  });
});
