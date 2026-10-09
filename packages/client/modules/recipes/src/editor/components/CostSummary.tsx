import { formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';

import { draftCost } from '../logic/draftCost';
import type { Draft } from '../types';

export function CostSummary({ draft }: { draft: Draft }) {
  const t = useT();
  const cost = draftCost(draft);
  if (cost.totalVnd === 0) {
    return (
      <p className="text-sm text-text-muted">
        {t('Nhập giá ước tính của từng nguyên liệu để xem tổng chi phí.')}
      </p>
    );
  }
  return (
    <div className="grid gap-1">
      <p className="text-2xl font-semibold">{formatVnd(cost.totalVnd)}</p>
      <p className="text-sm text-text-muted">
        {t('cho {{count}} người · {{each}} mỗi người', {
          count: draft.servings,
          each: formatVnd(cost.perServingVnd),
        })}
      </p>
    </div>
  );
}
