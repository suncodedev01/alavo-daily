import type {
  ApplyRemoteInput,
  ApplyRemoteReport,
  AppNotification,
  ImportPreview,
  ImportSummary,
  NotificationRule,
  ReportSyncState,
  Settings,
  SyncConflict,
  SyncEvent,
  SyncPeer,
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
  SuggestedEntry,
  SuggestPlanRequest,
} from './types/recipes';
import type {
  Bill,
  BudgetStatus,
  Category,
  CategoryKind,
  CsvExport,
  Goal,
  StatementPreview,
  StatementImportRequest,
  StatementImportResult,
  MonthSummary,
  NewCategory,
  NewGoal,
  NewTransaction,
  NewWallet,
  ReportRange,
  SaveBill,
  SpendingReport,
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
  'hub.export_data': { payload: void; result: { format: string; version: number; exportedAt: number; deviceId: string; tables: Record<string, unknown[]> } };
  /** Fills spending and recipes with sample data. Safe to call twice. */
  'hub.load_demo_data': { payload: void; result: Empty };
  'hub.device_info': { payload: void; result: { deviceId: string } };
  /** The file `hub.export_data` produced, merged in with the rules used for another device's changes. */
  'hub.import_data': { payload: { json: string }; result: ImportSummary };
  /** Reads an exported file and counts what is in it, without changing anything. */
  'hub.inspect_import': { payload: { json: string }; result: ImportPreview };
  'sync.status': { payload: void; result: SyncStatus };
  /** The sync orchestrator tells the engine where sync stands, so every screen shows the same. */
  'sync.report_state': { payload: ReportSyncState; result: SyncStatus };
  /** This device's changes that are not uploaded yet, oldest first. */
  'sync.pending_events': { payload: { limit?: number } | void; result: SyncEvent[] };
  /** Every change this device ever made, oldest first: the content of its file on Drive. */
  'sync.list_own_events': { payload: void; result: SyncEvent[] };
  'sync.mark_synced': { payload: { eventIds: string[] }; result: { count: number } };
  'sync.apply_remote': { payload: ApplyRemoteInput; result: ApplyRemoteReport };
  'sync.list_peers': { payload: void; result: SyncPeer[] };
  'sync.list_conflicts': { payload: void; result: SyncConflict[] };
  'sync.resolve_conflict': { payload: { id: string; keep: 'local' | 'remote' }; result: Empty };

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
  /** Creates the monthly copies of every recurring transaction that are due by `today` and not
   *  there yet. Safe to call repeatedly. */
  'spending.generate_recurring': { payload: { today: string }; result: { created: number } };
  /** Totals, per-category shares and a per-month series for `from <= date <= to` (120 months at most). */
  'spending.report': { payload: ReportRange; result: SpendingReport };
  'spending.export_csv': { payload: ReportRange; result: CsvExport };
  /** Reads a bank statement without saving anything. Rejects text with no date and amount columns. */
  'spending.import_preview': { payload: { csv: string }; result: StatementPreview };
  /** Records the rows in one go, skipping ones the wallet already has. */
  'spending.import_transactions': { payload: StatementImportRequest; result: StatementImportResult };
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
  /** Sets the recipe's photo (an image data URL under 400 KB), or removes it with `null`. */
  'recipes.set_photo': { payload: { id: string; dataUrl: string | null }; result: Recipe };
  /** Parses a schema.org Recipe JSON-LD document. `null` when it holds no recipe. */
  'recipes.parse_json_ld': { payload: { json: string }; result: RecipeInput | null };
  /** Entries from `from` for `days` days (default 7). */
  'recipes.get_plan': { payload: { from: string; days?: number }; result: PlanEntry[] };
  /** The menu of each of `days` mornings (default 3) from `from`: planned dishes, or one suggestion. */
  'recipes.morning_menus': { payload: { from: string; days?: number }; result: MorningMenu[] };
  /** Proposes dishes for the empty meals of a range. Saves nothing. */
  'recipes.suggest_plan': { payload: SuggestPlanRequest; result: SuggestedEntry[] };
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

const READ_PREFIXES = ['list', 'get', 'status', 'month', 'budget', 'export', 'parse', 'device', 'morning', 'suggest', 'report', 'import_preview', 'pending', 'inspect'];
/** Commands whose name looks like a read but which change data. */
const WRITES_NAMED_LIKE_READS = new Set(['sync.report_state']);

/** Reads leave the data alone, so they never invalidate cached queries. */
export function isReadCommand(command: string): boolean {
  if (WRITES_NAMED_LIKE_READS.has(command)) return false;
  const verb = command.split('.')[1] ?? '';
  return READ_PREFIXES.some((prefix) => verb === prefix || verb.startsWith(`${prefix}_`));
}
