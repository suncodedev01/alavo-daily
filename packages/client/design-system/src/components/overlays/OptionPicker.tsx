import { cn } from '@/lib/utils';
import { Icon } from '../foundations/Icon';
import { Menu, MenuItem, type Alignment, type Placement } from './Menu';

export type PickerOption = { value: string; label: string; hint?: string; icon?: string };

export type OptionPickerProps = {
  value: string | null;
  onChange: (value: string) => void;
  options: readonly PickerOption[];
  placement?: Placement;
  align?: Alignment;
  label?: string;
  placeholder?: string;
  leadingIcon?: string;
  className?: string;
};

const TRIGGER_CLASS =
  'focus-ring flex h-9 w-full items-center gap-2 rounded-4xl bg-surface px-3 text-left text-sm text-text-primary inset-ring inset-ring-line-hairline aria-expanded:inset-ring-2 aria-expanded:inset-ring-ring max-lg:h-12 max-lg:px-4 max-lg:text-base';

export function OptionPicker({
  value,
  onChange,
  options,
  placement = 'bottom',
  align = 'start',
  label,
  placeholder = 'Chọn',
  leadingIcon,
  className,
}: OptionPickerProps) {
  const selected = options.find((option) => option.value === value);
  const shownLabel = selected?.label ?? placeholder;
  const icon = selected?.icon ?? leadingIcon;
  const trigger = (
    <button
      type="button"
      aria-label={label ? `${label}: ${shownLabel}` : undefined}
      className={cn(TRIGGER_CLASS, className)}
    >
      {icon ? <Icon name={icon} size="lg" className="text-text-muted" /> : null}
      <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-text-muted')}>{shownLabel}</span>
      <Icon name="caret-down" className="text-text-muted" />
    </button>
  );
  return (
    <Menu trigger={trigger} placement={placement} align={align} className="min-w-(--anchor-width)">
      {options.map((option) => (
        <MenuItem
          key={option.value}
          icon={option.icon}
          hint={option.hint}
          selected={option.value === value}
          onSelect={() => onChange(option.value)}
        >
          {option.label}
        </MenuItem>
      ))}
    </Menu>
  );
}
