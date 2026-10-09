import type { Bill, BudgetLine } from '@alavo-daily/common/engine';

export interface ChartBar {
  day: number;
  valueVnd: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isToday: boolean;
  showLabel: boolean;
}

export interface ChartGridLine {
  y: number;
  valueVnd: number;
}

export interface ChartModel {
  bars: ChartBar[];
  grid: ChartGridLine[];
  averageVnd: number;
  averageY: number;
  baselineY: number;
  ceilingVnd: number;
}

export interface Decision {
  line: BudgetLine;
  daysLeft: number;
  raiseVnd: number;
  pending: boolean;
  error: string | null;
  raise: () => void;
  keep: () => void;
}

export interface UpcomingBill {
  bill: Bill;
  dueOn: string;
}

export interface MonthScope {
  month: string;
  today: string;
  isCurrentMonth: boolean;
}
