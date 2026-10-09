import { useT } from '@alavo-daily/common';
import { Avatar, SidebarFooter } from '@alavo-daily/design-system';

import { SyncRow } from '../../sync-status';
import { ThemeToggle } from '../../theme';

export function SidebarFooterContent() {
  return (
    <>
      <SyncRow />
      <UserFooter />
    </>
  );
}

function UserFooter() {
  const t = useT();
  return (
    <SidebarFooter className="max-compact:flex-col">
      <Avatar name={t('Bạn')} />
      <span className="min-w-0 flex-1 max-compact:hidden">
        <span className="block truncate text-sm font-medium">{t('Bạn')}</span>
        <span className="block truncate text-xs text-text-muted">{t('Dữ liệu trên máy này')}</span>
      </span>
      <ThemeToggle />
    </SidebarFooter>
  );
}
