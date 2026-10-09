import { act, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppNotification, Category } from '@alavo-daily/common';
import {
  FakeEngineClient,
  createActionablePlatform,
  createFakePlatform,
  renderWithProviders,
  type ActionablePlatform,
} from '@alavo-daily/common/testing';
import { Toaster } from '@alavo-daily/design-system';

import { NOW, createHubEngine } from '../../testing/hubEngine';
import { NotificationActions } from './NotificationActions';

const TEN_MINUTES = 10 * 60 * 1000;

function Location() {
  return <p aria-label="Đường dẫn">{useLocation().pathname}</p>;
}

function aCategory(budgetVnd: number | null = 2_000_000): Category {
  return {
    id: 'category-food',
    name: 'Ăn uống',
    icon: 'fork-knife',
    kind: 'expense',
    budgetVnd,
    isFixed: false,
    position: 0,
  };
}

function aBudgetNotice(id: string, overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id,
    module: 'spending',
    title: 'Ăn uống đã dùng 85% ngân sách',
    body: 'Còn 300.000 ₫ cho 22 ngày tới.',
    subjectId: 'category-food',
    createdAt: NOW,
    read: false,
    ...overrides,
  };
}

function engineWithBudgets(notices: AppNotification[]): FakeEngineClient {
  return createHubEngine(
    { notifications: notices },
    {
      'spending.list_categories': () => [aCategory()],
      'spending.update_category': (payload) => ({ ...aCategory(), budgetVnd: payload.budgetVnd ?? null }),
    },
  ).engine;
}

interface Setup {
  actions: ActionablePlatform;
  engine: FakeEngineClient;
  notices: AppNotification[];
}

interface SetupOptions {
  notices?: AppNotification[];
  actions?: ActionablePlatform;
  engine?: FakeEngineClient;
}

function setup(options: SetupOptions = {}): Setup {
  const actions = options.actions ?? createActionablePlatform();
  const notices = options.notices ?? [];
  const engine = options.engine ?? engineWithBudgets(notices);
  renderWithProviders(
    <MemoryRouter initialEntries={['/today']}>
      <NotificationActions />
      <Location />
      <Toaster />
    </MemoryRouter>,
    { engine, platform: actions.platform },
  );
  return { actions, engine, notices };
}

function withoutButtons(): ActionablePlatform {
  return createActionablePlatform({
    capabilities: { ...createFakePlatform().capabilities, notificationActions: false },
  });
}

const press = (actions: ActionablePlatform, actionId: string, data: Record<string, string> = {}) =>
  act(async () => actions.press(actionId, { data, title: 'Hôm nay ăn gì?', body: 'Bún chả' }));

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
});
afterEach(() => vi.useRealTimers());

describe('registering the buttons', () => {
  it('registers the dish reminder and the budget warning with their labels', async () => {
    const { actions } = setup();
    await waitFor(() =>
      expect(actions.registered.map((type) => type.id)).toEqual(['dish-reminder', 'budget-warning']),
    );
    expect(actions.registered[0]?.actions.map((action) => action.label)).toEqual([
      'Bắt đầu nấu',
      'Nhắc lại sau 10 phút',
    ]);
  });

  it('registers the labels in the language of the app', async () => {
    const actions = createActionablePlatform();
    renderWithProviders(
      <MemoryRouter>
        <NotificationActions />
      </MemoryRouter>,
      { engine: engineWithBudgets([]), platform: actions.platform, language: 'en' },
    );
    await waitFor(() => expect(actions.registered[0]?.actions[0]?.label).toBe('Start cooking'));
  });

  it('registers nothing and listens to nothing where notifications have no buttons', async () => {
    const actions = withoutButtons();
    setup({ actions });
    await act(async () => undefined);
    expect(actions.registered).toEqual([]);
    expect(actions.listenerCount()).toBe(0);
  });

  it('listens to the buttons once while it is on the screen', () => {
    const { actions } = setup();
    expect(actions.listenerCount()).toBe(1);
  });
});

describe('start cooking', () => {
  it('opens the cooking mode of the recipe the reminder was about', async () => {
    const { actions } = setup();
    await press(actions, 'start-cooking', { recipeId: 'recipe-1' });
    expect(screen.getByLabelText('Đường dẫn')).toHaveTextContent('/recipes/cook/recipe-1');
  });

  it('goes nowhere when the reminder carried no recipe', async () => {
    const { actions } = setup();
    await press(actions, 'start-cooking');
    expect(screen.getByLabelText('Đường dẫn')).toHaveTextContent('/today');
  });
});

describe('snooze', () => {
  it('schedules the same reminder again 10 minutes later and says so', async () => {
    const { actions } = setup();
    await press(actions, 'snooze-10', { recipeId: 'recipe-1' });
    expect(actions.scheduled.at(-1)).toEqual([
      expect.objectContaining({
        at: NOW + TEN_MINUTES,
        title: 'Hôm nay ăn gì?',
        body: 'Bún chả',
        data: { recipeId: 'recipe-1' },
      }),
    ]);
    expect(await screen.findByText('Sẽ nhắc lại sau 10 phút')).toBeInTheDocument();
  });
});

describe('raise the budget', () => {
  it('raises the budget of the category by 300.000 and says so', async () => {
    const { actions, engine } = setup();
    await press(actions, 'raise-budget', { categoryId: 'category-food' });
    await waitFor(() =>
      expect(engine.callsTo('spending.update_category')).toEqual([
        { id: 'category-food', budgetVnd: 2_300_000 },
      ]),
    );
    expect(await screen.findByText('Đã tăng ngân sách Ăn uống lên 2.300.000 ₫')).toBeInTheDocument();
  });

  it('changes nothing for a category that does not exist or a press without one', async () => {
    const { actions, engine } = setup();
    await press(actions, 'raise-budget', { categoryId: 'category-unknown' });
    await press(actions, 'raise-budget');
    expect(engine.callsTo('spending.update_category')).toEqual([]);
  });

  it('says it did not work when the engine refuses', async () => {
    const engine = createHubEngine(
      {},
      {
        'spending.list_categories': () => [aCategory()],
        'spending.update_category': () => {
          throw new Error('no');
        },
      },
    ).engine;
    const { actions } = setup({ engine });
    await press(actions, 'raise-budget', { categoryId: 'category-food' });
    expect(await screen.findByText('Chưa tăng được ngân sách. Hãy thử lại.')).toBeInTheDocument();
  });

  it('waits until the engine is ready before it reads or changes anything', async () => {
    let open: () => void = () => undefined;
    class SlowEngine extends FakeEngineClient {
      override readonly ready = new Promise<{ deviceId: string }>((resolve) => {
        open = () => resolve({ deviceId: 'test' });
      });
    }
    const slow = new SlowEngine({
      'hub.list_notifications': () => [],
      'spending.list_categories': () => [aCategory()],
      'spending.update_category': () => aCategory(),
    });
    const { actions } = setup({ engine: slow });
    await press(actions, 'raise-budget', { categoryId: 'category-food' });
    expect(slow.callsTo('spending.list_categories')).toEqual([]);
    await act(async () => open());
    await waitFor(() => expect(slow.callsTo('spending.update_category')).toHaveLength(1));
  });
});

describe('keep the budget', () => {
  it('remembers the choice the overview card remembers and changes no budget', async () => {
    const { actions, engine } = setup();
    await press(actions, 'keep-budget', { categoryId: 'category-food' });
    await waitFor(() =>
      expect(window.localStorage.getItem('spending.keep-budget.2026-10.category-food.2000000')).toBe('1'),
    );
    expect(engine.callsTo('spending.update_category')).toEqual([]);
  });
});

describe('other buttons', () => {
  it('ignores a button it does not know, including the plain tap', async () => {
    const { actions, engine } = setup();
    await press(actions, 'tap');
    await press(actions, 'dismiss');
    await press(actions, 'constructor');
    expect(engine.callsTo('spending.update_category')).toEqual([]);
    expect(screen.getByLabelText('Đường dẫn')).toHaveTextContent('/today');
  });
});

describe('budget warnings while the app is open', () => {
  async function appHasOpened(engine: FakeEngineClient) {
    await waitFor(() => expect(engine.callsTo('hub.list_notifications')).toHaveLength(1));
    await act(async () => undefined);
  }

  async function addNotice(engine: FakeEngineClient, notices: AppNotification[], notice: AppNotification) {
    notices.unshift(notice);
    await act(async () => engine.call('hub.mark_notifications_read', { ids: [] }));
  }

  it('does not show the warnings that were already there when the app opened', async () => {
    const { actions, engine } = setup({ notices: [aBudgetNotice('old')] });
    await appHasOpened(engine);
    expect(actions.shown).toEqual([]);
  });

  it('shows a new warning with the budget buttons and the category it is about', async () => {
    const { actions, engine, notices } = setup({ notices: [aBudgetNotice('old')] });
    await appHasOpened(engine);
    await addNotice(engine, notices, aBudgetNotice('new'));
    await waitFor(() => expect(actions.shown).toHaveLength(1));
    expect(actions.shown[0]).toEqual({
      title: 'Ăn uống đã dùng 85% ngân sách',
      body: 'Còn 300.000 ₫ cho 22 ngày tới.',
      options: { actionTypeId: 'budget-warning', data: { categoryId: 'category-food' } },
    });
  });

  it('shows each warning once and skips notices that are not about a category', async () => {
    const { actions, engine, notices } = setup();
    await appHasOpened(engine);
    await addNotice(engine, notices, aBudgetNotice('new'));
    await addNotice(engine, notices, aBudgetNotice('other', { subjectId: null }));
    await waitFor(() => expect(actions.shown).toHaveLength(1));
  });

  it('shows nothing where notifications have no buttons', async () => {
    const actions = withoutButtons();
    const { engine, notices } = setup({ actions });
    await appHasOpened(engine);
    await addNotice(engine, notices, aBudgetNotice('new'));
    expect(actions.shown).toEqual([]);
  });
});
