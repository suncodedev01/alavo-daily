import type { BudgetLine } from '@alavo-daily/common/engine';
import { formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button, Meter, StatusChip } from '@alavo-daily/design-system';
import { useState } from 'react';

import type { Translate } from '../../engine-errors';
import { projectFoodBudget, raiseAmountFor } from '../logic/projection';
import type { FoodProjection } from '../types';

export interface BudgetImpactProps {
  line: BudgetLine;
  extraVnd: number;
  logged: boolean;
  onRaise: (byVnd: number) => void;
}

export function BudgetImpact({ line, extraVnd, logged, onRaise }: BudgetImpactProps) {
  const t = useT();
  const [kept, setKept] = useState(false);
  const projection = projectFoodBudget(line, logged ? 0 : extraVnd);
  const needsDecision = projection.overVnd > 0 && !kept;
  return (
    <div className="grid gap-3">
      <p className="text-sm text-text-secondary">{sentenceFor(projection, line, logged, t)}</p>
      <Meter value={projection.ratio} label={t('Mức dùng ngân sách Ăn uống')} />
      {needsDecision ? (
        <div className="grid gap-3">
          <StatusChip className="justify-self-start" status="needs_you" label={t('Cần bạn')} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onRaise(raiseAmountFor(projection.overVnd))}>
              {t('Tăng thêm {{amount}}', { amount: formatVnd(raiseAmountFor(projection.overVnd)) })}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setKept(true)}>
              {t('Giữ nguyên')}
            </Button>
          </div>
        </div>
      ) : null}
      {kept && projection.overVnd > 0 ? (
        <p className="text-xs text-text-muted">{t('Bạn đã chọn giữ nguyên ngân sách.')}</p>
      ) : null}
    </div>
  );
}

function sentenceFor(projection: FoodProjection, line: BudgetLine, logged: boolean, t: Translate): string {
  if (projection.overVnd > 0) return overSentence(projection, t);
  const first = logged
    ? t('Đã ghi chi phí đi chợ.')
    : t('Chi phí đi chợ ước tính {{amount}}.', { amount: formatVnd(projection.extraVnd) });
  const second = t('Ăn uống: {{spent}} / {{budget}}.', {
    spent: formatVnd(projection.projectedVnd),
    budget: formatVnd(line.budgetVnd),
  });
  return `${first} ${second}`;
}

function overSentence(projection: FoodProjection, t: Translate): string {
  const values = {
    cost: formatVnd(projection.extraVnd),
    remaining: formatVnd(projection.remainingVnd),
    over: formatVnd(projection.overVnd),
  };
  if (projection.remainingVnd <= 0) {
    return t('Ngân sách Ăn uống đã hết. Ghi thêm {{cost}} tiền đi chợ sẽ vượt {{over}}.', values);
  }
  return t(
    'Đi chợ ước tính {{cost}}, nhưng ngân sách Ăn uống chỉ còn {{remaining}}. Ghi hết vào Chi tiêu sẽ vượt {{over}}.',
    values,
  );
}
