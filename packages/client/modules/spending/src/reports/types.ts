export type RangePreset = 'month' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  from: string;
  to: string;
}

export interface ReportRangeState {
  preset: RangePreset;
  range: DateRange;
  choosePreset: (preset: RangePreset) => void;
  setFrom: (from: string) => void;
  setTo: (to: string) => void;
}
