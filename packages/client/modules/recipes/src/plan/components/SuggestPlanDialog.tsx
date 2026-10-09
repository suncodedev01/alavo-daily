import { useEngineQuery, type MealSlot, type SuggestedEntry } from '@alavo-daily/common/engine';
import { useT } from '@alavo-daily/common';
import { Button, Eyebrow, Pill, ResponsiveDialog } from '@alavo-daily/design-system';
import { useState } from 'react';

import { ListSkeleton, QueryState } from '../../query-state';
import { MEAL_SLOTS, SLOT_LABELS } from '../../vocabulary';
import { useSuggestionEditor } from '../hooks/useSuggestionEditor';
import { DEFAULT_SUGGESTED_SLOTS, toggleSlot } from '../logic/suggestion';
import type { SuggestionRange } from '../types';
import { SuggestionList } from './SuggestionList';

export interface SuggestPlanDialogProps {
  open: boolean;
  range: SuggestionRange;
  today: string;
  servings: number;
  hasRecipes: boolean;
  onClose: () => void;
}

export function SuggestPlanDialog({ open, onClose, ...content }: SuggestPlanDialogProps) {
  const t = useT();
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t('Gợi ý thực đơn')}
      description={t('Xem trước, đổi món nếu chưa ưng, rồi bấm Áp dụng để thêm vào thực đơn.')}
      closeLabel={t('Đóng')}
    >
      {open ? <SuggestionContent {...content} onClose={onClose} /> : null}
    </ResponsiveDialog>
  );
}

type ContentProps = Omit<SuggestPlanDialogProps, 'open'>;

function SuggestionContent(props: ContentProps) {
  const [slots, setSlots] = useState<MealSlot[]>([...DEFAULT_SUGGESTED_SLOTS]);
  const [seed, setSeed] = useState(0);
  const query = useEngineQuery('recipes.suggest_plan', { ...props.range, slots, seed });
  return (
    <div className="grid gap-3">
      <SlotPicker slots={slots} onToggle={(slot) => setSlots(toggleSlot(slots, slot))} />
      <QueryState query={query} skeleton={<ListSkeleton rows={4} />}>
        {(entries) => (
          <SuggestionEditorView
            key={`${seed}|${slots.join(',')}`}
            entries={entries}
            {...props}
            onShuffle={() => setSeed(seed + 1)}
          />
        )}
      </QueryState>
    </div>
  );
}

function SlotPicker({ slots, onToggle }: { slots: MealSlot[]; onToggle: (slot: MealSlot) => void }) {
  const t = useT();
  return (
    <div>
      <Eyebrow as="div" className="mb-2 block">
        {t('Bữa cần gợi ý')}
      </Eyebrow>
      <div role="group" aria-label={t('Bữa cần gợi ý')} className="flex flex-wrap gap-1.5">
        {MEAL_SLOTS.map((slot) => (
          <Pill key={slot} selected={slots.includes(slot)} onClick={() => onToggle(slot)}>
            {t(SLOT_LABELS[slot])}
          </Pill>
        ))}
      </div>
    </div>
  );
}

interface EditorViewProps extends ContentProps {
  entries: SuggestedEntry[];
  onShuffle: () => void;
}

function SuggestionEditorView({ entries, today, servings, hasRecipes, onShuffle, onClose }: EditorViewProps) {
  const t = useT();
  const editor = useSuggestionEditor(entries, { servings, onApplied: onClose });
  if (entries.length === 0) return <NothingToSuggest hasRecipes={hasRecipes} onShuffle={onShuffle} />;
  const dropped = editor.entries.length === 0;
  return (
    <>
      {dropped ? (
        <p className="py-4 text-center text-sm text-text-muted">{t('Bạn đã bỏ hết món gợi ý.')}</p>
      ) : (
        <SuggestionList editor={editor} today={today} />
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-sm text-text-muted">
          {t('{{count}} món', { count: editor.entries.length })}
        </span>
        <Button variant="outline" leadingIcon="arrows-clockwise" disabled={editor.applying} onClick={onShuffle}>
          {t('Gợi ý lại tất cả')}
        </Button>
        <Button disabled={editor.applying || dropped} onClick={editor.apply}>
          {t('Áp dụng')}
        </Button>
      </div>
    </>
  );
}

function NothingToSuggest({ hasRecipes, onShuffle }: { hasRecipes: boolean; onShuffle: () => void }) {
  const t = useT();
  return (
    <div className="grid justify-items-center gap-2 py-4 text-center">
      <p className="text-sm text-text-muted">
        {hasRecipes
          ? t('Các bữa bạn chọn trong khoảng này đã có món rồi.')
          : t('Chưa có công thức nào để gợi ý. Hãy thêm công thức trước nhé.')}
      </p>
      {hasRecipes ? (
        <Button variant="outline" size="sm" onClick={onShuffle}>
          {t('Gợi ý lại')}
        </Button>
      ) : null}
    </div>
  );
}
