import { EngineCallError } from '@alavo-daily/common/engine';
import type { Translate } from '../types';

interface KnownMessage {
  pattern: RegExp;
  text: string;
}

const KNOWN_MESSAGES: readonly KnownMessage[] = [
  { pattern: /^recipe name must not be empty/, text: 'Công thức cần có tên.' },
  { pattern: /^servings must be between/, text: 'Khẩu phần phải từ 1 đến 50 người.' },
  { pattern: /^times and calories must not be negative/, text: 'Thời gian và calo không được âm.' },
  {
    pattern: /^a recipe needs at least one named ingredient/,
    text: 'Công thức cần ít nhất một nguyên liệu có tên.',
  },
  { pattern: /^quantity of (.+) must be above 0/, text: 'Số lượng của {{name}} phải lớn hơn 0.' },
  { pattern: /^cost of (.+) must not be negative/, text: 'Chi phí của {{name}} không được âm.' },
  { pattern: /^too many (ingredients|steps)/, text: 'Công thức có quá nhiều nguyên liệu hoặc bước.' },
  { pattern: /^timerMin must not be negative/, text: 'Thời gian hẹn giờ không được âm.' },
  {
    pattern: /^nothing with an estimated cost is left to buy/,
    text: 'Chưa có món nào cần mua có chi phí ước tính để ghi vào Chi tiêu.',
  },
  { pattern: /^shopping item name must not be empty/, text: 'Tên món cần mua không được để trống.' },
  { pattern: /^shopping item quantity must be above 0/, text: 'Số lượng món cần mua phải lớn hơn 0.' },
  { pattern: /^amount must be/, text: 'Số tiền không hợp lệ.' },
];

const FALLBACK_TEXT = 'Không thực hiện được. Bạn thử lại sau nhé.';
const NOT_FOUND_TEXT = 'Không tìm thấy dữ liệu này, có thể nó đã bị xoá.';

export function describeEngineError(error: unknown, t: Translate): string {
  if (!(error instanceof EngineCallError)) return t(FALLBACK_TEXT);
  if (error.code === 'not_found') return t(NOT_FOUND_TEXT);
  for (const { pattern, text } of KNOWN_MESSAGES) {
    const match = pattern.exec(error.message);
    if (match) return t(text, { name: match[1] ?? '' });
  }
  return t(FALLBACK_TEXT);
}
