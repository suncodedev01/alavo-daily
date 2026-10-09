import type { ModuleManifest } from '@alavo-daily/common/modules';

export const recipesManifest: ModuleManifest = {
  id: 'recipes',
  name: 'Món ăn',
  icon: 'cooking-pot',
  description: 'Công thức, thực đơn, đi chợ',
  views: [
    { id: 'list', label: 'Công thức', icon: 'book-open', path: '/recipes/list', tab: true },
    { id: 'plan', label: 'Thực đơn tuần', icon: 'calendar-blank', path: '/recipes/plan', tab: true },
    { id: 'shopping', label: 'Đi chợ', icon: 'shopping-bag', path: '/recipes/shopping', tab: true },
  ],
  quickActions: [
    { id: 'new-recipe', label: 'Công thức mới', icon: 'book-open', path: '/recipes/new' },
  ],
  routes: [],
};
