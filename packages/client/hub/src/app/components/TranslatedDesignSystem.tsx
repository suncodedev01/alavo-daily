import type { ReactNode } from 'react';

import { useT } from '@alavo-daily/common';
import { DesignSystemTextsProvider, type DesignSystemTexts } from '@alavo-daily/design-system';

type Translate = ReturnType<typeof useT>;

function designSystemTexts(t: Translate): DesignSystemTexts {
  return {
    searchLabel: t('Tìm kiếm'),
    clearSearch: t('Xoá tìm kiếm'),
    decrease: t('Giảm'),
    increase: t('Tăng'),
    contextPanel: t('Bảng ngữ cảnh'),
    list: t('Danh sách'),
    navigation: t('Điều hướng'),
    cancel: t('Huỷ'),
    close: t('Đóng'),
    choose: t('Chọn'),
    status: {
      open: t('Đang mở'),
      working: t('Đang xử lý'),
      needs_you: t('Cần bạn'),
      your_call: t('Bạn quyết định'),
      resolved: t('Đã xong'),
    },
  };
}

export function TranslatedDesignSystem({ children }: { children: ReactNode }) {
  const t = useT();
  return <DesignSystemTextsProvider texts={designSystemTexts(t)}>{children}</DesignSystemTextsProvider>;
}
