import { useT } from '@alavo-daily/common';
import { Segmented } from '@alavo-daily/design-system';

import { DatePicker } from '../../datepicker';
import type { RangePreset, ReportRangeState } from '../types';

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'month', label: 'Tháng này' },
  { value: 'quarter', label: '3 tháng' },
  { value: 'year', label: 'Năm nay' },
  { value: 'custom', label: 'Tuỳ chọn' },
];

export function RangeBar({ state, today }: { state: ReportRangeState; today: string }) {
  const t = useT();
  const options = PRESETS.map((preset) => ({ value: preset.value, label: t(preset.label) }));
  return (
    <div className="grid min-w-0 gap-3">
      <Segmented
        label={t('Khoảng thời gian')}
        options={options}
        value={state.preset}
        onChange={(value) => state.choosePreset(value as RangePreset)}
        className="max-w-full"
      />
      {state.preset === 'custom' ? (
        <div className="grid max-w-md grid-cols-2 gap-2">
          <DatePicker label={t('Từ ngày')} value={state.range.from} today={today} onChange={state.setFrom} />
          <DatePicker label={t('Đến ngày')} value={state.range.to} today={today} onChange={state.setTo} />
        </div>
      ) : null}
    </div>
  );
}
