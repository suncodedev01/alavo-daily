import { useRef, type KeyboardEvent } from 'react';

import { useT } from '@alavo-daily/common';

import { relationOfPalette } from '../logic/menh';
import { PALETTES } from '../logic/palettes';
import type { MenhId, PaletteId } from '../types';
import { PaletteCard } from './PaletteCard';

export interface PaletteGridProps {
  selectedId: PaletteId;
  menh: MenhId | null;
  onSelect: (id: PaletteId) => void;
}

function targetIndex(key: string, current: number): number | null {
  const last = PALETTES.length - 1;
  if (key === 'ArrowRight' || key === 'ArrowDown') return current === last ? 0 : current + 1;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return current === 0 ? last : current - 1;
  if (key === 'Home') return 0;
  return key === 'End' ? last : null;
}

export function PaletteGrid({ selectedId, menh, onSelect }: PaletteGridProps) {
  const t = useT();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const moveFocus = (event: KeyboardEvent, from: number) => {
    const target = targetIndex(event.key, from);
    if (target === null) return;
    event.preventDefault();
    onSelect(PALETTES[target]!.id);
    buttons.current[target]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={t('Bộ màu')} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {PALETTES.map((palette, index) => (
        <PaletteCard
          key={palette.id}
          palette={palette}
          selected={palette.id === selectedId}
          relation={menh ? relationOfPalette(palette.id, menh) : null}
          focusable={palette.id === selectedId}
          onSelect={() => onSelect(palette.id)}
          onKeyDown={(event) => moveFocus(event, index)}
          buttonRef={(node) => {
            buttons.current[index] = node;
          }}
        />
      ))}
    </div>
  );
}
