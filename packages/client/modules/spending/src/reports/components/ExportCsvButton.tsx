import { useT } from '@alavo-daily/common';
import { Button } from '@alavo-daily/design-system';

import { useExportCsv } from '../hooks/useExportCsv';
import type { DateRange } from '../types';

export function ExportCsvButton({ range }: { range: DateRange }) {
  const t = useT();
  const { exportRange, pending } = useExportCsv();
  return (
    <Button variant="outline" leadingIcon="download-simple" disabled={pending} onClick={() => exportRange(range)}>
      {t('Xuất file CSV')}
    </Button>
  );
}
