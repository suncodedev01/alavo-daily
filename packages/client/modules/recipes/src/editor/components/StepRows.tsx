import { useT } from '@alavo-daily/common';
import { Button, Card, Field, IconButton, Pill, TextArea } from '@alavo-daily/design-system';
import { useState } from 'react';

import { parseMinutes } from '../logic/draft';
import type { StepDraft } from '../types';
import type { SectionProps } from './GeneralSection';

export function StepSection({ draft, dispatch }: SectionProps) {
  const t = useT();
  const last = draft.steps.length - 1;
  return (
    <Card padding="md">
      <h2 className="mb-3 text-title font-semibold">
        {t('Các bước')} <span className="text-sm font-normal text-text-muted">{draft.steps.length}</span>
      </h2>
      <ol className="grid gap-4">
        {draft.steps.map((step, index) => (
          <li key={step.key}>
            <StepRow
              step={step}
              number={index + 1}
              isFirst={index === 0}
              isLast={index === last}
              dispatch={dispatch}
            />
          </li>
        ))}
      </ol>
      <Button
        variant="outline"
        size="sm"
        leadingIcon="plus"
        className="mt-3"
        onClick={() => dispatch({ type: 'add_step' })}
      >
        {t('Thêm bước')}
      </Button>
    </Card>
  );
}

interface StepRowProps {
  step: StepDraft;
  number: number;
  isFirst: boolean;
  isLast: boolean;
  dispatch: SectionProps['dispatch'];
}

function StepRow({ step, number, isFirst, isLast, dispatch }: StepRowProps) {
  const t = useT();
  return (
    <div className="flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-tint text-xs font-semibold">
        {number}
      </span>
      <div className="grid min-w-0 flex-1 gap-2">
        <TextArea
          aria-label={t('Bước {{number}}', { number })}
          placeholder={t('Mô tả bước {{number}}', { number })}
          value={step.text}
          onChange={(event) =>
            dispatch({ type: 'edit_step', key: step.key, changes: { text: event.target.value } })
          }
        />
        <StepTimer step={step} dispatch={dispatch} />
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <IconButton
          icon="caret-up"
          label={t('Chuyển bước {{number}} lên', { number })}
          size="sm"
          disabled={isFirst}
          onClick={() => dispatch({ type: 'move_step', key: step.key, by: -1 })}
        />
        <IconButton
          icon="caret-down"
          label={t('Chuyển bước {{number}} xuống', { number })}
          size="sm"
          disabled={isLast}
          onClick={() => dispatch({ type: 'move_step', key: step.key, by: 1 })}
        />
        <IconButton
          icon="trash"
          label={t('Xoá bước {{number}}', { number })}
          size="sm"
          onClick={() => dispatch({ type: 'remove_step', key: step.key })}
        />
      </div>
    </div>
  );
}

function StepTimer({ step, dispatch }: Pick<StepRowProps, 'step' | 'dispatch'>) {
  const t = useT();
  const toggle = () => dispatch({ type: 'toggle_timer', key: step.key });
  if (step.timerMin === 0) {
    return (
      <Pill className="w-fit" leadingIcon="timer" onClick={toggle}>
        {t('Thêm hẹn giờ')}
      </Pill>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <TimerMinutesField
        minutes={step.timerMin}
        onChange={(timerMin) => dispatch({ type: 'edit_step', key: step.key, changes: { timerMin } })}
      />
      <Button variant="ghost" size="sm" onClick={toggle}>
        {t('Bỏ hẹn giờ')}
      </Button>
    </div>
  );
}

function TimerMinutesField({ minutes, onChange }: { minutes: number; onChange: (minutes: number) => void }) {
  const t = useT();
  const [text, setText] = useState(String(minutes));
  const edit = (next: string) => {
    setText(next);
    const parsed = parseMinutes(next);
    if (parsed > 0) onChange(parsed);
  };
  return (
    <Field
      className="w-32"
      leadingIcon="timer"
      inputMode="numeric"
      aria-label={t('Phút hẹn giờ')}
      trailing={t('phút')}
      value={text}
      onChange={(event) => edit(event.target.value)}
      onBlur={() => setText(String(minutes))}
    />
  );
}
