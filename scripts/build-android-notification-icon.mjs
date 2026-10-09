import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { composeLayers, renderSvg } from './icon-render.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LAYERS = resolve(root, 'mockup/assets/logo');
const OUT = resolve(root, 'apps/native/src-tauri/icons/android');
const SMALL_ICON_DP = 24;
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const ART_SIZE = 1024;
const GLYPH_VIEW_BOX = '150 50 720 720';

const layer = (name) => resolve(LAYERS, `${name}.svg`);

const FLAT = (red, green, blue) =>
  `<filter id="flat-${red}${green}${blue}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 ${red} 0 0 0 0 ${green} 0 0 0 0 ${blue} 0 0 0 1 0"/></filter>`;

function flatten(svg, red, green, blue) {
  const inner = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
  return `<g filter="url(#flat-${red}${green}${blue})">${inner}</g>`;
}

export function notificationGlyphSvg() {
  const house = composeLayers([layer('layer-1-house')], {});
  const cutout = composeLayers([layer('layer-2-notebook'), layer('layer-3-pencil')], {});
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${GLYPH_VIEW_BOX}">`,
    `<defs>${FLAT(1, 1, 1)}${FLAT(0, 0, 0)}`,
    `<mask id="cutout"><rect x="0" y="0" width="${ART_SIZE}" height="${ART_SIZE}" fill="white"/>${flatten(cutout, 0, 0, 0)}</mask></defs>`,
    `<g mask="url(#cutout)">${flatten(house, 1, 1, 1)}</g>`,
    '</svg>',
  ].join('');
}

function writeDensity(density, factor) {
  const dir = resolve(OUT, `drawable-${density}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'ic_notification.png'), renderSvg(notificationGlyphSvg(), SMALL_ICON_DP * factor));
}

Object.entries(DENSITIES).forEach(([density, factor]) => writeDensity(density, factor));
