import { useLocation } from 'react-router';

import { Screen, useT, type ModuleManifest } from '@alavo-daily/common';
import { EmptyState, PageColumn } from '@alavo-daily/design-system';

import { useModules } from '../../../module-registry';
import { LinkButton } from '../../../router-links';
import { findModuleAt, isPathActive } from '../../../module-navigation';

export function UnknownPath() {
  const modules = useModules();
  const { pathname } = useLocation();
  const manifest = findModuleAt(modules, pathname);
  return manifest ? <NotBuiltYet manifest={manifest} pathname={pathname} /> : <NotFound />;
}

function NotBuiltYet({ manifest, pathname }: { manifest: ModuleManifest; pathname: string }) {
  const t = useT();
  const view = manifest.views.find((item) => isPathActive(pathname, item.path));
  return (
    <Screen title={t(view?.label ?? manifest.name)}>
      <PageColumn maxWidth="detail">
        <EmptyState
          icon="wrench"
          title={t('Màn hình này đang được hoàn thiện')}
          description={t('Phần này của {{name}} chưa sẵn sàng. Bạn vẫn dùng được các phần khác.', {
            name: t(manifest.name),
          })}
          action={<BackToToday />}
        />
      </PageColumn>
    </Screen>
  );
}

function NotFound() {
  const t = useT();
  return (
    <Screen title={t('Không tìm thấy trang')}>
      <PageColumn maxWidth="detail">
        <EmptyState
          icon="question"
          title={t('Không tìm thấy trang này')}
          description={t('Đường dẫn có thể đã cũ hoặc bị gõ sai.')}
          action={<BackToToday />}
        />
      </PageColumn>
    </Screen>
  );
}

function BackToToday() {
  const t = useT();
  return (
    <LinkButton variant="outline" to="/today">
      {t('Về Hôm nay')}
    </LinkButton>
  );
}
