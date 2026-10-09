import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationRule } from '@alavo-daily/common';
import { createFakePlatform } from '@alavo-daily/common/testing';

import { renderHub, setViewportWidth } from '../../../testing/renderHub';
import { groupRulesByModule, timeOptions } from '../logic/notificationRules';
import { tabFromParam } from './SettingsScreen';

beforeEach(() => setViewportWidth(1280));

function rule(id: string, overrides: Partial<NotificationRule> = {}): NotificationRule {
  return {
    id,
    module: 'alpha',
    label: `Quy tắc ${id}`,
    description: `Mô tả ${id}`,
    kind: 'time',
    time: '09:00',
    enabled: true,
    ...overrides,
  };
}

describe('settings tabs', () => {
  it('switches between the two tabs and updates the URL', async () => {
    const user = userEvent.setup();
    renderHub('/settings/sync');
    await user.click(await screen.findByRole('radio', { name: 'Thông báo' }));
    expect(screen.getByLabelText('Đường dẫn hiện tại')).toHaveTextContent('/settings/notifications');
    expect(screen.getByRole('radio', { name: 'Thông báo' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: 'Đồng bộ Google' }));
    expect(await screen.findByText('Dữ liệu đang chỉ nằm trên máy này')).toBeInTheDocument();
  });

  it('maps unknown tab names to the sync tab', () => {
    expect(tabFromParam(undefined)).toBe('sync');
    expect(tabFromParam('notifications')).toBe('notifications');
    expect(tabFromParam('abc')).toBe('sync');
  });
});

describe('sync tab', () => {
  it('shows the honest off state with a disabled connect button', async () => {
    renderHub('/settings/sync');
    expect(await screen.findByText('Dữ liệu đang chỉ nằm trên máy này')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kết nối với Google' })).toBeDisabled();
    expect(screen.getByText(/Sắp có\. Tính năng này chưa dùng được/)).toBeInTheDocument();
  });

  it('shows how many changes are waiting', async () => {
    renderHub('/settings/sync', {
      state: { sync: { state: 'off', pendingEvents: 148, lastSyncedAt: null, deviceId: 'device-1' } },
    });
    expect(await screen.findByText('148 thay đổi trên máy này chưa được đồng bộ')).toBeInTheDocument();
  });

  it('exports the data through the platform as a dated file', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 9, 12).getTime() });
    const saveTextFile = vi.fn(async () => undefined);
    renderHub('/settings/sync', { platform: createFakePlatform({ saveTextFile }) });
    await user.click(await screen.findByRole('button', { name: 'Xuất dữ liệu' }));
    await waitFor(() => expect(saveTextFile).toHaveBeenCalledTimes(1));
    const [filename, content] = saveTextFile.mock.calls[0] as unknown as [string, string];
    expect(filename).toBe('alavo-daily-2026-10-09.json');
    expect(JSON.parse(content)).toMatchObject({ version: 1, deviceId: 'device-1' });
    expect(await screen.findByText('Đã xuất dữ liệu')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('loads the sample data', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/settings/sync');
    await user.click(await screen.findByRole('button', { name: 'Nạp dữ liệu mẫu' }));
    await waitFor(() => expect(engine.callsTo('hub.load_demo_data')).toHaveLength(1));
  });

  it('shows the device in the dock', async () => {
    renderHub('/settings/sync');
    const dock = await screen.findByRole('complementary', { name: 'Bảng ngữ cảnh' });
    expect(await within(dock).findByText('device-1')).toBeInTheDocument();
  });
});

describe('notifications tab', () => {
  const rules = [
    rule('r1'),
    rule('r2', { kind: 'event', time: null }),
    rule('r3', { module: 'beta', kind: 'always', time: null }),
  ];

  it('groups rules under their module', async () => {
    renderHub('/settings/notifications', { state: { rules } });
    expect(await screen.findByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Beta' })).toBeInTheDocument();
    expect(screen.getByText('Mô tả r3')).toBeInTheDocument();
    expect(screen.getByText('Luôn bật')).toBeInTheDocument();
    expect(screen.getByText('Ngay khi xảy ra')).toBeInTheDocument();
  });

  it('turns a rule off through the engine', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/settings/notifications', { state: { rules } });
    await user.click(await screen.findByRole('switch', { name: 'Quy tắc r1' }));
    await waitFor(() => expect(engine.callsTo('hub.update_notification_rule')).toEqual([{ id: 'r1', enabled: false }]));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Quy tắc r1' })).not.toBeChecked());
  });

  it('changes the reminder time from a custom list, not a native input', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/settings/notifications', { state: { rules } });
    await user.click(await screen.findByRole('button', { name: 'Giờ nhắc Quy tắc r1: 09:00' }));
    await user.click(await screen.findByRole('menuitemradio', { name: '17:30' }));
    await waitFor(() => expect(engine.callsTo('hub.update_notification_rule')).toEqual([{ id: 'r1', time: '17:30' }]));
    expect(document.querySelector('input[type="time"]')).toBeNull();
    expect(await screen.findByRole('button', { name: 'Giờ nhắc Quy tắc r1: 17:30' })).toBeInTheDocument();
  });

  it('shows no time picker for rules that are not time based', async () => {
    renderHub('/settings/notifications', { state: { rules: [rule('r2', { kind: 'event', time: null })] } });
    await screen.findByRole('switch', { name: 'Quy tắc r2' });
    expect(screen.queryByRole('button', { name: /Giờ nhắc/ })).not.toBeInTheDocument();
  });

  it('warns that reminders only show while the app is open when the platform cannot run in the background', async () => {
    renderHub('/settings/notifications', { state: { rules } });
    expect(await screen.findByRole('note')).toHaveTextContent('nhắc nhở chỉ hiện khi ứng dụng đang mở');
  });

  it('does not show that warning when background reminders work', async () => {
    const base = createFakePlatform();
    const platform = createFakePlatform({ capabilities: { ...base.capabilities, backgroundReminders: true } });
    renderHub('/settings/notifications', { state: { rules }, platform });
    await screen.findByRole('switch', { name: 'Quy tắc r1' });
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});

describe('notification rule helpers', () => {
  it('keeps a time that is not in the fixed list', () => {
    expect(timeOptions('09:15').map((option) => option.value)).toContain('09:15');
    expect(timeOptions('09:00').filter((option) => option.value === '09:00')).toHaveLength(1);
  });

  it('puts modules in manifest order and unknown modules last', () => {
    const groups = groupRulesByModule(
      [rule('a', { module: 'zeta' }), rule('b', { module: 'beta' }), rule('c', { module: 'alpha' })],
      [{ id: 'alpha' }, { id: 'beta' }] as never,
    );
    expect(groups.map((group) => group.moduleId)).toEqual(['alpha', 'beta', 'zeta']);
  });
});
