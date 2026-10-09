import { useId, useState } from 'react';

import { useT } from '@alavo-daily/common';
import { Field } from '@alavo-daily/design-system';

import { MAX_YEAR, MIN_YEAR, parseYear } from '../logic/menh';

const FULL_YEAR_LENGTH = 4;

export function MenhYearField({ yearText, onChange }: { yearText: string; onChange: (text: string) => void }) {
  const t = useT();
  const labelId = useId();
  const problemId = useId();
  const [leftField, setLeftField] = useState(false);
  const looksFinished = leftField || yearText.length >= FULL_YEAR_LENGTH;
  const invalid = yearText !== '' && parseYear(yearText) === null && looksFinished;
  return (
    <div className="grid gap-1">
      <span id={labelId} className="text-row text-text-secondary">
        {t('Năm sinh')}
      </span>
      <Field
        inputMode="numeric"
        maxLength={FULL_YEAR_LENGTH}
        placeholder="1995"
        autoComplete="off"
        aria-labelledby={labelId}
        aria-describedby={invalid ? problemId : undefined}
        invalid={invalid}
        value={yearText}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        onBlur={() => setLeftField(true)}
        className="w-32"
      />
      {invalid ? (
        <p id={problemId} className="text-row text-destructive-fg">
          {t('Nhập năm từ {{min}} đến {{max}}.', { min: MIN_YEAR, max: MAX_YEAR })}
        </p>
      ) : null}
    </div>
  );
}
