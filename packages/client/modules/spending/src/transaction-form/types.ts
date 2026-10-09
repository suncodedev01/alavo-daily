import type { CategoryKind } from '@alavo-daily/common/engine';
import type { Transaction } from '@alavo-daily/common/engine';

import type { Lookups } from '../lookups';

export interface TransactionDraft {
  kind: CategoryKind;
  amount: string;
  categoryId: string;
  title: string;
  walletId: string;
  occurredOn: string;
  recurring: boolean;
}

export interface DraftErrors {
  amount?: string;
  category?: string;
  wallet?: string;
  date?: string;
}

export type KeypadKey = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '000' | '0' | 'delete';

export interface TransactionFormOptions {
  editing: Transaction | null;
  lookups: Lookups;
  today: string;
  onSaved: (item: Transaction) => void;
}

export interface TransactionFormState {
  draft: TransactionDraft;
  errors: DraftErrors;
  serverError: string | null;
  pending: boolean;
  patch: (changes: Partial<TransactionDraft>) => void;
  setKind: (kind: CategoryKind) => void;
  submit: () => void;
}
