import { useT } from '@alavo-daily/common';
import { Eyebrow } from '@alavo-daily/design-system';

import { useMenhChoice } from '../hooks/useMenhChoice';
import { usePalette } from '../hooks/usePalette';
import { MenhPicker } from './MenhPicker';
import { PaletteGrid } from './PaletteGrid';

export function PaletteTab() {
  const t = useT();
  const { paletteId, selectPalette } = usePalette();
  const { choice, setYearText, setBeforeTet, chooseMenh } = useMenhChoice();
  return (
    <>
      <Eyebrow>{t('Bộ màu của ứng dụng')}</Eyebrow>
      <MenhPicker
        choice={choice}
        paletteId={paletteId}
        onYearText={setYearText}
        onBeforeTet={setBeforeTet}
        onMenh={chooseMenh}
        onUsePalette={selectPalette}
      />
      <PaletteGrid selectedId={paletteId} menh={choice.menh} onSelect={selectPalette} />
      <p className="text-row text-text-muted">
        {t(
          'Gợi ý theo quan niệm phong thủy phổ biến, không có cơ sở khoa học và các nguồn đôi khi khác nhau. Mệnh được tính theo năm âm lịch bằng bảng Nạp Âm. Màu tương sinh và tương khắc suy ra từ quy luật ngũ hành. Hãy chọn màu bạn thấy dễ nhìn nhất.',
        )}
      </p>
    </>
  );
}
