import { useT } from '@alavo-daily/common';
import { IconTile } from '@alavo-daily/design-system';

export function CardIntro({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex items-center gap-4">
      <IconTile icon={icon} size="lg" />
      <div>
        <h2 className="text-title font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{body}</p>
      </div>
    </div>
  );
}

export function WaitingChanges({ pending }: { pending: number }) {
  const t = useT();
  return (
    <p className="text-sm text-text-secondary">
      {t('{{count}} thay đổi trên máy này chưa được đồng bộ', { count: pending })}
    </p>
  );
}
