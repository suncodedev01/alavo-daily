import { hasSticker } from '@alavo-daily/design-system';
import { screen, within } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { blankDraft } from '../../editor/logic/draft';
import { recipesManifest } from '../../index';
import { renderScreen } from '../../testing/renderScreen';
import { RecipeListScreen } from './RecipeListScreen';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 9, 12));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('recipe icons', () => {
  it('have a sticker for the module, its quick actions and a new recipe', () => {
    const icons = [
      recipesManifest.icon,
      blankDraft().icon,
      ...(recipesManifest.quickActions ?? []).map((action) => action.icon),
    ];
    expect(icons.filter((icon) => !hasSticker(icon))).toEqual([]);
  });
});

describe('recipe stickers on screen', () => {
  it('draws the sticker of the dish on each list row and on the cover', async () => {
    renderScreen(<RecipeListScreen />, { path: '/recipes/list/:id?', route: '/recipes/list/ga-kho' });
    const list = await screen.findByRole('list', { name: 'Danh sách công thức' });
    const row = within(list).getByRole('link', { name: /Gà kho gừng/ });
    expect(row.querySelector('img')).toHaveAttribute('data-sticker', 'pot_of_food');
    const covers = document.querySelectorAll('img[data-sticker="pot_of_food"][width="72"]');
    expect(covers).toHaveLength(1);
  });
});
