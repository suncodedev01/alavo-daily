import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(root, 'apps/web/package.json'));
const { chromium } = require('@playwright/test');

const PUBLIC = resolve(root, 'apps/web/public');
const SOURCE = resolve(PUBLIC, 'icon.svg');
const OUTPUTS = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
];

async function render(page, svgUrl, size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0}img{display:block}</style><img src="${svgUrl}" width="${size}" height="${size}">`,
  );
  await page.waitForFunction(() => [...document.images].every((image) => image.complete));
  await page.screenshot({ path: resolve(PUBLIC, file) });
}

const svgUrl = `data:image/svg+xml;base64,${readFileSync(SOURCE).toString('base64')}`;
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size] of OUTPUTS) await render(page, svgUrl, size, file);
await browser.close();
