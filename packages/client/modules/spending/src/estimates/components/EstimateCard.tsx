import { Link } from 'react-router';

import type { EstimateSummary } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Card, IconTile, Meter } from '@alavo-daily/design-system';

import { formatBalance } from '../../money';

const FULL_COVER = 100;
const NEARLY_COVERED = 85;

export function estimatePath(id: string): string {
  return `/spending/estimates/${id}`;
}

function coverTone(percent: number): 'normal' | 'warn' | 'over' {
  if (percent >= FULL_COVER) return 'normal';
  return percent >= NEARLY_COVERED ? 'warn' : 'over';
}

/** One estimate in the list: how big it is and whether the money on hand is enough. */
export function EstimateCard({ estimate }: { estimate: EstimateSummary }) {
  const t = useT();
  const enough = estimate.result >= 0;
  return (
    <Card padding="md" className="p-0">
      <Link to={estimatePath(estimate.id)} className="focus-ring grid gap-3 rounded-2xl p-4 lg:p-6">
        <span className="flex items-center gap-3">
          <IconTile icon={estimate.icon} size="lg" />
          <span className="grid min-w-0 flex-1">
            <b className="truncate text-row">{estimate.name}</b>
            <small className="truncate text-sm text-text-muted">
              {t('{{count}} khoản · {{total}}', { count: estimate.itemCount, total: formatBalance(estimate.total) })}
            </small>
          </span>
          <span className={enough ? 'text-sm font-semibold text-income-fg' : 'text-sm font-semibold text-hold-fg'}>
            {enough ? t('Đủ tiền') : t('Còn thiếu')}
          </span>
        </span>
        <Meter value={estimate.coveredPercent / FULL_COVER} tone={coverTone(estimate.coveredPercent)} label={t('Phần đã đủ tiền')} />
        <span className="flex gap-2 text-sm text-text-muted">
          <span className="flex-1">{t('Còn phải chi {{amount}}', { amount: formatBalance(estimate.remaining) })}</span>
          <span>{`${enough ? t('Dư') : t('Thiếu')} ${formatBalance(Math.abs(estimate.result))}`}</span>
        </span>
      </Link>
    </Card>
  );
}
