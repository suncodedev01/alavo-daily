import type { BudgetLine } from '@alavo-daily/common/engine';
import { formatPercent, formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Card, IconButton, IconTile, Menu, MenuItem, Meter } from '@alavo-daily/design-system';

export interface BudgetCardProps {
  line: BudgetLine;
  onEdit: (line: BudgetLine) => void;
  onDelete: (line: BudgetLine) => void;
}

export function BudgetCard({ line, onEdit, onDelete }: BudgetCardProps) {
  const t = useT();
  const name = t(line.name);
  const remaining =
    line.remainingVnd >= 0
      ? t('Còn {{amount}}', { amount: formatVnd(line.remainingVnd) })
      : t('Vượt {{amount}}', { amount: formatVnd(line.remainingVnd) });
  return (
    <Card padding="sm" aria-label={name} className="grid content-start gap-3">
      <div className="flex items-center gap-3">
        <IconTile icon={line.icon} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{name}</h3>
          <p className="text-xs text-text-muted">{`${formatVnd(line.spentVnd)} / ${formatVnd(line.budgetVnd)}`}</p>
        </div>
        <span className="text-sm font-semibold">{formatPercent(line.pct)}</span>
        <Menu
          align="end"
          trigger={<IconButton icon="dots-three" label={t('Tuỳ chọn {{name}}', { name })} size="sm" />}
        >
          <MenuItem icon="pencil-simple" onSelect={() => onEdit(line)}>
            {t('Sửa ngân sách')}
          </MenuItem>
          <MenuItem icon="trash" destructive onSelect={() => onDelete(line)}>
            {t('Xoá hạng mục')}
          </MenuItem>
        </Menu>
      </div>
      <Meter value={line.pct} tone={line.tone} label={t('Đã dùng ngân sách {{name}}', { name })} />
      <p className="text-xs text-text-muted">{remaining}</p>
    </Card>
  );
}
