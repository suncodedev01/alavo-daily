import { useT } from '@alavo-daily/common';
import { ContextSection } from '@alavo-daily/design-system';

import { LinkButton } from '../../navigation';

const NOTIFICATION_SETTINGS_PATH = '/settings/notifications';

export function BudgetNotificationInfo() {
  const t = useT();
  return (
    <ContextSection title={t('Nhắc nhở ngân sách')} defaultOpen>
      <div className="grid justify-items-start gap-3">
        <p className="text-sm text-text-secondary">
          {t('Bạn nhận thông báo khi một hạng mục chạm 85% ngân sách và khi hạng mục đó vượt ngân sách. Mỗi mốc chỉ báo một lần.')}
        </p>
        <LinkButton to={NOTIFICATION_SETTINGS_PATH} variant="outline" size="sm" leadingIcon="bell">
          {t('Cài đặt thông báo')}
        </LinkButton>
      </div>
    </ContextSection>
  );
}
