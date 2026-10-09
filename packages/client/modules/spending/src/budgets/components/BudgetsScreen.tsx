import { useEngineMutation, useEngineQuery, type BudgetLine, type BudgetStatus } from '@alavo-daily/common/engine';
import { formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button, Card, EmptyState, Icon, useLayout, useToast } from '@alavo-daily/design-system';
import { useState } from 'react';

import { CategoryDialog } from '../../categories';
import { useMonthParam } from '../../month';
import { DeleteConfirm } from '../../form-dialogs';
import { Loadable, SkeletonRows } from '../../query-state';
import { SpendingScreen } from '../../spending-screen';
import { BudgetCard } from './BudgetCard';
import { BudgetDialog } from './BudgetDialog';
import { BudgetHero } from './BudgetHero';
import { BudgetNotificationInfo } from './BudgetNotificationInfo';

export function BudgetsScreen() {
  const t = useT();
  const monthParam = useMonthParam();
  const narrow = useLayout() === 'narrow';
  const status = useEngineQuery('spending.budget_status', { month: monthParam.month, today: monthParam.today });
  const info = <BudgetNotificationInfo />;
  return (
    <SpendingScreen title={t('Ngân sách')} monthParam={monthParam} dock={narrow ? undefined : info}>
      <Loadable query={status} skeleton={<BudgetsSkeleton />}>
        {(data) => <BudgetsContent status={data} />}
      </Loadable>
      {narrow ? <Card padding="none">{info}</Card> : null}
    </SpendingScreen>
  );
}

function BudgetsSkeleton() {
  return (
    <div className="grid gap-4">
      <SkeletonRows count={1} className="h-32 w-full" />
      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonRows count={3} className="h-32 w-full" />
      </div>
    </div>
  );
}

function BudgetsContent({ status }: { status: BudgetStatus }) {
  const t = useT();
  const { toast } = useToast();
  const remove = useEngineMutation('spending.delete_category');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BudgetLine | null>(null);
  const [deleting, setDeleting] = useState<BudgetLine | null>(null);
  return (
    <>
      {status.lines.length === 0 ? (
        <EmptyState
          icon="chart-pie-slice"
          title={t('Chưa đặt ngân sách nào')}
          description={t('Đặt giới hạn chi cho từng hạng mục để biết mình còn bao nhiêu mỗi ngày.')}
          action={
            <Button leadingIcon="plus" onClick={() => setCreating(true)}>
              {t('Thêm hạng mục')}
            </Button>
          }
        />
      ) : (
        <>
          <BudgetHero status={status} />
          <div className="grid gap-4 lg:grid-cols-3">
            {status.lines.map((line) => (
              <BudgetCard key={line.categoryId} line={line} onEdit={setEditing} onDelete={setDeleting} />
            ))}
            <AddCategoryTile onClick={() => setCreating(true)} />
          </div>
        </>
      )}
      <CategoryDialog
        open={creating}
        onOpenChange={setCreating}
        kind="expense"
        requireBudget
        onCreated={(category) =>
          toast(t('Đã tạo hạng mục {{name}} · ngân sách {{amount}}', { name: category.name, amount: formatVnd(category.budgetVnd ?? 0) }))
        }
      />
      <BudgetDialog line={editing} onClose={() => setEditing(null)} />
      <DeleteConfirm
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title={t('Xoá hạng mục {{name}}?', { name: deleting ? t(deleting.name) : '' })}
        description={t('Chỉ xoá được hạng mục chưa có giao dịch nào.')}
        failureTitle={t('Không xoá được hạng mục')}
        onDelete={() => remove.mutateAsync({ id: deleting?.categoryId ?? '' })}
      />
    </>
  );
}

function AddCategoryTile({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring grid min-h-33 place-items-center content-center gap-1 rounded-xl border border-dashed border-line-strong text-sm font-medium text-text-secondary hover:bg-surface-tint"
    >
      <Icon name="plus" size="xl" />
      {t('Thêm hạng mục')}
    </button>
  );
}
