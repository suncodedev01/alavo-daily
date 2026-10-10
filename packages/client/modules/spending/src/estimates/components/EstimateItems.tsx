import type { EstimateItem, EstimateView } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, Card, Eyebrow, Icon } from '@alavo-daily/design-system';

import { formatBalance } from '../../money';
import { groupItems, paidState, type PaidState } from '../logic/groupItems';
import { PRIORITY_LABELS } from '../logic/templates';

export interface EstimateItemsProps {
  view: EstimateView;
  onEdit: (item: EstimateItem | 'new') => void;
  onPaid: (item: EstimateItem) => void;
}

/** The items of an estimate, gathered by group, with a way to mark what is already paid. */
export function EstimateItems({ view, onEdit, onPaid }: EstimateItemsProps) {
  const t = useT();
  const amounts = new Map(view.amounts.map((entry) => [entry.id, entry]));
  return (
    <>
      {groupItems(view.estimate.items).map((group) => (
        <Card key={group.name} padding="md" className="grid gap-1" aria-label={group.name}>
          <div className="flex items-center gap-2">
            <Eyebrow className="flex-1">{group.name}</Eyebrow>
            <span className="text-sm text-text-muted">
              {formatBalance(group.items.reduce((sum, item) => sum + (amounts.get(item.id)?.amount ?? 0), 0))}
            </span>
          </div>
          <ul className="grid">
            {group.items.map((item) => (
              <li key={item.id}>
                <ItemRow
                  item={item}
                  amount={amounts.get(item.id)?.amount ?? 0}
                  paid={amounts.get(item.id)?.paid ?? 0}
                  estimateView={view}
                  onEdit={() => onEdit(item)}
                  onPaid={() => onPaid(item)}
                />
              </li>
            ))}
          </ul>
        </Card>
      ))}
      <Button variant="outline" leadingIcon="plus" onClick={() => onEdit('new')}>
        {t('Thêm khoản cần mua')}
      </Button>
    </>
  );
}

interface ItemRowProps {
  item: EstimateItem;
  amount: number;
  paid: number;
  estimateView: EstimateView;
  onEdit: () => void;
  onPaid: () => void;
}

const CHECK_CLASS: Record<PaidState, string> = {
  none: 'inset-ring-2 inset-ring-line-strong',
  part: 'bg-accent text-accent-fg',
  full: 'bg-primary text-primary-fg',
};

function ItemRow({ item, amount, paid, estimateView, onEdit, onPaid }: ItemRowProps) {
  const t = useT();
  const state = paidState(amount, paid);
  return (
    <div className="flex min-h-14 items-center gap-3 py-1">
      <button
        type="button"
        aria-label={t('Ghi tiền đã trả: {{name}}', { name: item.name })}
        className={`focus-ring grid size-6 shrink-0 place-items-center rounded-md max-lg:size-11 ${CHECK_CLASS[state]}`}
        onClick={onPaid}
      >
        {state === 'none' ? null : <Icon name={state === 'part' ? 'minus' : 'check'} />}
      </button>
      <button type="button" className="focus-ring grid min-w-0 flex-1 text-left" onClick={onEdit}>
        <b className="truncate text-row font-medium">{item.name}</b>
        <small className="truncate text-sm text-text-muted">{subtitle(item, estimateView, t)}</small>
        {state === 'none' ? null : (
          <small className="text-sm text-income-fg">
            {state === 'full' ? t('Đã trả đủ') : t('Đã cọc {{paid}}, còn {{left}}', { paid: formatBalance(paid), left: formatBalance(amount - paid) })}
          </small>
        )}
      </button>
      <span className="shrink-0 text-row font-semibold">{formatBalance(amount)}</span>
    </div>
  );
}

function subtitle(item: EstimateItem, view: EstimateView, t: (key: string, values?: Record<string, string | number>) => string): string {
  const parts = [formatBalance(item.price)];
  for (const id of item.by) {
    const factor = view.estimate.factors.find((entry) => entry.id === id);
    if (factor) parts.push(`${factor.value} ${factor.label}`);
  }
  if (item.quantity > 1) parts.push(String(item.quantity));
  return `${parts.join(' × ')} · ${t(PRIORITY_LABELS[item.priority])}`;
}
