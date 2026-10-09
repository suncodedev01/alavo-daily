import { useT } from '@alavo-daily/common';
import { Button, Pill } from '@alavo-daily/design-system';

import { canChiOfYear, groupPalettesByRelation, suggestedPalette } from '../logic/menh';
import { findMenh } from '../logic/menhInfo';
import type { Menh, MenhId, Palette, PaletteId } from '../types';

export interface MenhResultProps {
  menh: MenhId;
  lunarYear: number | null;
  paletteId: PaletteId;
  onUsePalette: (id: PaletteId) => void;
}

type TextOf = (key: string, values?: Record<string, string | number>) => string;

function relationRows(menh: Menh, t: TextOf) {
  const name = t(menh.name);
  const colors = (text: string) => ({ colors: t(text) });
  return [
    {
      relation: 'ban',
      title: t('Hợp mệnh {{menh}}', { menh: name }),
      note: t('Màu bản mệnh: {{colors}}.', colors(menh.own)),
    },
    {
      relation: 'sinh',
      title: t('Tương sinh'),
      note: t('Màu hỗ trợ: {{colors}}.', colors(menh.generating)),
    },
    {
      relation: 'pha',
      title: t('Hợp một phần'),
      note: t('Có cả màu hợp lẫn màu khắc với mệnh {{menh}}.', { menh: name }),
    },
    {
      relation: 'ky',
      title: t('Nên hạn chế'),
      note: t('Màu tương khắc: {{colors}}.', colors(menh.clashing)),
    },
  ] as const;
}

export function MenhResult({ menh, lunarYear, paletteId, onUsePalette }: MenhResultProps) {
  const t = useT();
  const info = findMenh(menh);
  const groups = groupPalettesByRelation(menh);
  const suggestion = suggestedPalette(menh);
  return (
    <div className="grid gap-3">
      {lunarYear === null ? null : (
        <p className="text-row font-semibold">
          {t('Năm âm lịch {{year}} · {{canChi}} · mệnh {{menh}}', {
            year: lunarYear,
            canChi: canChiOfYear(lunarYear),
            menh: t(info.name),
          })}
        </p>
      )}
      {relationRows(info, t).map(({ relation, ...row }) =>
        relation === 'pha' && groups.pha.length === 0 ? null : (
          <RelationRow
            key={relation}
            {...row}
            palettes={groups[relation]}
            paletteId={paletteId}
            onPick={onUsePalette}
          />
        ),
      )}
      {suggestion ? (
        <Button className="justify-self-start max-lg:w-full" onClick={() => onUsePalette(suggestion.id)}>
          {t('Dùng bộ {{name}}', { name: t(suggestion.name) })}
        </Button>
      ) : null}
    </div>
  );
}

interface RelationRowProps {
  title: string;
  note: string;
  palettes: readonly Palette[];
  paletteId: PaletteId;
  onPick: (id: PaletteId) => void;
}

function RelationRow({ title, note, palettes, paletteId, onPick }: RelationRowProps) {
  const t = useT();
  return (
    <div className="grid gap-1.5">
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="text-row text-text-secondary">{note}</p>
      <div className="flex flex-wrap gap-2">
        {palettes.length === 0 ? <span className="text-row text-text-muted">{t('Không có bộ nào')}</span> : null}
        {palettes.map((palette) => (
          <Pill key={palette.id} selected={palette.id === paletteId} onClick={() => onPick(palette.id)}>
            <span
              className="size-3.5 rounded-full inset-ring inset-ring-line-strong"
              style={{ background: palette.swatches.button }}
            />
            {t(palette.name)}
          </Pill>
        ))}
      </div>
    </div>
  );
}
