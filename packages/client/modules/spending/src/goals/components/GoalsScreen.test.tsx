import { EngineCallError } from '@alavo-daily/common/engine';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createDemoData, createEmptyData } from '../../testing/fixtures';
import { freezeToday, NARROW_WIDTH, renderSpending, type SpendingRenderOptions } from '../../testing/renderSpending';

freezeToday();

async function openGoals(options: SpendingRenderOptions = {}) {
  const view = renderSpending({ route: '/spending/goals', ...options });
  await screen.findByRole('region', { name: 'Quỹ khẩn cấp' }).catch(() => undefined);
  return view;
}

async function openMenu(goalName: string, itemName: string) {
  await userEvent.click(await screen.findByRole('button', { name: `Tuỳ chọn ${goalName}` }));
  await userEvent.click(await screen.findByRole('menuitem', { name: itemName }));
}

describe('Goals data', () => {
  it('shows saved against target with progress, remaining amount and due label', async () => {
    await openGoals();
    const emergency = screen.getByRole('region', { name: 'Quỹ khẩn cấp' });
    expect(within(emergency).getByText('38.500.000 ₫')).toBeInTheDocument();
    expect(within(emergency).getByText('trên 60.000.000 ₫')).toBeInTheDocument();
    expect(within(emergency).getByRole('progressbar', { name: 'Tiến độ Quỹ khẩn cấp' })).toHaveAttribute('aria-valuenow', '64');
    expect(within(emergency).getByText('64% hoàn thành')).toBeInTheDocument();
    expect(within(emergency).getByText('Còn 21.500.000 ₫')).toBeInTheDocument();
    expect(within(emergency).getByText('Không đặt hạn')).toBeInTheDocument();
    const trip = screen.getByRole('region', { name: 'Du lịch Đà Lạt' });
    expect(within(trip).getByText('Còn 10 tuần · 20/12')).toBeInTheDocument();
  });

  it('marks a reached goal and drops the remaining amount', async () => {
    const data = createDemoData();
    data.goals[1]!.savedVnd = 15_000_000;
    await openGoals({ data });
    const trip = screen.getByRole('region', { name: 'Du lịch Đà Lạt' });
    expect(within(trip).getByText('Đã đạt')).toBeInTheDocument();
    expect(within(trip).queryByText(/^Còn [0-9.]+ ₫$/)).not.toBeInTheDocument();
  });

  it('suggests a monthly saving for the goal that is due first', async () => {
    const { screenInfo } = await openGoals();
    const dock = screen.getByRole('complementary', { name: 'Bảng ngữ cảnh' });
    expect(within(dock).getByText('Gợi ý cho Du lịch Đà Lạt')).toBeInTheDocument();
    expect(within(dock).getByText(/khoảng 1\.933\.334 ₫ mỗi tháng/)).toBeInTheDocument();
    expect(screenInfo.current).toMatchObject({ title: 'Mục tiêu', hasDock: true });
  });

  it('has no dock when no goal has a deadline', async () => {
    const data = createDemoData();
    data.goals = [data.goals[0]!];
    const { screenInfo } = await openGoals({ data });
    expect(screenInfo.current?.hasDock).toBe(false);
  });
});

describe('Goals states', () => {
  it('shows skeletons while loading', () => {
    renderSpending({ route: '/spending/goals', handlers: { 'spending.list_goals': () => new Promise(() => undefined) } });
    expect(screen.getAllByRole('status', { name: 'Đang tải' }).length).toBeGreaterThan(0);
  });

  it('shows an error with retry when goals cannot be loaded', async () => {
    renderSpending({
      route: '/spending/goals',
      handlers: {
        'spending.list_goals': () => {
          throw new EngineCallError('internal', 'boom');
        },
      },
    });
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('invites the first goal when there are none', async () => {
    renderSpending({ route: '/spending/goals', data: createEmptyData() });
    expect(await screen.findByText('Chưa có mục tiêu nào')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tạo mục tiêu đầu tiên' }));
    expect(await screen.findByRole('dialog', { name: 'Mục tiêu mới' })).toBeInTheDocument();
  });
});

describe('Adding money to a goal', () => {
  async function contribute(text: string) {
    const card = await screen.findByRole('region', { name: 'Quỹ khẩn cấp' });
    await userEvent.click(within(card).getByRole('button', { name: 'Thêm tiền' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm tiền vào Quỹ khẩn cấp' });
    if (text) await userEvent.type(within(dialog).getByRole('textbox', { name: 'Số tiền thêm vào' }), text);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm tiền' }));
    return dialog;
  }

  it('contributes the typed amount and updates the card', async () => {
    const { engine } = await openGoals();
    await contribute('1000000');
    await waitFor(() => expect(engine.callsTo('spending.contribute_goal')).toEqual([{ id: 'goal-1', amountVnd: 1_000_000 }]));
    expect(await within(screen.getByRole('region', { name: 'Quỹ khẩn cấp' })).findByText('39.500.000 ₫')).toBeInTheDocument();
    expect(await screen.findByText('Đã thêm 1.000.000 ₫ vào Quỹ khẩn cấp')).toBeInTheDocument();
  });

  it('shows the current progress in the dialog and formats the amount while typing', async () => {
    await openGoals();
    const card = await screen.findByRole('region', { name: 'Quỹ khẩn cấp' });
    await userEvent.click(within(card).getByRole('button', { name: 'Thêm tiền' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm tiền vào Quỹ khẩn cấp' });
    expect(within(dialog).getByText('Đã có 38.500.000 ₫ trên 60.000.000 ₫.')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Số tiền thêm vào' }), '2500000');
    expect(within(dialog).getByRole('textbox', { name: 'Số tiền thêm vào' })).toHaveValue('2.500.000');
  });

  it('refuses an empty amount', async () => {
    const { engine } = await openGoals();
    const dialog = await contribute('');
    expect(await within(dialog).findByText('Nhập số tiền lớn hơn 0.')).toBeInTheDocument();
    expect(engine.callsTo('spending.contribute_goal')).toHaveLength(0);
  });

  it('shows the engine error in Vietnamese', async () => {
    await openGoals({
      handlers: {
        'spending.contribute_goal': () => {
          throw new EngineCallError('not_found', 'goal not found');
        },
      },
    });
    const dialog = await contribute('1000');
    expect(await within(dialog).findByText('Không tìm thấy dữ liệu này. Có thể nó đã bị xoá.')).toBeInTheDocument();
  });
});

describe('Creating a goal', () => {
  async function openCreate() {
    await userEvent.click(screen.getByRole('button', { name: 'Thêm mục tiêu' }));
    return screen.findByRole('dialog', { name: 'Mục tiêu mới' });
  }

  it('creates a goal without a deadline', async () => {
    const { engine } = await openGoals();
    const dialog = await openCreate();
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Tên mục tiêu' }), 'MacBook Air');
    await userEvent.click(within(dialog).getByRole('button', { name: 'laptop' }));
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Số tiền cần đạt' }), '32000000');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Đã có sẵn' }), '8000000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo mục tiêu' }));
    await waitFor(() => expect(engine.callsTo('spending.create_goal')).toHaveLength(1));
    expect(engine.callsTo('spending.create_goal')[0]).toEqual({
      name: 'MacBook Air',
      icon: 'laptop',
      targetVnd: 32_000_000,
      savedVnd: 8_000_000,
      dueOn: null,
    });
    expect(await screen.findByRole('region', { name: 'MacBook Air' })).toBeInTheDocument();
  });

  it('adds a deadline with the custom date picker, defaulting to 90 days ahead', async () => {
    const { engine } = await openGoals();
    const dialog = await openCreate();
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Tên mục tiêu' }), 'Xe máy');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Số tiền cần đạt' }), '50000000');
    expect(within(dialog).queryByRole('button', { name: /^Hạn hoàn thành/ })).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('switch', { name: 'Đặt hạn hoàn thành' }));
    expect(within(dialog).getByRole('button', { name: /^Hạn hoàn thành: .*7\/1\/2027/ })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo mục tiêu' }));
    await waitFor(() => expect(engine.callsTo('spending.create_goal')).toHaveLength(1));
    expect(engine.callsTo('spending.create_goal')[0]).toMatchObject({ dueOn: '2027-01-07' });
  });

  it('asks for a name and a target above zero', async () => {
    const { engine } = await openGoals();
    const dialog = await openCreate();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo mục tiêu' }));
    expect(await within(dialog).findByText('Nhập tên mục tiêu.')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Tên mục tiêu' }), 'Xe');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo mục tiêu' }));
    expect(await within(dialog).findByText('Nhập số tiền cần đạt lớn hơn 0.')).toBeInTheDocument();
    expect(engine.callsTo('spending.create_goal')).toHaveLength(0);
  });
});

describe('Editing and deleting a goal', () => {
  it('edits the name and target and keeps the deadline', async () => {
    const { engine } = await openGoals();
    await openMenu('Du lịch Đà Lạt', 'Sửa mục tiêu');
    const dialog = await screen.findByRole('dialog', { name: 'Sửa mục tiêu' });
    expect(within(dialog).getByRole('textbox', { name: 'Số tiền cần đạt' })).toHaveValue('15.000.000');
    expect(within(dialog).queryByRole('textbox', { name: 'Đã có sẵn' })).not.toBeInTheDocument();
    const target = within(dialog).getByRole('textbox', { name: 'Số tiền cần đạt' });
    await userEvent.clear(target);
    await userEvent.type(target, '18000000');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(engine.callsTo('spending.update_goal')).toHaveLength(1));
    expect(engine.callsTo('spending.update_goal')[0]).toEqual({
      id: 'goal-2',
      name: 'Du lịch Đà Lạt',
      icon: 'calendar-blank',
      targetVnd: 18_000_000,
      dueOn: '2026-12-20',
    });
  });

  it('removes the deadline by switching it off', async () => {
    const { engine } = await openGoals();
    await openMenu('Du lịch Đà Lạt', 'Sửa mục tiêu');
    const dialog = await screen.findByRole('dialog', { name: 'Sửa mục tiêu' });
    await userEvent.click(within(dialog).getByRole('switch', { name: 'Đặt hạn hoàn thành' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(engine.callsTo('spending.update_goal')).toHaveLength(1));
    expect(engine.callsTo('spending.update_goal')[0]).toMatchObject({ dueOn: null });
    expect(await within(screen.getByRole('region', { name: 'Du lịch Đà Lạt' })).findByText('Không đặt hạn')).toBeInTheDocument();
  });

  it('deletes a goal only after confirmation', async () => {
    const { engine } = await openGoals();
    await openMenu('Quỹ khẩn cấp', 'Xoá mục tiêu');
    const confirm = await screen.findByRole('alertdialog', { name: 'Xoá mục tiêu Quỹ khẩn cấp?' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Huỷ' }));
    expect(engine.callsTo('spending.delete_goal')).toHaveLength(0);
    await openMenu('Quỹ khẩn cấp', 'Xoá mục tiêu');
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(engine.callsTo('spending.delete_goal')).toEqual([{ id: 'goal-1' }]));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Quỹ khẩn cấp' })).not.toBeInTheDocument());
  });
});

describe('Narrow layout', () => {
  it('shows the suggestion in the main content and keeps the add button reachable', async () => {
    const { screenInfo } = await openGoals({ width: NARROW_WIDTH });
    expect(screenInfo.current?.hasDock).toBe(false);
    expect(await screen.findByText('Gợi ý cho Du lịch Đà Lạt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm mục tiêu' })).toBeInTheDocument();
  });
});
