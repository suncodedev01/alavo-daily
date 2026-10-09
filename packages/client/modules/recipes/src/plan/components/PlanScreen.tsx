import { useEngineQuery } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Screen } from '@alavo-daily/common/shell';
import { Card, PageColumn, useLayout } from '@alavo-daily/design-system';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { ListSkeleton, QueryState } from '../../query-state';
import { useHouseholdSize } from '../../household';
import { useToday } from '../../today';
import { PLAN_DAYS } from '../../vocabulary';
import { DayView } from './DayView';
import { PlanInsights } from './PlanInsights';
import type { PlanTarget } from '../types';
import { RecipePickerDialog } from './RecipePickerDialog';
import { WeekGrid } from './WeekGrid';
import { WeekNavigator } from './WeekNavigator';
import { normalizeWeek, weekDates } from '../../week';

export function PlanScreen() {
  const t = useT();
  const layout = useLayout();
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const week = normalizeWeek(params.get('week'), today);
  const plan = useEngineQuery('recipes.get_plan', { from: week, days: PLAN_DAYS });
  const recipes = useEngineQuery('recipes.list');
  const householdSize = useHouseholdSize();
  const [target, setTarget] = useState<PlanTarget | null>(null);
  const entries = plan.data ?? [];
  const recipeList = recipes.data ?? [];
  const insights = <PlanInsights week={week} today={today} entries={entries} recipes={recipeList} />;
  return (
    <Screen title={t('Thực đơn tuần')} dock={layout === 'wide' ? insights : undefined}>
      <PageColumn maxWidth="page" className="gap-4">
        <WeekNavigator week={week} today={today} onChange={(next) => setParams({ week: next })} />
        <QueryState query={plan} skeleton={<ListSkeleton rows={6} />}>
          {(loaded) =>
            layout === 'wide' ? (
              <WeekGrid dates={weekDates(week)} entries={loaded} today={today} onAdd={setTarget} />
            ) : (
              <DayView
                dates={weekDates(week)}
                entries={loaded}
                recipes={recipeList}
                today={today}
                onAdd={setTarget}
              />
            )
          }
        </QueryState>
        {layout === 'narrow' ? <Card padding="none" className="empty:hidden">{insights}</Card> : null}
      </PageColumn>
      <RecipePickerDialog
        target={target}
        today={today}
        recipes={recipeList}
        servings={householdSize}
        onClose={() => setTarget(null)}
      />
    </Screen>
  );
}
