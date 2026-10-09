import { useId, type KeyboardEvent, type Ref } from 'react';

import { useT } from '@alavo-daily/common';
import { Icon } from '@alavo-daily/design-system';

import type { Palette, Relation } from '../types';
import { PalettePreview } from './PalettePreview';
import { PaletteSwatchRow } from './PaletteSwatchRow';
import { RelationBadge } from './RelationBadge';

const CARD_CLASS = [
  'focus-ring grid gap-2.5 rounded-xl bg-surface p-4 text-left shadow-card',
  'hover:bg-surface-raised aria-checked:ring-2 aria-checked:ring-accent-fg',
].join(' ');

export interface PaletteCardProps {
  palette: Palette;
  selected: boolean;
  relation: Relation | null;
  focusable: boolean;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
  buttonRef: Ref<HTMLButtonElement>;
}

export function PaletteCard({ palette, selected, relation, focusable, ...handlers }: PaletteCardProps) {
  const t = useT();
  const nameId = useId();
  const tagId = useId();
  return (
    <button
      ref={handlers.buttonRef}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-labelledby={nameId}
      aria-describedby={tagId}
      tabIndex={focusable ? 0 : -1}
      className={CARD_CLASS}
      onClick={handlers.onSelect}
      onKeyDown={handlers.onKeyDown}
    >
      <span className="flex flex-wrap items-center gap-2">
        <span id={nameId} className="min-w-0 flex-1 text-base font-semibold">
          {t(palette.name)}
        </span>
        {relation ? <RelationBadge relation={relation} /> : null}
        {selected ? <InUseMark /> : null}
      </span>
      <span id={tagId} className="text-sm text-text-secondary">
        {t(palette.tag)}
      </span>
      <PalettePreview swatches={palette.swatches} />
      <PaletteSwatchRow swatches={palette.swatches} />
      <span className="text-row text-text-secondary">{t(palette.fit)}</span>
    </button>
  );
}

function InUseMark() {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-fg">
      <Icon name="check" size="sm" />
      {t('Đang dùng')}
    </span>
  );
}
