import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PAPER_COLOR = '#FFFAF7F0';
const STATUS_BAR_ITEMS = [
  `<item name="android:statusBarColor">${PAPER_COLOR}</item>`,
  '<item name="android:windowLightStatusBar">true</item>',
  `<item name="android:windowBackground">${PAPER_COLOR}</item>`,
];
const APP_STYLE = /(<style name="Theme\.[^"]*"[^>]*>)([\s\S]*?)(<\/style>)/;
const STATUS_BAR_ITEM = /^[ \t]*<item name="android:(statusBarColor|windowLightStatusBar|windowBackground)">[^<]*<\/item>\r?\n/gm;

export function useLightStatusBar(xml) {
  if (!APP_STYLE.test(xml)) throw new Error('themes.xml has no <style name="Theme.*"> block');
  return xml.replace(APP_STYLE, (_, open, body, close) => {
    const kept = body.replace(STATUS_BAR_ITEM, '');
    const added = STATUS_BAR_ITEMS.map((item) => `        ${item}\n`).join('');
    return `${open}${kept.replace(/\s*$/, '\n')}${added}    ${close}`;
  });
}

function themeFiles(resDir) {
  return readdirSync(resDir)
    .filter((folder) => folder === 'values' || folder.startsWith('values-'))
    .map((folder) => join(resDir, folder, 'themes.xml'))
    .filter(existsSync);
}

export function patchThemes(resDir) {
  const files = themeFiles(resDir);
  if (files.length === 0) throw new Error(`No themes.xml under ${resDir}`);
  files.forEach((file) => writeFileSync(file, useLightStatusBar(readFileSync(file, 'utf8'))));
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: patch-android-theme.mjs <android res directory>');
  patchThemes(process.argv[2]);
}
