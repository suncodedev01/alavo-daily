import { useT } from '@alavo-daily/common';
import { Button, Card, TextArea } from '@alavo-daily/design-system';
import { useRef, useState, type ChangeEvent } from 'react';

import type { StatementDraft } from '../hooks/useStatementDraft';
import { decodeStatement } from '../logic/decodeStatement';
import { readFileBytes } from '../logic/readFileBytes';

export function StatementInput({ draft }: { draft: StatementDraft }) {
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileFailed, setFileFailed] = useState(false);

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      draft.setText(decodeStatement(await readFileBytes(file)));
      setFileName(file.name);
      setFileFailed(false);
    } catch {
      setFileFailed(true);
    }
  };

  return (
    <Card className="mx-auto grid w-full max-w-160 gap-4">
      <div className="grid gap-1">
        <h2 className="text-title font-semibold">{t('Chọn sao kê ngân hàng')}</h2>
        <p className="text-sm text-text-secondary">
          {t('Dùng file CSV tải từ ứng dụng ngân hàng, hoặc dán nội dung vào ô bên dưới.')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" leadingIcon="upload-simple" onClick={() => fileInput.current?.click()}>
          {t('Chọn file CSV')}
        </Button>
        {fileName ? <span className="min-w-0 truncate text-sm text-text-muted">{fileName}</span> : null}
        <input
          ref={fileInput}
          type="file"
          hidden
          accept=".csv,.txt,text/csv,text/plain"
          aria-label={t('File sao kê')}
          onChange={(event) => void chooseFile(event)}
        />
      </div>
      <TextArea
        aria-label={t('Nội dung sao kê')}
        placeholder={t('Hoặc dán nội dung sao kê vào đây')}
        value={draft.text}
        onChange={(event) => draft.setText(event.target.value)}
      />
      {fileFailed || draft.error ? (
        <p role="alert" className="text-sm text-destructive-fg">
          {fileFailed ? t('Không đọc được file này. Bạn thử chọn file khác nhé.') : draft.error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button disabled={draft.text.trim() === '' || draft.reading} onClick={draft.readStatement}>
          {t('Đọc sao kê')}
        </Button>
      </div>
    </Card>
  );
}
