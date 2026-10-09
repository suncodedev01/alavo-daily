import { useState, type ReactNode } from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { cn } from '@/lib/utils';
import { Icon } from '../foundations/Icon';

export type CheckboxProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  children?: ReactNode;
  className?: string;
};

const BOX_CLASS =
  'focus-ring grid size-5 shrink-0 place-items-center rounded-md text-primary-fg inset-ring-2 inset-ring-line-strong transition-colors data-checked:bg-primary data-checked:inset-ring-0 data-disabled:opacity-50 max-lg:size-6';

export function Checkbox({
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  label,
  children,
  className,
}: CheckboxProps) {
  const [inner, setInner] = useState(defaultChecked);
  const isChecked = checked ?? inner;
  const handleChange = (next: boolean) => {
    setInner(next);
    onCheckedChange?.(next);
  };
  const box = (
    <CheckboxPrimitive.Root
      checked={isChecked}
      disabled={disabled}
      aria-label={children ? undefined : label}
      onCheckedChange={handleChange}
      className={BOX_CLASS}
    >
      <CheckboxPrimitive.Indicator keepMounted className="opacity-0 data-checked:opacity-100">
        <Icon name="check" size={14} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
  if (!children) return box;
  return (
    <label className={cn('flex min-h-12 w-full items-center gap-3 py-2 text-left max-lg:min-h-15', className)}>
      {box}
      <span
        className={cn(
          'min-w-0 flex-1 text-sm font-medium max-lg:text-base',
          isChecked && 'text-text-muted line-through',
        )}
      >
        {children}
      </span>
    </label>
  );
}
