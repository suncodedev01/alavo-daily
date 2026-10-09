import { useT } from '@alavo-daily/common';

import { LinkButton } from '../../navigation';
import { SpendingScreen } from '../../spending-screen';
import { transactionListPath } from '../../transaction-model';
import { useStatementDraft } from '../hooks/useStatementDraft';
import { StatementInput } from './StatementInput';
import { StatementReview } from './StatementReview';

export function ImportStatementScreen() {
  const t = useT();
  const draft = useStatementDraft();
  return (
    <SpendingScreen title={t('Nhập sao kê')} primaryAction={null}>
      <LinkButton
        to={transactionListPath(null)}
        variant="ghost"
        size="sm"
        leadingIcon="caret-left"
        className="justify-self-start"
      >
        {t('Giao dịch')}
      </LinkButton>
      {draft.step === 'input' ? <StatementInput draft={draft} /> : <StatementReview draft={draft} />}
    </SpendingScreen>
  );
}
