import { describe, expect, it } from 'vitest';

import { costForServings, knownTimeText, sharePercent, totalMinutes, totalTimeText } from './recipeMath';

describe('costForServings', () => {
  it('scales the cost proportionally', () => {
    expect(costForServings({ costVnd: 70000, servings: 4 }, 2)).toBe(35000);
    expect(costForServings({ costVnd: 70000, servings: 4 }, 6)).toBe(105000);
  });

  it('rounds to whole dong', () => {
    expect(costForServings({ costVnd: 10000, servings: 3 }, 1)).toBe(3333);
  });

  it('keeps the cost when the base servings are zero', () => {
    expect(costForServings({ costVnd: 500, servings: 0 }, 3)).toBe(500);
  });
});

describe('time helpers', () => {
  it('adds preparation and cooking', () => {
    expect(totalMinutes({ prepMin: 15, cookMin: 40 })).toBe(55);
    expect(totalTimeText({ prepMin: 40, cookMin: 150 })).toBe('3 giờ 10 phút');
  });
});

describe('knownTimeText', () => {
  it('is empty when no time was entered', () => {
    expect(knownTimeText({ prepMin: 0, cookMin: 0 })).toBeNull();
    expect(knownTimeText({ prepMin: 0, cookMin: 25 })).toBe('25 phút');
  });
});

describe('sharePercent', () => {
  it('rounds to a whole percent', () => {
    expect(sharePercent(82500, 203000)).toBe(41);
  });

  it('is zero when there is nothing to compare against', () => {
    expect(sharePercent(100, 0)).toBe(0);
    expect(sharePercent(100, -5)).toBe(0);
  });
});
