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
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {entries.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5 text-xs whitespace-nowrap text-text-secondary">
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
