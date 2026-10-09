import { formatMinutes } from '@alavo-daily/common/format';
import { useLanguage, useT } from '@alavo-daily/common';
import { ContextSection, Icon } from '@alavo-daily/design-system';

import { checklistOf, parseMinutes } from '../logic/draft';
import type { ChecklistItem, Draft } from '../types';
import { CostSummary } from './CostSummary';

export function EditorChecklist({ draft }: { draft: Draft }) {
  const t = useT();
  return (
    <>
      <ul aria-label={t('Kiểm tra trước khi lưu')} className="grid gap-1">
        {checklistOf(draft).map((item) => (
          <li key={item.label} className="flex items-center gap-3 py-1.5 text-sm">
            <Icon
              name={item.done ? 'check-circle' : 'circle'}
              weight={item.done ? 'fill' : 'regular'}
              size="lg"
              className={item.done ? 'text-primary' : 'text-text-muted'}
            />
            <span className={item.done ? undefined : 'text-text-muted'}>{t(item.label)}</span>
            <span className="sr-only">{t(statusOf(item))}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-text-secondary">
        {t('Chỉ cần đặt tên món là lưu được. Nguyên liệu và các bước có thể thêm sau.')}
      </p>
    </>
  );
}

function statusOf({ done, optional }: ChecklistItem): string {
  if (done) return 'Đã xong';
  return optional ? 'Có thể thêm sau' : 'Chưa xong';
}

export function EditorDock({ draft }: { draft: Draft }) {
  const language = useLanguage();
  const t = useT();
  const minutes = parseMinutes(draft.prepMin) + parseMinutes(draft.cookMin);
  const ingredients = draft.ingredients.filter((item) => item.name.trim() !== '').length;
  const steps = draft.steps.filter((step) => step.text.trim() !== '').length;
  const timers = draft.steps.filter((step) => step.timerMin > 0).length;
  return (
    <>
      <ContextSection title={t('Kiểm tra trước khi lưu')} defaultOpen>
        <EditorChecklist draft={draft} />
      </ContextSection>
      <ContextSection title={t('Chi phí ước tính')} defaultOpen>
        <CostSummary draft={draft} />
      </ContextSection>
      <ContextSection title={t('Tóm tắt')} defaultOpen>
        <p className="text-title font-semibold">{minutes > 0 ? formatMinutes(minutes, language) : '—'}</p>
        <p className="mt-1 text-sm text-text-muted">{t('tổng thời gian')}</p>
        <p className="mt-3 text-sm text-text-secondary">
          {t('{{ingredients}} nguyên liệu · {{steps}} bước · {{timers}} bước có hẹn giờ', {
            ingredients,
            steps,
            timers,
          })}
        </p>
      </ContextSection>
      <ContextSection title={t('Mẹo nhập nhanh')} defaultOpen>
        <p className="text-sm text-text-secondary">
          {t('Mỗi bước có hẹn giờ sẽ hiện đồng hồ đếm ngược trong chế độ nấu ăn.')}
        </p>
      </ContextSection>
    </>
  );
}
