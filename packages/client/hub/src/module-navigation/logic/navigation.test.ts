import { describe, expect, it } from 'vitest';
import type { ModuleView } from '@alavo-daily/common';

import { activeViewId } from './navigation';

const views: ModuleView[] = [
  { id: 'list', label: 'Công thức', icon: 'book', path: '/recipes/list' },
  { id: 'favorites', label: 'Yêu thích', icon: 'heart', path: '/recipes/list?tag=favorites' },
  { id: 'plan', label: 'Thực đơn', icon: 'calendar', path: '/recipes/plan' },
];

describe('activeViewId', () => {
  it('marks only the plain view active when the query does not match another view', () => {
    expect(activeViewId(views, '/recipes/list', '')).toBe('list');
  });

  it('prefers the view whose query matches the current search', () => {
    expect(activeViewId(views, '/recipes/list', '?tag=favorites')).toBe('favorites');
  });

  it('keeps the plain view active for an unrelated query', () => {
    expect(activeViewId(views, '/recipes/list', '?q=canh')).toBe('list');
  });

  it('matches a selected record below the view path', () => {
    expect(activeViewId(views, '/recipes/list/r1', '')).toBe('list');
  });

  it('returns null when no view matches', () => {
    expect(activeViewId(views, '/recipes/new', '')).toBeNull();
  });
});
