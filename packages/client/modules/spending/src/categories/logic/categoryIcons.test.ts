import { hasSticker } from '@alavo-daily/design-system';
import { describe, expect, it } from 'vitest';

import { BILL_ICONS } from '../../bills/logic/billIcons';
import { GOAL_ICONS } from '../../goals/logic/goalIcons';
import { WALLET_KINDS } from '../../wallets/logic/walletKinds';
import { CATEGORY_ICONS } from './categoryIcons';

describe('icons chosen for spending entities', () => {
  it.each([
    ['category', CATEGORY_ICONS],
    ['bill', BILL_ICONS],
    ['goal', GOAL_ICONS],
    ['wallet', WALLET_KINDS.map((kind) => kind.icon)],
  ])('has a sticker for every %s icon', (_label, icons) => {
    const missing = icons.filter((icon) => !hasSticker(icon));
    expect(missing).toEqual([]);
  });
});
