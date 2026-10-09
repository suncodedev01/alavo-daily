import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LAYER_NAMES = ['layer-0-background', 'layer-1-house', 'layer-2-notebook', 'layer-3-pencil'];
const TARGETS = ['apps/native/app-icon.svg', 'apps/web/public/icon.svg'];
const ART_SIZE = 1024;

function innerOf(name) {
  const svg = readFileSync(resolve(root, `mockup/assets/logo/${name}.svg`), 'utf8');
  return svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'));
}

export function composeAppIcon() {
  const layers = LAYER_NAMES.map(innerOf).join('\n');
  const frame = `viewBox="0 0 ${ART_SIZE} ${ART_SIZE}" width="${ART_SIZE}" height="${ART_SIZE}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" ${frame}>\n${layers}\n</svg>\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const icon = composeAppIcon();
  TARGETS.forEach((target) => writeFileSync(resolve(root, target), icon));
}
