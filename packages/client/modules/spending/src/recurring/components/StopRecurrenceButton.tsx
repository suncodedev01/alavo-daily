import { useEngineMutation, useEngineQuery, type Transaction } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, useToast } from '@alavo-daily/design-system';

import { recurrenceOf } from '../logic/recurrenceOf';

/** Ends the monthly repeat of a recurring transaction, from the transaction itself or from a copy. */
export function StopRecurrenceButton({ transaction }: { transaction: Transaction }) {
  const recurrence = recurrenceOf(transaction);
  if (recurrence.kind === 'template') return <StopButton templateId={transaction.id} />;
  if (recurrence.kind === 'generated') return <StopFromCopy templateId={recurrence.templateId} />;
  return null;
}

function StopFromCopy({ templateId }: { templateId: string }) {
  const template = useEngineQuery('spending.get_transaction', { id: templateId });
  if (!template.data || recurrenceOf(template.data).kind !== 'template') return null;
  return <StopButton templateId={templateId} />;
}

function StopButton({ templateId }: { templateId: string }) {
  const t = useT();
  const { toast } = useToast();
  const stop = useEngineMutation('spending.update_transaction');
  const stopRepeating = () =>
    stop.mutate(
      { id: templateId, recurringRule: null },
      {
        onSuccess: () => toast(t('Đã dừng lặp lại. Các giao dịch đã tạo vẫn được giữ.')),
        onError: () => toast(t('Không dừng được lặp lại. Bạn thử lại nhé.')),
      },
    );
  return (
    <Button variant="outline" size="sm" leadingIcon="repeat" disabled={stop.isPending} onClick={stopRepeating}>
      {t('Dừng lặp lại')}
    </Button>
  );
}
