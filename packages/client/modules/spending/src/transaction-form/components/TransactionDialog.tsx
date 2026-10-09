import type { Transaction } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Field, ResponsiveDialog, Skeleton, useLayout } from '@alavo-daily/design-system';
import { useState } from 'react';

import { CategoryDialog } from '../../categories';
import { useLookups, type Lookups } from '../../lookups';
import { DatePicker } from '../../datepicker';
import { useToday } from '../../today';
import { FormDialog } from '../../form-dialogs';
import { InlineError } from '../../query-state';
import { AmountInput } from './AmountInput';
import { CategoryPicker } from './CategoryPicker';
import { KindSwitch, RecurringRow } from './FormRows';
import { MoneyKeypad } from './MoneyKeypad';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { applyKeypadKey, categoriesOfKind } from '../logic/transactionForm';
import { useTransactionForm } from '../hooks/useTransactionForm';

export interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Transaction | null;
  onSaved?: (item: Transaction) => void;
}

export function TransactionDialog({ open, onOpenChange, editing = null, onSaved }: TransactionDialogProps) {
  const t = useT();
  const lookups = useLookups();
  const title = editing ? t('Sửa giao dịch') : t('Thêm giao dịch');
  if (!open) return null;
  if (lookups.isPending || lookups.isError) {
    return (
      <ResponsiveDialog open onOpenChange={onOpenChange} title={title}>
        {lookups.isError ? (
          <InlineError message={t('Không tải được hạng mục và ví.')} />
        ) : (
          <div role="status" aria-label={t('Đang tải')}>
            <Skeleton className="h-64 w-full" />
          </div>
        )}
      </ResponsiveDialog>
    );
  }
  return (
    <TransactionForm onOpenChange={onOpenChange} editing={editing} lookups={lookups} onSaved={onSaved} title={title} />
  );
}

interface FormProps {
  onOpenChange: (open: boolean) => void;
  editing: Transaction | null;
  lookups: Lookups;
  onSaved?: (item: Transaction) => void;
  title: string;
}

function TransactionForm({ onOpenChange, editing, lookups, onSaved, title }: FormProps) {
  const t = useT();
  const today = useToday();
  const narrow = useLayout() === 'narrow';
  const [creatingCategory, setCreatingCategory] = useState(false);
  const form = useTransactionForm({
    editing,
    lookups,
    today,
    onSaved: (item) => {
      onOpenChange(false);
      onSaved?.(item);
    },
  });
  const { draft, errors, patch } = form;

  return (
    <>
      <FormDialog
        open
        onOpenChange={onOpenChange}
        title={title}
        submitLabel={editing ? t('Lưu thay đổi') : t('Lưu giao dịch')}
        onSubmit={form.submit}
        pending={form.pending}
        error={form.serverError}
      >
        <KindSwitch kind={draft.kind} onChange={form.setKind} />
        <AmountInput value={draft.amount} onChange={(amount) => patch({ amount })} error={errors.amount} />
        <CategoryPicker
          categories={categoriesOfKind(lookups.categories, draft.kind)}
          selectedId={draft.categoryId}
          onSelect={(categoryId) => patch({ categoryId })}
          onCreate={() => setCreatingCategory(true)}
          error={errors.category}
        />
        <Field
          leadingIcon="receipt"
          aria-label={t('Ghi chú')}
          placeholder={t('Ghi chú (ví dụ: Highlands Coffee)')}
          autoComplete="off"
          value={draft.title}
          onChange={(event) => patch({ title: event.target.value })}
        />
        <PaymentMethodPicker
          wallets={lookups.wallets}
          selectedId={draft.walletId}
          onSelect={(walletId) => patch({ walletId })}
          error={errors.wallet}
        />
        <DatePicker
          label={t('Ngày')}
          value={draft.occurredOn}
          today={today}
          onChange={(occurredOn) => patch({ occurredOn })}
          invalid={Boolean(errors.date)}
        />
        {editing?.recurringSourceId ? null : (
          <RecurringRow checked={draft.recurring} onChange={(recurring) => patch({ recurring })} />
        )}
        {narrow ? <MoneyKeypad onKey={(key) => patch({ amount: applyKeypadKey(draft.amount, key) })} /> : null}
      </FormDialog>
      <CategoryDialog
        open={creatingCategory}
        onOpenChange={setCreatingCategory}
        kind={draft.kind}
        onCreated={(category) => patch({ categoryId: category.id })}
      />
    </>
  );
}
