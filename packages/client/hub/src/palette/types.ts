export type PaletteId = 'vang' | 'phuquy' | 'tho' | 'kim' | 'thuy' | 'moc' | 'hoa' | 'hong';

export type MenhId = 'kim' | 'thuy' | 'moc' | 'hoa' | 'tho';

export type Relation = 'ban' | 'sinh' | 'ky' | 'pha' | 'trung';

export interface PaletteSwatches {
  background: string;
  button: string;
  accent: string;
  text: string;
  buttonText: string;
}

export interface Palette {
  id: PaletteId;
  name: string;
  tag: string;
  fit: string;
  swatches: PaletteSwatches;
  elements: readonly MenhId[];
}

export interface Menh {
  id: MenhId;
  name: string;
  own: string;
  generating: string;
  clashing: string;
}

export interface YearChoice {
  year: number;
  beforeTet: boolean;
}

export type RelationGroups = Record<'ban' | 'sinh' | 'pha' | 'ky', readonly Palette[]>;
