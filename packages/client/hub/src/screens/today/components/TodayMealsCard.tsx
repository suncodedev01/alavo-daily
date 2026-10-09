import { useT, type PlanEntry, type ShoppingList } from '@alavo-daily/common';
import { Card, Eyebrow, StickerTile } from '@alavo-daily/design-system';

import { LinkButton } from '../../../router-links';
import { RECIPES_PLAN_PATH, cookingPath } from '../logic/links';
import { missingIngredientCount } from '../logic/today';
import { mealEntries, todayMeals, type MealGroup, type MealSlot, type MealsTitle } from '../logic/todayMeals';

const TITLES: Record<MealsTitle, string> = {
  day: 'Thực đơn hôm nay',
  fromLunch: 'Từ bữa trưa',
  tonight: 'Bữa tối nay',
};

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Sáng',
  lunch: 'Trưa',
  dinner: 'Tối',
};

export interface TodayMealsCardProps {
  plan: PlanEntry[];
  hour: number;
  shopping: ShoppingList | undefined;
}

export function TodayMealsCard({ plan, hour, shopping }: TodayMealsCardProps) {
  const t = useT();
  const meals = todayMeals(plan, hour);
  if (meals.kind === 'planned') {
    return (
      <Card padding="lg" className="grid content-start gap-4">
        <Eyebrow>{t(TITLES[meals.title])}</Eyebrow>
        {meals.groups.map((group) => (
          <MealGroupRow key={group.slot} group={group} showLabel={meals.showSlotLabels} />
        ))}
        <CookingStart groups={meals.groups} shopping={shopping} />
      </Card>
    );
  }
  return (
    <Card padding="lg" className="grid content-start gap-4">
      <Eyebrow>{t(TITLES.day)}</Eyebrow>
      {meals.kind === 'done' ? <MealsDone mealCount={meals.mealCount} /> : <NothingPlanned />}
    </Card>
  );
}

function MealGroupRow({ group, showLabel }: { group: MealGroup; showLabel: boolean }) {
  const t = useT();
  return (
    <div className="grid gap-2">
      {showLabel ? <Eyebrow>{t(SLOT_LABELS[group.slot])}</Eyebrow> : null}
      {group.entries.map((entry) => (
        <DishRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

function DishRow({ entry }: { entry: PlanEntry }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3">
      <StickerTile icon={entry.recipeIcon} kind="recipe" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.recipeName}</p>
        <p className="text-xs text-text-muted">{t('{{count}} người', { count: entry.servings })}</p>
      </div>
    </div>
  );
}

function CookingStart({ groups, shopping }: { groups: MealGroup[]; shopping: ShoppingList | undefined }) {
  const t = useT();
  const entries = mealEntries(groups);
  const first = entries[0];
  if (!first) return null;
  const missing = shopping ? missingIngredientCount(shopping, entries.map((entry) => entry.recipeName)) : 0;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <LinkButton to={cookingPath(first.recipeId)} leadingIcon="play" size="lg">
        {t('Bắt đầu nấu')}
      </LinkButton>
      <span className="text-sm text-text-muted">
        {missing > 0 ? t('Còn {{count}} nguyên liệu chưa mua', { count: missing }) : t('Đã đủ nguyên liệu')}
      </span>
    </div>
  );
}

function MealsDone({ mealCount }: { mealCount: number }) {
  const t = useT();
  return <p className="text-sm text-text-muted">{t('Hôm nay bạn đã có {{count}} bữa', { count: mealCount })}</p>;
}

function NothingPlanned() {
  const t = useT();
  return (
    <>
      <p className="text-sm text-text-muted">{t('Hôm nay chưa có món nào')}</p>
      <LinkButton to={RECIPES_PLAN_PATH} variant="outline" className="justify-self-start">
        {t('Lên thực đơn')}
      </LinkButton>
    </>
  );
}
