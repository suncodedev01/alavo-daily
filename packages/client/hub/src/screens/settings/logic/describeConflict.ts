import type { ConflictRow, SyncConflict } from '@alavo-daily/common';

type Translate = (key: string, values?: Record<string, string | number>) => string;

const SLOT_LABELS: Record<string, string> = {
  breakfast: 'Bữa sáng',
  lunch: 'Bữa trưa',
  dinner: 'Bữa tối',
};

/** What kind of thing the two devices disagree about, in words. */
export function conflictTitle(conflict: SyncConflict, t: Translate): string {
  switch (conflict.entityType) {
    case 'ingredient':
      return t('Một nguyên liệu');
    case 'step':
      return t('Một bước nấu');
    case 'plan_entry':
      return t('Một món trong kế hoạch');
    case 'shopping_item':
      return t('Một mục đi chợ');
    case 'shopping_state':
      return t('Mục "{{name}}" trong danh sách đi chợ', { name: nameOfKey(conflict.entityId) });
    case 'photo':
      return t('Ảnh của một món');
    default:
      return t('Một dữ liệu');
  }
}

/** One version of the row as a short sentence, or "deleted". */
export function describeVersion(entityType: string, row: ConflictRow, t: Translate): string {
  if (row.deleted_at != null) return t('Đã xoá');
  switch (entityType) {
    case 'ingredient':
    case 'shopping_item':
      return joinParts([text(row.name), quantityOf(row)]);
    case 'step':
      return joinParts([text(row.text), minutesOf(row, t)]);
    case 'plan_entry':
      return joinParts([text(row.planned_on), slotOf(row, t), servingsOf(row, t)]);
    case 'shopping_state':
      return row.have ? t('Đã có ở nhà') : t('Cần mua');
    case 'photo':
      return t('Ảnh món');
    default:
      return t('Dữ liệu đã đổi');
  }
}

function nameOfKey(key: string): string {
  return key.split('|')[0] ?? key;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function quantityOf(row: ConflictRow): string {
  const quantity = typeof row.quantity === 'number' ? String(Number(row.quantity.toFixed(2))) : '';
  return joinParts([quantity, text(row.unit)], ' ');
}

function minutesOf(row: ConflictRow, t: Translate): string {
  const minutes = typeof row.timer_min === 'number' ? row.timer_min : 0;
  return minutes > 0 ? t('{{count}} phút', { count: minutes }) : '';
}

function slotOf(row: ConflictRow, t: Translate): string {
  const label = SLOT_LABELS[text(row.slot)];
  return label ? t(label) : '';
}

function servingsOf(row: ConflictRow, t: Translate): string {
  return typeof row.servings === 'number' ? t('{{count}} người', { count: row.servings }) : '';
}

function joinParts(parts: string[], separator = ' · '): string {
  return parts.filter((part) => part !== '').join(separator);
}
