import { useT, usePlatform } from '@alavo-daily/common';
import {
  Button,
  Card,
  ContextSection,
  Field,
  Pill,
  TextArea,
} from '@alavo-daily/design-system';
import { useState } from 'react';

import type { Draft } from '../types';
import { useRecipeImport } from '../hooks/useRecipeImport';
import type { RecipeImport } from '../types';

type EntryMode = 'manual' | 'link';

export function ImportEntry({ onFill }: { onFill: (draft: Draft) => void }) {
  const t = useT();
  const { capabilities } = usePlatform();
  const [mode, setMode] = useState<EntryMode>('manual');
  const importer = useRecipeImport(onFill);
  return (
    <Card padding="md" className="grid gap-3">
      <h2 className="text-title font-semibold">{t('Cách nhập công thức')}</h2>
      <div role="group" aria-label={t('Cách nhập công thức')} className="flex gap-1.5">
        <Pill selected={mode === 'manual'} onClick={() => setMode('manual')}>
          {t('Tự nhập')}
        </Pill>
        {capabilities.importFromUrl ? (
          <Pill selected={mode === 'link'} leadingIcon="link" onClick={() => setMode('link')}>
            {t('Dán link')}
          </Pill>
        ) : null}
      </div>
      {capabilities.importFromUrl && mode === 'link' ? <LinkImport importer={importer} /> : null}
      <ContextSection title={t('Dán JSON-LD (nâng cao)')}>
        <JsonLdBox importer={importer} />
      </ContextSection>
      {importer.error ? (
        <p role="alert" className="text-sm text-destructive-fg">
          {importer.error}
        </p>
      ) : null}
    </Card>
  );
}

function LinkImport({ importer }: { importer: RecipeImport }) {
  const t = useT();
  const [url, setUrl] = useState('');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Field
        className="min-w-48 flex-1"
        leadingIcon="link"
        aria-label={t('Đường dẫn công thức')}
        placeholder={t('Dán link công thức (blog, Cookpad, YouTube…)')}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />
      <Button disabled={importer.busy || url.trim() === ''} onClick={() => void importer.fromUrl(url.trim())}>
        {t('Nhập công thức')}
      </Button>
    </div>
  );
}

function JsonLdBox({ importer }: { importer: RecipeImport }) {
  const t = useT();
  const [json, setJson] = useState('');
  return (
    <div className="grid gap-2">
      <TextArea
        aria-label={t('Nội dung JSON-LD')}
        placeholder={t('Dán khối JSON-LD của công thức vào đây')}
        value={json}
        onChange={(event) => setJson(event.target.value)}
      />
      <Button
        variant="outline"
        size="sm"
        className="justify-self-start"
        disabled={importer.busy || json.trim() === ''}
        onClick={() => void importer.fromJson(json)}
      >
        {t('Điền vào form')}
      </Button>
    </div>
  );
}
