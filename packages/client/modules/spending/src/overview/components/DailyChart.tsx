import { formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';

import { buildChart, CHART_HEIGHT, CHART_LEFT, CHART_WIDTH } from '../logic/chartGeometry';
import type { ChartBar } from '../types';

export interface DailyChartProps {
  dailyVnd: readonly number[];
  highlightToday: boolean;
  month: string;
}

export function DailyChart({ dailyVnd, highlightToday, month }: DailyChartProps) {
  const t = useT();
  const todayIndex = highlightToday ? dailyVnd.length - 1 : null;
  const model = buildChart(dailyVnd, todayIndex);
  const monthNumber = Number(month.slice(5));
  const average = formatVnd(Math.round(model.averageVnd));
  return (
    <div className="grid gap-2">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={t('Chi tiêu theo ngày, trung bình {{average}} mỗi ngày', { average })}
        className="h-auto w-full"
      >
        {model.grid.map((line, index) => (
          <line
            key={line.valueVnd}
            x1={CHART_LEFT}
            x2={CHART_WIDTH}
            y1={line.y}
            y2={line.y}
            className="stroke-line-hairline"
            strokeDasharray={index === 0 ? undefined : '2 4'}
          />
        ))}
        {model.bars.map((bar) => (
          <Bar key={bar.day} bar={bar} monthNumber={monthNumber} baselineY={model.baselineY} />
        ))}
        <line
          x1={CHART_LEFT}
          x2={CHART_WIDTH}
          y1={model.averageY}
          y2={model.averageY}
          className="stroke-chart-2"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      </svg>
      <Legend highlightToday={highlightToday} average={average} />
    </div>
  );
}

function Bar({ bar, monthNumber, baselineY }: { bar: ChartBar; monthNumber: number; baselineY: number }) {
  return (
    <>
      <rect
        x={bar.x}
        y={bar.y}
        width={bar.width}
        height={bar.height}
        rx={4}
        className={bar.isToday ? 'fill-chart-1' : 'fill-chart-3'}
      >
        <title>{`${bar.day}/${monthNumber}: ${formatVnd(bar.valueVnd)}`}</title>
      </rect>
      {bar.showLabel ? (
        <text x={bar.x + bar.width / 2} y={baselineY + 18} textAnchor="middle" className="fill-text-muted text-meta">
          {bar.day}
        </text>
      ) : null}
    </>
  );
}

function Legend({ highlightToday, average }: { highlightToday: boolean; average: string }) {
  const t = useT();
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
      {highlightToday ? (
        <li className="flex items-center gap-1.5">
          <i aria-hidden className="size-2.5 rounded-sm bg-chart-1" />
          {t('Hôm nay')}
        </li>
      ) : null}
      <li className="flex items-center gap-1.5">
        <i aria-hidden className="size-2.5 rounded-sm bg-chart-3" />
        {highlightToday ? t('Các ngày trước') : t('Các ngày trong tháng')}
      </li>
      <li className="flex items-center gap-1.5">
        <i aria-hidden className="w-3.5 border-t-2 border-dashed border-chart-2" />
        {t('Trung bình {{average}}/ngày', { average })}
      </li>
    </ul>
  );
}
