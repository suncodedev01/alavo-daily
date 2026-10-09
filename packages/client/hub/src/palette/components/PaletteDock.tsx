import { useT } from '@alavo-daily/common';
import { ContextSection } from '@alavo-daily/design-system';

export function PaletteDock() {
  const t = useT();
  return (
    <>
      <ContextSection title={t('Màu chữ và độ dễ đọc')} defaultOpen>
        <p className="text-sm text-text-secondary">
          {t(
            'Mỗi bộ màu có sẵn màu chữ chính, chữ phụ và chữ trên nút, đều được kiểm tra độ dễ đọc ở cả giao diện sáng và tối. Đổi bộ màu không làm đổi màu thu (xanh lá) và chi (đỏ).',
          )}
        </p>
      </ContextSection>
      <ContextSection title={t('Nhớ lựa chọn')} defaultOpen>
        <p className="text-sm text-text-secondary">{t('Bộ màu bạn chọn được nhớ trên thiết bị này.')}</p>
      </ContextSection>
    </>
  );
}
