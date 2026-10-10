import { useEngineMutation, useEngineQuery, type Category } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';

import { DeleteWithTransactionsDialog, type MoveTarget } from '../../form-dialogs';

export interface CategoryDeleteDialogProps {
  category: Category;
  /** The other categories of the same kind, where the transactions can go. */
  otherCategories: readonly Category[];
  onClose: () => void;
}

export function CategoryDeleteDialog({ category, otherCategories, onClose }: CategoryDeleteDialogProps) {
  const t = useT();
  const used = useEngineQuery('spending.list_transactions', { categoryId: category.id, limit: 1 });
  const remove = useEngineMutation('spending.delete_category');
  const targets: MoveTarget[] = otherCategories.map((other) => ({
    id: other.id,
    label: t(other.name),
    icon: other.icon,
  }));
  return (
    <DeleteWithTransactionsDialog
      title={t('Xoá hạng mục {{name}}?', { name: t(category.name) })}
      description={t('Hạng mục này đã có giao dịch. Bạn muốn làm gì với chúng?')}
      emptyDescription={t('Hạng mục này chưa có giao dịch nào.')}
      ready={!used.isPending}
      hasTransactions={(used.data?.length ?? 0) > 0}
      targets={targets}
      moveLabel={t('Chuyển sang hạng mục khác')}
      moveHint={t('Tổng tiền và báo cáo không đổi.')}
      targetLabel={t('Hạng mục nhận giao dịch')}
      removeLabel={t('Xoá luôn các giao dịch')}
      removeHint={t('Tổng chi tiêu và báo cáo sẽ giảm tương ứng.')}
      onConfirm={(choice) => remove.mutateAsync({ id: category.id, ...choice })}
      onClose={onClose}
    />
  );
}
