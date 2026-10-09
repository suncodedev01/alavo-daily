import type {
  AppNotification,
  NotificationRule,
  Settings,
  SyncStatus,
  UpdateNotificationRule,
  UpdateSettings,
} from './types/hub';
import type {
  LogShoppingExpense,
  MorningMenu,
  NewPlanEntry,
  NewShoppingItem,
  PlanEntry,
  Recipe,
  RecipeFilter,
  RecipeInput,
  RecipeSummary,
  ShoppingList,
} from './types/recipes';
import type {
  Bill,
  BudgetStatus,
  Category,
  CategoryKind,
  Goal,
  MonthSummary,
  NewCategory,
  NewGoal,
  NewTransaction,
  NewWallet,
  SaveBill,
  Transaction,
  TransactionFilter,
  UpdateCategory,
  UpdateGoal,
  UpdateTransaction,
  UpdateWallet,
  Wallet,
} from './types/spending';

type Empty = Record<string, never>;

/**
 * Every engine command: its payload and its result. This is the contract between the React
 * client and the Rust engine. A command name is `<module>.<verb>`; the Rust handler for it lives
 * in `packages/engine/presentation/src/<module>.rs`.
 */
export interface CommandMap {
  // ---- hub ----
  'hub.get_settings': { payload: void; result: Settings };
  'hub.update_settings': { payload: UpdateSettings; result: Settings };
  'hub.list_notifications': { payload: void; result: AppNotification[] };
  /** Without `ids`, marks everything read. */
  'hub.mark_notifications_read': { payload: { ids?: string[] } | void; result: { count: number } };
  'hub.list_notification_rules': { payload: void; result: NotificationRule[] };
  'hub.update_notification_rule': { payload: UpdateNotificationRule; result: NotificationRule };
  'hub.export_data': { payload: void; result: { version: number; exportedAt: number; deviceId: string; tables: Record<string, unknown[]> } };
  /** Fills spending and recipes with sample data. Safe to call twice. */
  'hub.load_demo_data': { payload: void; result: Empty };
  'hub.device_info': { payload: void; result: { deviceId: string } };
  'sync.status': { payload: void; result: SyncStatus };

  // ---- spending ----
  'spending.list_categories': { payload: { kind?: CategoryKind } | void; result: Category[] };
  'spending.create_category': { payload: NewCategory; result: Category };
  'spending.update_category': { payload: UpdateCategory; result: Category };
  'spending.delete_category': { payload: { id: string }; result: Empty };
  'spending.list_wallets': { payload: void; result: Wallet[] };
  'spending.create_wallet': { payload: NewWallet; result: Wallet };
  'spending.update_wallet': { payload: UpdateWallet; result: Wallet };
  'spending.delete_wallet': { payload: { id: string }; result: Empty };
  /** Newest first: by `occurredOn`, then by creation time. */
  'spending.list_transactions': { payload: TransactionFilter | void; result: Transaction[] };
  'spending.get_transaction': { payload: { id: string }; result: Transaction };
  'spending.record_transaction': { payload: NewTransaction; result: Transaction };
  'spending.update_transaction': { payload: UpdateTransaction; result: Transaction };
  'spending.delete_transaction': { payload: { id: string }; result: Empty };
  /** `today` is the client's local date, so the engine never reads a timezone. */
  'spending.month_summary': { payload: { month: string; today: string }; result: MonthSummary };
  'spending.budget_status': { payload: { month: string; today: string }; result: BudgetStatus };
  'spending.list_goals': { payload: void; result: Goal[] };
  'spending.create_goal': { payload: NewGoal; result: Goal };
  'spending.update_goal': { payload: UpdateGoal; result: Goal };
  'spending.contribute_goal': { payload: { id: string; amountVnd: number }; result: Goal };
  'spending.delete_goal': { payload: { id: string }; result: Empty };
  'spending.list_bills': { payload: void; result: Bill[] };
  'spending.save_bill': { payload: SaveBill; result: Bill };
  'spending.delete_bill': { payload: { id: string }; result: Empty };

  // ---- recipes ----
  'recipes.list': { payload: RecipeFilter | void; result: RecipeSummary[] };
  'recipes.get': { payload: { id: string }; result: Recipe };
  'recipes.create': { payload: RecipeInput; result: Recipe };
  /** Replaces the recipe's fields, ingredients and steps. */
  'recipes.update': { payload: { id: string } & RecipeInput; result: Recipe };
  'recipes.delete': { payload: { id: string }; result: Empty };
  'recipes.set_favorite': { payload: { id: string; favorite: boolean }; result: Recipe };
  /** Parses a schema.org Recipe JSON-LD document. `null` when it holds no recipe. */
  'recipes.parse_json_ld': { payload: { json: string }; result: RecipeInput | null };
  /** Entries from `from` for `days` days (default 7). */
  'recipes.get_plan': { payload: { from: string; days?: number }; result: PlanEntry[] };
  /** The menu of each of `days` mornings (default 3) from `from`: planned dishes, or one suggestion. */
  'recipes.morning_menus': { payload: { from: string; days?: number }; result: MorningMenu[] };
  'recipes.add_to_plan': { payload: NewPlanEntry; result: PlanEntry };
  'recipes.remove_from_plan': { payload: { id: string }; result: Empty };
  /** Plan entries with `from <= date <= to`, merged by `name|unit`, plus hand-added items. */
  'recipes.get_shopping_list': { payload: { from: string; to: string }; result: ShoppingList };
  'recipes.set_shopping_have': { payload: { key: string; have: boolean }; result: Empty };
  'recipes.add_shopping_item': { payload: NewShoppingItem; result: Empty };
  'recipes.remove_shopping_item': { payload: { key: string }; result: Empty };
  /** Records what still needs buying as one expense through the spending contract. */
  'recipes.log_shopping_expense': { payload: LogShoppingExpense; result: import('./types/spending').Transaction };
}

export type CommandName = keyof CommandMap;
export type CommandPayload<K extends CommandName> = CommandMap[K]['payload'];
export type CommandResult<K extends CommandName> = CommandMap[K]['result'];

/** Arguments of `call`: no second argument when the payload is `void` or optional-only. */
export type CallArgs<K extends CommandName> = [CommandPayload<K>] extends [void]
  ? []
  : undefined extends CommandPayload<K>
    ? [payload?: CommandPayload<K>]
    : void extends CommandPayload<K>
      ? [payload?: CommandPayload<K>]
      : [payload: CommandPayload<K>];

const READ_PREFIXES = ['list', 'get', 'status', 'month', 'budget', 'export', 'parse', 'device', 'morning'];

/** Reads leave the data alone, so they never invalidate cached queries. */
export function isReadCommand(command: string): boolean {
  const verb = command.split('.')[1] ?? '';
  return READ_PREFIXES.some((prefix) => verb === prefix || verb.startsWith(`${prefix}_`));
}
