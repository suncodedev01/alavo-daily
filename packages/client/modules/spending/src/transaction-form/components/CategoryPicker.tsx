import { useState } from 'react';

import type { Category } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { cn, Icon, StickerTile, useLayout } from '@alavo-daily/design-system';

import { VISIBLE_CATEGORY_COUNT, visibleCategories } from '../../categories/logic/categoryBrowse';
import { CategoryBrowserDialog } from './CategoryBrowserDialog';

export interface CategoryPickerProps {
  categories: readonly Category[];
  selectedId: string;
  onSelect: (categoryId: string) => void;
  onCreate: () => void;
  error?: string;
}

const GRID_CLASS = 'grid grid-cols-4 gap-2';
const CHIPS_CLASS = 'scrollbar-none -mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1';

const TILE_CLASS =
  'focus-ring grid min-w-0 justify-items-center gap-1 rounded-lg p-2 text-xs text-text-secondary hover:bg-surface-tint aria-pressed:bg-accent aria-pressed:text-accent-fg';

const CHIP_CLASS =
  'focus-ring inline-flex h-11 shrink-0 items-center gap-2 rounded-4xl bg-surface pr-4 pl-3 text-sm font-medium text-text-secondary inset-ring inset-ring-line-hairline aria-pressed:bg-accent aria-pressed:text-accent-fg aria-pressed:inset-ring-0';

export function CategoryPicker({ categories, selectedId, onSelect, onCreate, error }: CategoryPickerProps) {
  const t = useT();
  const wide = useLayout() === 'wide';
  const [browsing, setBrowsing] = useState(false);
  const buttonClass = wide ? TILE_CLASS : CHIP_CLASS;
  const iconBoxClass = cn('grid place-items-center text-text-muted', wide ? 'size-12' : 'size-8');
  return (
    <div className="grid gap-2">
      <div role="group" aria-label={t('Hạng mục')} className={wide ? GRID_CLASS : CHIPS_CLASS}>
        {visibleCategories(categories, selectedId).map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={category.id === selectedId}
            className={buttonClass}
            onClick={() => onSelect(category.id)}
          >
            <StickerTile icon={category.icon} kind="category" size={wide ? 'lg' : 'sm'} />
            <span className="max-w-full text-center leading-tight break-words">{t(category.name)}</span>
          </button>
        ))}
        {categories.length > VISIBLE_CATEGORY_COUNT ? (
          <button type="button" className={buttonClass} onClick={() => setBrowsing(true)}>
            <span className={iconBoxClass}>
              <Icon name="magnifying-glass" size="lg" />
            </span>
            <span className="max-w-full text-center leading-tight break-words text-text-muted">{t('Xem tất cả')}</span>
          </button>
        ) : null}
        <button type="button" className={buttonClass} onClick={onCreate}>
          <span className={iconBoxClass}>
            <Icon name="plus" size="lg" />
          </span>
          <span className="max-w-full text-center leading-tight break-words text-text-muted">{t('Hạng mục mới')}</span>
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive-fg">
          {t(error)}
        </p>
      ) : null}
      <CategoryBrowserDialog
        open={browsing}
        categories={categories}
        selectedId={selectedId}
        onSelect={onSelect}
        onOpenChange={setBrowsing}
      />
    </div>
  );
}
