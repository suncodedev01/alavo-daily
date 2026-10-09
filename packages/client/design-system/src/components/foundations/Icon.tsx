import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { FALLBACK_ICON, ICON_REGISTRY, type IconComponent } from './iconRegistry';

const NAMED_SIZES = { sm: 14, md: 16, lg: 20, xl: 24 } as const;
const FILL_SUFFIX = '-fill';

export type IconSize = keyof typeof NAMED_SIZES | number;
export type IconWeight = 'regular' | 'fill';

export type IconProps = Omit<ComponentProps<'svg'>, 'name' | 'ref' | 'color'> & {
  name: string;
  size?: IconSize;
  weight?: IconWeight;
  label?: string;
};

type ResolvedIcon = { component: IconComponent; weight: IconWeight; known: boolean };

export function resolveIcon(name: string, weight: IconWeight = 'regular'): ResolvedIcon {
  const exact = ICON_REGISTRY[name];
  if (exact) return { component: exact, weight, known: true };
  const base = name.endsWith(FILL_SUFFIX) ? name.slice(0, -FILL_SUFFIX.length) : null;
  const baseComponent = base ? ICON_REGISTRY[base] : undefined;
  if (baseComponent) return { component: baseComponent, weight: 'fill', known: true };
  return { component: FALLBACK_ICON, weight, known: false };
}

export function Icon({ name, size = 'md', weight = 'regular', label, className, ...rest }: IconProps) {
  const resolved = resolveIcon(name, weight);
  const Component = resolved.component;
  const pixels = typeof size === 'number' ? size : NAMED_SIZES[size];
  const accessibility = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <Component
      size={pixels}
      weight={resolved.weight}
      className={cn('inline-block shrink-0 align-middle', className)}
      data-icon-name={resolved.known ? name : undefined}
      data-icon-fallback={resolved.known ? undefined : name}
      {...accessibility}
      {...rest}
    />
  );
}
