import {
  formatPercent,
  formatVnd,
  useT,
  type BudgetLine,
  type ShoppingList,
} from '@alavo-daily/common';
import { Card, CardHeader, CardTitle, Meter } from '@alavo-daily/design-system';

import { LinkButton } from '../../../router-links';
import { RECIPES_SHOPPING_PATH, SPENDING_OVERVIEW_PATH } from '../logic/links';

export interface SpendingCardProps {
  spentTodayVnd: number;
  monthTransactionCount: number;
  foodLine: BudgetLine | undefined;
}

export function SpendingCard({ spentTodayVnd, monthTransactionCount, foodLine }: SpendingCardProps) {
  const t = useT();
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>{t('Chi tiêu hôm nay')}</CardTitle>
        <LinkButton to={SPENDING_OVERVIEW_PATH} variant="ghost" size="sm">
          {t('Chi tiết')}
        </LinkButton>
      </CardHeader>
      <p className="text-2xl font-semibold">{formatVnd(spentTodayVnd)}</p>
      <p className="mt-1 mb-4 text-xs text-text-muted">
        {t('{{count}} giao dịch trong tháng', { count: monthTransactionCount })}
      </p>
      {foodLine ? <FoodBudget line={foodLine} /> : null}
    </Card>
  );
}

function FoodBudget({ line }: { line: BudgetLine }) {
  const t = useT();
  return (
    <div className="grid gap-2">
      <div className="flex text-sm">
        <span className="flex-1 font-medium">{t('Ngân sách {{name}}', { name: t(line.name) })}</span>
        <span className="font-semibold">{formatPercent(line.pct)}</span>
      </div>
      <Meter value={line.pct} label={t('Ngân sách {{name}}', { name: t(line.name) })} />
      <p className="text-xs text-text-muted">{`${formatVnd(line.spentVnd)} / ${formatVnd(line.budgetVnd)}`}</p>
    </div>
  );
}

export function ShoppingCard({ shopping }: { shopping: ShoppingList | undefined }) {
  const t = useT();
  const total = shopping?.items.length ?? 0;
  const have = shopping?.items.filter((item) => item.have).length ?? 0;
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>{t('Đi chợ')}</CardTitle>
        <LinkButton to={RECIPES_SHOPPING_PATH} variant="ghost" size="sm">
          {t('Mở danh sách')}
        </LinkButton>
      </CardHeader>
      <p className="text-2xl font-semibold">{t('{{count}} món', { count: shopping?.neededCount ?? 0 })}</p>
      <p className="mt-1 mb-4 text-sm text-text-muted">
        {t('cần mua cho 3 ngày tới · ước tính {{cost}}', { cost: formatVnd(shopping?.neededCostVnd ?? 0) })}
      </p>
      <Meter value={total === 0 ? 0 : have / total} label={t('Món đã có sẵn')} />
      <p className="mt-2 text-xs text-text-muted">
        {t('{{have}}/{{total}} món đã có sẵn', { have, total })}
      </p>
    </Card>
  );
}
