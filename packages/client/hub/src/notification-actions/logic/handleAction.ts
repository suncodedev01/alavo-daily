import type { EngineClient, NotificationActionEvent } from '@alavo-daily/common';
import { formatVnd } from '@alavo-daily/common/format';
import { rememberKeptBudget } from '@alavo-daily/spending';

import { KEEP_BUDGET, RAISE_BUDGET, RAISE_BUDGET_VND, SNOOZE, SNOOZE_MINUTES, START_COOKING } from './actionIds';

type Translate = (key: string, values?: Record<string, string | number>) => string;

export interface ActionContext {
  engine: EngineClient;
  navigate(path: string): void;
  snooze(event: NotificationActionEvent): void;
  announce(text: string): void;
  t: Translate;
  today(): string;
}

type ActionHandler = (event: NotificationActionEvent, context: ActionContext) => void | Promise<void>;

const HANDLERS = new Map<string, ActionHandler>([
  [START_COOKING, startCooking],
  [SNOOZE, snoozeReminder],
  [RAISE_BUDGET, raiseBudget],
  [KEEP_BUDGET, keepBudget],
]);

export async function handleNotificationAction(
  event: NotificationActionEvent,
  context: ActionContext,
): Promise<void> {
  await HANDLERS.get(event.actionId)?.(event, context);
}

function startCooking({ data }: NotificationActionEvent, { navigate }: ActionContext): void {
  if (data.recipeId) navigate(`/recipes/cook/${encodeURIComponent(data.recipeId)}`);
}

function snoozeReminder(event: NotificationActionEvent, { snooze, announce, t }: ActionContext): void {
  snooze(event);
  announce(t('Sẽ nhắc lại sau {{minutes}} phút', { minutes: SNOOZE_MINUTES }));
}

async function raiseBudget(event: NotificationActionEvent, context: ActionContext): Promise<void> {
  const { engine, announce, t } = context;
  try {
    const category = await findBudgetedCategory(event, engine);
    if (!category) return;
    const budgetVnd = category.budgetVnd + RAISE_BUDGET_VND;
    await engine.call('spending.update_category', { id: category.id, budgetVnd });
    announce(
      t('Đã tăng ngân sách {{name}} lên {{amount}}', {
        name: t(category.name),
        amount: formatVnd(budgetVnd),
      }),
    );
  } catch {
    announce(t('Chưa tăng được ngân sách. Hãy thử lại.'));
  }
}

async function keepBudget(event: NotificationActionEvent, context: ActionContext): Promise<void> {
  const category = await findBudgetedCategory(event, context.engine).catch(() => null);
  if (!category) return;
  rememberKeptBudget({ categoryId: category.id, budgetVnd: category.budgetVnd }, context.today());
}

interface BudgetedCategory {
  id: string;
  name: string;
  budgetVnd: number;
}

async function findBudgetedCategory(
  { data }: NotificationActionEvent,
  engine: EngineClient,
): Promise<BudgetedCategory | null> {
  if (!data.categoryId) return null;
  await engine.ready;
  const categories = await engine.call('spending.list_categories');
  const category = categories.find((item) => item.id === data.categoryId);
  if (!category || category.budgetVnd === null) return null;
  return { id: category.id, name: category.name, budgetVnd: category.budgetVnd };
}
