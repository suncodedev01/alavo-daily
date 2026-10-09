import { useT } from '@alavo-daily/common';
import { Card, Eyebrow, Field, Icon, Pill, Stepper } from '@alavo-daily/design-system';
import type { Dispatch } from 'react';

import { PhotoField } from '../../photo';
import { MAX_SERVINGS, MIN_SERVINGS, RECIPE_TAGS } from '../../vocabulary';
import type { Draft } from '../types';
import type { DraftAction } from '../types';

export interface SectionProps {
  draft: Draft;
  dispatch: Dispatch<DraftAction>;
}

export function GeneralSection({ draft, dispatch }: SectionProps) {
  const t = useT();
  return (
    <Card padding="md" className="grid gap-4">
      <h2 className="text-title font-semibold">{t('Thông tin chung')}</h2>
      <Field
        leadingIcon="book-open"
        aria-label={t('Tên món')}
        placeholder={t('Tên món, ví dụ: Gà kho gừng')}
        value={draft.name}
        onChange={(event) => dispatch({ type: 'set_field', field: 'name', value: event.target.value })}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <MinutesField
          label={t('Phút chuẩn bị')}
          icon="timer"
          value={draft.prepMin}
          field="prepMin"
          dispatch={dispatch}
        />
        <MinutesField
          label={t('Phút nấu')}
          icon="fire"
          value={draft.cookMin}
          field="cookMin"
          dispatch={dispatch}
        />
        <div className="flex items-center gap-2 px-2 sm:col-span-2">
          <Icon name="users" size="lg" className="text-text-muted" />
          <span className="flex-1 text-sm">{t('Khẩu phần')}</span>
          <Stepper
            value={draft.servings}
            min={MIN_SERVINGS}
            max={MAX_SERVINGS}
            label={t('Khẩu phần')}
            decrementLabel={t('Giảm khẩu phần')}
            incrementLabel={t('Tăng khẩu phần')}
            onChange={(servings) => dispatch({ type: 'set_servings', servings })}
          />
        </div>
      </div>
      <TagPicker draft={draft} dispatch={dispatch} />
      <PhotoField photo={draft.photo} onChange={(photo) => dispatch({ type: 'set_photo', photo })} />
    </Card>
  );
}

interface MinutesFieldProps {
  label: string;
  icon: string;
  value: string;
  field: 'prepMin' | 'cookMin';
  dispatch: Dispatch<DraftAction>;
}

function MinutesField({ label, icon, value, field, dispatch }: MinutesFieldProps) {
  const t = useT();
  return (
    <Field
      leadingIcon={icon}
      inputMode="numeric"
      aria-label={label}
      placeholder={label}
      trailing={t('phút')}
      value={value}
      onChange={(event) => dispatch({ type: 'set_field', field, value: event.target.value })}
    />
  );
}

function TagPicker({ draft, dispatch }: SectionProps) {
  const t = useT();
  const tags = [...RECIPE_TAGS, ...draft.tags.filter((tag) => !RECIPE_TAGS.includes(tag))];
  return (
    <div>
      <Eyebrow as="div" className="mb-2 block">
        {t('Phân loại')}
      </Eyebrow>
      <div role="group" aria-label={t('Phân loại')} className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Pill
            key={tag}
            selected={draft.tags.includes(tag)}
            onClick={() => dispatch({ type: 'toggle_tag', tag })}
          >
            {tag}
          </Pill>
        ))}
      </div>
    </div>
  );
}
