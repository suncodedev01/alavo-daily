import { useEngineMutation, useEngineQuery } from '@alavo-daily/common/engine';
import { dayAndMonth, formatVnd } from '@alavo-daily/common/format';
import { useLanguage, useT } from '@alavo-daily/common';
import { Button, OptionPicker, ResponsiveDialog, useToast } from '@alavo-daily/design-system';
import { useState } from 'react';

import { describeEngineError } from '../../engine-errors';
import type { DateRange } from '../../shopping-range';
import { markExpenseLogged } from '../../logged-expenses';
import { FOOD_CATEGORY_NAME } from '../../vocabulary';

export interface LogExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  range: DateRange;
  today: string;
  amountVnd: number;
}

export function LogExpenseDialog({ open, onOpenChange, range, today, amountVnd }: LogExpenseDialogProps) {
  const language = useLanguage();
  const t = useT();
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Ghi vào Chi tiêu')}
      description={t('Ghi {{amount}} tiền đi chợ từ {{from}} đến {{to}} thành một khoản chi.', {
        amount: formatVnd(amountVnd),
        from: dayAndMonth(range.from, language),
        to: dayAndMonth(range.to, language),
      })}
      closeLabel={t('Đóng')}
    >
      <LogExpenseForm range={range} today={today} onDone={() => onOpenChange(false)} />
    </ResponsiveDialog>
  );
}

interface LogExpenseFormProps {
  range: DateRange;
  today: string;
  onDone: () => void;
}

function LogExpenseForm({ range, today, onDone }: LogExpenseFormProps) {
  const t = useT();
  const { toast } = useToast();
  const wallets = useEngineQuery('spending.list_wallets');
  const categories = useEngineQuery('spending.list_categories', { kind: 'expense' });
  const log = useEngineMutation('recipes.log_shopping_expense');
  const [walletChoice, setWalletChoice] = useState<string | null>(null);
  const [categoryChoice, setCategoryChoice] = useState<string | null>(null);
  const walletList = wallets.data ?? [];
  const categoryList = categories.data ?? [];
  const defaultCategory = categoryList.find((category) => category.name === FOOD_CATEGORY_NAME) ?? categoryList[0];
  const walletId = walletChoice ?? walletList[0]?.id ?? null;
  const categoryId = categoryChoice ?? defaultCategory?.id ?? null;

  const submit = () => {
    if (walletId === null || categoryId === null) return;
    log.mutate(
      { ...range, walletId, categoryId, occurredOn: today },
      {
        onSuccess: (transaction) => {
          markExpenseLogged(range);
          toast(t('Đã ghi {{amount}} vào Chi tiêu', { amount: formatVnd(transaction.amountVnd) }));
          onDone();
        },
      },
    );
  };

  return (
    <div className="grid gap-3">
      {walletList.length === 0 && !wallets.isPending ? (
        <p className="text-sm text-text-muted">{t('Chưa có ví nào. Hãy tạo ví trong Chi tiêu trước.')}</p>
      ) : null}
      <OptionPicker
        label={t('Ví')}
        value={walletId}
        placeholder={t('Chọn ví')}
        leadingIcon="wallet"
        options={walletList.map((wallet) => ({ value: wallet.id, label: wallet.name }))}
        onChange={setWalletChoice}
      />
      <OptionPicker
        label={t('Danh mục')}
        value={categoryId}
        placeholder={t('Chọn danh mục')}
        leadingIcon="tag"
        options={categoryList.map((category) => ({
          value: category.id,
          label: t(category.name),
          icon: category.icon,
        }))}
        onChange={setCategoryChoice}
      />
      {log.error ? (
        <p role="alert" className="text-sm text-destructive-fg">
          {describeEngineError(log.error, t)}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>
          {t('Huỷ')}
        </Button>
        <Button disabled={walletId === null || categoryId === null || log.isPending} onClick={submit}>
          {t('Ghi khoản chi')}
        </Button>
      </div>
    </div>
  );
}
