import { addDays, startOfWeek } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button, IconButton } from '@alavo-daily/design-system';

import { PLAN_DAYS } from '../../vocabulary';
import { weekRangeText } from '../../week';

export interface WeekNavigatorProps {
  week: string;
  today: string;
  onChange: (week: string) => void;
}

export function WeekNavigator({ week, today, onChange }: WeekNavigatorProps) {
  const t = useT();
  const isThisWeek = week === startOfWeek(today);
  return (
    <div className="flex items-center gap-2">
      <IconButton
        icon="caret-left"
        label={t('Tuần trước')}
        onClick={() => onChange(addDays(week, -PLAN_DAYS))}
      />
      <h2 className="text-title font-semibold">{t('Tuần {{range}}', { range: weekRangeText(week) })}</h2>
      <IconButton icon="caret-right" label={t('Tuần sau')} onClick={() => onChange(addDays(week, PLAN_DAYS))} />
      {isThisWeek ? null : (
        <Button variant="ghost" size="sm" onClick={() => onChange(startOfWeek(today))}>
          {t('Về tuần này')}
        </Button>
      )}
    </div>
  );
}
