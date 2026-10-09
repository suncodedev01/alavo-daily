import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NOW, aMeal, aShoppingList } from '../../../testing/hubEngine';
import { renderHub, setViewportWidth } from '../../../testing/renderHub';

const breakfast = aMeal('breakfast', 'Bánh mì', 'recipe-banh-mi');
const lunch = aMeal('lunch', 'Cơm tấm', 'recipe-com-tam');
const dinner = aMeal('dinner', 'Gà kho gừng', 'recipe-ga');
const fullDay = [breakfast, lunch, dinner];

function setLocalTime(hour: number, minute = 0): void {
  vi.setSystemTime(new Date(2026, 9, 9, hour, minute));
}

beforeEach(() => {
  setViewportWidth(1280);
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
});
afterEach(() => vi.useRealTimers());

describe('in the morning', () => {
  it('lists every planned meal of the day, once, with its label', async () => {
    setLocalTime(8);
    renderHub('/today', { state: { plan: fullDay } });
    expect(await screen.findByText('Thực đơn hôm nay')).toBeInTheDocument();
    for (const label of ['Sáng', 'Trưa', 'Tối']) expect(screen.getByText(label)).toBeInTheDocument();
    for (const name of ['Bánh mì', 'Cơm tấm', 'Gà kho gừng']) expect(screen.getAllByText(name)).toHaveLength(1);
  });

  it('starts cooking the first dish of the first meal', async () => {
    setLocalTime(8);
    renderHub('/today', { state: { plan: [dinner, breakfast] } });
    const start = await screen.findByRole('link', { name: 'Bắt đầu nấu' });
    expect(start).toHaveAttribute('href', '/recipes/cook/recipe-banh-mi');
  });

  it('shows only dinner when only dinner is planned', async () => {
    setLocalTime(8);
    renderHub('/today', { state: { plan: [dinner] } });
    expect(await screen.findByText('Gà kho gừng')).toBeInTheDocument();
    expect(screen.getByText('Tối')).toBeInTheDocument();
    expect(screen.queryByText('Sáng')).not.toBeInTheDocument();
    expect(screen.queryByText('Trưa')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bắt đầu nấu' })).toHaveAttribute('href', '/recipes/cook/recipe-ga');
  });

  it('shows the servings of each dish', async () => {
    setLocalTime(8);
    renderHub('/today', { state: { plan: fullDay } });
    expect(await screen.findAllByText('2 người')).toHaveLength(3);
  });
});

describe('around lunch', () => {
  it('leaves breakfast out from 10:00 and starts from lunch', async () => {
    setLocalTime(10);
    renderHub('/today', { state: { plan: fullDay } });
    expect(await screen.findByText('Từ bữa trưa')).toBeInTheDocument();
    expect(screen.getByText('Cơm tấm')).toBeInTheDocument();
    expect(screen.getByText('Gà kho gừng')).toBeInTheDocument();
    expect(screen.queryByText('Bánh mì')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bắt đầu nấu' })).toHaveAttribute('href', '/recipes/cook/recipe-com-tam');
  });

  it('still shows lunch at 14:59', async () => {
    setLocalTime(14, 59);
    renderHub('/today', { state: { plan: fullDay } });
    expect(await screen.findByText('Từ bữa trưa')).toBeInTheDocument();
    expect(screen.getByText('Cơm tấm')).toBeInTheDocument();
  });

  it('is titled after dinner when lunch has no dish', async () => {
    setLocalTime(12);
    renderHub('/today', { state: { plan: [breakfast, dinner] } });
    expect(await screen.findByText('Bữa tối nay')).toBeInTheDocument();
    expect(screen.queryByText('Từ bữa trưa')).not.toBeInTheDocument();
  });
});

describe('in the evening', () => {
  it('shows only dinner from 15:00, without a slot label', async () => {
    setLocalTime(15);
    renderHub('/today', { state: { plan: fullDay } });
    expect(await screen.findByText('Bữa tối nay')).toBeInTheDocument();
    expect(screen.getByText('Gà kho gừng')).toBeInTheDocument();
    expect(screen.queryByText('Cơm tấm')).not.toBeInTheDocument();
    expect(screen.queryByText('Tối')).not.toBeInTheDocument();
  });

  it('says calmly that the day is done when only earlier meals were planned', async () => {
    setLocalTime(19);
    renderHub('/today', { state: { plan: [breakfast, lunch] } });
    expect(await screen.findByText('Hôm nay bạn đã có 2 bữa')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Bắt đầu nấu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Lên thực đơn' })).not.toBeInTheDocument();
  });
});

describe('with nothing planned', () => {
  it('offers to plan the menu', async () => {
    setLocalTime(8);
    renderHub('/today');
    expect(await screen.findByText('Hôm nay chưa có món nào')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lên thực đơn' })).toHaveAttribute('href', '/recipes/plan');
    expect(screen.queryByRole('link', { name: 'Bắt đầu nấu' })).not.toBeInTheDocument();
  });
});

describe('ingredients', () => {
  it('says how many ingredients of the shown dishes are still missing', async () => {
    renderHub('/today', { state: { plan: [dinner], shopping: aShoppingList(20_000, ['Gà', 'Gừng']) } });
    expect(await screen.findByText('Còn 2 nguyên liệu chưa mua')).toBeInTheDocument();
  });

  it('says when everything is at home', async () => {
    renderHub('/today', { state: { plan: [dinner] } });
    expect(await screen.findByText('Đã đủ nguyên liệu')).toBeInTheDocument();
  });
});

describe('layouts and language', () => {
  it('shows the same list on a narrow screen', async () => {
    setViewportWidth(390);
    setLocalTime(8);
    renderHub('/today', { state: { plan: fullDay } });
    expect(await screen.findByText('Thực đơn hôm nay')).toBeInTheDocument();
    expect(screen.getAllByText('Cơm tấm')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Bắt đầu nấu' })).toBeInTheDocument();
  });

  it('speaks English', async () => {
    setLocalTime(10);
    renderHub('/today', { state: { plan: fullDay }, language: 'en' });
    expect(await screen.findByText('From lunch')).toBeInTheDocument();
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start cooking' })).toBeInTheDocument();
  });

  it('speaks English when nothing is planned', async () => {
    renderHub('/today', { language: 'en' });
    expect(await screen.findByText('No dishes planned for today yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plan meals' })).toBeInTheDocument();
  });
});
