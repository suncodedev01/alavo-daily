import { formatVndInput } from '@alavo-daily/common/format';
import { Field } from '@alavo-daily/design-system';

export interface MoneyFieldProps {
  value: string;
  onValueChange: (formatted: string) => void;
  label: string;
  placeholder?: string;
  leadingIcon?: string;
  invalid?: boolean;
  autoFocus?: boolean;
}

export function MoneyField({ value, onValueChange, label, placeholder = '0', leadingIcon, invalid, autoFocus }: MoneyFieldProps) {
  return (
    <Field
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      placeholder={placeholder}
      leadingIcon={leadingIcon}
      invalid={invalid}
      autoFocus={autoFocus}
      trailing="₫"
      value={value}
      onChange={(event) => onValueChange(formatVndInput(event.target.value))}
    />
  );
}
