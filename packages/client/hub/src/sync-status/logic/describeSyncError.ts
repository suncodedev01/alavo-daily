type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Words for the reason a sync round failed, from the failure kind the engine stored. */
export function describeSyncError(error: string | null, t: Translate): string {
  switch (error) {
    case 'rate_limited':
      return t('Google đang giới hạn số lần truy cập. Ứng dụng sẽ tự thử lại sau ít phút.');
    case 'drive':
      return t('Google Drive từ chối yêu cầu. Hãy kiểm tra quyền truy cập và dung lượng Drive rồi thử lại.');
    default:
      return t('Có lỗi khi đồng bộ. Dữ liệu trên máy này vẫn an toàn, hãy thử lại.');
  }
}
