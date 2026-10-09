import { useT } from '@alavo-daily/common';
import { useToast } from '@alavo-daily/design-system';

import { describeEngineError } from '../logic/engineMessage';

export function useReportError(): (error: unknown) => void {
  const t = useT();
  const { toast } = useToast();
  return (error) => toast(describeEngineError(error, t));
}
