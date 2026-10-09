import { EngineCallError } from '@alavo-daily/common/engine';

type Translate = (key: string) => string;

interface KnownError {
  pattern: RegExp;
  message: string;
}

const KNOWN_ERRORS: KnownError[] = [
  { pattern: /category still has transactions/, message: 'Hạng mục này vẫn còn giao dịch. Hãy chuyển hoặc xoá các giao dịch đó trước.' },
  { pattern: /wallet still has transactions/, message: 'Ví này vẫn còn giao dịch. Hãy chuyển hoặc xoá các giao dịch đó trước.' },
  { pattern: /amountVnd must not be zero/, message: 'Số tiền phải khác 0.' },
  { pattern: /expense amount must be negative|income amount must be positive/, message: 'Số tiền không khớp với loại giao dịch.' },
  { pattern: /must be greater than zero/, message: 'Số tiền phải lớn hơn 0.' },
  { pattern: /dayOfMonth must be between/, message: 'Ngày trong tháng phải từ 1 đến 31.' },
  { pattern: /savedVnd must not be negative/, message: 'Số tiền đã để dành không được âm.' },
  { pattern: /no recognisable date and amount columns/, message: 'Không nhận ra cột ngày và số tiền. Hãy kiểm tra dòng tiêu đề của sao kê.' },
  { pattern: /from must not be after to|at most 120 months/, message: 'Khoảng thời gian không hợp lệ. Chọn tối đa 10 năm và ngày bắt đầu không sau ngày kết thúc.' },
  { pattern: /invalid date/, message: 'Ngày không hợp lệ.' },
  { pattern: /must not be empty/, message: 'Vui lòng điền đủ thông tin bắt buộc.' },
  { pattern: /does not exist/, message: 'Hạng mục hoặc ví đã chọn không còn tồn tại.' },
];

const NOT_FOUND_MESSAGE = 'Không tìm thấy dữ liệu này. Có thể nó đã bị xoá.';
const FALLBACK_MESSAGE = 'Có lỗi xảy ra. Bạn thử lại nhé.';

export function describeEngineError(error: unknown, t: Translate): string {
  if (!(error instanceof EngineCallError)) return t(FALLBACK_MESSAGE);
  if (error.code === 'not_found') return t(NOT_FOUND_MESSAGE);
  const known = KNOWN_ERRORS.find((entry) => entry.pattern.test(error.message));
  return t(known?.message ?? FALLBACK_MESSAGE);
}
