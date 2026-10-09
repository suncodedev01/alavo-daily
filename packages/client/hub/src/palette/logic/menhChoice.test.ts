import { describe, expect, it } from 'vitest';

import { EMPTY_MENH_CHOICE, lunarYearOfChoice, withBeforeTet, withMenh, withYearText } from './menhChoice';

describe('menh choice', () => {
  it('works out the element once a valid year is typed', () => {
    expect(withYearText(EMPTY_MENH_CHOICE, '1984')).toEqual({ menh: 'kim', yearText: '1984', beforeTet: false });
  });

  it('keeps the last element while the year is still being typed or is invalid', () => {
    const typed = withYearText(EMPTY_MENH_CHOICE, '1984');
    expect(withYearText(typed, '19').menh).toBe('kim');
    expect(withYearText(typed, '1850').menh).toBe('kim');
    expect(withYearText(EMPTY_MENH_CHOICE, '19').menh).toBeNull();
  });

  it('recomputes the element when the Tết switch changes', () => {
    const typed = withYearText(EMPTY_MENH_CHOICE, '1990');
    expect(typed.menh).toBe('tho');
    expect(withBeforeTet(typed, true).menh).toBe('moc');
    expect(withBeforeTet(withBeforeTet(typed, true), false).menh).toBe('tho');
  });

  it('keeps the element when the switch changes with no year typed', () => {
    const chosen = withMenh(EMPTY_MENH_CHOICE, 'hoa');
    expect(withBeforeTet(chosen, true)).toEqual({ menh: 'hoa', yearText: '', beforeTet: true });
  });

  it('keeps the year when the chosen element agrees with it', () => {
    const typed = withYearText(EMPTY_MENH_CHOICE, '1984');
    expect(withMenh(typed, 'kim').yearText).toBe('1984');
  });

  it('clears the year when another element is chosen', () => {
    const typed = withYearText(EMPTY_MENH_CHOICE, '1984');
    expect(withMenh(typed, 'hoa')).toEqual({ menh: 'hoa', yearText: '', beforeTet: false });
  });

  it('reports the lunar year only for a valid year', () => {
    const typed = withYearText(EMPTY_MENH_CHOICE, '1990');
    expect(lunarYearOfChoice(typed)).toBe(1990);
    expect(lunarYearOfChoice(withBeforeTet(typed, true))).toBe(1989);
    expect(lunarYearOfChoice(withYearText(EMPTY_MENH_CHOICE, '19'))).toBeNull();
  });
});
