import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EngineCallError, type SyncConflict, type SyncController } from '@alavo-daily/common';
import { createFakePlatform } from '@alavo-daily/common/testing';

import { aSyncStatus } from '../../../testing/hubEngine';
import { renderHub, setViewportWidth } from '../../../testing/renderHub';

beforeEach(() => setViewportWidth(1280));

const LAST_SYNC = new Date(2026, 9, 9, 13, 5).getTime();

function fakeController(overrides: Partial<SyncController> = {}) {
  return {
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    ...overrides,
  };
}

function connectedStatus(overrides: Parameters<typeof aSyncStatus>[0] = {}) {
  return aSyncStatus({
    state: 'idle',
    accountEmail: 'person@example.com',
    lastSyncedAt: LAST_SYNC,
    ...overrides,
  });
}

function aConflict(overrides: Partial<SyncConflict> = {}): SyncConflict {
  return {
    id: 'conflict-1',
    module: 'recipes',
    entityType: 'shopping_state',
    entityId: 'Hành|g',
    local: { have: 1, deleted_at: null },
    remote: { have: 0, deleted_at: null },
    remoteHlc: 5,
    remoteDeviceId: 'other',
    createdAt: 1,
    ...overrides,
  };
}

describe('when the device cannot sign in to Google', () => {
  it('explains that Google sign-in is not set up instead of offering a broken button', async () => {
    renderHub('/settings/sync');
    expect(await screen.findByText('Chưa cấu hình đăng nhập Google')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kết nối với Google' })).not.toBeInTheDocument();
  });

  it('still says how many changes are waiting', async () => {
    renderHub('/settings/sync', { state: { sync: aSyncStatus({ pendingEvents: 148 }) } });
    expect(await screen.findByText('148 thay đổi trên máy này chưa được đồng bộ')).toBeInTheDocument();
  });
});

describe('not connected', () => {
  it('offers the connect button and how many changes are waiting', async () => {
    renderHub('/settings/sync', { sync: fakeController(), state: { sync: aSyncStatus({ pendingEvents: 3 }) } });
    expect(await screen.findByText('Dữ liệu đang chỉ nằm trên máy này')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kết nối với Google' })).toBeEnabled();
    expect(await screen.findByText('3 thay đổi trên máy này chưa được đồng bộ')).toBeInTheDocument();
  });

  it('asks the controller to connect when the button is pressed', async () => {
    const user = userEvent.setup();
    const sync = fakeController();
    renderHub('/settings/sync', { sync });
    await user.click(await screen.findByRole('button', { name: 'Kết nối với Google' }));
    expect(sync.connect).toHaveBeenCalledTimes(1);
  });

  it('tells the person calmly when sign-in does not work and keeps the button', async () => {
    const user = userEvent.setup();
    const sync = fakeController({ connect: vi.fn(async () => Promise.reject(new Error('popup_closed'))) });
    renderHub('/settings/sync', { sync });
    await user.click(await screen.findByRole('button', { name: 'Kết nối với Google' }));
    expect(await screen.findByText('Chưa đăng nhập được Google. Hãy thử lại.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Kết nối với Google' })).toBeEnabled());
  });

  it('disables the button while signing in', async () => {
    const user = userEvent.setup();
    let finish: () => void = () => undefined;
    const sync = fakeController({ connect: () => new Promise<void>((resolve) => (finish = resolve)) });
    renderHub('/settings/sync', { sync });
    await user.click(await screen.findByRole('button', { name: 'Kết nối với Google' }));
    expect(screen.getByRole('button', { name: 'Kết nối với Google' })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Kết nối với Google' })).toBeEnabled());
  });
});

describe('connected', () => {
  it('shows the account, the last sync and the waiting changes', async () => {
    renderHub('/settings/sync', {
      sync: fakeController(),
      state: { sync: connectedStatus({ pendingEvents: 2 }) },
    });
    expect(await screen.findByRole('heading', { name: 'Đã kết nối với Google' })).toBeInTheDocument();
    expect(screen.getByText('person@example.com')).toBeInTheDocument();
    expect(screen.getByText(/13:05/)).toBeInTheDocument();
    expect(screen.getByText('Thay đổi đang chờ gửi').nextSibling).toHaveTextContent('2');
  });

  it('syncs when "Đồng bộ ngay" is pressed', async () => {
    const user = userEvent.setup();
    const sync = fakeController();
    renderHub('/settings/sync', { sync, state: { sync: connectedStatus() } });
    await user.click(await screen.findByRole('button', { name: 'Đồng bộ ngay' }));
    expect(sync.syncNow).toHaveBeenCalledTimes(1);
  });

  it('cannot start a second sync while one is running', async () => {
    renderHub('/settings/sync', { sync: fakeController(), state: { sync: connectedStatus({ state: 'syncing' }) } });
    expect(await screen.findByRole('button', { name: 'Đồng bộ ngay' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Đang đồng bộ…' })).toBeInTheDocument();
  });

  it('disconnects only after the person confirms, and says that data stays', async () => {
    const user = userEvent.setup();
    const sync = fakeController();
    renderHub('/settings/sync', { sync, state: { sync: connectedStatus() } });
    await user.click(await screen.findByRole('button', { name: 'Ngắt kết nối' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Việc này chỉ dừng đồng bộ');
    expect(dialog).toHaveTextContent('Dữ liệu trên máy này');
    expect(sync.disconnect).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Ngắt kết nối' }));
    expect(sync.disconnect).toHaveBeenCalledTimes(1);
  });

  it('keeps the connection when the person cancels', async () => {
    const user = userEvent.setup();
    const sync = fakeController();
    renderHub('/settings/sync', { sync, state: { sync: connectedStatus() } });
    await user.click(await screen.findByRole('button', { name: 'Ngắt kết nối' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Huỷ' }));
    expect(sync.disconnect).not.toHaveBeenCalled();
  });
});

describe('other states', () => {
  it('asks the person to sign in again, with a button that connects', async () => {
    const user = userEvent.setup();
    const sync = fakeController();
    renderHub('/settings/sync', { sync, state: { sync: connectedStatus({ state: 'needs_login', pendingEvents: 4 }) } });
    expect(await screen.findByRole('heading', { name: 'Cần đăng nhập lại Google' })).toBeInTheDocument();
    expect(screen.getByText('4 thay đổi trên máy này chưa được đồng bộ')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Đăng nhập lại Google' }));
    expect(sync.connect).toHaveBeenCalledTimes(1);
  });

  it('says offline in plain words, not as an error', async () => {
    renderHub('/settings/sync', { sync: fakeController(), state: { sync: connectedStatus({ state: 'offline', pendingEvents: 3 }) } });
    expect(await screen.findByRole('heading', { name: 'Đang ngoại tuyến' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('gửi đi khi có mạng');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains a failure and offers to retry', async () => {
    const user = userEvent.setup();
    const sync = fakeController();
    renderHub('/settings/sync', {
      sync,
      state: { sync: connectedStatus({ state: 'error', error: 'rate_limited' }) },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Google đang giới hạn số lần truy cập');
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(sync.syncNow).toHaveBeenCalledTimes(1);
  });
});

describe('the sidebar reflects the same state', () => {
  it.each([
    ['needs_login', 'Cần đăng nhập lại Google'],
    ['offline', 'Chưa đồng bộ'],
    ['error', 'Đồng bộ chưa thành công'],
    ['syncing', 'Đang đồng bộ…'],
    ['idle', 'Đã đồng bộ'],
  ] as const)('shows the %s state', async (state, title) => {
    renderHub('/today', { state: { sync: connectedStatus({ state }) } });
    expect(await screen.findByText(title)).toBeInTheDocument();
  });

  it('asks for a choice when two devices changed the same data', async () => {
    renderHub('/today', { state: { sync: connectedStatus(), conflicts: [aConflict()] } });
    expect(await screen.findByText('Cần chọn bản dữ liệu')).toBeInTheDocument();
  });
});

describe('conflicts', () => {
  it('lists both versions of each row with a button to keep either', async () => {
    renderHub('/settings/sync', { sync: fakeController(), state: { sync: connectedStatus(), conflicts: [aConflict()] } });
    expect(await screen.findByRole('heading', { name: 'Hai thiết bị cùng sửa dữ liệu' })).toBeInTheDocument();
    const item = screen.getByRole('region', { name: 'Mục "Hành" trong danh sách đi chợ' });
    expect(within(item).getByText('Bản trên máy này').nextSibling).toHaveTextContent('Đã có ở nhà');
    expect(within(item).getByText('Bản từ thiết bị khác').nextSibling).toHaveTextContent('Cần mua');
  });

  it('keeps the version on this device', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/settings/sync', {
      sync: fakeController(),
      state: { sync: connectedStatus(), conflicts: [aConflict()] },
    });
    await user.click(await screen.findByRole('button', { name: 'Giữ bản trên máy này' }));
    await waitFor(() => expect(engine.callsTo('sync.resolve_conflict')).toEqual([{ id: 'conflict-1', keep: 'local' }]));
    expect(await screen.findByText('Đã chọn bản dữ liệu')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Hai thiết bị cùng sửa dữ liệu' })).not.toBeInTheDocument());
  });

  it('takes the version from the other device', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/settings/sync', {
      sync: fakeController(),
      state: { sync: connectedStatus(), conflicts: [aConflict()] },
    });
    await user.click(await screen.findByRole('button', { name: 'Dùng bản từ thiết bị khác' }));
    await waitFor(() => expect(engine.callsTo('sync.resolve_conflict')).toEqual([{ id: 'conflict-1', keep: 'remote' }]));
  });

  it('shows no conflict section when there is nothing to choose', async () => {
    renderHub('/settings/sync', { sync: fakeController(), state: { sync: connectedStatus() } });
    await screen.findByRole('heading', { name: 'Đã kết nối với Google' });
    expect(screen.queryByRole('heading', { name: 'Hai thiết bị cùng sửa dữ liệu' })).not.toBeInTheDocument();
  });
});

describe('data on this device', () => {
  it('exports the data through the platform as a dated file', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 9, 12).getTime() });
    const saveTextFile = vi.fn(async () => undefined);
    renderHub('/settings/sync', { platform: createFakePlatform({ saveTextFile }) });
    await user.click(await screen.findByRole('button', { name: 'Xuất dữ liệu' }));
    await waitFor(() => expect(saveTextFile).toHaveBeenCalledTimes(1));
    const [filename, content] = saveTextFile.mock.calls[0] as unknown as [string, string];
    expect(filename).toBe('alavo-daily-2026-10-09.json');
    expect(JSON.parse(content)).toMatchObject({ format: 'alavo-daily-export', version: 1, deviceId: 'device-1' });
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

  it('describes where the data is kept once connected', async () => {
    renderHub('/settings/sync', { sync: fakeController(), state: { sync: connectedStatus() } });
    const dock = await screen.findByRole('complementary', { name: 'Bảng ngữ cảnh' });
    expect(await within(dock).findByText(/Alavo Daily Backup/)).toBeInTheDocument();
  });
});

describe('importing data', () => {
  const FILE_TEXT = JSON.stringify({ format: 'alavo-daily-export', version: 1, tables: {} });

  function chooseFile(content = FILE_TEXT) {
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    return { input, file: new File([content], 'alavo-daily.json', { type: 'application/json' }) };
  }

  it('opens the file chooser from a button, not a native control on screen', async () => {
    const user = userEvent.setup();
    renderHub('/settings/sync');
    const button = await screen.findByRole('button', { name: 'Nhập dữ liệu' });
    const click = vi.spyOn(HTMLInputElement.prototype, 'click');
    await user.click(button);
    expect(click).toHaveBeenCalled();
    expect(document.querySelector('input[type="file"]')).toHaveClass('hidden');
    click.mockRestore();
  });

  it('shows what the file holds and imports only after confirming', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/settings/sync', {
      handlers: {
        'hub.inspect_import': () => ({ rows: 120, tables: 7, exportedAt: null }),
        'hub.import_data': () => ({ rows: 120, applied: 118, unchanged: 2, skipped: 0 }),
      },
    });
    await screen.findByRole('button', { name: 'Nhập dữ liệu' });
    const { input, file } = chooseFile();
    await user.upload(input, file);
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Tệp có 120 dòng dữ liệu thuộc 7 mục');
    expect(engine.callsTo('hub.import_data')).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Nhập dữ liệu' }));
    await waitFor(() => expect(engine.callsTo('hub.import_data')).toEqual([{ json: FILE_TEXT }]));
    expect(await screen.findByText('Đã nhập 118 dòng dữ liệu')).toBeInTheDocument();
  });

  it('says so when the file has nothing new', async () => {
    const user = userEvent.setup();
    renderHub('/settings/sync', {
      handlers: {
        'hub.inspect_import': () => ({ rows: 5, tables: 2, exportedAt: null }),
        'hub.import_data': () => ({ rows: 5, applied: 0, unchanged: 5, skipped: 0 }),
      },
    });
    await screen.findByRole('button', { name: 'Nhập dữ liệu' });
    const { input, file } = chooseFile();
    await user.upload(input, file);
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Nhập dữ liệu' }));
    expect(await screen.findByText('Không có dữ liệu mới để nhập')).toBeInTheDocument();
  });

  it('imports nothing when the person cancels', async () => {
    const user = userEvent.setup();
    const { engine } = renderHub('/settings/sync', {
      handlers: { 'hub.inspect_import': () => ({ rows: 5, tables: 2, exportedAt: null }) },
    });
    await screen.findByRole('button', { name: 'Nhập dữ liệu' });
    const { input, file } = chooseFile();
    await user.upload(input, file);
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Huỷ' }));
    expect(engine.callsTo('hub.import_data')).toHaveLength(0);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('rejects a file that is not an export without opening the confirm step', async () => {
    const user = userEvent.setup();
    renderHub('/settings/sync', {
      handlers: {
        'hub.inspect_import': () => {
          throw new EngineCallError('validation', 'the file is not a data export');
        },
      },
    });
    await screen.findByRole('button', { name: 'Nhập dữ liệu' });
    const { input, file } = chooseFile('hello');
    await user.upload(input, file);
    expect(await screen.findByText('Tệp này không phải dữ liệu xuất từ Alavo Daily')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('tells the person when the import itself fails', async () => {
    const user = userEvent.setup();
    renderHub('/settings/sync', {
      handlers: {
        'hub.inspect_import': () => ({ rows: 5, tables: 2, exportedAt: null }),
        'hub.import_data': () => {
          throw new EngineCallError('db', 'disk full');
        },
      },
    });
    await screen.findByRole('button', { name: 'Nhập dữ liệu' });
    const { input, file } = chooseFile();
    await user.upload(input, file);
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Nhập dữ liệu' }));
    expect(await screen.findByText('Không nhập được dữ liệu')).toBeInTheDocument();
  });
});
