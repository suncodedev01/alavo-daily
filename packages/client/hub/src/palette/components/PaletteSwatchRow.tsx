import { useT } from '@alavo-daily/common';

import type { PaletteSwatches } from '../types';

export function PaletteSwatchRow({ swatches }: { swatches: PaletteSwatches }) {
  const t = useT();
  const entries = [
    [t('Nền'), swatches.background],
    [t('Nút'), swatches.button],
    [t('Nhấn'), swatches.accent],
    [t('Chữ'), swatches.text],
  ] as const;
  return (
    <span className="grid grid-cols-4 gap-2">
      {entries.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span
            className="size-4 shrink-0 rounded-full inset-ring inset-ring-line-strong"
            style={{ background: color }}
          />
          {label}
        </span>
      ))}
    </span>
  );
}
