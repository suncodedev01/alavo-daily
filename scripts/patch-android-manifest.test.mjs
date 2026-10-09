import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addMissingPermissions } from './patch-android-manifest.mjs';

const MANIFEST = [
  '<?xml version="1.0" encoding="utf-8"?>',
  '<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
  '    <uses-permission android:name="android.permission.INTERNET" />',
  '    <application />',
  '</manifest>',
].join('\n');

test('adds the notification and exact alarm permissions', () => {
  const patched = addMissingPermissions(MANIFEST);
  assert.match(patched, /android\.permission\.POST_NOTIFICATIONS/);
  assert.match(patched, /android\.permission\.USE_EXACT_ALARM/);
  assert.match(patched, /android\.permission\.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32"/);
});

test('keeps the permissions that were already there', () => {
  assert.match(addMissingPermissions(MANIFEST), /android\.permission\.INTERNET/);
});

test('patching twice changes nothing the second time', () => {
  const once = addMissingPermissions(MANIFEST);
  assert.equal(addMissingPermissions(once), once);
});

test('does not add a permission that is already declared', () => {
  const declared = MANIFEST.replace(
    '<application />',
    '<uses-permission android:name="android.permission.USE_EXACT_ALARM" />\n    <application />',
  );
  const patched = addMissingPermissions(declared);
  assert.equal(patched.split('android.permission.USE_EXACT_ALARM').length - 1, 1);
});

test('a file without a manifest tag is rejected', () => {
  assert.throws(() => addMissingPermissions('<resources />'), /no <manifest> tag/);
});
