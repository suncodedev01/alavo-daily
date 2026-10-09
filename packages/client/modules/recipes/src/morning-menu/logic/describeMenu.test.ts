import type { MorningMenu } from '@alavo-daily/common';
import { describe, expect, it } from 'vitest';

import { describeMenu } from './describeMenu';

const translate = (key: string, values: Record<string, string | number> = {}) =>
  key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name]));

function dish(name: string, slot: MorningMenu['dishes'][number]['slot']) {
  return { recipeId: name, name, icon: 'cooking-pot', slot };
}

describe('describeMenu', () => {
  it('lists each planned dish with its meal and reminds to buy ingredients', () => {
    const menu: MorningMenu = {
      date: '2026-10-10',
      source: 'planned',
      dishes: [dish('Bún chả', 'lunch'), dish('Gà kho', 'dinner')],
    };
    expect(describeMenu(menu, translate)).toEqual({
      title: 'Hôm nay ăn gì?',
      body: 'Hôm nay bạn ăn: Trưa: Bún chả · Tối: Gà kho. Nhớ mua nguyên liệu nhé.',
    });
  });

  it('suggests the picked recipe when nothing was planned', () => {
    const menu: MorningMenu = { date: '2026-10-10', source: 'suggested', dishes: [dish('Canh chua', null)] };
    expect(describeMenu(menu, translate).body).toBe('Hôm nay bạn chưa chọn món. Thử Canh chua nhé?');
  });
});
