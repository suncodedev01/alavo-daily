import type { ComponentProps, HTMLInputTypeAttribute, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '../foundations/Icon';

type NativePickerType = 'date' | 'time' | 'datetime-local' | 'month' | 'week';

export type FieldProps = Omit<ComponentProps<'input'>, 'type' | 'size' | 'ref'> & {
  type?: Exclude<HTMLInputTypeAttribute, NativePickerType>;
  leadingIcon?: string;
  trailing?: ReactNode;
  invalid?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  ref?: Ref<HTMLInputElement>;
};

const SHELL_CLASS =
  'flex h-9 items-center gap-2 rounded-4xl bg-surface px-3 text-text-muted inset-ring inset-ring-line-hairline transition-shadow focus-within:inset-ring-2 focus-within:inset-ring-ring has-aria-invalid:inset-ring-2 has-aria-invalid:inset-ring-destructive has-disabled:opacity-50 max-lg:h-12 max-lg:px-4 max-lg:text-base';

const INPUT_CLASS =
  'min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted disabled:cursor-not-allowed max-lg:text-base';

export function Field({
  leadingIcon,
  trailing,
  invalid = false,
  className,
  ref,
  inputRef,
  type = 'text',
  ...rest
}: FieldProps) {
  return (
    <label className={cn(SHELL_CLASS, className)}>
      {leadingIcon ? <Icon name={leadingIcon} size="lg" /> : null}
      <input
        ref={ref ?? inputRef}
        type={type}
        aria-invalid={invalid || undefined}
        className={INPUT_CLASS}
        {...rest}
      />
      {trailing ? <span className="shrink-0 text-sm text-text-muted">{trailing}</span> : null}
    </label>
  );
}

export type TextAreaProps = Omit<ComponentProps<'textarea'>, 'ref'> & {
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
};

const AREA_CLASS =
  'min-h-22 w-full resize-y rounded-xl bg-surface px-4 py-3 text-sm text-text-primary inset-ring inset-ring-line-hairline outline-none placeholder:text-text-muted focus:inset-ring-2 focus:inset-ring-ring aria-invalid:inset-ring-2 aria-invalid:inset-ring-destructive disabled:cursor-not-allowed disabled:opacity-50 max-lg:text-base lg:min-h-30';

export function TextArea({ invalid = false, className, ...rest }: TextAreaProps) {
  return <textarea aria-invalid={invalid || undefined} className={cn(AREA_CLASS, className)} {...rest} />;
}
