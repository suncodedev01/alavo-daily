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
  /** Digits only, for lookup. Never used to reach a bank. */
  accountNumber?: string | null;
}

/** How a transaction was paid, separate from the wallet it came out of. */
export interface PaymentMethod {
  id: string;
  name: string;
  icon: PaymentIcon;
  isDefault: boolean;
  position: number;
  transactionCount: number;
}

export type PaymentIcon = 'money' | 'bank' | 'device-mobile' | 'credit-card' | 'coins';

export interface NewPaymentMethod {
  name: string;
  icon: PaymentIcon;
}

export interface UpdatePaymentMethod {
  id: string;
  name?: string;
  icon?: PaymentIcon;
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
  /** `null` when the method was deleted or never chosen. */
  paymentMethodId?: string | null;
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
  paymentMethodId?: string | null;
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
  paymentMethodId?: string | null;
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
  position?: number;
}

/** A category with transactions needs one of the two options; an empty category needs neither. */
export interface DeleteCategoryRequest {
  id: string;
  moveTransactionsTo?: string;
  deleteTransactions?: boolean;
}

export interface NewWallet {
  name: string;
  kind: WalletKind;
  openingBalanceVnd: number;
  accountNumber?: string | null;
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
  /** `null` clears the number. */
  accountNumber?: string | null;
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

/** How much an item of an estimate matters, so the person can see what to drop. */
export type EstimatePriority = 'must' | 'should' | 'nice';

/** A number the amounts of an estimate multiply by: guests, people, days, nights. */
export interface EstimateFactor {
  id: string;
  label: string;
  value: number;
}

export interface EstimateItem {
  id: string;
  group: string;
  name: string;
  price: number;
  quantity: number;
  priority: EstimatePriority;
  /** Ids of the factors the price is multiplied by. */
  by: string[];
  /** A deposit or the whole amount; never more than the item costs. */
  paid: number;
}

export interface ExpectedIncome {
  id: string;
  label: string;
  amount: number;
}

export interface Estimate {
  id: string;
  name: string;
  icon: string;
  /** 0, 5, 10, 15 or 20. */
  contingencyPercent: number;
  /** Wallets whose balances count as money on hand. */
  walletIds: string[];
  factors: EstimateFactor[];
  items: EstimateItem[];
  income: ExpectedIncome[];
}

export interface EstimateTotals {
  base: number;
  paid: number;
  contingency: number;
  total: number;
  /** Still to pay: items minus what is paid, plus the contingency. */
  remaining: number;
  available: number;
  incoming: number;
  /** Negative means short. */
  result: number;
  withoutIncoming: number;
  /** How much of what is still to pay is covered, 0 to 100. */
  coveredPercent: number;
}

export interface SavingOption {
  dropped: EstimatePriority[];
  saving: number;
  result: number;
}

/** What one item costs after multiplying by its factors, and how much of it is paid. */
export interface EstimateItemAmount {
  id: string;
  amount: number;
  paid: number;
}

export interface EstimateView {
  estimate: Estimate;
  totals: EstimateTotals;
  savingOptions: SavingOption[];
  /** In the order of `estimate.items`. */
  amounts: EstimateItemAmount[];
}

export interface EstimateSummary {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
  total: number;
  remaining: number;
  result: number;
  coveredPercent: number;
}

export interface NewEstimate {
  name: string;
  icon: string;
  contingencyPercent?: number;
  walletIds?: string[];
  factors?: { label: string; value: number }[];
}

export interface UpdateEstimate {
  id: string;
  name?: string;
  icon?: string;
  contingencyPercent?: number;
  walletIds?: string[];
}

/** Creates a factor when `id` is missing, otherwise changes it. */
export interface SaveEstimateFactor {
  estimateId: string;
  id?: string;
  label: string;
  value: number;
}

export interface SaveEstimateItem {
  estimateId: string;
  id?: string;
  group: string;
  name: string;
  price: number;
  quantity?: number;
  priority: EstimatePriority;
  by?: string[];
}

export interface SaveEstimateIncome {
  estimateId: string;
  id?: string;
  label: string;
  amount: number;
}

/** Where the payment goes in the spending ledger when the person asks for it to be recorded. */
export interface RecordEstimatePayment {
  categoryId: string;
  walletId: string;
  occurredOn: string;
  paymentMethodId?: string | null;
}

export interface SetEstimateItemPaid {
  id: string;
  paid: number;
  /** Leave out when the payment was already recorded, so it is not counted twice. */
  record?: RecordEstimatePayment;
}

export interface EstimateRowRef {
  estimateId: string;
  id: string;
}
