import { useT } from '@alavo-daily/common';
import { Skeleton } from '@alavo-daily/design-system';
import type { ReactNode } from 'react';

import { describeEngineError } from '../../engine-errors';
import { InlineError } from './InlineError';
import type { QueryLike } from '../types';

export interface LoadableProps<T> {
  query: QueryLike<T>;
  skeleton?: ReactNode;
  skeletonClassName?: string;
  children: (data: T) => ReactNode;
}

export function Loadable<T>({ query, skeleton, skeletonClassName, children }: LoadableProps<T>) {
  const t = useT();
  if (query.isError) {
    return <InlineError message={describeEngineError(query.error, t)} onRetry={() => void query.refetch()} />;
  }
  if (query.isPending || query.data === undefined) {
    return (
      <div role="status" aria-label={t('Đang tải')} className={skeletonClassName}>
        {skeleton ?? <Skeleton className="h-20 w-full" />}
      </div>
    );
  }
  return <>{children(query.data)}</>;
}

export function SkeletonRows({ count, className = 'h-12 w-full' }: { count: number; className?: string }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={className} />
      ))}
    </div>
  );
}
