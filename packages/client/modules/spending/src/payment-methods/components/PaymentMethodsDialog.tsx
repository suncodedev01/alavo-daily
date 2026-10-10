import { useState } from 'react';

import { useEngineMutation, useEngineQuery, type PaymentMethod } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, EmptyState, IconButton, ResponsiveDialog, StickerTile } from '@alavo-daily/design-system';

import { DeleteConfirm } from '../../form-dialogs';
import { Loadable, SkeletonRows } from '../../query-state';
import { PaymentMethodFormDialog } from './PaymentMethodFormDialog';

export interface PaymentMethodsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Editing = PaymentMethod | 'new' | null;

export function PaymentMethodsDialog({ open, onOpenChange }: PaymentMethodsDialogProps) {
  const t = useT();
  const methods = useEngineQuery('spending.list_payment_methods');
  const remove = useEngineMutation('spending.delete_payment_method');
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<PaymentMethod | null>(null);
  return (
    <>
      <ResponsiveDialog
        open={open && editing === null}
        onOpenChange={onOpenChange}
        title={t('Hình thức thanh toán')}
        description={t('Cách bạn trả tiền, ví dụ tiền mặt, chuyển khoản hay quẹt thẻ. Mỗi khoản chi chọn một hình thức.')}
        footer={
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('Đóng')}
            </Button>
            <Button leadingIcon="plus" onClick={() => setEditing('new')}>
              {t('Thêm hình thức')}
            </Button>
          </>
        }
      >
        <Loadable query={methods} skeleton={<SkeletonRows count={3} />}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState icon="credit-card" title={t('Chưa có hình thức nào')} />
            ) : (
              <ul className="grid gap-1">
                {items.map((method) => (
                  <MethodRow key={method.id} method={method} onEdit={setEditing} onDelete={setDeleting} />
                ))}
              </ul>
            )
          }
        </Loadable>
      </ResponsiveDialog>
      <PaymentMethodFormDialog editing={editing} onClose={() => setEditing(null)} />
      <DeleteConfirm
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title={t('Xoá hình thức {{name}}?', { name: deleting?.name ?? '' })}
        description={t('Các giao dịch đã dùng hình thức này vẫn được giữ, chỉ không còn hình thức gắn kèm.')}
        failureTitle={t('Không xoá được hình thức')}
        onDelete={() => remove.mutateAsync({ id: deleting?.id ?? '' })}
      />
    </>
  );
}

interface MethodRowProps {
  method: PaymentMethod;
  onEdit: (method: PaymentMethod) => void;
  onDelete: (method: PaymentMethod) => void;
}

function MethodRow({ method, onEdit, onDelete }: MethodRowProps) {
  const t = useT();
  return (
    <li className="flex items-center gap-3 py-2">
      <StickerTile icon={method.icon} kind="wallet" size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{t(method.name)}</p>
        <p className="text-xs text-text-muted">
          {method.isDefault
            ? t('Mặc định · Tiền mặt là hình thức mặc định, không xoá được.')
            : t('Dùng cho {{count}} giao dịch', { count: method.transactionCount })}
        </p>
      </div>
      <IconButton icon="pencil-simple" label={t('Sửa hình thức {{name}}', { name: method.name })} size="sm" onClick={() => onEdit(method)} />
      {method.isDefault ? null : (
        <IconButton icon="trash" label={t('Xoá hình thức {{name}}', { name: method.name })} size="sm" onClick={() => onDelete(method)} />
      )}
    </li>
  );
}
