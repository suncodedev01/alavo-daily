import { useT } from '@alavo-daily/common';
import { Button, Card, Field, IconButton, OptionPicker } from '@alavo-daily/design-system';

import { AISLE_LABELS, AISLES, COMMON_UNITS } from '../../vocabulary';
import type { IngredientDraft } from '../types';
import type { SectionProps } from './GeneralSection';

export function IngredientSection({ draft, dispatch }: SectionProps) {
  const t = useT();
  return (
    <Card padding="md">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-title font-semibold">
          {t('Nguyên liệu')} <span className="text-sm font-normal text-text-muted">{draft.ingredients.length}</span>
        </h2>
        <span className="text-xs text-text-muted">{t('cho {{count}} người', { count: draft.servings })}</span>
      </div>
      <ul className="grid gap-3">
        {draft.ingredients.map((item) => (
          <li key={item.key}>
            <IngredientRow
              item={item}
              onChange={(changes) => dispatch({ type: 'edit_ingredient', key: item.key, changes })}
              onRemove={() => dispatch({ type: 'remove_ingredient', key: item.key })}
            />
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        size="sm"
        leadingIcon="plus"
        className="mt-3"
        onClick={() => dispatch({ type: 'add_ingredient' })}
      >
        {t('Thêm nguyên liệu')}
      </Button>
      <p className="mt-3 text-xs text-text-muted">
        {t('Nhập số lượng và đơn vị riêng để ứng dụng tự đổi khẩu phần và cộng gộp nguyên liệu trùng khi đi chợ.')}
      </p>
    </Card>
  );
}

interface IngredientRowProps {
  item: IngredientDraft;
  onChange: (changes: Partial<Omit<IngredientDraft, 'key'>>) => void;
  onRemove: () => void;
}

function IngredientRow({ item, onChange, onRemove }: IngredientRowProps) {
  const t = useT();
  const unitOptions = (COMMON_UNITS.includes(item.unit) ? COMMON_UNITS : [...COMMON_UNITS, item.unit]).map(
    (unit) => ({ value: unit, label: unit }),
  );
  const aisleOptions = AISLES.map((aisle) => ({ value: aisle, label: t(AISLE_LABELS[aisle]) }));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Field
        className="w-20"
        inputMode="decimal"
        aria-label={t('Số lượng')}
        placeholder={t('SL')}
        value={item.quantity}
        onChange={(event) => onChange({ quantity: event.target.value })}
      />
      <div className="w-32">
        <OptionPicker
          label={t('Đơn vị')}
          value={item.unit}
          options={unitOptions}
          onChange={(unit) => onChange({ unit })}
        />
      </div>
      <Field
        className="min-w-40 flex-1"
        aria-label={t('Tên nguyên liệu')}
        placeholder={t('Tên nguyên liệu')}
        value={item.name}
        onChange={(event) => onChange({ name: event.target.value })}
      />
      <div className="w-36">
        <OptionPicker
          label={t('Mua ở khu nào')}
          value={item.aisle}
          options={aisleOptions}
          onChange={(aisle) => onChange({ aisle: aisle as IngredientDraft['aisle'] })}
        />
      </div>
      <IconButton icon="trash" label={t('Xoá nguyên liệu')} size="sm" onClick={onRemove} />
    </div>
  );
}
