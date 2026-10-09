import { useT } from '@alavo-daily/common';
import { Icon } from '@alavo-daily/design-system';

import type { KeypadKey } from '../types';

const KEYS: KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'delete'];

const KEY_CLASS =
  'focus-ring grid h-12 place-items-center [@media(min-height:700px)]:h-13 rounded-xl text-2xl font-medium text-text-primary hover:bg-surface-tint active:bg-surface-tint';

export interface MoneyKeypadProps {
  onKey: (key: KeypadKey) => void;
}

export function MoneyKeypad({ onKey }: MoneyKeypadProps) {
  const t = useT();
  return (
    <div role="group" aria-label={t('Bàn phím nhập số tiền')} className="grid grid-cols-3 gap-1">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={key === 'delete' ? t('Xoá chữ số cuối') : undefined}
          className={KEY_CLASS}
          onClick={() => onKey(key)}
        >
          {key === 'delete' ? <Icon name="backspace" size="xl" /> : key}
        </button>
      ))}
    </div>
  );
}
