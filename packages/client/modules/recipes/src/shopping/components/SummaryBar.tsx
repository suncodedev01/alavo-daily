import { formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button, StatusChip } from '@alavo-daily/design-system';

export interface SummaryBarProps {
  neededCount: number;
  neededCostVnd: number;
  logged: boolean;
  onLog: () => void;
}

export function SummaryBar({ neededCount, neededCostVnd, logged, onLog }: SummaryBarProps) {
  const t = useT();
  return (
    <div className="sticky bottom-0 flex items-center gap-3 rounded-xl bg-surface p-3 shadow-card">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{t('{{count}} món cần mua', { count: neededCount })}</p>
        <p className="text-xs text-text-muted">{t('Ước tính {{cost}}', { cost: formatVnd(neededCostVnd) })}</p>
      </div>
      {logged ? (
        <StatusChip status="resolved" label={t('Đã ghi vào Chi tiêu')} />
      ) : (
        <Button leadingIcon="wallet" disabled={neededCostVnd <= 0} onClick={onLog}>
          {t('Ghi vào Chi tiêu')}
        </Button>
      )}
    </div>
  );
}
