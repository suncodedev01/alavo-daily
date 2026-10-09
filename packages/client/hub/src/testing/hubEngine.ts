import { FakeEngineClient, type Handlers } from '@alavo-daily/common/testing';
import type {
  AppNotification,
  BudgetStatus,
  NotificationRule,
  PlanEntry,
  RecipeSummary,
  Settings,
  ShoppingList,
  SyncConflict,
  SyncStatus,
  Transaction,
} from '@alavo-daily/common';

export interface HubState {
  settings: Settings;
  notifications: AppNotification[];
  rules: NotificationRule[];
  sync: SyncStatus;
  conflicts: SyncConflict[];
  plan: PlanEntry[];
  shopping: ShoppingList;
  budget: BudgetStatus;
  transactions: Transaction[];
  recipes: RecipeSummary[];
}

export const NOW = new Date(2026, 9, 9, 12, 0).getTime();

export function aTransaction(): Transaction {
  return {
    id: 'tx-1',
    occurredOn: '2026-10-09',
    title: 'Cà phê',
    categoryId: 'category-food',
    walletId: 'wallet-cash',
    amountVnd: -45000,
    note: '',
    recurringRule: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

export function aRecipe(): RecipeSummary {
  return {
    id: 'recipe-1',
    name: 'Gà kho gừng',
    tags: [],
    prepMin: 10,
    cookMin: 45,
    servings: 2,
    level: 'easy',
    favorite: false,
    icon: 'cooking-pot',
    costVnd: 120000,
    ingredientCount: 5,
  };
}

export function aDinner(): PlanEntry {
  return {
    id: 'plan-1',
    date: '2026-10-09',
    slot: 'dinner',
    recipeId: 'recipe-1',
    recipeName: 'Gà kho gừng',
    recipeIcon: 'cooking-pot',
    servings: 2,
  };
}

export function aFoodBudget(spentVnd: number, budgetVnd = 1_000_000): BudgetStatus {
  const remainingVnd = budgetVnd - spentVnd;
  return {
    month: '2026-10',
    lines: [
      {
        categoryId: 'category-food',
        name: 'Ăn uống',
        icon: 'fork-knife',
        budgetVnd,
        spentVnd,
        pct: spentVnd / budgetVnd,
        remainingVnd,
        tone: 'normal',
      },
    ],
    totalBudgetVnd: budgetVnd,
    totalSpentVnd: spentVnd,
    totalRemainingVnd: remainingVnd,
    daysLeft: 22,
    perDayVnd: 0,
  };
}

export function aShoppingList(costVnd: number, itemNames: string[] = []): ShoppingList {
  return {
    from: '2026-10-09',
    to: '2026-10-11',
    items: itemNames.map((name) => ({
      key: `${name}|g`,
      name,
      unit: 'g',
      aisle: 'other',
      quantity: 100,
      costVnd: 10000,
      from: ['Gà kho gừng'],
      have: false,
      custom: false,
    })),
    neededCount: itemNames.length,
    neededCostVnd: costVnd,
  };
}

export function aSyncStatus(overrides: Partial<SyncStatus> = {}): SyncStatus {
  return {
    state: 'off',
    pendingEvents: 0,
    lastSyncedAt: null,
    deviceId: 'device-1',
    accountEmail: null,
    error: null,
    conflictCount: 0,
    ...overrides,
  };
}

export function defaultState(): HubState {
  return {
    settings: {
      language: 'vi',
      theme: 'system',
      householdSize: 2,
      pinnedModules: ['alpha', 'beta'],
      recentModules: [],
    },
    notifications: [],
    rules: [],
    sync: aSyncStatus(),
    conflicts: [],
    plan: [],
    shopping: aShoppingList(0),
    budget: { ...aFoodBudget(0), lines: [] },
    transactions: [aTransaction()],
    recipes: [aRecipe()],
  };
}

export function createHubEngine(
  seed: Partial<HubState> = {},
  extra: Handlers = {},
): { engine: FakeEngineClient; state: HubState } {
  const state: HubState = { ...defaultState(), ...seed };
  return { engine: new FakeEngineClient({ ...hubHandlers(state), ...extra }), state };
}

function hubHandlers(state: HubState): Handlers {
  return {
    'hub.get_settings': () => ({ ...state.settings }),
    'hub.update_settings': (payload) => {
      state.settings = { ...state.settings, ...payload };
      return { ...state.settings };
    },
    'hub.list_notifications': () => state.notifications.map((item) => ({ ...item })),
    'hub.mark_notifications_read': (payload) => {
      const ids = payload && 'ids' in payload ? payload.ids : undefined;
      state.notifications = state.notifications.map((item) => ({
        ...item,
        read: item.read || !ids || ids.includes(item.id),
      }));
      return { count: state.notifications.length };
    },
    'hub.list_notification_rules': () => state.rules.map((rule) => ({ ...rule })),
    'hub.update_notification_rule': (payload) => {
      state.rules = state.rules.map((rule) => (rule.id === payload.id ? { ...rule, ...payload } : rule));
      return state.rules.find((rule) => rule.id === payload.id) as NotificationRule;
    },
    'hub.export_data': () => ({ format: 'alavo-daily-export', version: 1, exportedAt: NOW, deviceId: 'device-1', tables: {} }),
    'hub.load_demo_data': () => ({}),
    'sync.status': () => ({ ...state.sync, conflictCount: state.conflicts.length }),
    'sync.list_conflicts': () => state.conflicts.map((conflict) => ({ ...conflict })),
    'sync.resolve_conflict': (payload) => {
      state.conflicts = state.conflicts.filter((conflict) => conflict.id !== payload.id);
      return {};
    },
    'recipes.get_plan': () => state.plan,
    'recipes.get_shopping_list': () => state.shopping,
    'recipes.list': () => state.recipes,
    'spending.month_summary': () => ({
      month: '2026-10',
      incomeVnd: 0,
      expenseVnd: 0,
      netVnd: 0,
      previousExpenseVnd: 0,
      expenseDeltaPct: null,
      totalBalanceVnd: 0,
      dailyExpenseVnd: [0, 0, 0, 0, 0, 0, 0, 0, 113000],
      transactionCount: 23,
    }),
    'spending.budget_status': () => state.budget,
    'spending.list_bills': () => [],
    'spending.list_transactions': () => state.transactions,
    'spending.update_category': (payload) => ({
      id: payload.id,
      name: 'Ăn uống',
      icon: 'fork-knife',
      kind: 'expense',
      budgetVnd: payload.budgetVnd ?? null,
      isFixed: false,
      position: 1,
    }),
  };
}
