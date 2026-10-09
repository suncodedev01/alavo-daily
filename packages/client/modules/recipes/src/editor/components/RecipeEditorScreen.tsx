import { useEngineQuery } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Screen } from '@alavo-daily/common/shell';
import { Button, Card, PageColumn, useLayout } from '@alavo-daily/design-system';
import { useReducer } from 'react';
import { useNavigate, useParams } from 'react-router';

import { QueryState } from '../../query-state';
import { blankDraft, draftFromRecipe, isDraftValid } from '../logic/draft';
import type { Draft } from '../types';
import { draftReducer } from '../logic/draftReducer';
import { CostSummary } from './CostSummary';
import { EditorChecklist, EditorDock } from './EditorDock';
import { GeneralSection } from './GeneralSection';
import { ImportEntry } from './ImportEntry';
import { IngredientSection } from './IngredientRows';
import { StepSection } from './StepRows';
import { useSaveRecipe } from '../hooks/useSaveRecipe';

export function RecipeEditorScreen() {
  const { id } = useParams();
  if (id === undefined) return <EditorForm initial={blankDraft()} />;
  return <EditExistingRecipe id={id} />;
}

function EditExistingRecipe({ id }: { id: string }) {
  const recipe = useEngineQuery('recipes.get', { id });
  return (
    <QueryState query={recipe}>
      {(loaded) => <EditorForm key={loaded.id} recipeId={loaded.id} initial={draftFromRecipe(loaded)} />}
    </QueryState>
  );
}

interface EditorFormProps {
  recipeId?: string;
  initial: Draft;
}

function EditorForm({ recipeId, initial }: EditorFormProps) {
  const t = useT();
  const layout = useLayout();
  const [draft, dispatch] = useReducer(draftReducer, initial);
  const save = useSaveRecipe(recipeId, initial.photo);
  return (
    <Screen
      title={recipeId === undefined ? t('Công thức mới') : t('Sửa công thức')}
      dock={layout === 'wide' ? <EditorDock draft={draft} /> : undefined}
    >
      <PageColumn maxWidth="detail" className="gap-4">
        {recipeId === undefined ? (
          <ImportEntry onFill={(filled) => dispatch({ type: 'replace', draft: filled })} />
        ) : null}
        {draft.imported ? <ImportedNotice /> : null}
        <GeneralSection draft={draft} dispatch={dispatch} />
        <IngredientSection draft={draft} dispatch={dispatch} />
        <StepSection draft={draft} dispatch={dispatch} />
        {layout === 'narrow' ? <NarrowSummary draft={draft} /> : null}
        {save.error ? (
          <p role="alert" className="text-sm text-destructive-fg">
            {save.error}
          </p>
        ) : null}
        <SaveBar
          valid={isDraftValid(draft)}
          saving={save.saving}
          backTo={recipeId === undefined ? '/recipes/list' : `/recipes/list/${recipeId}`}
          onSave={() => save.submit(draft)}
        />
      </PageColumn>
    </Screen>
  );
}

function NarrowSummary({ draft }: { draft: Draft }) {
  const t = useT();
  return (
    <>
      <Card padding="sm">
        <h2 className="mb-2 text-title font-semibold">{t('Chi phí ước tính')}</h2>
        <CostSummary draft={draft} />
      </Card>
      <Card padding="sm">
        <h2 className="mb-2 text-title font-semibold">{t('Kiểm tra trước khi lưu')}</h2>
        <EditorChecklist draft={draft} />
      </Card>
    </>
  );
}

function ImportedNotice() {
  const t = useT();
  return (
    <Card padding="sm">
      <p className="text-sm">
        <strong>{t('Đã đọc công thức.')}</strong>{' '}
        {t('Kiểm tra lại số lượng, đơn vị và các bước trước khi lưu, vì nguồn gốc có thể ghi khác.')}
      </p>
    </Card>
  );
}

interface SaveBarProps {
  valid: boolean;
  saving: boolean;
  backTo: string;
  onSave: () => void;
}

function SaveBar({ valid, saving, backTo, onSave }: SaveBarProps) {
  const t = useT();
  const navigate = useNavigate();
  return (
    <div className="sticky bottom-0 flex items-center gap-3 rounded-xl bg-surface p-3 shadow-card">
      <p className="min-w-0 flex-1 text-sm text-text-muted">
        {valid ? t('Sẵn sàng để lưu.') : t('Còn thiếu thông tin bắt buộc.')}
      </p>
      <Button variant="outline" onClick={() => navigate(backTo)}>
        {t('Huỷ')}
      </Button>
      <Button disabled={!valid || saving} onClick={onSave}>
        {t('Lưu công thức')}
      </Button>
    </div>
  );
}
