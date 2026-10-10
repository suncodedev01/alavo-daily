import { useState } from 'react';

import { useEngineMutation, useEngineQuery, type EstimateItem } from '@alavo-daily/common/engine';
import { formatVndInput, parseVndInput } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button, Eyebrow, OptionPicker, ResponsiveDialog } from '@alavo-daily/design-system';

import { describeEngineError } from '../../engine-errors';
import { MoneyField, formatBalance } from '../../money';
import { useToday } from '../../today';
import { walletIcon } from '../../wallets';

export interface PaidDialogProps {
  item: EstimateItem;
  /** What the item costs after multiplying by its factors. */
  amount: number;
  /** What counts as paid now. */
  paid: number;
  onClose: () => void;
}

type Way = 'record' | 'only';

const WAY_CLASS =
  'focus-ring flex w-full items-start gap-3 rounded-lg p-3 text-left text-sm inset-ring inset-ring-line-hairline hover:bg-surface-tint aria-pressed:bg-accent aria-pressed:text-accent-fg aria-pressed:inset-ring-0';

/** How much of an item is paid, and whether to write the payment into the spending ledger. */
export function PaidDialog({ item, amount, paid, onClose }: PaidDialogProps) {
  const t = useT();
  const today = useToday();
  const setPaid = useEngineMutation('spending.set_estimate_item_paid');
  const categories = useEngineQuery('spending.list_categories', { kind: 'expense' });
  const wallets = useEngineQuery('spending.list_wallets');
  const [value, setValue] = useState(formatVndInput(String(paid || '')));
  const [way, setWay] = useState<Way>('record');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const newPaid = Math.min(parseVndInput(value), amount);
  const increases = newPaid > paid;
  const chosenCategory = categoryId || categories.data?.[0]?.id || '';
  const chosenWallet = walletId || wallets.data?.[0]?.id || '';

  const confirm = () => {
    const record = increases && way === 'record' ? { categoryId: chosenCategory, walletId: chosenWallet, occurredOn: today } : undefined;
    setPaid.mutate({ id: item.id, paid: newPaid, record }, { onSuccess: onClose, onError: (error) => setProblem(describeEngineError(error, t)) });
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('Tiền đã trả cho {{name}}', { name: item.name })}
      description={t('Khoản này giá {{amount}}. Ghi số tiền đã trả, kể cả tiền cọc.', { amount: formatBalance(amount) })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('Huỷ')}
          </Button>
          <Button disabled={setPaid.isPending} onClick={confirm}>
            {t('Lưu')}
          </Button>
        </>
      }
    >
      <div className="grid gap-2">
        <Eyebrow>{t('Đã trả')}</Eyebrow>
        <MoneyField value={value} onValueChange={setValue} label={t('Số tiền đã trả')} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setValue('')}>
            {t('Chưa trả')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setValue(formatVndInput(String(amount)))}>
            {t('Trả đủ')}
          </Button>
        </div>
      </div>
      {increases ? (
        <div className="grid gap-2">
          <Eyebrow>{t('Cách ghi')}</Eyebrow>
          <button type="button" aria-pressed={way === 'record'} className={WAY_CLASS} onClick={() => setWay('record')}>
            <span className="grid gap-1">
              <span className="font-medium">{t('Ghi vào Chi tiêu')}</span>
              <span className="text-text-muted">{t('Tạo một giao dịch chi và trừ tiền trong ví.')}</span>
            </span>
          </button>
          <button type="button" aria-pressed={way === 'only'} className={WAY_CLASS} onClick={() => setWay('only')}>
            <span className="grid gap-1">
              <span className="font-medium">{t('Chỉ cập nhật dự toán')}</span>
              <span className="text-text-muted">{t('Dùng khi bạn đã tự ghi khoản chi này rồi, để không tính hai lần.')}</span>
            </span>
          </button>
          {way === 'record' ? (
            <>
              <OptionPicker
                label={t('Hạng mục')}
                value={chosenCategory}
                options={(categories.data ?? []).map((category) => ({ value: category.id, label: t(category.name), icon: category.icon }))}
                onChange={setCategoryId}
              />
              <OptionPicker
                label={t('Chi từ ví')}
                value={chosenWallet}
                options={(wallets.data ?? []).map((wallet) => ({ value: wallet.id, label: t(wallet.name), hint: formatBalance(wallet.balanceVnd), icon: walletIcon(wallet.kind) }))}
                onChange={setWalletId}
              />
            </>
          ) : null}
        </div>
      ) : null}
      {problem ? (
        <p role="alert" className="text-sm text-destructive-fg">
          {problem}
        </p>
      ) : null}
    </ResponsiveDialog>
  );
}
