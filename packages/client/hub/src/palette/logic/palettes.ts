import type { Palette, PaletteId } from '../types';

export const DEFAULT_PALETTE_ID: PaletteId = 'vang';

export const PALETTES: readonly Palette[] = [
  {
    id: 'vang',
    name: 'Vàng kim',
    tag: 'Màu tài lộc trực tiếp nhất',
    fit: 'Hợp mệnh Thổ và Kim. Mệnh Mộc và Thủy nên cân nhắc, vì một số nguồn xếp vàng vào nhóm kiêng.',
    swatches: { background: '#FAF7F0', button: '#FFC53D', accent: '#FFF7C2', text: '#2D1A0B', buttonText: '#311C0C' },
    elements: ['tho'],
  },
  {
    id: 'phuquy',
    name: 'Phú quý · Tím vàng',
    tag: 'Màu của giàu sang',
    fit: 'Tím gần nhóm màu mệnh Hỏa, vàng hợp mệnh Thổ. Tím và vàng đều hay được gợi ý cho góc tài lộc (Đông Nam).',
    swatches: { background: '#F5F3F7', button: '#FFC53D', accent: '#FFF7C2', text: '#1E1226', buttonText: '#311C0C' },
    elements: ['hoa', 'tho'],
  },
  {
    id: 'tho',
    name: 'Thổ · Nâu đất',
    tag: 'Nâu đất, màu cát',
    fit: 'Màu bản mệnh Thổ, tương sinh cho mệnh Kim.',
    swatches: { background: '#F7F5F3', button: '#A5622C', accent: '#F6ECE4', text: '#18120C', buttonText: '#FFFFFF' },
    elements: ['tho'],
  },
  {
    id: 'kim',
    name: 'Kim · Trắng bạc',
    tag: 'Trắng, xám, bạc',
    fit: 'Màu bản mệnh Kim, tương sinh cho mệnh Thủy. Một số nguồn cho rằng màu trắng không hợp để giữ tiền.',
    swatches: { background: '#F3F5F6', button: '#5D7692', accent: '#EAEDF0', text: '#05070A', buttonText: '#FFFFFF' },
    elements: ['kim'],
  },
  {
    id: 'thuy',
    name: 'Thủy · Xanh biển',
    tag: 'Xanh biển, tĩnh và ổn định',
    fit: 'Màu bản mệnh Thủy (cùng với đen), tương sinh cho mệnh Mộc.',
    swatches: { background: '#F3F5F7', button: '#1D6ED7', accent: '#E2ECF9', text: '#080C11', buttonText: '#FFFFFF' },
    elements: ['thuy'],
  },
  {
    id: 'moc',
    name: 'Mộc · Xanh lá',
    tag: 'Xanh lá, tăng trưởng',
    fit: 'Màu bản mệnh Mộc, gắn với sự phát triển và dồi dào. Tương sinh cho mệnh Hỏa.',
    swatches: { background: '#F3F6F5', button: '#1E804C', accent: '#E4F7ED', text: '#12261C', buttonText: '#FFFFFF' },
    elements: ['moc'],
  },
  {
    id: 'hoa',
    name: 'Hỏa · Tím hồng',
    tag: 'Tím hồng, nổi bật',
    fit: 'Màu bản mệnh Hỏa (cùng với đỏ, cam), tương sinh cho mệnh Thổ.',
    swatches: { background: '#F6F3F7', button: '#AF38C7', accent: '#F3E5F6', text: '#1F1122', buttonText: '#FFFFFF' },
    elements: ['hoa'],
  },
  {
    id: 'hong',
    name: 'Hồng đào',
    tag: 'Hồng ngọt, dịu mắt',
    fit: 'Cùng nhóm màu hợp mệnh Hỏa, tương sinh cho mệnh Thổ.',
    swatches: { background: '#F7F3F4', button: '#D22866', accent: '#F7E3EA', text: '#180C10', buttonText: '#FFFFFF' },
    elements: ['hoa'],
  },
];

export function isPaletteId(value: unknown): value is PaletteId {
  return PALETTES.some((palette) => palette.id === value);
}

export function findPalette(id: PaletteId): Palette {
  return PALETTES.find((palette) => palette.id === id) ?? PALETTES[0]!;
}
