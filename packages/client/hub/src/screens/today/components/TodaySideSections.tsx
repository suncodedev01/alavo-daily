import { useState, type ReactNode } from 'react';

import {
  formatVnd,
  relativeDayLabel,
  useEngineMutation,
  useLanguage,
  useT,
  type AppNotification,
  type BudgetLine,
} from '@alavo-daily/common';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  ContextSection,
  StickerTile,
  Meter,
  StatusChip,
  useLayout,
  useToast,
} from '@alavo-daily/design-system';

import { useModules } from '../../../module-registry';
import { formatNotificationTime } from '../../../notifications';
import type { BudgetDecision, UpcomingBill } from '../logic/today';

interface SectionFrameProps {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}

/** A dock section on wide layouts and a card in the main column on narrow ones. */
function SectionFrame({ title, trailing, children }: SectionFrameProps) {
  if (useLayout() === 'wide') {
    return (
      <ContextSection title={title} trailing={trailing} defaultOpen>
        {children}
      </ContextSection>
    );
  }
  return (
    <Card padding="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {trailing}
      </CardHeader>
      {children}
    </Card>
  );
}

type OverDecision = Extract<BudgetDecision, { kind: 'over' }>;

export interface DecisionSectionProps {
  decision: OverDecision;
  foodLine: BudgetLine;
  onKeep: () => void;
}

export function DecisionSection({ decision, foodLine, onKeep }: DecisionSectionProps) {
  const t = useT();
  const { toast } = useToast();
  const updateCategory = useEngineMutation('spending.update_category');
  const raise = () => {
    const budgetVnd = foodLine.budgetVnd + decision.raiseByVnd;
    const message = t('Đã tăng ngân sách {{name}} lên {{amount}}', {
      name: t(foodLine.name),
      amount: formatVnd(budgetVnd),
    });
    updateCategory.mutate(
      { id: foodLine.categoryId, budgetVnd },
      { onSuccess: () => toast(message) },
    );
  };
  return (
    <SectionFrame title={t('Cần bạn quyết định')} trailing={<StatusChip status="needs_you" />}>
      <p className="mb-3 text-sm text-text-secondary">
        {t(
          'Đi chợ cho 3 ngày tới ước tính {{cost}}, nhưng ngân sách {{name}} chỉ còn {{remaining}}. Ghi hết vào Chi tiêu sẽ vượt {{over}}.',
          {
            cost: formatVnd(decision.costVnd),
            name: t(foodLine.name),
            remaining: formatVnd(decision.remainingVnd),
            over: formatVnd(decision.overByVnd),
          },
        )}
      </p>
      <Meter value={decision.projectedRatio} label={t('Ngân sách {{name}}', { name: t(foodLine.name) })} />
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" disabled={updateCategory.isPending} onClick={raise}>
          {t('Tăng thêm {{amount}}', { amount: formatVnd(decision.raiseByVnd) })}
        </Button>
        <Button variant="outline" onClick={onKeep}>
          {t('Giữ nguyên')}
        </Button>
      </div>
    </SectionFrame>
  );
}

export function useKeptDecision(decision: BudgetDecision) {
  const [keptCost, setKeptCost] = useState<number | null>(null);
  const over = decision.kind === 'over' ? decision : null;
  return {
    pending: over && over.costVnd !== keptCost ? over : null,
    keep: () => setKeptCost(over?.costVnd ?? null),
  };
}

interface RecentNotificationsProps {
  notifications: AppNotification[];
  today: string;
}

export function RecentNotificationsSection({ notifications, today }: RecentNotificationsProps) {
  const t = useT();
  const language = useLanguage();
  const modules = useModules();
  const recent = [...notifications].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  return (
    <SectionFrame title={t('Thông báo gần đây')}>
      {recent.length === 0 ? (
        <p className="text-sm text-text-muted">{t('Chưa có thông báo nào')}</p>
      ) : (
        <ul className="grid gap-3">
          {recent.map((item) => {
            const owner = modules.find((manifest) => manifest.id === item.module);
            return (
              <li key={item.id} className="flex gap-3">
                <StickerTile icon={owner?.icon ?? 'bell'} kind="module" size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-text-muted">{formatNotificationTime(item.createdAt, today, language)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionFrame>
  );
}

export function UpcomingBillsSection({ upcoming, today }: { upcoming: UpcomingBill[]; today: string }) {
  const t = useT();
  const language = useLanguage();
  return (
    <SectionFrame title={t('Sắp đến hạn')}>
      {upcoming.length === 0 ? (
        <p className="text-sm text-text-muted">{t('Không có khoản nào sắp đến hạn.')}</p>
      ) : (
        <ul className="grid gap-3">
          {upcoming.map(({ bill, dueOn }) => (
            <li key={bill.id} className="flex items-center gap-3">
              <StickerTile icon={bill.icon} kind="category" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{bill.title}</p>
                <p className="text-xs text-text-muted">{relativeDayLabel(dueOn, today, language)}</p>
              </div>
              <span className="text-sm font-medium">{formatVnd(bill.amountVnd)}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionFrame>
  );
}
