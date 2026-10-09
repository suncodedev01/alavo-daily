export interface MonthParam {
  month: string;
  today: string;
  isCurrentMonth: boolean;
  setMonth: (month: string) => void;
}
