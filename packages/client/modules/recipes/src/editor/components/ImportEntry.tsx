import { useT, usePlatform } from '@alavo-daily/common';
import { Button, Card, Field } from '@alavo-daily/design-system';
import { useState } from 'react';

import { useRecipeImport } from '../hooks/useRecipeImport';
import type { Draft } from '../types';

export function ImportEntry({ onFill }: { onFill: (draft: Draft) => void }) {
  const { capabilities } = usePlatform();
  return capabilities.importFromUrl ? <LinkImport onFill={onFill} /> : null;
}

function LinkImport({ onFill }: { onFill: (draft: Draft) => void }) {
  const t = useT();
  const importer = useRecipeImport(onFill);
  const [url, setUrl] = useState('');
  return (
    <Card padding="md" className="grid gap-3">
      <h2 className="text-title font-semibold">{t('Nhập từ trang web')}</h2>
      <div className="flex flex-wrap items-center gap-2">
        <Field
          className="min-w-48 flex-1"
          leadingIcon="link"
          aria-label={t('Đường dẫn công thức')}
          placeholder={t('Dán link công thức (blog, Cookpad, YouTube…)')}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <Button className="max-lg:w-full" disabled={importer.busy || url.trim() === ''} onClick={() => void importer.fromUrl(url.trim())}>
          {t('Nhập công thức')}
        </Button>
      </div>
      {importer.error ? (
        <p role="alert" className="text-sm text-destructive-fg">
          {importer.error}
        </p>
      ) : null}
    </Card>
  );
}
