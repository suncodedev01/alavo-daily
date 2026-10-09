import { useT } from '@alavo-daily/common';
import { Button, Icon } from '@alavo-daily/design-system';

export interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
}

export function InlineError({ message, onRetry }: InlineErrorProps) {
  const t = useT();
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-tint p-4 text-sm">
      <Icon name="warning-circle" size="lg" className="text-destructive-fg" />
      <span className="min-w-0 flex-1 text-text-secondary">{message}</span>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('Thử lại')}
        </Button>
      ) : null}
    </div>
  );
}
