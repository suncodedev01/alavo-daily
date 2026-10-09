import { describe, expect, it } from 'vitest';

import type { SyncConflict } from '@alavo-daily/common';

import { conflictTitle, describeVersion } from './describeConflict';

const keyAsText = (key: string, values?: Record<string, string | number>) =>
  values ? key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name])) : key;

function conflict(entityType: string, entityId = 'id-1'): SyncConflict {
  return {
    id: 'c1',
    module: 'recipes',
    entityType,
    entityId,
    local: {},
    remote: {},
    remoteHlc: 1,
    remoteDeviceId: 'other',
    createdAt: 1,
  };
}

describe('conflictTitle', () => {
  it('names the kind of row', () => {
    expect(conflictTitle(conflict('ingredient'), keyAsText)).toBe('Một nguyên liệu');
    expect(conflictTitle(conflict('plan_entry'), keyAsText)).toBe('Một món trong kế hoạch');
    expect(conflictTitle(conflict('mystery'), keyAsText)).toBe('Một dữ liệu');
  });

  it('shows the item name for a shopping flag, not its key', () => {
    expect(conflictTitle(conflict('shopping_state', 'Hành|g'), keyAsText)).toBe(
      'Mục "Hành" trong danh sách đi chợ',
    );
  });
});

describe('describeVersion', () => {
  it('describes an ingredient with its quantity and drops a trailing .0', () => {
    const row = { name: 'Đùi gà', quantity: 600.0, unit: 'g', deleted_at: null };
    expect(describeVersion('ingredient', row, keyAsText)).toBe('Đùi gà · 600 g');
    expect(describeVersion('ingredient', { ...row, quantity: 1.5 }, keyAsText)).toBe('Đùi gà · 1.5 g');
  });

  it('describes a step with its timer', () => {
    expect(describeVersion('step', { text: 'Kho', timer_min: 30 }, keyAsText)).toBe('Kho · 30 phút');
    expect(describeVersion('step', { text: 'Kho', timer_min: 0 }, keyAsText)).toBe('Kho');
  });

  it('describes a plan entry with day, meal and servings', () => {
    const row = { planned_on: '2026-10-10', slot: 'dinner', servings: 4 };
    expect(describeVersion('plan_entry', row, keyAsText)).toBe('2026-10-10 · Bữa tối · 4 người');
  });

  it('describes the have flag in words', () => {
    expect(describeVersion('shopping_state', { have: 1 }, keyAsText)).toBe('Đã có ở nhà');
    expect(describeVersion('shopping_state', { have: 0 }, keyAsText)).toBe('Cần mua');
  });

  it('says deleted for a deleted row, whatever the kind', () => {
    expect(describeVersion('ingredient', { name: 'x', deleted_at: 55 }, keyAsText)).toBe('Đã xoá');
  });

  it('falls back to a neutral phrase for a kind it does not know', () => {
    expect(describeVersion('mystery', { a: 1 }, keyAsText)).toBe('Dữ liệu đã đổi');
  });
});
