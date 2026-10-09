import type { Menh, MenhId } from '../types';

export const MENHS: readonly Menh[] = [
  { id: 'kim', name: 'Kim', own: 'trắng, xám, bạc', generating: 'vàng, nâu đất', clashing: 'đỏ, hồng' },
  { id: 'thuy', name: 'Thủy', own: 'đen, xanh biển', generating: 'trắng, xám, bạc', clashing: 'nâu, vàng đất' },
  { id: 'moc', name: 'Mộc', own: 'xanh lá', generating: 'xanh biển, đen', clashing: 'trắng, xám' },
  { id: 'hoa', name: 'Hỏa', own: 'đỏ, cam, hồng, tím', generating: 'xanh lá', clashing: 'đen, xanh dương' },
  { id: 'tho', name: 'Thổ', own: 'vàng nhạt, nâu sáng, màu cát', generating: 'đỏ, hồng, cam', clashing: 'xanh lá' },
];

export function isMenhId(value: unknown): value is MenhId {
  return MENHS.some((menh) => menh.id === value);
}

export function findMenh(id: MenhId): Menh {
  return MENHS.find((menh) => menh.id === id) ?? MENHS[0]!;
}
