import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { patchThemes, useLightStatusBar } from './patch-android-theme.mjs';

const THEMES = [
  '<resources xmlns:tools="http://schemas.android.com/tools">',
  '    <!-- Base application theme. -->',
  '    <style name="Theme.alavo_daily_native" parent="Theme.Material3.DayNight.NoActionBar">',
  '        <!-- Customize your theme here. -->',
  '    </style>',
  '</resources>',
].join('\n');

test('asks for dark status bar icons on the light paper colour', () => {
  const patched = useLightStatusBar(THEMES);
  assert.match(patched, /<item name="android:windowLightStatusBar">true<\/item>/);
  assert.match(patched, /<item name="android:statusBarColor">#FFFAF7F0<\/item>/);
});

test('keeps the parent theme and the existing items', () => {
  const patched = useLightStatusBar(THEMES.replace('</style>', '<item name="colorPrimary">#fff</item>\n    </style>'));
  assert.match(patched, /parent="Theme\.Material3\.DayNight\.NoActionBar"/);
  assert.match(patched, /colorPrimary/);
});

test('patching twice changes nothing the second time', () => {
  const once = useLightStatusBar(THEMES);
  assert.equal(useLightStatusBar(once), once);
});

test('replaces a status bar setting that was already there', () => {
  const dark = THEMES.replace('</style>', '<item name="android:windowLightStatusBar">false</item>\n    </style>');
  const patched = useLightStatusBar(dark);
  assert.equal(patched.split('windowLightStatusBar').length - 1, 1);
  assert.doesNotMatch(patched, />false</);
});

test('a file without an app theme is rejected', () => {
  assert.throws(() => useLightStatusBar('<resources />'), /no <style name="Theme/);
});

test('patches the day and night themes of an Android project', () => {
  const res = mkdtempSync(join(tmpdir(), 'alavo-res-'));
  ['values', 'values-night'].forEach((folder) => {
    mkdirSync(join(res, folder));
    writeFileSync(join(res, folder, 'themes.xml'), THEMES);
  });
  assert.equal(patchThemes(res).length, 2);
  assert.match(readFileSync(join(res, 'values-night', 'themes.xml'), 'utf8'), /windowLightStatusBar/);
});
