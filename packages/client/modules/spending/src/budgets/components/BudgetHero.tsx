import type { BudgetStatus } from '@alavo-daily/common/engine';
import { formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Card, Eyebrow, Meter } from '@alavo-daily/design-system';

export function BudgetHero({ status }: { status: BudgetStatus }) {
  const t = useT();
  const over = status.totalRemainingVnd < 0;
  const ratio = status.totalBudgetVnd === 0 ? 0 : status.totalSpentVnd / status.totalBudgetVnd;
  return (
    <Card aria-label={t('Tổng quan ngân sách')} className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <Eyebrow>{over ? t('Vượt ngân sách tháng này') : t('Còn lại tháng này')}</Eyebrow>
        <p className="mt-2 text-display font-semibold max-lg:text-2xl">{formatVnd(status.totalRemainingVnd)}</p>
        {status.daysLeft > 0 && !over ? (
          <p className="mt-2 text-sm text-text-muted">
            {t('Khoảng {{perDay}} mỗi ngày trong {{days}} ngày tới', {
              perDay: formatVnd(status.perDayVnd),
              days: status.daysLeft,
            })}
          </p>
        ) : null}
      </div>
      <div className="grid min-w-60 flex-1 gap-2">
        <div className="flex items-center text-sm">
          <span className="flex-1">{t('Đã chi {{amount}}', { amount: formatVnd(status.totalSpentVnd) })}</span>
          <span className="text-text-muted">{`/ ${formatVnd(status.totalBudgetVnd)}`}</span>
        </div>
        <Meter value={ratio} label={t('Tổng ngân sách đã dùng')} />
      </div>
    </Card>
  );
}
