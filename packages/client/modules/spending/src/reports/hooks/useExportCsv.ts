import { useEngineMutation } from '@alavo-daily/common/engine';
import { useT, usePlatform } from '@alavo-daily/common';
import { useToast } from '@alavo-daily/design-system';

import { describeEngineError } from '../../engine-errors';
import { csvFilename, withByteOrderMark } from '../logic/csvFile';
import type { DateRange } from '../types';

export interface CsvExporter {
  exportRange: (range: DateRange) => void;
  pending: boolean;
}

export function useExportCsv(): CsvExporter {
  const t = useT();
  const platform = usePlatform();
  const { toast } = useToast();
  const exportCsv = useEngineMutation('spending.export_csv');

  const save = async (range: DateRange, csv: string, rowCount: number) => {
    if (rowCount === 0) return toast(t('Không có giao dịch nào trong khoảng này để xuất.'));
    await platform.saveTextFile(csvFilename(range), withByteOrderMark(csv));
    toast(t('Đã xuất {{count}} giao dịch ra file bảng tính', { count: rowCount }));
  };

  const exportRange = (range: DateRange) =>
    exportCsv.mutate(range, {
      onSuccess: (result) =>
        save(range, result.csv, result.rowCount).catch(() =>
          toast(t('Không lưu được file. Bạn thử lại nhé.')),
        ),
      onError: (error) => toast(describeEngineError(error, t)),
    });

  return { exportRange, pending: exportCsv.isPending };
}
