import { useT } from '@alavo-daily/common';
import { Button, IconButton } from '@alavo-daily/design-system';
import { useRef, type ChangeEvent } from 'react';

import { usePhotoPicker } from '../hooks/usePhotoPicker';

export interface PhotoFieldProps {
  photo: string | null;
  onChange: (photo: string | null) => void;
}

export function PhotoField({ photo, onChange }: PhotoFieldProps) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const picker = usePhotoPicker(onChange);
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) picker.choose(file);
  };
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3">
        {photo ? <PhotoPreview photo={photo} /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t('Ảnh món ăn')}</p>
          <p className="text-xs text-text-muted">{t('Ảnh được thu nhỏ và lưu ngay trên máy của bạn.')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leadingIcon="camera"
          disabled={picker.busy}
          onClick={() => input.current?.click()}
        >
          {photo ? t('Đổi ảnh') : t('Thêm ảnh')}
        </Button>
        {photo ? <IconButton icon="trash" label={t('Xoá ảnh')} size="sm" onClick={() => onChange(null)} /> : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        tabIndex={-1}
        aria-label={t('Chọn tệp ảnh')}
        onChange={onFile}
      />
      {picker.error ? (
        <p role="alert" className="text-sm text-destructive-fg">
          {picker.error}
        </p>
      ) : null}
    </div>
  );
}

function PhotoPreview({ photo }: { photo: string }) {
  const t = useT();
  return <img src={photo} alt={t('Ảnh xem trước')} className="size-16 shrink-0 rounded-lg object-cover" />;
}
