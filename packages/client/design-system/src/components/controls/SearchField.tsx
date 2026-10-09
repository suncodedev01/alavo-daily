import type { Ref } from 'react';
import { Field } from './Field';
import { IconButton } from './IconButton';

export type SearchFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  clearLabel?: string;
  className?: string;
  ref?: Ref<HTMLInputElement>;
};

export function SearchField({
  value,
  onValueChange,
  placeholder,
  label = 'Tìm kiếm',
  clearLabel = 'Xoá tìm kiếm',
  className,
  ref,
}: SearchFieldProps) {
  const clear = value ? (
    <IconButton
      icon="x"
      label={clearLabel}
      size="sm"
      className="-mr-2"
      onClick={() => onValueChange('')}
    />
  ) : null;
  return (
    <Field
      ref={ref}
      role="searchbox"
      aria-label={label}
      leadingIcon="magnifying-glass"
      placeholder={placeholder}
      value={value}
      trailing={clear}
      className={className}
      onChange={(event) => onValueChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && value) onValueChange('');
      }}
    />
  );
}
