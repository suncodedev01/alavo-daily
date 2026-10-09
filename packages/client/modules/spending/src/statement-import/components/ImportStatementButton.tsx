import { useT } from '@alavo-daily/common';
import { useLayout } from '@alavo-daily/design-system';

import { LinkButton } from '../../navigation';
import { IMPORT_STATEMENT_PATH } from '../logic/paths';

/** The "Nhập sao kê" entry in the Transactions header. */
export function ImportStatementButton() {
  const t = useT();
  const narrow = useLayout() === 'narrow';
  return (
    <LinkButton
      to={IMPORT_STATEMENT_PATH}
      variant="outline"
      size={narrow ? 'icon' : 'md'}
      leadingIcon="upload-simple"
      aria-label={narrow ? t('Nhập sao kê') : undefined}
    >
      {narrow ? null : t('Nhập sao kê')}
    </LinkButton>
  );
}
