import { useT } from '@alavo-daily/common';
import { Icon } from '@alavo-daily/design-system';

export function AutoBadge() {
  const t = useT();
  return (
    <span
      className={
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-sm bg-surface-tint px-1.5 ' +
        'text-micro font-semibold text-text-secondary'
      }
    >
      <Icon name="arrows-clockwise" size={12} />
      {t('Tự động')}
    </span>
  );
}
