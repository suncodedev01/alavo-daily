import type { MoreSection } from '@alavo-daily/common/modules';

import { HouseholdSizeDialog } from '../household';

export const recipesMoreSections: MoreSection[] = [
  {
    id: 'recipes',
    title: 'Công thức',
    items: [
      {
        id: 'favorites',
        label: 'Món yêu thích',
        icon: 'heart',
        description: 'Những món bạn đã đánh dấu',
        target: { screen: '/recipes/list?tag=favorites' },
      },
    ],
  },
  {
    id: 'planning',
    title: 'Thực đơn và đi chợ',
    items: [
      {
        id: 'household',
        label: 'Khẩu phần mặc định',
        icon: 'users',
        description: 'Số người ăn của thực đơn và đi chợ',
        target: { dialog: HouseholdSizeDialog },
      },
    ],
  },
  {
    id: 'preferences',
    title: 'Tuỳ chỉnh',
    items: [
      {
        id: 'cooking-reminders',
        label: 'Nhắc nấu ăn',
        icon: 'bell',
        description: 'Giờ nhắc món ăn và đi chợ',
        target: { screen: '/settings/notifications' },
      },
    ],
  },
];
