import { useState } from 'react';

import { useEngine, useT, type ImportPreview } from '@alavo-daily/common';
import { useToast } from '@alavo-daily/design-system';

interface ChosenFile {
  json: string;
  preview: ImportPreview;
}

export interface ImportFlow {
  /** What the chosen file holds, while the person is asked to confirm. */
  preview: ImportPreview | null;
  busy: boolean;
  choose(file: File): void;
  confirm(): void;
  cancel(): void;
}

/** Choose a file, see what is in it, confirm, then merge it in. Nothing changes before confirm. */
export function useImportData(): ImportFlow {
  const t = useT();
  const engine = useEngine();
  const { toast } = useToast();
  const [chosen, setChosen] = useState<ChosenFile | null>(null);
  const [busy, setBusy] = useState(false);

  const choose = (file: File) => {
    readFileText(file)
      .then(async (json) => setChosen({ json, preview: await engine.call('hub.inspect_import', { json }) }))
      .catch(() => toast(t('Tệp này không phải dữ liệu xuất từ Alavo Daily')));
  };

  const confirm = () => {
    if (!chosen || busy) return;
    setBusy(true);
    engine
      .call('hub.import_data', { json: chosen.json })
      .then((summary) =>
        toast(
          summary.applied > 0
            ? t('Đã nhập {{count}} dòng dữ liệu', { count: summary.applied })
            : t('Không có dữ liệu mới để nhập'),
        ),
      )
      .catch(() => toast(t('Không nhập được dữ liệu')))
      .finally(() => {
        setBusy(false);
        setChosen(null);
      });
  };

  return { preview: chosen?.preview ?? null, busy, choose, confirm, cancel: () => setChosen(null) };
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('unreadable file'));
    reader.readAsText(file);
  });
}
