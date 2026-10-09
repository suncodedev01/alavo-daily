import { useT } from '@alavo-daily/common';
import { useLayout } from '@alavo-daily/design-system';

import { normalizeAmount } from '../logic/transactionForm';

export interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function AmountInput({ value, onChange, error }: AmountInputProps) {
  const layout = useLayout();
  const t = useT();
  return (
    <div className="grid gap-2">
      {layout === 'wide' ? (
        <WideAmount value={value} onChange={onChange} invalid={Boolean(error)} />
      ) : (
        <NarrowAmount value={value} />
      )}
      {error ? (
        <p role="alert" className="text-center text-sm text-destructive-fg">
          {t(error)}
        </p>
      ) : null}
    </div>
  );
}

function WideAmount({ value, onChange, invalid }: { value: string; onChange: (value: string) => void; invalid: boolean }) {
  const t = useT();
  return (
    <label className="flex items-baseline justify-center gap-2 py-2">
      <input
        autoFocus
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        aria-label={t('Số tiền')}
        aria-invalid={invalid || undefined}
        value={value}
        onChange={(event) => onChange(normalizeAmount(event.target.value))}
        className="focus-ring w-full max-w-64 rounded-lg bg-transparent text-center text-display font-semibold text-text-primary outline-none placeholder:text-text-muted"
      />
      <span className="text-2xl text-text-muted">₫</span>
    </label>
  );
}

function NarrowAmount({ value }: { value: string }) {
  const t = useT();
  return (
    <div className="py-2 text-center">
      <output aria-label={t('Số tiền')} className="block text-display font-semibold text-text-primary">
        {value === '' ? '0' : value} ₫
      </output>
    </div>
  );
}
