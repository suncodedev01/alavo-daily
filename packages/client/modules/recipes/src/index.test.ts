import { describe, expect, it } from 'vitest';

import { recipesManifest } from './index';

describe('recipesManifest', () => {
  it('keeps the identity the hub depends on', () => {
    expect(recipesManifest.id).toBe('recipes');
    expect(recipesManifest.name).toBe('Món ăn');
    expect(recipesManifest.icon).toBe('cooking-pot');
  });

  it('keeps the three main tabs and moves favourites under "Khác"', () => {
    expect(recipesManifest.views.map((view) => [view.id, view.path])).toEqual([
      ['list', '/recipes/list'],
      ['plan', '/recipes/plan'],
      ['shopping', '/recipes/shopping'],
      ['favorites', '/recipes/list?tag=favorites'],
    ]);
    expect(recipesManifest.views.filter((view) => view.tab).map((view) => view.id)).toEqual(['list', 'plan', 'shopping']);
    expect(recipesManifest.views.find((view) => view.id === 'favorites')?.more).toBe(true);
  });

  it('keeps the quick action for a new recipe', () => {
    expect(recipesManifest.quickActions).toEqual([
      { id: 'new-recipe', label: 'Công thức mới', tabLabel: 'Thêm công thức', icon: 'book-open', path: '/recipes/new' },
    ]);
  });

  it('declares every screen and only the cooking mode is full screen', () => {
    const paths = recipesManifest.routes.map((route) => route.path);
    expect(paths).toEqual([
      '/recipes/list/:id?',
      '/recipes/new',
      '/recipes/edit/:id',
      '/recipes/plan',
      '/recipes/shopping',
      '/recipes/cook/:id',
    ]);
    const fullscreen = recipesManifest.routes.filter((route) => route.fullscreen).map((route) => route.path);
    expect(fullscreen).toEqual(['/recipes/cook/:id']);
  });

  it('keeps the reminders scheduled from one background component', () => {
    expect(recipesManifest.background).toBeTypeOf('function');
  });

  it('adds the meals of today to the sidebar', () => {
    expect(recipesManifest.sidebarExtra).toBeTypeOf('function');
  });
});
