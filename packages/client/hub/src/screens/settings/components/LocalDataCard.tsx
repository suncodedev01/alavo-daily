import { useRef, type ChangeEvent } from 'react';

import { useEngine, useEngineMutation, usePlatform, useT } from '@alavo-daily/common';
import { Button, Card, ConfirmDialog, useToast } from '@alavo-daily/design-system';

import { todayText } from '../../../clock';
import { useImportData, type ImportFlow } from '../hooks/useImportData';

export function LocalDataCard() {
  const t = useT();
  const engine = useEngine();
  const platform = usePlatform();
  const { toast } = useToast();
  const loadDemo = useEngineMutation('hub.load_demo_data');
  const importing = useImportData();
  const exportData = async () => {
    const data = await engine.call('hub.export_data');
    await platform.saveTextFile(`alavo-daily-${todayText()}.json`, JSON.stringify(data, null, 2));
    toast(t('Đã xuất dữ liệu'));
  };
  const exportAndReport = () => exportData().catch(() => toast(t('Không xuất được dữ liệu')));
  return (
    <Card padding="lg" className="grid gap-4">
      <div>
        <h2 className="text-title font-semibold">{t('Dữ liệu trên máy này')}</h2>
        <p className="mt-1 text-sm text-text-muted">
          {t('Xuất ra một tệp để tự lưu giữ, nhập lại từ tệp đã xuất, hoặc nạp dữ liệu mẫu để thử ứng dụng.')}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" leadingIcon="export" onClick={exportAndReport}>
          {t('Xuất dữ liệu')}
        </Button>
        <ImportButton flow={importing} />
        <Button
          variant="outline"
          leadingIcon="download-simple"
          disabled={loadDemo.isPending}
          onClick={() => loadDemo.mutate(undefined, { onSuccess: () => toast(t('Đã nạp dữ liệu mẫu')) })}
        >
          {t('Nạp dữ liệu mẫu')}
        </Button>
      </div>
      <ImportConfirm flow={importing} />
    </Card>
  );
}

function ImportButton({ flow }: { flow: ImportFlow }) {
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) flow.choose(file);
  };
  return (
    <>
      <Button variant="outline" leadingIcon="upload-simple" onClick={() => fileInput.current?.click()}>
        {t('Nhập dữ liệu')}
      </Button>
      <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
    </>
  );
}

function ImportConfirm({ flow }: { flow: ImportFlow }) {
  const t = useT();
  const { preview } = flow;
  return (
    <ConfirmDialog
      open={preview !== null}
      onOpenChange={(open) => !open && flow.cancel()}
      title={t('Nhập dữ liệu từ tệp này?')}
      description={t(
        'Tệp có {{rows}} dòng dữ liệu thuộc {{tables}} mục. Dữ liệu đã có trên máy này được gộp với tệp, không bị xoá. Nhập lại cùng một tệp không làm gì thêm.',
        { rows: preview?.rows ?? 0, tables: preview?.tables ?? 0 },
      )}
      confirmLabel={t('Nhập dữ liệu')}
      cancelLabel={t('Huỷ')}
      onConfirm={flow.confirm}
    />
  );
}
