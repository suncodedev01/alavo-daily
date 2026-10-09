import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { applyAndroidIcons } from './apply-android-icons.mjs';

function write(path, text) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, text);
}

function fixture() {
  const base = mkdtempSync(join(tmpdir(), 'icons-'));
  const icons = join(base, 'icons');
  const res = join(base, 'res');
  write(join(icons, 'mipmap-mdpi/ic_launcher.png'), 'new-icon');
  write(join(icons, 'mipmap-anydpi-v26/ic_launcher.xml'), 'adaptive');
  write(join(res, 'mipmap-mdpi/ic_launcher.png'), 'default-icon');
  write(join(res, 'drawable/ic_launcher_background.xml'), 'default-background');
  write(join(res, 'drawable-v24/ic_launcher_foreground.xml'), 'default-foreground');
  write(join(res, 'values/strings.xml'), 'keep-me');
  return { icons, res };
}

test('replaces the default launcher icons with ours', () => {
  const { icons, res } = fixture();
  applyAndroidIcons(icons, res);
  assert.equal(readFileSync(join(res, 'mipmap-mdpi/ic_launcher.png'), 'utf8'), 'new-icon');
});

test('adds the adaptive icon descriptor', () => {
  const { icons, res } = fixture();
  applyAndroidIcons(icons, res);
  assert.equal(readFileSync(join(res, 'mipmap-anydpi-v26/ic_launcher.xml'), 'utf8'), 'adaptive');
});

test('removes the default drawables that would shadow our icon', () => {
  const { icons, res } = fixture();
  applyAndroidIcons(icons, res);
  assert.equal(existsSync(join(res, 'drawable/ic_launcher_background.xml')), false);
  assert.equal(existsSync(join(res, 'drawable-v24/ic_launcher_foreground.xml')), false);
});

test('leaves unrelated resources alone', () => {
  const { icons, res } = fixture();
  applyAndroidIcons(icons, res);
  assert.equal(readFileSync(join(res, 'values/strings.xml'), 'utf8'), 'keep-me');
});

test('applying twice gives the same result', () => {
  const { icons, res } = fixture();
  applyAndroidIcons(icons, res);
  applyAndroidIcons(icons, res);
  assert.equal(readFileSync(join(res, 'mipmap-mdpi/ic_launcher.png'), 'utf8'), 'new-icon');
});

test('asks for "tauri android init" when the project does not exist yet', () => {
  const { icons } = fixture();
  assert.throws(() => applyAndroidIcons(icons, join(tmpdir(), 'no-such-res-dir')), /tauri android init/);
});
