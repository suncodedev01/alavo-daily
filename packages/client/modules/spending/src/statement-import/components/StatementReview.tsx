import { useT } from '@alavo-daily/common';
import { Button, Card, Checkbox, EmptyState, OptionPicker, Skeleton } from '@alavo-daily/design-system';
import { useState } from 'react';

import { useLookups } from '../../lookups';
import { formatBalance } from '../../money';
import { useConfirmImport } from '../hooks/useConfirmImport';
import type { StatementDraft } from '../hooks/useStatementDraft';
import { summarize } from '../logic/draftRows';
import { StatementRowItem } from './StatementRowItem';

export function StatementReview({ draft }: { draft: StatementDraft }) {
  const t = useT();
  const lookups = useLookups();
  const importer = useConfirmImport();
  const [chosenWalletId, setWalletId] = useState<string | null>(null);
  const walletId = chosenWalletId ?? lookups.wallets[0]?.id ?? null;
  const summary = summarize(draft.rows);
  if (lookups.isPending) return <Skeleton className="h-64 w-full" />;
  if (draft.rows.length === 0) return <NothingFound onBack={draft.backToInput} />;

  const walletOptions = lookups.wallets.map((wallet) => ({
    value: wallet.id,
    label: wallet.name,
    hint: formatBalance(wallet.balanceVnd),
    icon: 'wallet',
  }));
  const canConfirm = walletId !== null && summary.selected > 0 && !importer.pending;
  return (
    <Card className="mx-auto grid w-full max-w-240 gap-4">
      <div className="grid gap-3 lg:grid-cols-2 lg:items-end">
        <div className="grid gap-1">
          <h2 className="text-title font-semibold">{t('Kiểm tra trước khi nhập')}</h2>
          <p className="text-sm text-text-secondary">
            {t(
              'Chọn những dòng cần nhập và đổi hạng mục nếu chưa đúng. Dòng đã có trong ví sẽ tự được bỏ qua.',
            )}
          </p>
        </div>
        <OptionPicker
          label={t('Ví nhận giao dịch')}
          value={walletId}
          options={walletOptions}
          placeholder={t('Chọn ví')}
          leadingIcon="wallet"
          onChange={setWalletId}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-hairline pb-2 text-sm">
        <Checkbox
          checked={summary.selected === summary.importable && summary.importable > 0}
          disabled={summary.importable === 0}
          onCheckedChange={draft.setAllIncluded}
        >
          {t('Chọn tất cả')}
        </Checkbox>
        <p className="text-text-muted">
          {t('Đã chọn {{selected}}/{{total}} dòng', { selected: summary.selected, total: draft.rows.length })}
          {summary.skipped > 0 ? ` · ${t('{{count}} dòng không đọc được', { count: summary.skipped })}` : ''}
        </p>
      </div>
      <ul className="grid gap-1" aria-label={t('Các dòng trong sao kê')}>
        {draft.rows.map((row) => (
          <StatementRowItem key={row.line} row={row} lookups={lookups} onChange={draft.patch} />
        ))}
      </ul>
      {importer.error ? (
        <p role="alert" className="text-sm text-destructive-fg">
          {importer.error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={draft.backToInput}>
          {t('Quay lại')}
        </Button>
        <Button disabled={!canConfirm} onClick={() => walletId && importer.confirm(walletId, draft.rows)}>
          {t('Nhập {{count}} giao dịch', { count: summary.selected })}
        </Button>
      </div>
    </Card>
  );
}

function NothingFound({ onBack }: { onBack: () => void }) {
  const t = useT();
  return (
    <EmptyState
      icon="receipt-x"
      title={t('Không có dòng giao dịch nào')}
      description={t('Sao kê chỉ có dòng tiêu đề. Hãy kiểm tra lại file hoặc nội dung đã dán.')}
      action={<Button variant="outline" onClick={onBack}>{t('Quay lại')}</Button>}
    />
  );
}
