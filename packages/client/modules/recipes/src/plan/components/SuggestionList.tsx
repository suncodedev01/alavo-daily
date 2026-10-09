import type { SuggestedEntry } from '@alavo-daily/common/engine';
import { dayAndMonth, relativeDayLabel } from '@alavo-daily/common/format';
import { useLanguage, useT } from '@alavo-daily/common';
import { Eyebrow, IconButton, IconTile } from '@alavo-daily/design-system';

import { SLOT_LABELS } from '../../vocabulary';
import type { SuggestionEditor } from '../hooks/useSuggestionEditor';
import { entryKey, groupByDay } from '../logic/suggestion';

export interface SuggestionListProps {
  editor: SuggestionEditor;
  today: string;
}

export function SuggestionList({ editor, today }: SuggestionListProps) {
  const language = useLanguage();
  const t = useT();
  return (
    <div className="grid max-h-80 gap-3 overflow-y-auto">
      {groupByDay(editor.entries).map((day) => (
        <section key={day.date} aria-label={relativeDayLabel(day.date, today, language)} className="grid gap-1">
          <h3 className="text-sm font-semibold">{relativeDayLabel(day.date, today, language)}</h3>
          <ul aria-label={t('Món gợi ý ngày {{day}}', { day: dayAndMonth(day.date, language) })}>
            {day.entries.map((entry) => (
              <li key={entryKey(entry)}>
                <SuggestionRow entry={entry} editor={editor} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SuggestionRow({ entry, editor }: { entry: SuggestedEntry; editor: SuggestionEditor }) {
  const language = useLanguage();
  const t = useT();
  const slot = t(SLOT_LABELS[entry.slot]);
  const where = { slot, day: dayAndMonth(entry.date, language) };
  const rerolling = editor.rerollingKey === entryKey(entry);
  return (
    <div className="flex min-h-12 items-center gap-2" aria-busy={rerolling}>
      <Eyebrow className="w-10 shrink-0">{slot}</Eyebrow>
      <IconTile icon={entry.recipeIcon} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.recipeName}</span>
      <IconButton
        icon="arrows-clockwise"
        label={t('Đổi món bữa {{slot}} ngày {{day}}', where)}
        size="sm"
        disabled={rerolling || editor.applying}
        onClick={() => editor.reroll(entry)}
      />
      <IconButton
        icon="x"
        label={t('Bỏ bữa {{slot}} ngày {{day}} khỏi gợi ý', where)}
        size="sm"
        disabled={editor.applying}
        onClick={() => editor.remove(entry)}
      />
    </div>
  );
}
