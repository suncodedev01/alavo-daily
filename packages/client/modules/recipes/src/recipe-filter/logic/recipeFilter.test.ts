import { describe, expect, it } from 'vitest';

import { ALL_RECIPES, summaryOf } from '../../testing/fixtures';
import { filterRecipes, normalizeText } from './recipeFilter';

const summaries = ALL_RECIPES.map(summaryOf);

describe('normalizeText', () => {
  it('drops accents, the stroke of đ and case', () => {
    expect(normalizeText('  Đậu Hũ Sốt Cà ')).toBe('dau hu sot ca');
  });
});

describe('filterRecipes', () => {
  it('returns everything for an empty filter', () => {
    expect(filterRecipes(summaries, { query: '', tag: '' })).toHaveLength(3);
  });

  it('matches part of the name without accents', () => {
    const names = filterRecipes(summaries, { query: 'ga kho', tag: '' }).map((recipe) => recipe.name);
    expect(names).toEqual(['Gà kho gừng']);
  });

  it('keeps only favorites for the favorites tag', () => {
    const names = filterRecipes(summaries, { query: '', tag: 'favorites' }).map((recipe) => recipe.name);
    expect(names).toEqual(['Gà kho gừng']);
  });

  it('matches a tag exactly', () => {
    const names = filterRecipes(summaries, { query: '', tag: 'Rau' }).map((recipe) => recipe.name);
    expect(names).toEqual(['Rau muống xào tỏi']);
  });

  it('combines the tag and the query', () => {
    expect(filterRecipes(summaries, { query: 'canh', tag: 'Rau' })).toEqual([]);
  });
});
