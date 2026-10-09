import { Avatar as VendorAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export type AvatarSize = 'sm' | 'md' | 'lg';

export type AvatarProps = {
  name: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
};

const SIZE_CLASS: Record<AvatarSize, string> = { sm: 'size-6', md: 'size-8', lg: 'size-10' };
const TEXT_CLASS: Record<AvatarSize, string> = { sm: 'text-xs', md: 'text-xs', lg: 'text-sm' };

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <VendorAvatar role="img" aria-label={name} className={cn(SIZE_CLASS[size], className)}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback className={cn('bg-surface-tint font-semibold text-text-secondary', TEXT_CLASS[size])}>
        {initialsOf(name)}
      </AvatarFallback>
    </VendorAvatar>
  );
}
