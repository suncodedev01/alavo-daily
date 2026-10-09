import { createContext, useContext, type ReactNode } from 'react';

import type { Status } from '../components/controls/StatusChip';

export interface DesignSystemTexts {
  searchLabel: string;
  clearSearch: string;
  decrease: string;
  increase: string;
  contextPanel: string;
  list: string;
  navigation: string;
  cancel: string;
  close: string;
  choose: string;
  status: Record<Status, string>;
}

export const DEFAULT_TEXTS: DesignSystemTexts = {
  searchLabel: 'Tìm kiếm',
  clearSearch: 'Xoá tìm kiếm',
  decrease: 'Giảm',
  increase: 'Tăng',
  contextPanel: 'Bảng ngữ cảnh',
  list: 'Danh sách',
  navigation: 'Điều hướng',
  cancel: 'Huỷ',
  close: 'Đóng',
  choose: 'Chọn',
  status: {
    open: 'Đang mở',
    working: 'Đang xử lý',
    needs_you: 'Cần bạn',
    your_call: 'Bạn quyết định',
    resolved: 'Đã xong',
  },
};

const TextsContext = createContext<DesignSystemTexts>(DEFAULT_TEXTS);

export function DesignSystemTextsProvider({
  texts,
  children,
}: {
  texts: DesignSystemTexts;
  children: ReactNode;
}) {
  return <TextsContext.Provider value={texts}>{children}</TextsContext.Provider>;
}

export function useDesignSystemTexts(): DesignSystemTexts {
  return useContext(TextsContext);
}
