import { useEngineMutation } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Field } from '@alavo-daily/design-system';
import { useState, type FormEvent } from 'react';

import { useReportError } from '../../engine-errors';

export function AddCustomItem() {
  const t = useT();
  const reportError = useReportError();
  const [name, setName] = useState('');
  const addItem = useEngineMutation('recipes.add_shopping_item');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed === '') return;
    addItem.mutate({ name: trimmed }, { onSuccess: () => setName(''), onError: reportError });
  };
  return (
    <form onSubmit={submit}>
      <Field
        leadingIcon="plus"
        aria-label={t('Thêm món')}
        placeholder={t('Thêm món lẻ, ví dụ: sữa tươi')}
        enterKeyHint="done"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
    </form>
  );
}
