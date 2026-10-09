import { formatPercent, formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Button, ContextSection, Meter, StatusChip } from '@alavo-daily/design-system';

import type { Decision } from '../types';

type Translate = (key: string, values?: Record<string, string | number>) => string;

function decisionText(decision: Decision, t: Translate): string {
  const { line, daysLeft } = decision;
  const name = t(line.name);
  if (line.remainingVnd < 0) {
    return t('{{name}} đã vượt ngân sách {{over}} ({{pct}}).', {
      name,
      over: formatVnd(line.remainingVnd),
      pct: formatPercent(line.pct),
    });
  }
  const values = { name, pct: formatPercent(line.pct), remaining: formatVnd(line.remainingVnd) };
  if (daysLeft <= 0) return t('{{name}} đã dùng {{pct}} ngân sách, còn {{remaining}}.', values);
  const perDay = formatVnd(Math.round(line.remainingVnd / daysLeft));
  return t('{{name}} đã dùng {{pct}} ngân sách, còn {{remaining}} cho {{days}} ngày, khoảng {{perDay}} mỗi ngày.', {
    ...values,
    days: daysLeft,
    perDay,
  });
}

export function DecisionSection({ decision }: { decision: Decision }) {
  const t = useT();
  return (
    <ContextSection title={t('Cần bạn quyết định')} trailing={<StatusChip status="needs_you" />} defaultOpen>
      <div className="grid gap-3">
        <p className="text-sm text-text-secondary">{decisionText(decision, t)}</p>
        <Meter
          value={decision.line.pct}
          tone={decision.line.tone}
          label={t('Đã dùng ngân sách {{name}}', { name: t(decision.line.name) })}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={decision.pending} onClick={decision.raise}>
            {t('Tăng thêm {{amount}}', { amount: formatVnd(decision.raiseVnd) })}
          </Button>
          <Button variant="outline" size="sm" onClick={decision.keep}>
            {t('Giữ nguyên')}
          </Button>
        </div>
        {decision.error ? (
          <p role="alert" className="text-sm text-destructive-fg">
            {decision.error}
          </p>
        ) : null}
      </div>
    </ContextSection>
  );
}
