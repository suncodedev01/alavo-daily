const STATIC_ROUTES = [
  '/today',
  '/explore',
  '/settings/sync',
  '/settings/notifications',
  '/settings/palette',
  '/spending/overview',
  '/spending/transactions',
  '/spending/transactions?new=1',
  '/spending/budgets',
  '/spending/goals',
  '/spending/reports',
  '/spending/import',
  '/recipes/list',
  '/recipes/list?tag=favorites',
  '/recipes/new',
  '/recipes/plan',
  '/recipes/shopping',
  '/this-page-does-not-exist',
];

function dynamicRoutes({ recipeId, transactionId }) {
  const routes = [];
  if (recipeId) {
    routes.push(`/recipes/list/${recipeId}`, `/recipes/edit/${recipeId}`, `/recipes/cook/${recipeId}`);
  }
  if (transactionId) routes.push(`/spending/transactions/${transactionId}`);
  return routes;
}

export function routesFor(ids, filter) {
  const all = [...STATIC_ROUTES, ...dynamicRoutes(ids)];
  return filter ? all.filter((route) => route.includes(filter)) : all;
}

export const POPUP_TRIGGERS = '[aria-haspopup]:not([aria-haspopup=false]), [aria-expanded=false]';
export const NOTIFICATION_BELL_LABELS = ['Thông báo', 'Notifications'];
export const MAX_POPUPS_PER_ROUTE = 6;
