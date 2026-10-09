import {
  formatPercent,
  formatVnd,
  useT,
  type BudgetLine,
  type PlanEntry,
  type ShoppingList,
} from '@alavo-daily/common';
import { Card, CardHeader, CardTitle, Eyebrow, IconTile, Meter } from '@alavo-daily/design-system';

import { LinkButton } from '../../../router-links';
import { RECIPES_PLAN_PATH, RECIPES_SHOPPING_PATH, SPENDING_OVERVIEW_PATH, cookingPath } from '../logic/links';
import { dinnerEntries, missingIngredientCount } from '../logic/today';

export function DinnerCard({ plan, shopping }: { plan: PlanEntry[]; shopping: ShoppingList | undefined }) {
  const t = useT();
  const dinner = dinnerEntries(plan);
  const missing = shopping ? missingIngredientCount(shopping, dinner.map((entry) => entry.recipeName)) : 0;
  const first = dinner[0];
  return (
    <Card padding="lg" className="grid content-start gap-4">
      <Eyebrow>{t('Bữa tối nay')}</Eyebrow>
      {dinner.length === 0 ? (
        <p className="text-sm text-text-muted">{t('Chưa lên món cho bữa tối.')}</p>
      ) : (
        dinner.map((entry) => <DinnerRow key={entry.id} entry={entry} />)
      )}
      {first ? (
        <div className="flex flex-wrap items-center gap-3">
          <LinkButton to={cookingPath(first.recipeId)} leadingIcon="play" size="lg">
            {t('Bắt đầu nấu')}
          </LinkButton>
          <span className="text-sm text-text-muted">
            {missing > 0
              ? t('Còn {{count}} nguyên liệu chưa mua', { count: missing })
              : t('Đã đủ nguyên liệu')}
          </span>
        </div>
      ) : (
        <LinkButton to={RECIPES_PLAN_PATH} variant="outline" className="justify-self-start">
          {t('Lên thực đơn')}
        </LinkButton>
      )}
    </Card>
  );
}

function DinnerRow({ entry }: { entry: PlanEntry }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3">
      <IconTile icon={entry.recipeIcon} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.recipeName}</p>
        <p className="text-xs text-text-muted">{t('{{count}} người', { count: entry.servings })}</p>
      </div>
    </div>
  );
}

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

const SLOT_LABELS: [PlanEntry['slot'], string][] = [
  ['breakfast', 'Sáng'],
  ['lunch', 'Trưa'],
  ['dinner', 'Tối'],
];

export function MealsCard({ plan }: { plan: PlanEntry[] }) {
  const t = useT();
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>{t('Thực đơn hôm nay')}</CardTitle>
        <LinkButton to={RECIPES_PLAN_PATH} variant="ghost" size="sm">
          {t('Cả tuần')}
        </LinkButton>
      </CardHeader>
      {SLOT_LABELS.map(([slot, label]) => {
        const entries = plan.filter((entry) => entry.slot === slot);
        return (
          <div key={slot} className="flex gap-3 py-2">
            <Eyebrow className="w-12 pt-0.5">{t(label)}</Eyebrow>
            <div className="min-w-0 flex-1 text-sm">
              {entries.length === 0 ? (
                <span className="text-text-muted">{t('Chưa lên món')}</span>
              ) : (
                entries.map((entry) => <p key={entry.id}>{entry.recipeName}</p>)
              )}
            </div>
          </div>
        );
      })}
    </Card>
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
