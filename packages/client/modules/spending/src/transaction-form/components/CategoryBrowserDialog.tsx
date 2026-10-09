import { useState } from 'react';

import type { Category } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Icon, ResponsiveDialog, SearchField, StickerTile } from '@alavo-daily/design-system';

import { filterCategories } from '../../categories/logic/categoryBrowse';

export interface CategoryBrowserDialogProps {
  open: boolean;
  categories: readonly Category[];
  selectedId: string;
  onSelect: (categoryId: string) => void;
  onOpenChange: (open: boolean) => void;
}

const ROW_CLASS =
  'focus-ring flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left text-row hover:bg-surface-tint aria-pressed:bg-accent aria-pressed:text-accent-fg';

export function CategoryBrowserDialog({
  open,
  categories,
  selectedId,
  onSelect,
  onOpenChange,
}: CategoryBrowserDialogProps) {
  const t = useT();
  const [query, setQuery] = useState('');
  const matches = filterCategories(categories, query, t);
  const choose = (categoryId: string) => {
    onSelect(categoryId);
    onOpenChange(false);
  };
  const search = (
    <SearchField value={query} onValueChange={setQuery} label={t('Tìm hạng mục')} placeholder={t('Tìm hạng mục')} />
  );
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={t('Chọn hạng mục')} docks={{ top: search }}>
      {matches.length === 0 ? (
        <p role="status" className="py-4 text-center text-sm text-text-muted">
          {t('Không tìm thấy hạng mục nào.')}
        </p>
      ) : (
        <ul className="grid gap-1">
          {matches.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                aria-pressed={category.id === selectedId}
                className={ROW_CLASS}
                onClick={() => choose(category.id)}
              >
                <StickerTile icon={category.icon} kind="category" size="sm" />
                <span className="min-w-0 flex-1 truncate">{t(category.name)}</span>
                {category.id === selectedId ? <Icon name="check" /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </ResponsiveDialog>
  );
}
