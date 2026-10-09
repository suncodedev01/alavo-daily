import { useT } from '@alavo-daily/common';

import type { PaletteSwatches } from '../types';

export function PalettePreview({ swatches }: { swatches: PaletteSwatches }) {
  const t = useT();
  return (
    <span
      className="flex items-center gap-2 rounded-lg p-3 text-sm font-medium inset-ring inset-ring-line-hairline"
      style={{ background: swatches.background, color: swatches.text }}
    >
      <span className="min-w-0 flex-1 truncate">{t('Aa · Chữ chính')}</span>
      <span
        className="rounded-4xl px-3 py-1.5"
        style={{ background: swatches.button, color: swatches.buttonText }}
      >
        {t('Nút')}
      </span>
      <span className="rounded-4xl px-3 py-1.5" style={{ background: swatches.accent, color: swatches.text }}>
        {t('Nhấn')}
      </span>
    </span>
  );
}
