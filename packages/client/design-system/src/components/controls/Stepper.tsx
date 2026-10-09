import { cn } from '@/lib/utils';
import { useDesignSystemTexts } from '../../lib/texts';
import { Icon } from '../foundations/Icon';

export type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  decrementLabel?: string;
  incrementLabel?: string;
  format?: (value: number) => string;
  className?: string;
};

const BUTTON_CLASS =
  'focus-ring grid size-7 place-items-center rounded-full text-text-primary inset-ring inset-ring-line-strong hover:bg-surface disabled:pointer-events-none disabled:opacity-40 max-lg:size-11';

export function Stepper({
  value,
  onChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  label,
  decrementLabel,
  incrementLabel,
  format = String,
  className,
}: StepperProps) {
  const texts = useDesignSystemTexts();
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  return (
    <div role="group" aria-label={label} className={cn('inline-flex items-center gap-1', className)}>
      <button
        type="button"
        aria-label={decrementLabel ?? texts.decrease}
        disabled={value <= min}
        className={BUTTON_CLASS}
        onClick={() => onChange(clamp(value - step))}
      >
        <Icon name="minus" />
      </button>
      <output aria-live="polite" className="min-w-6 text-center text-base font-semibold max-lg:min-w-9 max-lg:text-lg">
        {format(value)}
      </output>
      <button
        type="button"
        aria-label={incrementLabel ?? texts.increase}
        disabled={value >= max}
        className={BUTTON_CLASS}
        onClick={() => onChange(clamp(value + step))}
      >
        <Icon name="plus" />
      </button>
    </div>
  );
}
