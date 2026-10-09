import { useT } from '@alavo-daily/common';
import { Pill, Switch } from '@alavo-daily/design-system';

import { lunarYearOfChoice, type MenhChoice } from '../logic/menhChoice';
import { MENHS } from '../logic/menhInfo';
import type { MenhId, PaletteId } from '../types';
import { MenhResult } from './MenhResult';
import { MenhYearField } from './MenhYearField';

export interface MenhPickerProps {
  choice: MenhChoice;
  paletteId: PaletteId;
  onYearText: (text: string) => void;
  onBeforeTet: (value: boolean) => void;
  onMenh: (menh: MenhId) => void;
  onUsePalette: (id: PaletteId) => void;
}

export function MenhPicker({ choice, paletteId, ...handlers }: MenhPickerProps) {
  const t = useT();
  return (
    <section
      aria-label={t('Chọn bộ màu theo mệnh')}
      className="grid gap-3 rounded-xl bg-surface p-4 shadow-card"
    >
      <h3 className="text-title font-semibold">{t('Chọn bộ màu theo mệnh')}</h3>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <MenhYearField yearText={choice.yearText} onChange={handlers.onYearText} />
        <BeforeTetSwitch checked={choice.beforeTet} onChange={handlers.onBeforeTet} />
      </div>
      <div role="group" aria-label={t('Mệnh')} className="flex flex-wrap gap-2">
        {MENHS.map((menh) => (
          <Pill key={menh.id} selected={menh.id === choice.menh} onClick={() => handlers.onMenh(menh.id)}>
            {t(menh.name)}
          </Pill>
        ))}
      </div>
      {choice.menh === null ? (
        <p className="text-row text-text-secondary">
          {t('Nhập năm sinh hoặc chọn mệnh để xem bộ màu hợp.')}
        </p>
      ) : (
        <MenhResult
          menh={choice.menh}
          lunarYear={lunarYearOfChoice(choice)}
          paletteId={paletteId}
          onUsePalette={handlers.onUsePalette}
        />
      )}
    </section>
  );
}

function BeforeTetSwitch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  const t = useT();
  const label = t('Sinh trước Tết (tháng 1–2)');
  return (
    <div className="flex min-h-11 items-center gap-3">
      <Switch label={label} checked={checked} onCheckedChange={onChange} />
      <span className="text-sm text-text-secondary">{label}</span>
    </div>
  );
}
