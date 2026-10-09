import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PERMISSIONS = [
  '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
  '<uses-permission android:name="android.permission.USE_EXACT_ALARM" />',
  '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32" />',
];

function permissionName(line) {
  return line.split('"')[1];
}

export function addMissingPermissions(manifest) {
  const missing = PERMISSIONS.filter((line) => !manifest.includes(permissionName(line)));
  if (missing.length === 0) return manifest;
  const opening = /(<manifest[^>]*>)/;
  if (!opening.test(manifest)) throw new Error('AndroidManifest.xml has no <manifest> tag');
  return manifest.replace(opening, `$1\n    ${missing.join('\n    ')}`);
}

function main(path) {
  if (!path) throw new Error('Usage: patch-android-manifest.mjs <AndroidManifest.xml>');
  writeFileSync(path, addMissingPermissions(readFileSync(path, 'utf8')));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv[2]);
