import { useT } from '@alavo-daily/common';
import { useState } from 'react';

import { readPhoto } from '../logic/browserImage';
import { PhotoTooLarge } from '../logic/photoSize';
import type { PhotoPicker } from '../types';

export function usePhotoPicker(onPicked: (photo: string) => void): PhotoPicker {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (file: File) => {
    setBusy(true);
    setError(null);
    readPhoto(file)
      .then(onPicked)
      .catch((failure: unknown) => setError(t(explain(failure))))
      .finally(() => setBusy(false));
  };
  return { busy, error, choose };
}

function explain(failure: unknown): string {
  if (failure instanceof PhotoTooLarge) return 'Ảnh này quá lớn. Bạn chọn ảnh nhỏ hơn nhé.';
  return 'Không đọc được ảnh này. Bạn thử ảnh khác nhé.';
}
