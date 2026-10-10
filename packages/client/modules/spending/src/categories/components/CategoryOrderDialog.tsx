import { useState } from 'react';

import { useEngineMutation, useEngineQuery, type CategoryKind } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, ReorderList, ResponsiveDialog, Segmented, StickerTile } from '@alavo-daily/design-system';

import { Loadable, SkeletonRows } from '../../query-state';
import { VISIBLE_CATEGORY_COUNT } from '../logic/categoryBrowse';

export interface CategoryOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KINDS: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Chi tiêu' },
  { value: 'income', label: 'Thu nhập' },
];

/** Puts the categories in order: the first few show on the entry screen, the rest behind "Xem tất cả". */
export function CategoryOrderDialog({ open, onOpenChange }: CategoryOrderDialogProps) {
  const t = useT();
  const [kind, setKind] = useState<CategoryKind>('expense');
  const categories = useEngineQuery('spending.list_categories', { kind });
  const reorder = useEngineMutation('spending.reorder_categories');
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Hạng mục hiện ở ngoài')}
      description={t('Sáu hạng mục đầu hiện ngay ở màn Ghi chép, phần còn lại nằm trong "Xem tất cả".')}
      footer={<Button onClick={() => onOpenChange(false)}>{t('Đóng')}</Button>}
    >
      <Segmented
        label={t('Loại hạng mục')}
        value={kind}
        onChange={(value) => setKind(KINDS.find((entry) => entry.value === value)?.value ?? 'expense')}
        options={KINDS.map((entry) => ({ value: entry.value, label: t(entry.label) }))}
      />
      <Loadable query={categories} skeleton={<SkeletonRows count={6} />}>
        {(items) => (
          <ReorderList
            items={items.map((item) => ({
              id: item.id,
              label: t(item.name),
              leading: <StickerTile icon={item.icon} kind="category" size="sm" />,
            }))}
            dividerAfter={VISIBLE_CATEGORY_COUNT}
            dividerLabel={t('Vào "Xem tất cả"')}
            disabled={reorder.isPending}
            moveUpLabel={(name) => t('Đưa {{name}} lên', { name })}
            moveDownLabel={(name) => t('Đưa {{name}} xuống', { name })}
            onChange={(ids) => reorder.mutate({ ids })}
          />
        )}
      </Loadable>
    </ResponsiveDialog>
  );
}
