import { useState } from 'react';

import { useEngineQuery, type Category, type CategoryKind } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, EmptyState, IconButton, ResponsiveDialog, Segmented, StickerTile } from '@alavo-daily/design-system';

import { Loadable, SkeletonRows } from '../../query-state';
import { CategoryDeleteDialog } from './CategoryDeleteDialog';
import { CategoryDialog } from './CategoryDialog';

export interface CategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KINDS: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Chi tiêu' },
  { value: 'income', label: 'Thu nhập' },
];

type Editing = Category | 'new' | null;

/** "Quản lý hạng mục": every category of one kind, with the way to add, change or delete one. */
export function CategoriesDialog({ open, onOpenChange }: CategoriesDialogProps) {
  const t = useT();
  const [kind, setKind] = useState<CategoryKind>('expense');
  const categories = useEngineQuery('spending.list_categories', { kind });
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  return (
    <>
      <ResponsiveDialog
        open={open && editing === null}
        onOpenChange={onOpenChange}
        title={t('Quản lý hạng mục')}
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('Đóng')}
            </Button>
            <Button leadingIcon="plus" onClick={() => setEditing('new')}>
              {t('Thêm hạng mục')}
            </Button>
          </>
        }
      >
        <Segmented
          label={t('Loại hạng mục')}
          value={kind}
          onChange={(value) => setKind(KINDS.find((entry) => entry.value === value)?.value ?? 'expense')}
          options={KINDS.map((entry) => ({ value: entry.value, label: t(entry.label) }))}
        />
        <Loadable query={categories} skeleton={<SkeletonRows count={5} />}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState icon="tag" title={t('Chưa có hạng mục nào')} />
            ) : (
              <ul className="grid gap-1">
                {items.map((category) => (
                  <CategoryRow key={category.id} category={category} onEdit={setEditing} onDelete={setDeleting} />
                ))}
              </ul>
            )
          }
        </Loadable>
      </ResponsiveDialog>
      {deleting ? (
        <CategoryDeleteDialog
          key={deleting.id}
          category={deleting}
          otherCategories={(categories.data ?? []).filter((other) => other.id !== deleting.id)}
          onClose={() => setDeleting(null)}
        />
      ) : null}
      <CategoryDialog
        open={editing !== null}
        onOpenChange={(next) => !next && setEditing(null)}
        kind={kind}
        editing={editing === 'new' ? null : editing}
        onCreated={() => setEditing(null)}
      />
    </>
  );
}

interface CategoryRowProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  const t = useT();
  const name = t(category.name);
  return (
    <li className="flex items-center gap-3 py-2">
      <StickerTile icon={category.icon} kind="category" size="md" />
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{name}</p>
      <IconButton icon="pencil-simple" label={t('Sửa hạng mục {{name}}', { name })} size="sm" onClick={() => onEdit(category)} />
      <IconButton icon="trash" label={t('Xoá hạng mục {{name}}', { name })} size="sm" onClick={() => onDelete(category)} />
    </li>
  );
}
