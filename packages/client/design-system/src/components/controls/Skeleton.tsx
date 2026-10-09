import { Skeleton as VendorSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type SkeletonProps = { className?: string };

export function Skeleton({ className }: SkeletonProps) {
  return (
    <VendorSkeleton
      aria-hidden
      className={cn('rounded-lg bg-surface-tint motion-reduce:animate-none', className)}
    />
  );
}
