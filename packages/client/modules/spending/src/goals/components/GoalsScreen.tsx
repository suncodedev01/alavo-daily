import { useEngineMutation, useEngineQuery, type Goal } from '@alavo-daily/common/engine';
import { formatVnd } from '@alavo-daily/common/format';
import { useLanguage, useT } from '@alavo-daily/common';
import { Button, Card, ContextSection, EmptyState, useLayout } from '@alavo-daily/design-system';
import { useState } from 'react';

import { useToday } from '../../today';
import { DeleteConfirm } from '../../form-dialogs';
import { Loadable, SkeletonRows } from '../../query-state';
import { SpendingScreen } from '../../spending-screen';
import { ContributeDialog } from './ContributeDialog';
import { GoalCard } from './GoalCard';
import { GoalFormDialog } from './GoalFormDialog';
import { dueText } from '../logic/dueText';
import { dueLabelOf, monthlyNeedVnd, nearestDueGoal } from '../logic/goalMath';

export function GoalsScreen() {
  const t = useT();
  const narrow = useLayout() === 'narrow';
  const goals = useEngineQuery('spending.list_goals');
  const [editing, setEditing] = useState<Goal | 'new' | null>(null);
  const addButton = (
    <Button leadingIcon="plus" onClick={() => setEditing('new')}>
      {t('Thêm mục tiêu')}
    </Button>
  );
  const today = useToday();
  const dueGoal = goals.data ? nearestDueGoal(goals.data, today) : null;
  const suggestion = dueGoal ? <GoalSuggestion goal={dueGoal} /> : null;
  return (
    <SpendingScreen title={t('Mục tiêu')} primaryAction={addButton} dock={narrow ? undefined : (suggestion ?? undefined)}>
      <Loadable query={goals} skeleton={<GoalsSkeleton />}>
        {(items) => <GoalsContent goals={items} onCreate={() => setEditing('new')} onEdit={setEditing} />}
      </Loadable>
      {narrow && suggestion ? <Card padding="none">{suggestion}</Card> : null}
      <GoalFormDialog editing={editing} onClose={() => setEditing(null)} />
    </SpendingScreen>
  );
}

function GoalsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SkeletonRows count={3} className="h-60 w-full" />
    </div>
  );
}

interface GoalsContentProps {
  goals: Goal[];
  onCreate: () => void;
  onEdit: (goal: Goal) => void;
}

function GoalsContent({ goals, onCreate, onEdit }: GoalsContentProps) {
  const t = useT();
  const remove = useEngineMutation('spending.delete_goal');
  const [contributing, setContributing] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);
  return (
    <>
      {goals.length === 0 ? (
        <EmptyState
          icon="target"
          title={t('Chưa có mục tiêu nào')}
          description={t('Đặt một mục tiêu như quỹ khẩn cấp hay chuyến đi, rồi để dành từng chút một.')}
          action={
            <Button leadingIcon="plus" onClick={onCreate}>
              {t('Tạo mục tiêu đầu tiên')}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onContribute={setContributing} onEdit={onEdit} onDelete={setDeleting} />
          ))}
        </div>
      )}
      <ContributeDialog goal={contributing} onClose={() => setContributing(null)} />
      <DeleteConfirm
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
        title={t('Xoá mục tiêu {{name}}?', { name: deleting?.name ?? '' })}
        description={t('Số tiền đã để dành cho mục tiêu này sẽ không còn được theo dõi.')}
        failureTitle={t('Không xoá được mục tiêu')}
        onDelete={() => remove.mutateAsync({ id: deleting?.id ?? '' })}
      />
    </>
  );
}

function GoalSuggestion({ goal }: { goal: Goal }) {
  const language = useLanguage();
  const t = useT();
  const today = useToday();
  const need = monthlyNeedVnd(goal, today) ?? 0;
  return (
    <ContextSection title={t('Gợi ý cho {{name}}', { name: goal.name })} defaultOpen>
      <p className="text-sm text-text-secondary">
        {t('Để đủ {{target}} ({{due}}), bạn cần để dành khoảng {{need}} mỗi tháng.', {
          target: formatVnd(goal.targetVnd),
          due: dueText(dueLabelOf(goal, today, language), t).toLowerCase(),
          need: formatVnd(need),
        })}
      </p>
    </ContextSection>
  );
}
