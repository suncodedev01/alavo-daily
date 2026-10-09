import { describeEngineError } from '../../engine-errors';
import { Button, EmptyState, Skeleton } from '@alavo-daily/design-system';
import { useT } from '@alavo-daily/common';
import type { ReactNode } from 'react';

import type { QueryLike } from '../types';

export interface QueryStateProps<T> {
  query: QueryLike<T>;
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}

export function QueryState<T>({ query, skeleton, children }: QueryStateProps<T>) {
  if (query.isPending) return <>{skeleton ?? <ListSkeleton />}</>;
  if (query.isError || query.data === undefined) {
    return <LoadError error={query.error} onRetry={() => void query.refetch()} />;
  }
  return <>{children(query.data)}</>;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  const t = useT();
  return (
    <div role="status" aria-label={t('Đang tải')} className="grid gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const t = useT();
  return (
    <EmptyState
      icon="warning-circle"
      title={t('Không tải được dữ liệu')}
      description={describeEngineError(error, t)}
      action={
        <Button variant="outline" onClick={onRetry}>
          {t('Thử lại')}
        </Button>
      }
    />
  );
}
