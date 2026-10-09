import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

export type SwitchProps = Omit<SwitchPrimitive.Root.Props, 'className'> & {
  label?: string;
  className?: string;
};

const ROOT_CLASS =
  'focus-ring relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-line-strong transition-colors data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50 max-lg:h-7.75 max-lg:w-12.75 max-lg:after:absolute max-lg:after:inset-x-0 max-lg:after:-inset-y-2 max-lg:after:content-[""]';

const THUMB_CLASS =
  'pointer-events-none block size-4 translate-x-0.5 rounded-full bg-white shadow-raised transition-transform data-checked:translate-x-4.5 max-lg:size-6.75 max-lg:data-checked:translate-x-5.5';

export function Switch({ label, className, ...rest }: SwitchProps) {
  return (
    <SwitchPrimitive.Root aria-label={label} className={cn(ROOT_CLASS, className)} {...rest}>
      <SwitchPrimitive.Thumb className={THUMB_CLASS} />
    </SwitchPrimitive.Root>
  );
}
