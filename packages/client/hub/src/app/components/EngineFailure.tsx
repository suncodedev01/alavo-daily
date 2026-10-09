import { useT } from '@alavo-daily/common';
import { Button, EmptyState, Skeleton } from '@alavo-daily/design-system';

import { describeFailure } from '../logic/describeFailure';

export function EngineFailure({ message }: { message: string }) {
  const t = useT();
  const copy = describeFailure(message);
  return (
    <main className="grid min-h-dvh place-items-center bg-paper p-4 text-text-primary">
      <div role="alert" className="grid max-w-110 justify-items-center">
        <EmptyState
          icon="warning-circle"
          title={t(copy.title)}
          description={t(copy.description)}
          action={
            <Button variant="outline" leadingIcon="arrows-clockwise" onClick={() => window.location.reload()}>
              {t('Tải lại')}
            </Button>
          }
        />
        {copy.detail ? <p className="text-xs break-all text-text-muted">{copy.detail}</p> : null}
      </div>
    </main>
  );
}

export function AppLoading() {
  const t = useT();
  return (
    <div
      role="status"
      aria-label={t('Đang mở dữ liệu')}
      className="flex h-dvh gap-2 bg-paper p-2 max-lg:flex-col"
    >
      <Skeleton className="h-full w-64 max-lg:hidden" />
      <div className="grid flex-1 content-start gap-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
