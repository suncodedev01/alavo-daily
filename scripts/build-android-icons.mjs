import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'apps/web/package.json'));
const { chromium } = require('@playwright/test');

const LAYERS = resolve(root, 'mockup/assets/logo');
const OUT = resolve(root, 'apps/native/src-tauri/icons/android');
const ADAPTIVE_DP = 108;
const LEGACY_DP = 48;
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const SAFE_ZONE_SCALE = 0.85;
const GLYPH_LAYERS = ['layer-1-house', 'layer-2-notebook', 'layer-3-pencil'];

function dataUrl(layer) {
  const svg = readFileSync(resolve(LAYERS, `${layer}.svg`));
  return `data:image/svg+xml;base64,${svg.toString('base64')}`;
}

function stack(layers, size, shape, scale = 1) {
  const inner = Math.round(size * scale);
  const offset = Math.floor((size - inner) / 2);
  const images = layers
    .map((layer) => `<img src="${dataUrl(layer)}" width="${inner}" height="${inner}">`)
    .join('');
  return `<style>html,body{margin:0;background:transparent}div{position:relative;width:${size}px;height:${size}px;overflow:hidden;${shape}}img{position:absolute;left:${offset}px;top:${offset}px}</style><div>${images}</div>`;
}

async function render(page, html, size, path) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html);
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  mkdirSync(dirname(path), { recursive: true });
  await page.screenshot({ path, omitBackground: true });
}

async function renderDensity(page, density, scale) {
  const adaptive = ADAPTIVE_DP * scale;
  const legacy = LEGACY_DP * scale;
  const dir = resolve(OUT, `mipmap-${density}`);
  const everything = ['layer-0-background', ...GLYPH_LAYERS];
  await render(page, stack(GLYPH_LAYERS, adaptive, '', SAFE_ZONE_SCALE), adaptive, resolve(dir, 'ic_launcher_foreground.png'));
  await render(page, stack(['layer-0-background'], adaptive, ''), adaptive, resolve(dir, 'ic_launcher_background.png'));
  await render(page, stack(everything, legacy, 'border-radius:22%;'), legacy, resolve(dir, 'ic_launcher.png'));
  await render(page, stack(everything, legacy, 'border-radius:50%;'), legacy, resolve(dir, 'ic_launcher_round.png'));
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

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [density, scale] of Object.entries(DENSITIES)) await renderDensity(page, density, scale);
await browser.close();
writeAdaptiveDescriptor();
