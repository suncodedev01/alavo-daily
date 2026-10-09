import type { ModuleManifest } from '@alavo-daily/common/modules';
import { createElement } from 'react';

import { CookingScreen } from './cooking';
import { RecipeEditorScreen } from './editor';
import { RecipeListScreen } from './list';
import { PlanScreen } from './plan';
import { ShoppingScreen } from './shopping';
import { TodayMealsGroup } from './sidebar';

export const recipesManifest: ModuleManifest = {
  id: 'recipes',
  name: 'Món ăn',
  icon: 'cooking-pot',
  description: 'Công thức, thực đơn, đi chợ',
  views: [
    { id: 'list', label: 'Công thức', icon: 'book-open', path: '/recipes/list', tab: true },
    { id: 'plan', label: 'Thực đơn tuần', icon: 'calendar-blank', path: '/recipes/plan', tab: true },
    { id: 'shopping', label: 'Đi chợ', icon: 'shopping-bag', path: '/recipes/shopping', tab: true },
    {
      id: 'favorites',
      label: 'Yêu thích',
      icon: 'heart',
      path: '/recipes/list?tag=favorites',
      tab: true,
    },
  ],
  quickActions: [
    { id: 'new-recipe', label: 'Công thức mới', icon: 'book-open', path: '/recipes/new' },
  ],
  routes: [
    { path: '/recipes/list/:id?', element: createElement(RecipeListScreen) },
    { path: '/recipes/new', element: createElement(RecipeEditorScreen) },
    { path: '/recipes/edit/:id', element: createElement(RecipeEditorScreen) },
    { path: '/recipes/plan', element: createElement(PlanScreen) },
    { path: '/recipes/shopping', element: createElement(ShoppingScreen) },
    { path: '/recipes/cook/:id', element: createElement(CookingScreen), fullscreen: true },
  ],
  sidebarExtra: TodayMealsGroup,
};
