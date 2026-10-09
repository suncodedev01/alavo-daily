import { useEngineQuery } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { NavItem, SidebarGroup } from '@alavo-daily/design-system';
import { Link } from 'react-router';

import { useToday } from '../../today';
import { SLOT_LABELS } from '../../vocabulary';

export function TodayMealsGroup() {
  const t = useT();
  const today = useToday();
  const plan = useEngineQuery('recipes.get_plan', { from: today, days: 1 });
  if (!plan.data) return null;
  return (
    <SidebarGroup label={t('Hôm nay ăn gì')}>
      {plan.data.length === 0 ? (
        <p className="px-3 py-1 text-sm text-text-muted max-compact:hidden">{t('Chưa lên món cho hôm nay.')}</p>
      ) : (
        plan.data.map((entry) => (
          <NavItem
            key={entry.id}
            icon={entry.recipeIcon}
            label={entry.recipeName}
            count={t(SLOT_LABELS[entry.slot])}
            render={<Link to={`/recipes/list/${entry.recipeId}`} />}
          />
        ))
      )}
    </SidebarGroup>
  );
}
