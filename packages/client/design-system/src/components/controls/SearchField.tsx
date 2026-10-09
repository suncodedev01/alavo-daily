import type { Ref } from 'react';
import { cn } from '@/lib/utils';
import { Field } from './Field';
import { useDesignSystemTexts } from '../../lib/texts';
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
  label,
  clearLabel,
  className,
  ref,
}: SearchFieldProps) {
  const texts = useDesignSystemTexts();
  const clear = value ? (
    <IconButton
      icon="x"
      label={clearLabel ?? texts.clearSearch}
      size="sm"
      className="-mr-2"
      onClick={() => onValueChange('')}
    />
  ) : null;
  return (
    <Field
      ref={ref}
      role="searchbox"
      aria-label={label ?? texts.searchLabel}
      leadingIcon="magnifying-glass"
      placeholder={placeholder}
      value={value}
      trailing={clear}
      className={cn('shrink-0', className)}
      onChange={(event) => onValueChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && value) onValueChange('');
      }}
    />
  );
}
