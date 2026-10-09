import { useT, type ModuleManifest } from '@alavo-daily/common';
import { Button, ContextSection, IconTile } from '@alavo-daily/design-system';

export interface ExploreDockProps {
  pinned: ModuleManifest[];
  onUnpin: (moduleId: string) => void;
}

export function ExploreDock({ pinned, onUnpin }: ExploreDockProps) {
  const t = useT();
  return (
    <>
      <ContextSection title={t('Đã ghim ({{count}})', { count: pinned.length })} defaultOpen>
        {pinned.length === 0 ? (
          <p className="text-sm text-text-muted">{t('Chưa ghim ứng dụng nào.')}</p>
        ) : (
          pinned.map((manifest) => (
            <div key={manifest.id} className="flex items-center gap-3 py-1">
              <IconTile icon={manifest.icon} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{t(manifest.name)}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('Bỏ ghim {{name}}', { name: t(manifest.name) })}
                onClick={() => onUnpin(manifest.id)}
              >
                {t('Bỏ ghim')}
              </Button>
            </div>
          ))
        )}
      </ContextSection>
      <ContextSection title={t('Ghim để làm gì')} defaultOpen>
        <p className="text-sm text-text-secondary">
          {t(
            'Ứng dụng đã ghim hiện ở thanh bên trên máy tính và ở thanh điều hướng dưới cùng trên điện thoại, nên mở được bằng một lần chạm. Những ứng dụng còn lại luôn tìm được ở trang này.',
          )}
        </p>
      </ContextSection>
    </>
  );
}
