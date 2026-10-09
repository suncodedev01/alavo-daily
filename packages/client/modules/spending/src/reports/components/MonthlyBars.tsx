import { formatVnd } from '@alavo-daily/common/format';

import { BARS_HEIGHT, BARS_WIDTH, type MonthBarsModel, type MonthGroup } from '../logic/monthBars';

const LEFT = 8;

export interface MonthlyBarsProps {
  model: MonthBarsModel;
  label: string;
  expenseLabel: string;
  incomeLabel: string;
}

export function MonthlyBars({ model, label, expenseLabel, incomeLabel }: MonthlyBarsProps) {
  return (
    <svg viewBox={`0 0 ${BARS_WIDTH} ${BARS_HEIGHT}`} role="img" aria-label={label} className="h-auto w-full">
      {model.grid.map((line, index) => (
        <line
          key={line.valueVnd}
          x1={LEFT}
          x2={BARS_WIDTH}
          y1={line.y}
          y2={line.y}
          className="stroke-line-hairline"
          strokeDasharray={index === 0 ? undefined : '2 4'}
        />
      ))}
      {model.groups.map((group) => (
        <Group
          key={group.month}
          group={group}
          baselineY={model.baselineY}
          expenseLabel={expenseLabel}
          incomeLabel={incomeLabel}
        />
      ))}
    </svg>
  );
}

interface GroupProps {
  group: MonthGroup;
  baselineY: number;
  expenseLabel: string;
  incomeLabel: string;
}

function Group({ group, baselineY, expenseLabel, incomeLabel }: GroupProps) {
  const middle = group.expense.x + group.expense.width;
  return (
    <>
      <rect {...group.expense} rx={3} className="fill-chart-1">
        <title>{`${group.label} · ${expenseLabel}: ${formatVnd(group.expenseVnd)}`}</title>
      </rect>
      <rect {...group.income} rx={3} className="fill-chart-2">
        <title>{`${group.label} · ${incomeLabel}: ${formatVnd(group.incomeVnd)}`}</title>
      </rect>
      {group.showLabel ? (
        <text x={middle} y={baselineY + 18} textAnchor="middle" className="fill-text-muted text-meta">
          {group.label}
        </text>
      ) : null}
    </>
  );
}
