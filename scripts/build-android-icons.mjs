import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { composeLayers, renderSvg } from './icon-render.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LAYERS = resolve(root, 'mockup/assets/logo');
const OUT = resolve(root, 'apps/native/src-tauri/icons/android');
const ADAPTIVE_DP = 108;
const LEGACY_DP = 48;
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const SAFE_ZONE_SCALE = 0.85;
const ROUNDED_CORNERS = 225;
const CIRCLE = 512;

const layer = (name) => resolve(LAYERS, `${name}.svg`);
const BACKGROUND = [layer('layer-0-background')];
const GLYPH = ['layer-1-house'].map(layer);

function write(dir, name, svg, size) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, name), renderSvg(svg, size));
}

function writeDensity(density, factor) {
  const dir = resolve(OUT, `mipmap-${density}`);
  const adaptive = ADAPTIVE_DP * factor;
  const legacy = LEGACY_DP * factor;
  const everything = [...BACKGROUND, ...GLYPH];
  write(dir, 'ic_launcher_foreground.png', composeLayers(GLYPH, { scale: SAFE_ZONE_SCALE }), adaptive);
  write(dir, 'ic_launcher_background.png', composeLayers(BACKGROUND), adaptive);
  write(dir, 'ic_launcher.png', composeLayers(everything, { cornerRadius: ROUNDED_CORNERS }), legacy);
  write(dir, 'ic_launcher_round.png', composeLayers(everything, { cornerRadius: CIRCLE }), legacy);
}

function writeAdaptiveDescriptor() {
  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">',
    '  <background android:drawable="@mipmap/ic_launcher_background"/>',
    '  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>',
    '</adaptive-icon>',
    '',
  ].join('\n');
  mkdirSync(resolve(OUT, 'mipmap-anydpi-v26'), { recursive: true });
  writeFileSync(resolve(OUT, 'mipmap-anydpi-v26/ic_launcher.xml'), xml);
  writeFileSync(resolve(OUT, 'mipmap-anydpi-v26/ic_launcher_round.xml'), xml);
}

Object.entries(DENSITIES).forEach(([density, factor]) => writeDensity(density, factor));
writeAdaptiveDescriptor();
