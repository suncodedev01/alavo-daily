import { useT } from '@alavo-daily/common';
import { cn } from '@alavo-daily/design-system';

import type { Relation } from '../types';

const LABEL: Record<Exclude<Relation, 'trung'>, string> = {
  ban: 'Hợp mệnh',
  sinh: 'Tương sinh',
  pha: 'Hợp một phần',
  ky: 'Nên hạn chế',
};

const TONE_CLASS: Record<Exclude<Relation, 'trung'>, string> = {
  ban: 'bg-accent text-accent-fg',
  sinh: 'bg-accent text-accent-fg',
  pha: 'bg-surface-tint text-text-secondary',
  ky: 'bg-surface-tint text-expense-fg inset-ring inset-ring-expense-fg',
};

export function RelationBadge({ relation }: { relation: Relation }) {
  const t = useT();
  if (relation === 'trung') return null;
  return (
    <span className={cn('rounded-4xl px-2 py-0.5 text-meta font-semibold', TONE_CLASS[relation])}>
      {t(LABEL[relation])}
    </span>
  );
}
