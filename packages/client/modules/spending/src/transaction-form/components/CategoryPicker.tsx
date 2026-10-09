import type { Category } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { cn, Icon, StickerTile, useLayout } from '@alavo-daily/design-system';

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
  const layout = useLayout();
  const wide = layout === 'wide';
  return (
    <div className="grid gap-2">
      <div role="group" aria-label={t('Hạng mục')} className={wide ? GRID_CLASS : CHIPS_CLASS}>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={category.id === selectedId}
            className={wide ? TILE_CLASS : CHIP_CLASS}
            onClick={() => onSelect(category.id)}
          >
            <StickerTile icon={category.icon} kind="category" size={wide ? 'lg' : 'sm'} />
            <span className="max-w-full text-center leading-tight break-words">{t(category.name)}</span>
          </button>
        ))}
        <button type="button" className={wide ? TILE_CLASS : CHIP_CLASS} onClick={onCreate}>
          <span className={cn('grid place-items-center text-text-muted', wide ? 'size-12' : 'size-8')}>
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
    </div>
  );
}
