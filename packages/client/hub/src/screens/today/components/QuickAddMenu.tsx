import { useNavigate } from 'react-router';

import { useT } from '@alavo-daily/common';
import { Button, Menu, MenuItem } from '@alavo-daily/design-system';

import { useModules } from '../../../module-registry';

export function QuickAddMenu() {
  const t = useT();
  const navigate = useNavigate();
  const actions = useModules().flatMap((manifest) => manifest.quickActions ?? []);
  if (actions.length === 0) return null;
  return (
    <Menu
      align="end"
      trigger={
        <Button leadingIcon="plus" trailingIcon="caret-down">
          {t('Thêm nhanh')}
        </Button>
      }
    >
      {actions.map((action) => (
        <MenuItem key={action.id} icon={action.icon} onSelect={() => navigate(action.path)}>
          {t(action.label)}
        </MenuItem>
      ))}
    </Menu>
  );
}
