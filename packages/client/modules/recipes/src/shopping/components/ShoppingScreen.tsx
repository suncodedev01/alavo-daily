import type { ShoppingList } from '@alavo-daily/common/engine';
import { dayAndMonth } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Screen } from '@alavo-daily/common/shell';
import { Button, Card, EmptyState, PageColumn, useLayout } from '@alavo-daily/design-system';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useExpenseLogged } from '../../logged-expenses';
import { ListSkeleton, QueryState } from '../../query-state';
import { shoppingRange, useShoppingList } from '../../shopping-range';
import { useToday } from '../../today';
import { normalizeWeek } from '../../week';
import { AddCustomItem } from './AddCustomItem';
import { LogExpenseDialog } from './LogExpenseDialog';
import { groupByAisle, sourceRecipeNames } from '../logic/shoppingModel';
import { ShoppingGroups } from './ShoppingGroups';
import { BudgetImpactSection } from '../../budget';
import { ShoppingInsights, SourceRecipes } from './ShoppingInsights';
import { SummaryBar } from './SummaryBar';

export function ShoppingScreen() {
  const t = useT();
  const layout = useLayout();
  const today = useToday();
  const [params] = useSearchParams();
  const range = shoppingRange(normalizeWeek(params.get('week'), today), today);
  const list = useShoppingList(range);
  const logged = useExpenseLogged(range);
  const [logging, setLogging] = useState(false);
  const insights = (loaded: ShoppingList) => (
    <ShoppingInsights today={today} items={loaded.items} neededCostVnd={loaded.neededCostVnd} logged={logged} />
  );
  return (
    <Screen
      title={t('Đi chợ')}
      dock={layout === 'wide' && list.data ? insights(list.data) : undefined}
    >
      <PageColumn maxWidth="detail" className="gap-4">
        <QueryState query={list} skeleton={<ListSkeleton rows={6} />}>
          {(loaded) => (
            <>
              <ShoppingHeader list={loaded} />
              {layout === 'narrow' ? (
                <Card padding="none" className="empty:hidden">
                  <BudgetImpactSection today={today} extraVnd={loaded.neededCostVnd} logged={logged} />
                </Card>
              ) : null}
              {loaded.items.length === 0 ? <NothingToBuy /> : <ShoppingGroups groups={groupByAisle(loaded.items)} />}
              {layout === 'narrow' ? (
                <Card padding="none" className="empty:hidden">
                  <SourceRecipes items={loaded.items} />
                </Card>
              ) : null}
              <AddCustomItem />
              <SummaryBar
                neededCount={loaded.neededCount}
                neededCostVnd={loaded.neededCostVnd}
                logged={logged}
                onLog={() => setLogging(true)}
              />
              <LogExpenseDialog
                open={logging}
                onOpenChange={setLogging}
                range={range}
                today={today}
                amountVnd={loaded.neededCostVnd}
              />
            </>
          )}
        </QueryState>
      </PageColumn>
    </Screen>
  );
}

function ShoppingHeader({ list }: { list: ShoppingList }) {
  const t = useT();
  const dishes = sourceRecipeNames(list.items).length;
  return (
    <div>
      <h2 className="text-title font-semibold">
        {t('Cần mua từ {{from}} đến {{to}}', { from: dayAndMonth(list.from), to: dayAndMonth(list.to) })}
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        {t('Gộp từ {{count}} món trong thực đơn. Món trùng nguyên liệu đã được cộng dồn.', { count: dishes })}
      </p>
    </div>
  );
}

function NothingToBuy() {
  const t = useT();
  const navigate = useNavigate();
  return (
    <EmptyState
      icon="shopping-bag"
      title={t('Chưa có gì để mua')}
      description={t('Lên món trong thực đơn tuần rồi quay lại đây, hoặc thêm món lẻ bên dưới.')}
      action={
        <Button variant="outline" leadingIcon="calendar-blank" onClick={() => navigate('/recipes/plan')}>
          {t('Mở thực đơn tuần')}
        </Button>
      }
    />
  );
}
