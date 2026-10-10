import type { EstimateView, SavingOption } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, Card, Eyebrow } from '@alavo-daily/design-system';

import { formatBalance } from '../../money';

export interface EstimateTipsProps {
  view: EstimateView;
  onSaveForShortfall: () => void;
}

/** When the money is short: what dropping the less important items would do. */
export function EstimateTips({ view, onSaveForShortfall }: EstimateTipsProps) {
  const t = useT();
  if (view.totals.result >= 0) return null;
  return (
    <Card padding="md" className="grid gap-3">
      <Eyebrow>{t('Cách để đủ tiền')}</Eyebrow>
      <ul className="grid gap-2">
        {view.savingOptions.map((option) => (
          <li key={option.dropped.join('-')}>
            <OptionLine option={option} />
          </li>
        ))}
      </ul>
      <Button variant="affirm" leadingIcon="target" onClick={onSaveForShortfall}>
        {t('Đặt mục tiêu tiết kiệm cho phần thiếu')}
      </Button>
    </Card>
  );
}

function OptionLine({ option }: { option: SavingOption }) {
  const t = useT();
  const enough = option.result >= 0;
  const label = option.dropped.includes('should') ? t('Bỏ thêm các khoản "Nên có"') : t('Bỏ các khoản "Có thì tốt"');
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="grid min-w-0">
        <span>{label}</span>
        <small className="text-text-muted">{t('Tiết kiệm {{amount}}', { amount: formatBalance(option.saving) })}</small>
      </span>
      <b className={enough ? 'text-income-fg' : undefined}>
        {`${enough ? t('Dư') : t('Thiếu')} ${formatBalance(Math.abs(option.result))}`}
      </b>
    </div>
  );
}
