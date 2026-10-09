import type { DueLabel } from '../types';

type Translate = (key: string, values?: Record<string, string | number>) => string;

export function dueText(label: DueLabel, t: Translate): string {
  switch (label.kind) {
    case 'none':
      return t('Không đặt hạn');
    case 'today':
      return t('Đến hạn hôm nay');
    case 'overdue':
      return t('Đã quá hạn · {{date}}', { date: label.date });
    case 'days':
      return t('Còn {{n}} ngày · {{date}}', { n: label.count, date: label.date });
    case 'weeks':
      return t('Còn {{n}} tuần · {{date}}', { n: label.count, date: label.date });
    case 'months':
      return t('Còn {{n}} tháng · {{date}}', { n: label.count, date: label.date });
  }
}
