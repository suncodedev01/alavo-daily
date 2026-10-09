import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ICONS = resolve(root, 'apps/native/src-tauri/icons/android');
const RES = resolve(root, 'apps/native/src-tauri/gen/android/app/src/main/res');
const DEFAULT_ICON_FILES = ['drawable/ic_launcher_background.xml', 'drawable-v24/ic_launcher_foreground.xml'];

export function applyAndroidIcons(iconsDir = ICONS, resDir = RES) {
  if (!existsSync(resDir)) throw new Error(`Run "tauri android init" first: ${resDir} is missing`);
  DEFAULT_ICON_FILES.forEach((file) => rmSync(resolve(resDir, file), { force: true }));
  cpSync(iconsDir, resDir, { recursive: true });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) applyAndroidIcons();
