import type { EstimateView } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Card, IconButton, IconTile, Meter } from '@alavo-daily/design-system';

import { formatBalance } from '../../money';
import { shortMoney } from '../logic/shortMoney';

export interface EstimateSummaryCardProps {
  view: EstimateView;
  onSources: () => void;
  onIncome: () => void;
  onDelete: () => void;
}

const FULL_COVER = 100;
const NEARLY_COVERED = 85;

/** The answer first: is the money enough? Then the numbers behind it. */
export function EstimateSummaryCard({ view, onSources, onIncome, onDelete }: EstimateSummaryCardProps) {
  const t = useT();
  const { estimate, totals } = view;
  return (
    <Card padding="lg" className="grid gap-4">
      <div className="flex items-center gap-3">
        <IconTile icon={estimate.icon} size="lg" />
        <div className="grid min-w-0 flex-1">
          <b className="truncate text-title">{estimate.name}</b>
          <small className="text-sm text-text-muted">{t('{{count}} khoản cần mua', { count: estimate.items.length })}</small>
        </div>
        <IconButton icon="trash" label={t('Xoá dự toán')} size="sm" onClick={onDelete} />
      </div>
      <Equation view={view} onSources={onSources} onIncome={onIncome} />
      <Result view={view} />
      <dl className="grid gap-2 text-sm">
        <Line label={t('Tổng dự toán')} value={formatBalance(totals.total)} />
        <Line label={t('Đã trả')} value={formatBalance(totals.paid)} />
        <Line label={t('Còn phải chi')} value={formatBalance(totals.remaining)} />
      </dl>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

const BOX_CLASS = 'focus-ring grid min-w-0 flex-1 justify-items-center gap-1 rounded-lg bg-surface-tint px-2 py-3';

function Equation({ view, onSources, onIncome }: Pick<EstimateSummaryCardProps, 'view' | 'onSources' | 'onIncome'>) {
  const t = useT();
  const { totals } = view;
  return (
    <div className="flex items-center gap-1" role="group" aria-label={t('Tiền đang có cộng khoản thu dự kiến trừ còn phải chi')}>
      <button type="button" className={BOX_CLASS} onClick={onSources}>
        <span className="text-meta text-text-muted">{t('Đang có')}</span>
        <b>{shortMoney(totals.available)}</b>
      </button>
      <span aria-hidden className="text-text-muted">+</span>
      <button type="button" className={BOX_CLASS} onClick={onIncome}>
        <span className="text-meta text-text-muted">{t('Sẽ thu')}</span>
        <b>{shortMoney(totals.incoming)}</b>
      </button>
      <span aria-hidden className="text-text-muted">−</span>
      <div className={BOX_CLASS}>
        <span className="text-meta text-text-muted">{t('Cần chi')}</span>
        <b>{shortMoney(totals.remaining)}</b>
      </div>
    </div>
  );
}

function Result({ view }: { view: EstimateView }) {
  const t = useT();
  const { totals, estimate } = view;
  const enough = totals.result >= 0;
  const tone = totals.coveredPercent >= FULL_COVER ? 'normal' : totals.coveredPercent >= NEARLY_COVERED ? 'warn' : 'over';
  return (
    <div className="grid gap-2">
      <div className="grid gap-1" role="status">
        <span className="text-sm font-medium text-text-secondary">{enough ? t('Đủ tiền, còn dư') : t('Chưa đủ tiền, còn thiếu')}</span>
        <span className={enough ? 'text-display font-semibold text-income-fg' : 'text-display font-semibold text-expense-fg'}>
          {formatBalance(Math.abs(totals.result))}
        </span>
      </div>
      <Meter value={totals.coveredPercent / FULL_COVER} tone={tone} label={t('Phần đã đủ tiền')} />
      {estimate.income.length > 0 ? (
        <p className="text-sm text-text-muted">
          {t('Nếu chưa tính khoản thu dự kiến: {{state}} {{amount}}. Khoản thu dự kiến chưa chắc chắn nên bạn nên xem cả hai con số.', {
            state: totals.withoutIncoming >= 0 ? t('còn dư') : t('còn thiếu'),
            amount: formatBalance(Math.abs(totals.withoutIncoming)),
          })}
        </p>
      ) : null}
    </div>
  );
}
