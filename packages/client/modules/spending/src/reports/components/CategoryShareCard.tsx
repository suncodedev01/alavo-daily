import type { CategoryKind, CategoryShare } from '@alavo-daily/common/engine';
import { formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Segmented } from '@alavo-daily/design-system';

import { useLookups } from '../../lookups';
import { SectionCard } from '../../overview';
import { buildDonut, type DonutSlice } from '../logic/donut';
import { shareText } from '../logic/shareText';
import { DonutChart } from './DonutChart';

export interface CategoryShareCardProps {
  categories: readonly CategoryShare[];
  kind: CategoryKind;
  onKindChange: (kind: CategoryKind) => void;
}

export function CategoryShareCard({ categories, kind, onKindChange }: CategoryShareCardProps) {
  const t = useT();
  const lookups = useLookups();
  const inputs = categories
    .filter((item) => item.kind === kind)
    .map((item) => ({
      id: item.categoryId,
      label: lookups.categoryName(item.categoryId) || t(item.name),
      totalVnd: item.totalVnd,
    }));
  const slices = buildDonut(inputs, t('Khác'));
  const kindLabel = kind === 'expense' ? t('chi tiêu') : t('thu nhập');
  const description = slices.map((slice) => `${slice.label} ${shareText(slice.share)}`).join(', ');
  return (
    <SectionCard
      title={t('Cơ cấu theo hạng mục')}
      action={
        <Segmented
          label={t('Loại giao dịch')}
          value={kind}
          onChange={(value) => onKindChange(value as CategoryKind)}
          options={[
            { value: 'expense', label: t('Chi tiêu') },
            { value: 'income', label: t('Thu nhập') },
          ]}
        />
      }
    >
      {slices.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          {t('Chưa có khoản {{kind}} nào trong khoảng này.', { kind: kindLabel })}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-6 max-lg:justify-center">
          <DonutChart
            slices={slices}
            label={t('Cơ cấu {{kind}}: {{description}}', { kind: kindLabel, description })}
          />
          <Legend slices={slices} />
        </div>
      )}
    </SectionCard>
  );
}

function Legend({ slices }: { slices: readonly DonutSlice[] }) {
  return (
    <ul className="grid min-w-48 flex-1 gap-2 text-sm">
      {slices.map((slice) => (
        <li key={slice.id} className="flex items-center gap-2">
          <i aria-hidden className={`size-2.5 shrink-0 rounded-sm ${slice.swatch}`} />
          <span className="min-w-0 flex-1 truncate">{slice.label}</span>
          <span className="whitespace-nowrap text-text-muted">{formatVnd(slice.totalVnd)}</span>
          <span className="w-12 text-right font-medium">{shareText(slice.share)}</span>
        </li>
      ))}
    </ul>
  );
}
