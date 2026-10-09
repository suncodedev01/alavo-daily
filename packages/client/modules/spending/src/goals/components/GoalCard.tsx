import type { Goal } from '@alavo-daily/common/engine';
import { formatPercent, formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button, Card, IconButton, IconTile, Menu, MenuItem, Meter, StatusChip } from '@alavo-daily/design-system';

import { useToday } from '../../today';
import { dueText } from '../logic/dueText';
import { dueLabelOf } from '../logic/goalMath';

export interface GoalCardProps {
  goal: Goal;
  onContribute: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

export function GoalCard({ goal, onContribute, onEdit, onDelete }: GoalCardProps) {
  const t = useT();
  const today = useToday();
  const ratio = goal.savedVnd / goal.targetVnd;
  const reached = goal.savedVnd >= goal.targetVnd;
  return (
    <Card aria-label={goal.name} className="grid content-start gap-4">
      <div className="flex items-center gap-3">
        <IconTile icon={goal.icon} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{goal.name}</h3>
          <p className="text-xs text-text-muted">{dueText(dueLabelOf(goal, today), t)}</p>
        </div>
        {reached ? <StatusChip status="resolved" label={t('Đã đạt')} /> : null}
        <Menu align="end" trigger={<IconButton icon="dots-three" label={t('Tuỳ chọn {{name}}', { name: goal.name })} size="sm" />}>
          <MenuItem icon="pencil-simple" onSelect={() => onEdit(goal)}>
            {t('Sửa mục tiêu')}
          </MenuItem>
          <MenuItem icon="trash" destructive onSelect={() => onDelete(goal)}>
            {t('Xoá mục tiêu')}
          </MenuItem>
        </Menu>
      </div>
      <div>
        <p className="text-2xl font-semibold">{formatVnd(goal.savedVnd)}</p>
        <p className="mt-1 text-xs text-text-muted">{t('trên {{target}}', { target: formatVnd(goal.targetVnd) })}</p>
      </div>
      <Meter value={ratio} tone="normal" label={t('Tiến độ {{name}}', { name: goal.name })} />
      <div className="flex text-xs text-text-muted">
        <span className="flex-1">{t('{{pct}} hoàn thành', { pct: formatPercent(ratio) })}</span>
        {reached ? null : <span>{t('Còn {{amount}}', { amount: formatVnd(goal.targetVnd - goal.savedVnd) })}</span>}
      </div>
      <Button variant="affirm" size="sm" leadingIcon="plus" className="justify-self-start" onClick={() => onContribute(goal)}>
        {t('Thêm tiền')}
      </Button>
    </Card>
  );
}
