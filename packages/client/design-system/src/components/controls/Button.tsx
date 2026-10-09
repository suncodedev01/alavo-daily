import type { ComponentProps } from 'react';
import { Button as VendorButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Icon } from '../foundations/Icon';

export type ButtonVariant =
  | 'primary'
  | 'outline'
  | 'ghost'
  | 'affirm'
  | 'destructive'
  | 'destructive-outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

type VendorProps = ComponentProps<typeof VendorButton>;

export type ButtonProps = Omit<VendorProps, 'variant' | 'size'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: string;
  trailingIcon?: string;
};

const VENDOR_VARIANT: Record<ButtonVariant, NonNullable<VendorProps['variant']>> = {
  primary: 'default',
  outline: 'outline',
  ghost: 'ghost',
  affirm: 'ghost',
  destructive: 'destructive',
  'destructive-outline': 'outline',
};

const VENDOR_SIZE: Record<ButtonSize, NonNullable<VendorProps['size']>> = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
  icon: 'icon',
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg shadow-raised hover:bg-primary-hover',
  outline:
    'border-line-strong bg-transparent text-text-primary hover:bg-surface-tint hover:text-text-primary aria-expanded:bg-surface-tint',
  ghost:
    'text-text-primary hover:bg-surface-tint hover:text-text-primary aria-expanded:bg-surface-tint dark:hover:bg-surface-tint',
  affirm: 'bg-accent text-accent-fg hover:bg-accent/80 hover:text-accent-fg',
  destructive:
    'bg-destructive text-on-solid shadow-raised hover:bg-destructive-hover focus-visible:bg-destructive dark:bg-destructive dark:hover:bg-destructive-hover',
  'destructive-outline':
    'border-line-strong bg-transparent text-destructive-fg hover:bg-surface-tint hover:text-destructive-fg',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 has-data-[icon=inline-start]:pl-3 has-data-[icon=inline-end]:pr-3',
  md: 'h-9 gap-1.5 px-4 has-data-[icon=inline-start]:pl-4 has-data-[icon=inline-end]:pr-4',
  lg: 'h-11 gap-2 px-5 text-base has-data-[icon=inline-start]:pl-5 has-data-[icon=inline-end]:pr-5',
  icon: 'size-9 px-0 max-lg:size-11',
};

const FOCUS_CLASS =
  'focus-ring focus-visible:border-transparent focus-visible:ring-0 active:translate-y-0';

export function Button({
  variant = 'primary',
  size = 'md',
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <VendorButton
      variant={VENDOR_VARIANT[variant]}
      size={VENDOR_SIZE[size]}
      className={cn(SIZE_CLASS[size], VARIANT_CLASS[variant], FOCUS_CLASS, className)}
      {...rest}
    >
      {leadingIcon ? <Icon name={leadingIcon} data-icon="inline-start" /> : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} data-icon="inline-end" /> : null}
    </VendorButton>
  );
}
