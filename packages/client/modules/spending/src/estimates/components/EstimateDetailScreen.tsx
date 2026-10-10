import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useEngineMutation, useEngineQuery, type EstimateItem, type EstimateView } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Card, Icon, IconTile } from '@alavo-daily/design-system';

import { DeleteConfirm } from '../../form-dialogs';
import { GoalFormDialog } from '../../goals';
import { Loadable, SkeletonRows } from '../../query-state';
import { SpendingScreen } from '../../spending-screen';
import { ESTIMATE_TEMPLATES } from '../logic/templates';
import { ContingencyDialog } from './ContingencyDialog';
import { EstimateItems } from './EstimateItems';
import { EstimateSummaryCard } from './EstimateSummaryCard';
import { EstimateTips } from './EstimateTips';
import { FactorsDialog } from './FactorsDialog';
import { IncomeDialog } from './IncomeDialog';
import { ItemFormDialog } from './ItemFormDialog';
import { PaidDialog } from './PaidDialog';
import { SourcesDialog } from './SourcesDialog';

type Open =
  | { kind: 'sources' | 'income' | 'factors' | 'contingency' | 'delete' | 'goal' }
  | { kind: 'item'; item: EstimateItem | 'new' }
  | { kind: 'paid'; item: EstimateItem };

/** One estimate: the answer first, then the settings and every item. */
export function EstimateDetailScreen() {
  const t = useT();
  const { id = '' } = useParams();
  const estimate = useEngineQuery('spending.get_estimate', { id });
  return (
    <SpendingScreen title={estimate.data?.estimate.name ?? t('Dự toán')}>
      <Loadable query={estimate} skeleton={<SkeletonRows count={4} className="h-32 w-full" />}>
        {(view) => <Detail view={view} />}
      </Loadable>
    </SpendingScreen>
  );
}

function Detail({ view }: { view: EstimateView }) {
  const [open, setOpen] = useState<Open | null>(null);
  const close = () => setOpen(null);
  return (
    <>
      <EstimateSummaryCard
        view={view}
        onSources={() => setOpen({ kind: 'sources' })}
        onIncome={() => setOpen({ kind: 'income' })}
        onDelete={() => setOpen({ kind: 'delete' })}
      />
      <EstimateTips view={view} onSaveForShortfall={() => setOpen({ kind: 'goal' })} />
      <SettingsCard view={view} onFactors={() => setOpen({ kind: 'factors' })} onContingency={() => setOpen({ kind: 'contingency' })} />
      <EstimateItems view={view} onEdit={(item) => setOpen({ kind: 'item', item })} onPaid={(item) => setOpen({ kind: 'paid', item })} />
      <Footnote />
      <Dialogs view={view} open={open} onClose={close} />
    </>
  );
}

function Footnote() {
  const t = useT();
  return (
    <p className="px-1 text-xs text-text-muted">
      {t('Dự toán chỉ là ước tính và không tự tạo giao dịch. Khi bạn ghi tiền đã trả cho một khoản, ứng dụng hỏi cách ghi để không tính hai lần.')}
    </p>
  );
}

interface SettingsCardProps {
  view: EstimateView;
  onFactors: () => void;
  onContingency: () => void;
}

function SettingsCard({ view, onFactors, onContingency }: SettingsCardProps) {
  const t = useT();
  const { estimate } = view;
  return (
    <Card padding="md" className="grid gap-1">
      {estimate.factors.length > 0 ? (
        <SettingRow icon="users" title={t('Các con số nhân')} hint={estimate.factors.map((factor) => `${factor.value} ${factor.label}`).join(' · ')} onPress={onFactors} />
      ) : (
        <SettingRow icon="users" title={t('Các con số nhân')} hint={t('Thêm số khách, số người, số ngày...')} onPress={onFactors} />
      )}
      <SettingRow icon="shield-check" title={t('Dự phòng phát sinh {{percent}}%', { percent: estimate.contingencyPercent })} hint={t('Chừa sẵn cho những khoản chưa tính tới')} onPress={onContingency} />
    </Card>
  );
}

interface SettingRowProps {
  icon: string;
  title: string;
  hint: string;
  onPress: () => void;
}

function SettingRow({ icon, title, hint, onPress }: SettingRowProps) {
  return (
    <button type="button" className="focus-ring flex min-h-14 w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-surface-tint" onClick={onPress}>
      <IconTile icon={icon} size="sm" />
      <span className="grid min-w-0 flex-1">
        <b className="truncate text-row font-medium">{title}</b>
        <small className="truncate text-sm text-text-muted">{hint}</small>
      </span>
      <Icon name="caret-right" className="text-text-muted" />
    </button>
  );
}

interface DialogsProps {
  view: EstimateView;
  open: Open | null;
  onClose: () => void;
}

function Dialogs({ view, open, onClose }: DialogsProps) {
  const t = useT();
  const navigate = useNavigate();
  const remove = useEngineMutation('spending.delete_estimate');
  if (open === null) return null;
  const { estimate, totals } = view;
  const suggested = ESTIMATE_TEMPLATES.find((template) => template.icon === estimate.icon)?.groups ?? [];
  switch (open.kind) {
    case 'sources':
      return <SourcesDialog estimate={estimate} onClose={onClose} />;
    case 'income':
      return <IncomeDialog estimate={estimate} onClose={onClose} />;
    case 'factors':
      return <FactorsDialog estimate={estimate} onClose={onClose} />;
    case 'contingency':
      return <ContingencyDialog estimate={estimate} contingencyVnd={totals.contingency} onClose={onClose} />;
    case 'item':
      return <ItemFormDialog estimate={estimate} editing={open.item} suggestedGroups={suggested} onClose={onClose} />;
    case 'paid': {
      const amount = view.amounts.find((entry) => entry.id === open.item.id);
      return <PaidDialog item={open.item} amount={amount?.amount ?? 0} paid={amount?.paid ?? 0} onClose={onClose} />;
    }
    case 'goal':
      return <GoalFormDialog editing="new" suggestion={{ name: estimate.name, targetVnd: Math.abs(totals.result) }} onClose={onClose} />;
    case 'delete':
      return (
        <DeleteConfirm
          open
          onOpenChange={(next) => !next && onClose()}
          title={t('Xoá dự toán {{name}}?', { name: estimate.name })}
          description={t('Các khoản chi đã ghi vào Chi tiêu vẫn được giữ, vì tiền đó đã ra khỏi ví.')}
          failureTitle={t('Không xoá được dự toán')}
          onDelete={async () => {
            await remove.mutateAsync({ id: estimate.id });
            navigate('/spending/estimates', { replace: true });
          }}
        />
      );
  }
}
