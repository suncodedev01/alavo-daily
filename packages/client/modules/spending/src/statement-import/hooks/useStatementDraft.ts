import { useEngineMutation } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { useState } from 'react';

import { describeEngineError } from '../../engine-errors';
import { patchRow, setAllIncluded, toDraftRows } from '../logic/draftRows';
import type { DraftRow, ImportStep } from '../types';

export interface StatementDraft {
  step: ImportStep;
  text: string;
  setText: (text: string) => void;
  rows: DraftRow[];
  error: string | null;
  reading: boolean;
  readStatement: () => void;
  backToInput: () => void;
  patch: (line: number, changes: Partial<DraftRow>) => void;
  setAllIncluded: (include: boolean) => void;
}

/** The statement text, what the engine made of it, and the person's edits on each line. */
export function useStatementDraft(): StatementDraft {
  const t = useT();
  const preview = useEngineMutation('spending.import_preview');
  const [step, setStep] = useState<ImportStep>('input');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const readStatement = () =>
    preview.mutate(
      { csv: text },
      {
        onSuccess: (result) => {
          setRows(toDraftRows(result));
          setError(null);
          setStep('review');
        },
        onError: (failure) => setError(describeEngineError(failure, t)),
      },
    );

  return {
    step,
    text,
    setText,
    rows,
    error,
    reading: preview.isPending,
    readStatement,
    backToInput: () => setStep('input'),
    patch: (line, changes) => setRows((current) => patchRow(current, line, changes)),
    setAllIncluded: (include) => setRows((current) => setAllIncluded(current, include)),
  };
}
