import { formatPercent, formatVnd } from '@alavo-daily/common/format';

import { DONUT_RADIUS, DONUT_SIZE, DONUT_STROKE, type DonutSlice } from '../logic/donut';

export interface DonutChartProps {
  slices: readonly DonutSlice[];
  label: string;
}

export function DonutChart({ slices, label }: DonutChartProps) {
  const center = DONUT_SIZE / 2;
  return (
    <svg
      viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
      role="img"
      aria-label={label}
      className="size-40 shrink-0 max-lg:size-36"
    >
      <g transform={`rotate(-90 ${center} ${center})`}>
        {slices.map((slice) => (
          <circle
            key={slice.id}
            cx={center}
            cy={center}
            r={DONUT_RADIUS}
            fill="none"
            strokeWidth={DONUT_STROKE}
            strokeDasharray={`${slice.dash} ${slice.gap}`}
            strokeDashoffset={slice.offset}
            className={slice.stroke}
          >
            <title>{`${slice.label}: ${formatVnd(slice.totalVnd)} (${formatPercent(slice.share)})`}</title>
          </circle>
        ))}
      </g>
    </svg>
  );
}
