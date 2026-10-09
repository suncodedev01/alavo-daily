import type { Category, CategoryKind, NewTransaction, Transaction, UpdateTransaction, Wallet } from '@alavo-daily/common/engine';
import { formatVndInput, parseVndInput } from '@alavo-daily/common/format';

import { isValidDateText } from '../../datepicker';
import { monthlyRule, monthlyRuleDay } from '../../transaction-model';
import type { TransactionDraft, DraftErrors } from '../types';

export const AMOUNT_MAX_DIGITS = 12;

export function categoriesOfKind(categories: readonly Category[], kind: CategoryKind): Category[] {
  return categories.filter((category) => category.kind === kind);
}

export function newDraft(today: string, categories: readonly Category[], wallets: readonly Wallet[]): TransactionDraft {
  return {
    kind: 'expense',
    amount: '',
    categoryId: categoriesOfKind(categories, 'expense')[0]?.id ?? '',
    title: '',
    walletId: wallets[0]?.id ?? '',
    occurredOn: today,
    recurring: false,
  };
}

export function draftFromTransaction(item: Transaction, categories: readonly Category[]): TransactionDraft {
  const kind = categories.find((category) => category.id === item.categoryId)?.kind ?? 'expense';
  return {
    kind,
    amount: formatVndInput(String(Math.abs(item.amountVnd))),
    categoryId: item.categoryId,
    title: item.title,
    walletId: item.walletId,
    occurredOn: item.occurredOn,
    recurring: monthlyRuleDay(item.recurringRule) !== null,
  };
}

export function withKind(draft: TransactionDraft, kind: CategoryKind, categories: readonly Category[]): TransactionDraft {
  if (draft.kind === kind) return draft;
  return { ...draft, kind, categoryId: categoriesOfKind(categories, kind)[0]?.id ?? '' };
}

export function normalizeAmount(text: string): string {
  const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, AMOUNT_MAX_DIGITS);
  return formatVndInput(digits);
}

export function appendDigits(amount: string, digits: string): string {
  return normalizeAmount(`${amount}${digits}`);
}

export function removeLastDigit(amount: string): string {
  return normalizeAmount(amount.replace(/\D/g, '').slice(0, -1));
}

export function applyKeypadKey(amount: string, key: string): string {
  return key === 'delete' ? removeLastDigit(amount) : appendDigits(amount, key);
}

export function validateDraft(draft: TransactionDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (parseVndInput(draft.amount) <= 0) errors.amount = 'Nhập số tiền lớn hơn 0.';
  if (draft.categoryId === '') errors.category = 'Chọn một hạng mục.';
  if (draft.walletId === '') errors.wallet = 'Hãy chọn hình thức thanh toán.';
  if (!isValidDateText(draft.occurredOn)) errors.date = 'Chọn ngày hợp lệ.';
  return errors;
}

export function signedAmount(draft: TransactionDraft): number {
  const amount = parseVndInput(draft.amount);
  return draft.kind === 'expense' ? -amount : amount;
}

function recurringRuleOf(draft: TransactionDraft): string | null {
  return draft.recurring ? monthlyRule(Number(draft.occurredOn.slice(8))) : null;
}

function titleOf(draft: TransactionDraft, categoryName: string): string {
  const typed = draft.title.trim();
  return typed === '' ? categoryName : typed;
}

export function toNewTransaction(draft: TransactionDraft, categoryName: string): NewTransaction {
  return {
    title: titleOf(draft, categoryName),
    amountVnd: signedAmount(draft),
    categoryId: draft.categoryId,
    walletId: draft.walletId,
    occurredOn: draft.occurredOn,
    recurringRule: recurringRuleOf(draft),
  };
}

export function toUpdateTransaction(id: string, draft: TransactionDraft, categoryName: string): UpdateTransaction {
  return { id, ...toNewTransaction(draft, categoryName) };
}
