import type { Language } from '../i18n/language';

export interface DateNames {
  weekdays: readonly string[];
  weekdaysShort: readonly string[];
  months: readonly string[];
  monthsShort: readonly string[];
  today: string;
  yesterday: string;
}

const VIETNAMESE: DateNames = {
  weekdays: ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'],
  weekdaysShort: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  months: [],
  monthsShort: [],
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
};

const ENGLISH: DateNames = {
  weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  weekdaysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  months: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  today: 'Today',
  yesterday: 'Yesterday',
};

export function dateNamesOf(language: Language): DateNames {
  return language === 'en' ? ENGLISH : VIETNAMESE;
}
