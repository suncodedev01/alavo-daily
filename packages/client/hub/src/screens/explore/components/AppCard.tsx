import { useT, type ModuleManifest } from '@alavo-daily/common';
import { Button, IconTile, useLayout } from '@alavo-daily/design-system';

export interface AppCardProps {
  manifest: ModuleManifest;
  pinned: boolean;
  onOpen: () => void;
  onTogglePin: () => void;
}

export function AppCard({ manifest, pinned, onOpen, onTogglePin }: AppCardProps) {
  const t = useT();
  const size = useLayout() === 'wide' ? 'sm' : 'lg';
  const name = t(manifest.name);
  return (
    <div className="grid gap-4 rounded-lg bg-surface-tint p-4">
      <div className="flex items-center gap-3">
        <IconTile icon={manifest.icon} size="lg" tone="brand" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-text-muted">{t(manifest.description)}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size={size} aria-label={t('Mở {{name}}', { name })} onClick={onOpen}>
          {t('Mở')}
        </Button>
        <Button
          size={size}
          variant={pinned ? 'affirm' : 'outline'}
          leadingIcon="push-pin"
          aria-pressed={pinned}
          aria-label={pinned ? t('Bỏ ghim {{name}}', { name }) : t('Ghim {{name}}', { name })}
          onClick={onTogglePin}
        >
          {pinned ? t('Đã ghim') : t('Ghim')}
        </Button>
      </div>
    </div>
  );
}
