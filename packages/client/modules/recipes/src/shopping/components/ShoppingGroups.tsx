import { useEngineMutation, type ShoppingItem } from '@alavo-daily/common/engine';
import { formatAmount, formatVnd } from '@alavo-daily/common/format';
import { useT } from '@alavo-daily/common';
import { Card, Checkbox, Eyebrow, IconButton } from '@alavo-daily/design-system';

import { useReportError } from '../../engine-errors';
import { AISLE_LABELS } from '../../vocabulary';
import type { AisleGroup } from '../types';

export function ShoppingGroups({ groups }: { groups: readonly AisleGroup[] }) {
  const t = useT();
  const reportError = useReportError();
  const setHave = useEngineMutation('recipes.set_shopping_have');
  const removeItem = useEngineMutation('recipes.remove_shopping_item');
  return (
    <>
      {groups.map((group) => (
        <Card key={group.aisle} padding="sm" aria-label={t(AISLE_LABELS[group.aisle])}>
          <Eyebrow>{`${t(AISLE_LABELS[group.aisle])} · ${group.neededCount}/${group.items.length}`}</Eyebrow>
          <ul>
            {group.items.map((item) => (
              <li key={item.key} className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <Checkbox
                    checked={item.have}
                    onCheckedChange={(have) =>
                      setHave.mutate({ key: item.key, have }, { onError: reportError })
                    }
                  >
                    <ItemLabel item={item} />
                  </Checkbox>
                </div>
                {item.custom ? (
                  <IconButton
                    icon="trash"
                    size="sm"
                    label={t('Xoá {{name}} khỏi danh sách', { name: item.name })}
                    onClick={() => removeItem.mutate({ key: item.key }, { onError: reportError })}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </>
  );
}

function ItemLabel({ item }: { item: ShoppingItem }) {
  const t = useT();
  const note = item.have ? t('Đã có sẵn') : item.custom ? t('Món thêm tay') : item.from.join(', ');
  return (
    <span className="flex items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block">{item.name}</span>
        <span className="block text-xs font-normal text-text-muted">{note}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end lg:flex-row lg:items-center lg:gap-3">
        <span className="text-sm">{formatAmount(item.quantity, item.unit)}</span>
        <span className="min-h-4 min-w-16 text-right text-xs font-normal text-text-muted">
          {item.have || item.costVnd === 0 ? '' : formatVnd(item.costVnd)}
        </span>
      </span>
    </span>
  );
}
