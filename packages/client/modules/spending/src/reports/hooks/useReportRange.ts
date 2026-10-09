import { useState } from 'react';

import { presetRange, withFrom, withTo } from '../logic/ranges';
import type { DateRange, RangePreset, ReportRangeState } from '../types';

export function useReportRange(today: string): ReportRangeState {
  const [preset, setPreset] = useState<RangePreset>('month');
  const [custom, setCustom] = useState<DateRange>(() => presetRange('month', today));
  const range = preset === 'custom' ? custom : presetRange(preset, today);

  const choosePreset = (next: RangePreset) => {
    if (next === 'custom') setCustom(range);
    setPreset(next);
  };

  return {
    preset,
    range,
    choosePreset,
    setFrom: (from) => setCustom((current) => withFrom(current, from)),
    setTo: (to) => setCustom((current) => withTo(current, to)),
  };
}
