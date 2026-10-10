/** Dates are local calendar dates `YYYY-MM-DD`, months are `YYYY-MM`. Money is whole đồng. */

export type CategoryKind = 'expense' | 'income';

export interface Category {
  id: string;
  /** Natural-text i18n key for the built-in categories, free text for user-made ones. */
  name: string;
  /** Phosphor icon name in kebab-case, e.g. `fork-knife`. */
  icon: string;
  kind: CategoryKind;
  /** Monthly limit; `null` means no budget. Always `null` for income. */
  budgetVnd: number | null;
  /** Fixed monthly costs such as rent are left out of the daily spending chart. */
  isFixed: boolean;
  position: number;
}

export type WalletKind = 'bank' | 'ewallet' | 'cash';

export interface Wallet {
  id: string;
  name: string;
  kind: WalletKind;
  openingBalanceVnd: number;
  /** Opening balance plus every transaction in this wallet. Computed by the engine. */
  balanceVnd: number;
  position: number;
}

export interface Transaction {
  id: string;
  occurredOn: string;
  title: string;
  categoryId: string;
  walletId: string;
  /** Negative for spending, positive for income. */
  amountVnd: number;
  note: string;
  /** `monthly:<day>` for a repeating payment, `null` for a one-off. */
  recurringRule: string | null;
  /** Set on a copy that the engine made from a recurring transaction: the id of that transaction. */
  recurringSourceId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  targetVnd: number;
  savedVnd: number;
  dueOn: string | null;
}

export interface Bill {
  id: string;
  title: string;
  icon: string;
  amountVnd: number;
  dayOfMonth: number;
  active: boolean;
}

export interface MonthSummary {
  month: string;
  incomeVnd: number;
  /** Positive number: total spent. */
  expenseVnd: number;
  netVnd: number;
  previousExpenseVnd: number;
  /** `(expense - previous) / previous`, `null` when there was no previous spending. */
  expenseDeltaPct: number | null;
  totalBalanceVnd: number;
  /** Spending per day for days 1..N (N = today's day in the current month, else the month length),
   *  fixed categories excluded. */
  dailyExpenseVnd: number[];
  transactionCount: number;
}

export type BudgetTone = 'normal' | 'warn' | 'over';

export interface BudgetLine {
  categoryId: string;
  name: string;
  icon: string;
  budgetVnd: number;
  spentVnd: number;
  /** `spent / budget`, 0.92 means 92%. Can exceed 1. */
  pct: number;
  remainingVnd: number;
  /** `warn` from 85%, `over` above 100%. */
  tone: BudgetTone;
}

export interface BudgetStatus {
  month: string;
  lines: BudgetLine[];
  totalBudgetVnd: number;
  totalSpentVnd: number;
  totalRemainingVnd: number;
  daysLeft: number;
  /** `totalRemainingVnd / daysLeft`, 0 when there are no days left. */
  perDayVnd: number;
}

export interface TransactionFilter {
  month?: string;
  categoryId?: string;
  walletId?: string;
  kind?: CategoryKind;
  /** Case-insensitive match on title and note. */
  query?: string;
  recurringOnly?: boolean;
  limit?: number;
}

export interface NewTransaction {
  title: string;
  amountVnd: number;
  categoryId: string;
  walletId: string;
  occurredOn: string;
  note?: string;
  recurringRule?: string | null;
}

export interface UpdateTransaction {
  id: string;
  title?: string;
  amountVnd?: number;
  categoryId?: string;
  walletId?: string;
  occurredOn?: string;
  note?: string;
  recurringRule?: string | null;
}

export interface NewCategory {
  name: string;
  icon: string;
  kind: CategoryKind;
  budgetVnd?: number | null;
}

export interface UpdateCategory {
  id: string;
  name?: string;
  icon?: string;
  budgetVnd?: number | null;
}

export interface NewWallet {
  name: string;
  kind: WalletKind;
  openingBalanceVnd: number;
}

/** A wallet with transactions needs one of the two options; an empty wallet needs neither. */
export interface DeleteWalletRequest {
  id: string;
  moveTransactionsTo?: string;
  deleteTransactions?: boolean;
}

export interface UpdateWallet {
  id: string;
  name?: string;
  kind?: WalletKind;
  openingBalanceVnd?: number;
}

export interface NewGoal {
  name: string;
  icon: string;
  targetVnd: number;
  savedVnd?: number;
  dueOn?: string | null;
}

export interface UpdateGoal {
  id: string;
  name?: string;
  icon?: string;
  targetVnd?: number;
  dueOn?: string | null;
}

export interface SaveBill {
  id?: string;
  title: string;
  icon: string;
  amountVnd: number;
  dayOfMonth: number;
  active?: boolean;
}

export interface ReportRange {
  /** First day, `YYYY-MM-DD`. */
  from: string;
  /** Last day, included. */
  to: string;
}

export interface CategoryShare {
  categoryId: string;
  /** Natural-text i18n key for the built-in categories, free text for user-made ones. */
  name: string;
  icon: string;
  kind: CategoryKind;
  /** Positive number: the sum of the absolute amounts. */
  totalVnd: number;
  /** Fraction of the total of the same kind: 0.25 is 25%. */
  share: number;
  transactionCount: number;
}

export interface MonthBar {
  month: string;
  incomeVnd: number;
  expenseVnd: number;
  netVnd: number;
}

export interface SpendingReport {
  from: string;
  to: string;
  incomeVnd: number;
  /** Positive number: total spent. */
  expenseVnd: number;
  netVnd: number;
  transactionCount: number;
  /** Largest first, expense and income categories together. */
  categories: CategoryShare[];
  /** One entry for every month the range touches, empty months included. */
  months: MonthBar[];
}

export interface CsvExport {
  /** UTF-8 text with a header row, ISO dates, signed integer amounts and `
` line ends. */
  csv: string;
  rowCount: number;
}

export type StatementProblem =
  | 'missing_date'
  | 'invalid_date'
  | 'missing_amount'
  | 'invalid_amount'
  | 'zero_amount';

export interface StatementPreviewRow {
  /** 1-based record number in the file. */
  line: number;
  occurredOn: string | null;
  /** Negative for money out, positive for money in. */
  amountVnd: number | null;
  title: string;
  /** Suggested category; `null` when the row has no usable amount. */
  categoryId: string | null;
  problems: StatementProblem[];
}

export interface StatementPreview {
  delimiter: string;
  rows: StatementPreviewRow[];
}

export interface StatementImportRow {
  occurredOn: string;
  amountVnd: number;
  title: string;
  categoryId: string;
}

export interface StatementImportRequest {
  walletId: string;
  rows: StatementImportRow[];
}

export interface StatementImportResult {
  imported: number;
  /** Rows left out because the wallet already had the same date, amount and title. */
  skippedDuplicates: number;
}
