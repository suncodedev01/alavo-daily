import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bumpVersion, replaceFirstVersionLine, replaceWorkspaceCrateVersions } from './bump-version.mjs';

test('patch bump increments only the last number', () => {
  assert.equal(bumpVersion('1.2.3', 'patch'), '1.2.4');
});

test('minor bump resets patch to zero', () => {
  assert.equal(bumpVersion('1.2.3', 'minor'), '1.3.0');
});

test('major bump resets minor and patch to zero', () => {
  assert.equal(bumpVersion('1.2.3', 'major'), '2.0.0');
});

test('numbers above nine are compared as numbers, not text', () => {
  assert.equal(bumpVersion('0.9.9', 'patch'), '0.9.10');
  assert.equal(bumpVersion('0.9.10', 'minor'), '0.10.0');
});

test('a prerelease suffix is rejected', () => {
  assert.throws(() => bumpVersion('1.0.0-beta.1', 'patch'), /major\.minor\.patch/);
});

test('an unknown level is rejected', () => {
  assert.throws(() => bumpVersion('1.0.0', 'huge'), /Unknown bump level/);
});

test('only the package version line is rewritten in a Cargo manifest', () => {
  const manifest = [
    '[package]',
    'name = "alavo-daily-native"',
    'version = "0.1.0"',
    '',
    '[dependencies]',
    'tauri = { version = "2" }',
  ].join('\n');
  const updated = replaceFirstVersionLine(manifest, '0.2.0');
  assert.match(updated, /^version = "0\.2\.0"$/m);
  assert.match(updated, /tauri = \{ version = "2" \}/);
});

test('only crates of this workspace change version in a lockfile', () => {
  const lock = [
    '[[package]]',
    'name = "alavo-domain"',
    'version = "0.1.0"',
    '',
    '[[package]]',
    'name = "serde"',
    'version = "1.0.200"',
  ].join('\n');
  const updated = replaceWorkspaceCrateVersions(lock, '0.2.0');
  assert.match(updated, /name = "alavo-domain"\nversion = "0\.2\.0"/);
  assert.match(updated, /name = "serde"\nversion = "1\.0\.200"/);
});
