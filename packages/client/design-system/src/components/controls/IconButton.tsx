import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from './Button';
import { Icon, type IconWeight } from '../foundations/Icon';

export type IconButtonVariant = 'ghost' | 'outline' | 'surface';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export type IconButtonProps = Omit<ButtonProps, 'variant' | 'size' | 'leadingIcon' | 'trailingIcon' | 'children'> & {
  icon: string;
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  weight?: IconWeight;
  badge?: boolean;
};

const BUTTON_VARIANT = { ghost: 'ghost', outline: 'outline', surface: 'ghost' } as const;

const SIZE_CLASS: Record<IconButtonSize, string> = {
  sm: 'size-8 max-lg:size-11',
  md: 'size-9 max-lg:size-11',
  lg: 'size-11',
};

const SURFACE_CLASS = 'bg-surface shadow-hairline hover:bg-surface-tint';

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  weight,
  badge = false,
  className,
  ...rest
}: IconButtonProps) {
  const surface = variant === 'surface';
  return (
    <Button
      variant={BUTTON_VARIANT[variant]}
      size="icon"
      aria-label={label}
      data-badge={badge ? '' : undefined}
      className={cn('relative', SIZE_CLASS[size], surface && SURFACE_CLASS, className)}
      {...rest}
    >
      <Icon name={icon} size="lg" weight={weight} />
      {badge ? (
        <i
          aria-hidden
          className={cn(
            'absolute top-2 right-2 size-2 rounded-full bg-primary ring-2',
            surface ? 'ring-surface' : 'ring-paper',
          )}
        />
      ) : null}
    </Button>
  );
}
