import type { MenhId, Palette, PaletteId, Relation, RelationGroups, YearChoice } from '../types';
import { PALETTES } from './palettes';

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2100;

const GENERATING_CYCLE: readonly MenhId[] = ['kim', 'thuy', 'moc', 'hoa', 'tho'];

const HALF_CYCLE_ELEMENTS: readonly MenhId[] = [
  'kim', 'hoa', 'moc', 'tho', 'kim', 'hoa', 'thuy', 'tho', 'kim', 'moc', 'thuy', 'tho', 'hoa', 'moc', 'thuy',
];
const PAIR_ELEMENTS: readonly MenhId[] = [...HALF_CYCLE_ELEMENTS, ...HALF_CYCLE_ELEMENTS];

const HEAVENLY_STEMS = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const EARTHLY_BRANCHES = [
  'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi',
];

const FIRST_CYCLE_YEAR = 4;
const CYCLE_YEARS = 60;

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function lunarYearOf({ year, beforeTet }: YearChoice): number {
  return beforeTet ? year - 1 : year;
}

export function menhOfYear(year: number, options: { beforeTet: boolean }): MenhId {
  const position = positiveModulo(lunarYearOf({ year, beforeTet: options.beforeTet }) - FIRST_CYCLE_YEAR, CYCLE_YEARS);
  return PAIR_ELEMENTS[Math.floor(position / 2)]!;
}

export function canChiOfYear(lunarYear: number): string {
  const stem = HEAVENLY_STEMS[positiveModulo(lunarYear - FIRST_CYCLE_YEAR, 10)]!;
  const branch = EARTHLY_BRANCHES[positiveModulo(lunarYear - FIRST_CYCLE_YEAR, 12)]!;
  return `${stem} ${branch}`;
}

export function parseYear(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const year = Number(trimmed);
  return year >= MIN_YEAR && year <= MAX_YEAR ? year : null;
}

function stepsAlongCycle(element: MenhId, steps: number): MenhId {
  return GENERATING_CYCLE[(GENERATING_CYCLE.indexOf(element) + steps) % GENERATING_CYCLE.length]!;
}

function relationOfElement(element: MenhId, person: MenhId): Relation {
  if (element === person) return 'ban';
  if (stepsAlongCycle(element, 1) === person) return 'sinh';
  if (stepsAlongCycle(element, 2) === person) return 'ky';
  return 'trung';
}

export function relationOfPalette(paletteId: PaletteId, person: MenhId): Relation {
  const palette = PALETTES.find((candidate) => candidate.id === paletteId);
  const relations = (palette?.elements ?? []).map((element) => relationOfElement(element, person));
  const helps = relations.some((relation) => relation === 'ban' || relation === 'sinh');
  if (relations.includes('ky')) return helps ? 'pha' : 'ky';
  if (relations.includes('ban')) return 'ban';
  return relations.includes('sinh') ? 'sinh' : 'trung';
}

export function groupPalettesByRelation(person: MenhId): RelationGroups {
  const withRelation = (relation: Relation) =>
    PALETTES.filter((palette) => relationOfPalette(palette.id, person) === relation);
  return { ban: withRelation('ban'), sinh: withRelation('sinh'), pha: withRelation('pha'), ky: withRelation('ky') };
}

export function suggestedPalette(person: MenhId): Palette | null {
  const own = groupPalettesByRelation(person).ban;
  return [...own].sort((first, second) => first.elements.length - second.elements.length)[0] ?? null;
}
