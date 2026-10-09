import type { Ingredient } from '@alavo-daily/common/engine';
import { formatAmount, scaleQuantity } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Checkbox, Eyebrow } from '@alavo-daily/design-system';

export interface IngredientChecklistProps {
  ingredients: readonly Ingredient[];
  baseServings: number;
  servings: number;
  checked: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

export function IngredientChecklist({
  ingredients,
  baseServings,
  servings,
  checked,
  onToggle,
}: IngredientChecklistProps) {
  const t = useT();
  return (
    <div>
      <Eyebrow as="h2">{t('Nguyên liệu · {{count}} người', { count: servings })}</Eyebrow>
      <ul aria-label={t('Nguyên liệu')}>
        {ingredients.map((item) => (
          <li key={item.id}>
            <Checkbox checked={checked.has(item.id)} onCheckedChange={() => onToggle(item.id)}>
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1">{item.name}</span>
                <span className="shrink-0 text-sm">
                  {formatAmount(scaleQuantity(item.quantity, baseServings, servings), item.unit)}
                </span>
              </span>
            </Checkbox>
          </li>
        ))}
      </ul>
    </div>
  );
}
