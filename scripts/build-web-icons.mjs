import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderSvg } from './icon-render.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = resolve(root, 'apps/web/public');
const OUTPUTS = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
];

const source = readFileSync(resolve(PUBLIC, 'icon.svg'), 'utf8');
OUTPUTS.forEach(([file, size]) => writeFileSync(resolve(PUBLIC, file), renderSvg(source, size)));
