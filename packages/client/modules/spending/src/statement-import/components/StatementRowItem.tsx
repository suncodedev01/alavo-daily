import type { Category } from '@alavo-daily/common/engine';
import { parseDateText } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Checkbox, OptionPicker } from '@alavo-daily/design-system';

import type { Lookups } from '../../lookups';
import { MoneyAmount } from '../../money';
import { isImportable, kindOfAmount } from '../logic/draftRows';
import { problemText } from '../logic/problemText';
import type { DraftRow } from '../types';

export interface StatementRowItemProps {
  row: DraftRow;
  lookups: Lookups;
  onChange: (line: number, changes: Partial<DraftRow>) => void;
}

export function StatementRowItem({ row, lookups, onChange }: StatementRowItemProps) {
  const t = useT();
  const importable = isImportable(row);
  const options = categoryOptions(row, lookups);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-3 py-2 hover:bg-surface-tint">
      <Checkbox
        checked={row.include}
        disabled={!importable}
        label={t('Nhập dòng {{line}}', { line: row.line })}
        onCheckedChange={(include) => onChange(row.line, { include })}
      />
      <div className="min-w-0 flex-1 basis-40">
        <p className="truncate text-sm font-medium">{row.title}</p>
        <p className="text-xs text-text-muted">{row.occurredOn ? dateText(row.occurredOn) : '—'}</p>
        {row.problems.map((problem) => (
          <p key={problem} className="text-xs text-destructive-fg">
            {t(problemText(problem))}
          </p>
        ))}
      </div>
      <div className="order-2 w-full lg:order-1 lg:w-56">
        {options.length > 0 && row.amountVnd !== null ? (
          <OptionPicker
            label={t('Hạng mục dòng {{line}}', { line: row.line })}
            value={row.categoryId}
            options={options}
            placeholder={t('Chọn hạng mục')}
            onChange={(categoryId) => onChange(row.line, { categoryId })}
          />
        ) : null}
      </div>
      <div className="order-1 text-sm font-medium lg:order-2 lg:w-28 lg:text-right">
        {row.amountVnd === null ? '—' : <MoneyAmount amountVnd={row.amountVnd} />}
      </div>
    </li>
  );
}

function categoryOptions(row: DraftRow, lookups: Lookups) {
  if (row.amountVnd === null || row.amountVnd === 0) return [];
  const kind = kindOfAmount(row.amountVnd);
  return lookups.categories
    .filter((category: Category) => category.kind === kind)
    .map((category) => ({ value: category.id, label: lookups.categoryName(category.id), icon: category.icon }));
}

function dateText(date: string): string {
  const parsed = parseDateText(date);
  return `${parsed.getDate()}/${parsed.getMonth() + 1}/${parsed.getFullYear()}`;
}
