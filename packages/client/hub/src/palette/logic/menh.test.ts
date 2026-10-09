import { describe, expect, it } from 'vitest';

import type { MenhId, PaletteId } from '../types';
import {
  canChiOfYear,
  groupPalettesByRelation,
  lunarYearOf,
  menhOfYear,
  parseYear,
  relationOfPalette,
  suggestedPalette,
} from './menh';
import { MENHS } from './menhInfo';
import { PALETTES } from './palettes';

const AFTER_TET = { beforeTet: false };
const BEFORE_TET = { beforeTet: true };

describe('menhOfYear', () => {
  it.each([
    [1984, 'kim'],
    [1990, 'tho'],
    [2000, 'kim'],
    [1995, 'hoa'],
    [1996, 'thuy'],
    [1988, 'moc'],
    [2024, 'hoa'],
  ] as [number, MenhId][])('gives %i the element %s', (year, menh) => {
    expect(menhOfYear(year, AFTER_TET)).toBe(menh);
  });

  it('shares one element between the two years of a pair', () => {
    expect(menhOfYear(1984, AFTER_TET)).toBe(menhOfYear(1985, AFTER_TET));
    expect(menhOfYear(1986, AFTER_TET)).toBe(menhOfYear(1987, AFTER_TET));
    expect(menhOfYear(1985, AFTER_TET)).not.toBe(menhOfYear(1986, AFTER_TET));
  });

  it('counts a birth before Tết in the previous lunar year', () => {
    expect(menhOfYear(1985, BEFORE_TET)).toBe(menhOfYear(1984, AFTER_TET));
    expect(menhOfYear(1990, BEFORE_TET)).toBe(menhOfYear(1989, AFTER_TET));
    expect(menhOfYear(1990, AFTER_TET)).toBe('tho');
    expect(menhOfYear(1990, BEFORE_TET)).toBe('moc');
  });

  it('repeats every 60 years', () => {
    expect(menhOfYear(1944, AFTER_TET)).toBe(menhOfYear(2004, AFTER_TET));
    expect(menhOfYear(1900, AFTER_TET)).toBe(menhOfYear(2020, AFTER_TET));
  });

  it('works at both ends of the supported range, including a birth before Tết of the first year', () => {
    expect(menhOfYear(1900, AFTER_TET)).toBe('tho');
    expect(menhOfYear(1900, BEFORE_TET)).toBe('moc');
    expect(menhOfYear(2100, AFTER_TET)).toBe('moc');
    expect(menhOfYear(2100, BEFORE_TET)).toBe('hoa');
  });

  it('gives every element somewhere in a 60 year cycle', () => {
    const seen = new Set(Array.from({ length: 60 }, (_, i) => menhOfYear(1984 + i, AFTER_TET)));
    expect([...seen].sort()).toEqual(MENHS.map((menh) => menh.id).sort());
  });
});

describe('lunar year and can chi', () => {
  it('moves back one year only before Tết', () => {
    expect(lunarYearOf({ year: 1990, beforeTet: false })).toBe(1990);
    expect(lunarYearOf({ year: 1990, beforeTet: true })).toBe(1989);
  });

  it.each([
    [1984, 'Giáp Tý'],
    [1990, 'Canh Ngọ'],
    [2000, 'Canh Thìn'],
    [1900, 'Canh Tý'],
    [2024, 'Giáp Thìn'],
  ])('names %i as %s', (year, name) => {
    expect(canChiOfYear(year)).toBe(name);
  });
});

describe('parseYear', () => {
  it('accepts years inside the range, with spaces around', () => {
    expect(parseYear('1995')).toBe(1995);
    expect(parseYear(' 1900 ')).toBe(1900);
    expect(parseYear('2100')).toBe(2100);
  });

  it.each(['', '  ', '1899', '2101', '19', 'abcd', '19.5', '-1990', '1e3', '0x7CF'])('rejects %j', (text) => {
    expect(parseYear(text)).toBeNull();
  });
});

describe('relationOfPalette', () => {
  it('calls the palette of your own element a match', () => {
    for (const element of ['kim', 'thuy', 'moc', 'hoa', 'tho'] as const) {
      expect(relationOfPalette(element, element)).toBe('ban');
    }
  });

  it('follows the generating cycle: wood feeds fire, fire feeds earth, earth feeds metal', () => {
    expect(relationOfPalette('moc', 'hoa')).toBe('sinh');
    expect(relationOfPalette('hoa', 'tho')).toBe('sinh');
    expect(relationOfPalette('tho', 'kim')).toBe('sinh');
    expect(relationOfPalette('kim', 'thuy')).toBe('sinh');
    expect(relationOfPalette('thuy', 'moc')).toBe('sinh');
  });

  it('follows the overcoming cycle: fire melts metal, metal cuts wood', () => {
    expect(relationOfPalette('hoa', 'kim')).toBe('ky');
    expect(relationOfPalette('kim', 'moc')).toBe('ky');
    expect(relationOfPalette('moc', 'tho')).toBe('ky');
    expect(relationOfPalette('tho', 'thuy')).toBe('ky');
    expect(relationOfPalette('thuy', 'hoa')).toBe('ky');
  });

  it('ranks a palette that mixes helpful and clashing elements as partial', () => {
    expect(relationOfPalette('phuquy', 'kim')).toBe('pha');
  });

  it('ranks a mixed palette as a match when it holds the person own element', () => {
    expect(relationOfPalette('phuquy', 'hoa')).toBe('ban');
    expect(relationOfPalette('phuquy', 'tho')).toBe('ban');
  });

  it('is neutral when no relation applies', () => {
    expect(relationOfPalette('kim', 'hoa')).toBe('trung');
    expect(relationOfPalette('kim', 'tho')).toBe('trung');
  });

  it('knows how the palettes relate to a Thổ person', () => {
    const relations = Object.fromEntries(PALETTES.map((palette) => [palette.id, relationOfPalette(palette.id, 'tho')]));
    expect(relations).toMatchObject({ vang: 'ban', tho: 'ban', hong: 'sinh', hoa: 'sinh', moc: 'ky' });
  });

  it('is neutral for an id it does not know', () => {
    expect(relationOfPalette('khong-co' as PaletteId, 'kim')).toBe('trung');
  });
});

describe('groupPalettesByRelation and suggestedPalette', () => {
  const ids = (list: readonly { id: string }[]) => list.map((palette) => palette.id);

  it('groups the palettes for a Kim person', () => {
    const groups = groupPalettesByRelation('kim');
    expect(ids(groups.ban)).toEqual(['kim']);
    expect(ids(groups.sinh)).toEqual(['vang', 'tho']);
    expect(ids(groups.pha)).toEqual(['phuquy']);
    expect(ids(groups.ky)).toEqual(['hoa', 'hong']);
  });

  it('never lists a palette in two groups', () => {
    for (const { id } of MENHS) {
      const groups = groupPalettesByRelation(id);
      const all = [...groups.ban, ...groups.sinh, ...groups.pha, ...groups.ky].map((palette) => palette.id);
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it('suggests a palette made of the person own element, preferring the plainest one', () => {
    expect(suggestedPalette('kim')?.id).toBe('kim');
    expect(suggestedPalette('thuy')?.id).toBe('thuy');
    expect(suggestedPalette('moc')?.id).toBe('moc');
    expect(suggestedPalette('hoa')?.id).toBe('hoa');
    expect(suggestedPalette('tho')?.id).toBe('vang');
  });

  it('suggests something for every element', () => {
    for (const { id } of MENHS) expect(suggestedPalette(id)).not.toBeNull();
  });
});
