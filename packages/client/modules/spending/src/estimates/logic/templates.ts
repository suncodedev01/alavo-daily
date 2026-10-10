import type { EstimateItem } from '@alavo-daily/common/engine';

export interface EstimateTemplate {
  id: string;
  /** Natural-text i18n key. */
  label: string;
  icon: string;
  /** Natural-text i18n keys for the groups offered when adding an item. */
  groups: string[];
  /** Natural-text i18n keys for the numbers amounts can multiply by. */
  factors: string[];
  contingencyPercent: number;
}

/** Starting points only: groups, numbers and a contingency. Any of them can be changed later. */
export const ESTIMATE_TEMPLATES: EstimateTemplate[] = [
  { id: 'travel', label: 'Du lịch', icon: 'airplane-tilt', groups: ['Đi lại', 'Chỗ ở', 'Ăn uống và vui chơi'], factors: ['người', 'ngày', 'đêm'], contingencyPercent: 10 },
  { id: 'remodel', label: 'Sửa nhà', icon: 'house-line', groups: ['Vật liệu', 'Nhân công và thiết bị'], factors: [], contingencyPercent: 15 },
  { id: 'wedding', label: 'Đám cưới và tiệc', icon: 'gift', groups: ['Tiệc', 'Trang phục và làm đẹp', 'Hình ảnh', 'Lễ và trang trí'], factors: ['khách'], contingencyPercent: 10 },
  { id: 'shopping', label: 'Mua sắm lớn', icon: 'shopping-bag', groups: ['Đồ cần mua'], factors: [], contingencyPercent: 5 },
  { id: 'tuition', label: 'Học phí', icon: 'graduation-cap', groups: ['Học phí', 'Sách vở và đồ dùng'], factors: ['kỳ'], contingencyPercent: 10 },
  { id: 'tet', label: 'Tết', icon: 'calendar-blank', groups: ['Quà và lì xì', 'Ăn uống', 'Đi lại'], factors: ['người'], contingencyPercent: 10 },
  { id: 'custom', label: 'Tự đặt', icon: 'tag', groups: [], factors: [], contingencyPercent: 10 },
];

export const CONTINGENCY_CHOICES = [0, 5, 10, 15, 20] as const;

export const PRIORITY_LABELS: Record<EstimateItem['priority'], string> = {
  must: 'Cần có',
  should: 'Nên có',
  nice: 'Có thì tốt',
};

export const PRIORITIES = ['must', 'should', 'nice'] as const;

export const DEFAULT_GROUP = 'Khác';
