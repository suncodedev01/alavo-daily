import { useExportCsv } from '../reports/hooks/useExportCsv';
import { useToday } from '../today/hooks/useToday';

const FIRST_DAY = '2000-01-01';

/** The "Xuất ra bảng tính" row of "Khác": every transaction up to today. */
export function useExportEverything(): () => void {
  const today = useToday();
  const { exportRange } = useExportCsv();
  return () => exportRange({ from: FIRST_DAY, to: today });
}
