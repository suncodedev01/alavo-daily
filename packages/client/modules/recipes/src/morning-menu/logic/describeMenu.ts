import type { MorningMenu } from '@alavo-daily/common';

import { SLOT_LABELS } from '../../vocabulary';
import type { MenuText } from './reminders';

type Translate = (key: string, values?: Record<string, string | number>) => string;

export function describeMenu(menu: MorningMenu, t: Translate): MenuText {
  const title = t('Hôm nay ăn gì?');
  if (menu.source === 'suggested') {
    const name = menu.dishes[0]?.name ?? '';
    return { title, body: t('Hôm nay bạn chưa chọn món. Thử {{name}} nhé?', { name }) };
  }
  const dishes = menu.dishes
    .map((dish) => (dish.slot ? `${t(SLOT_LABELS[dish.slot])}: ${dish.name}` : dish.name))
    .join(' · ');
  return { title, body: t('Hôm nay bạn ăn: {{dishes}}. Nhớ mua nguyên liệu nhé.', { dishes }) };
}
