import type { Aisle, MealSlot, RecipeLevel } from '@alavo-daily/common/engine';

export const AISLES: readonly Aisle[] = ['meat_fish', 'vegetables', 'spices', 'other'];

export const AISLE_LABELS: Record<Aisle, string> = {
  meat_fish: 'Thịt & cá',
  vegetables: 'Rau củ',
  spices: 'Gia vị',
  other: 'Khác',
};

export const LEVEL_LABELS: Record<RecipeLevel, string> = {
  easy: 'Dễ',
  medium: 'Vừa',
  hard: 'Khó',
};

export const MEAL_SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner'];

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Sáng',
  lunch: 'Trưa',
  dinner: 'Tối',
};

export const FAVORITES_TAG = 'favorites';

export const RECIPE_TAGS: readonly string[] = ['Món chính', 'Canh', 'Rau', 'Nhanh'];

export const FILTER_TAGS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: FAVORITES_TAG, label: 'Yêu thích' },
  ...RECIPE_TAGS.map((tag) => ({ value: tag, label: tag })),
];

export const COMMON_UNITS: readonly string[] = [
  'g',
  'kg',
  'ml',
  'lít',
  'củ',
  'tép',
  'cây',
  'quả',
  'trái',
  'mớ',
  'bó',
  'miếng',
  'lát',
  'con',
  'chén',
  'nhúm',
  'bộ',
  'gói',
  'muỗng canh',
  'muỗng cà phê',
  'phần',
];

export const DEFAULT_UNIT = 'g';
export const DEFAULT_HOUSEHOLD_SIZE = 2;
export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 50;
export const FOOD_CATEGORY_NAME = 'Ăn uống';
export const PLAN_DAYS = 7;
