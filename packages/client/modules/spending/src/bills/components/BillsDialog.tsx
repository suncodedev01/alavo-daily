import { useEngineMutation, useEngineQuery, type Bill } from '@alavo-daily/common/engine';
import { formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button, EmptyState, IconButton, IconTile, ResponsiveDialog } from '@alavo-daily/design-system';
import { useState } from 'react';

import { DeleteConfirm } from '../../form-dialogs';
import { Loadable, SkeletonRows } from '../../query-state';
import { BillFormDialog } from './BillFormDialog';

export interface BillsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Editing = Bill | 'new' | null;

export function BillsDialog({ open, onOpenChange }: BillsDialogProps) {
  const t = useT();
  const bills = useEngineQuery('spending.list_bills');
  const remove = useEngineMutation('spending.delete_bill');
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Bill | null>(null);
  return (
    <>
      <ResponsiveDialog
        open={open && editing === null}
        onOpenChange={onOpenChange}
        title={t('Khoản định kỳ')}
        description={t('Các khoản phải trả hằng tháng như tiền mạng, điện hay thẻ tín dụng.')}
        footer={
          <Button leadingIcon="plus" onClick={() => setEditing('new')}>
            {t('Thêm khoản định kỳ')}
          </Button>
        }
      >
        <Loadable query={bills} skeleton={<SkeletonRows count={3} />}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState
                icon="repeat"
                title={t('Chưa có khoản định kỳ nào')}
                description={t('Thêm khoản phải trả hằng tháng để được nhắc trước hạn.')}
              />
            ) : (
              <ul className="grid gap-1">
                {items.map((bill) => (
                  <BillRow key={bill.id} bill={bill} onEdit={setEditing} onDelete={setDeleting} />
                ))}
              </ul>
            )
          }
        </Loadable>
      </ResponsiveDialog>
      <BillFormDialog editing={editing} onClose={() => setEditing(null)} />
      <DeleteConfirm
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title={t('Xoá khoản {{name}}?', { name: deleting?.title ?? '' })}
        description={t('Khoản này sẽ không còn xuất hiện trong mục sắp đến hạn.')}
        failureTitle={t('Không xoá được khoản định kỳ')}
        onDelete={() => remove.mutateAsync({ id: deleting?.id ?? '' })}
      />
    </>
  );
}

interface BillRowProps {
  bill: Bill;
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
}

function BillRow({ bill, onEdit, onDelete }: BillRowProps) {
  const t = useT();
  const schedule = t('Ngày {{day}} hằng tháng', { day: bill.dayOfMonth });
  const status = bill.active ? '' : ` · ${t('Tạm dừng')}`;
  return (
    <li className="flex items-center gap-3 py-2">
      <IconTile icon={bill.icon} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{bill.title}</p>
        <p className="text-xs text-text-muted">{`${schedule} · ${formatVnd(bill.amountVnd)}${status}`}</p>
      </div>
      <IconButton icon="pencil-simple" label={t('Sửa khoản {{name}}', { name: bill.title })} size="sm" onClick={() => onEdit(bill)} />
      <IconButton icon="trash" label={t('Xoá khoản {{name}}', { name: bill.title })} size="sm" onClick={() => onDelete(bill)} />
    </li>
  );
}
