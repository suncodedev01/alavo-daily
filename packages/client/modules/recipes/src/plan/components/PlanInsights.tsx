import type { PlanEntry, RecipeSummary } from '@alavo-daily/common/engine';
import { formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button, ContextSection, Meter } from '@alavo-daily/design-system';
import { useNavigate } from 'react-router';

import { BudgetImpactSection } from '../../budget';
import { useExpenseLogged } from '../../logged-expenses';
import { shoppingRange, useShoppingList } from '../../shopping-range';
import { filledSlotCount, mostUsedDishes, TOTAL_SLOTS, weekCost } from '../logic/planStatistics';

export interface PlanInsightsProps {
  week: string;
  today: string;
  entries: readonly PlanEntry[];
  recipes: readonly RecipeSummary[];
}

export function PlanInsights({ week, today, entries, recipes }: PlanInsightsProps) {
  return (
    <>
      <WeekSummary entries={entries} recipes={recipes} />
      <PlanBudget week={week} today={today} />
      <TopDishes entries={entries} />
      <ShoppingShortcut week={week} />
    </>
  );
}

function WeekSummary({ entries, recipes }: Pick<PlanInsightsProps, 'entries' | 'recipes'>) {
  const t = useT();
  const filled = filledSlotCount(entries);
  return (
    <ContextSection title={t('Tuần này')} defaultOpen>
      <p className="text-2xl font-semibold">{`${filled}/${TOTAL_SLOTS}`}</p>
      <p className="mt-1 mb-3 text-sm text-text-muted">{t('bữa đã lên món')}</p>
      <Meter value={filled / TOTAL_SLOTS} tone="normal" label={t('Số bữa đã lên món')} />
      <p className="mt-3 text-sm text-text-secondary">
        {t('Chi phí nguyên liệu cả tuần ước tính {{cost}}.', {
          cost: formatVnd(weekCost(entries, recipes)),
        })}
      </p>
    </ContextSection>
  );
}

function PlanBudget({ week, today }: Pick<PlanInsightsProps, 'week' | 'today'>) {
  const range = shoppingRange(week, today);
  const list = useShoppingList(range);
  const logged = useExpenseLogged(range);
  return <BudgetImpactSection today={today} extraVnd={list.data?.neededCostVnd ?? 0} logged={logged} />;
}

function TopDishes({ entries }: { entries: readonly PlanEntry[] }) {
  const t = useT();
  const dishes = mostUsedDishes(entries);
  return (
    <ContextSection title={t('Món ăn nhiều nhất')} defaultOpen>
      {dishes.length === 0 ? (
        <p className="text-sm text-text-muted">{t('Chưa có món nào trong tuần này.')}</p>
      ) : (
        <ul>
          {dishes.map((dish) => (
            <li key={dish.name} className="flex justify-between gap-2 py-1 text-sm">
              <span className="min-w-0 flex-1">{dish.name}</span>
              <span className="text-text-muted">{t('{{count}} lần', { count: dish.count })}</span>
            </li>
          ))}
        </ul>
      )}
    </ContextSection>
  );
}

function ShoppingShortcut({ week }: { week: string }) {
  const t = useT();
  const navigate = useNavigate();
  return (
    <div className="px-4 py-4">
      <Button variant="outline" leadingIcon="shopping-bag" onClick={() => navigate(`/recipes/shopping?week=${week}`)}>
        {t('Tạo danh sách đi chợ')}
      </Button>
    </div>
  );
}
