import { useT } from '@alavo-daily/common';
import { IconButton } from '@alavo-daily/design-system';

import { useSettings, useUpdateSettings } from '../../hub-settings';
import { isDarkTheme, oppositeTheme } from '../logic/theme';

export function ThemeToggle() {
  const t = useT();
  const settings = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();
  const theme = settings.data?.theme ?? 'light';
  return (
    <IconButton
      icon={isDarkTheme(theme) ? 'sun' : 'moon'}
      label={t('Đổi giao diện sáng/tối')}
      onClick={() => updateSettings({ theme: oppositeTheme(theme) })}
    />
  );
}
